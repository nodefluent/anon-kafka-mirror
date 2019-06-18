"use strict";

import debug from "debug";
import * as express from "express";
import * as faker from "faker";
import { fromJS, List, Map } from "immutable";
import { KafkaStreams, KStream } from "kafka-streams";

import Metrics from "./Metrics";
import {
  IConfig,
  IFormatOptions,
  ITopicConfig,
} from "./types";
import {
  hashAlphanumerical,
  hashLuhnString,
  hashQueryParam,
  hashString,
  hashUUID,
  isArrayPath,
  splitPath,
} from "./utils";

const debugLogger = debug("anon-kafka-mirror:mirror");

const fake = (format: string, type?: string) => {
  if (format === "hashed.uuid" ||
    format === "hashed.string" ||
    format === "hashed.alphanumerical" ||
    format === "hashed.queryParam" ||
    format === "luhn.string") {
    return;
  }
  let value: string | number = faker.fake(`{{${format}}}`);
  if ((type === "number" || type === "integer") &&
    typeof value === "string" &&
    !isNaN(parseInt(value, 10))) {
    value = parseInt(value, 10);
  }
  return value;
};

const transform = (
  format: string,
  keyValue: any,
  formatOptions: IFormatOptions,
) => {
  switch (format) {
    case "hashed.uuid":
      return hashUUID(keyValue);
    case "hashed.string":
      return hashString(keyValue, formatOptions.ignoreLeft, formatOptions.ignoreRight);
    case "hashed.queryParam":
      return hashQueryParam(keyValue, formatOptions.paramName, formatOptions.paramFormat);
    case "hashed.alphanumerical":
      return hashAlphanumerical(keyValue, formatOptions.ignoreLeft, formatOptions.upperCase);
    case "luhn.string":
      return hashLuhnString(keyValue, formatOptions.prefixLength, formatOptions.prefix);
    default:
      return fake(format, formatOptions.type);
  }
};

const parseByKey = (
  key: string,
  outputMessage: Map<string, any>,
  inputMessage: Map<string, any>,
  format: string,
  formatOptions: IFormatOptions,
  pattern?: RegExp,
) => {
  const [isArray] = isArrayPath(key);
  if (!isArray) {
    const keyPath = splitPath(key);
    let keyValue = inputMessage.getIn(keyPath);
    if (keyValue === null) {
      outputMessage = outputMessage.setIn(keyPath, null);
    } else if (keyValue !== undefined) {
      if (pattern) {
        if (!Map.isMap(keyValue)) {
          throw new Error(`Pattern ${pattern} is currently only supported in object path.`);
        }
        const names = Array.from(keyValue.keys()) as string[];
        for (const name of names) {
          if (pattern.test(name)) {
            const alteredValue = transform(format, keyValue.get(name), formatOptions);
            outputMessage = outputMessage.setIn(keyPath.concat([name]), alteredValue);
          }
        }
      } else {
        keyValue = transform(
          format,
          keyValue,
          formatOptions,
        );
        outputMessage = outputMessage.setIn(keyPath, keyValue);
      }
    }
  } else {
    outputMessage = parseArrayByKey(
      key,
      inputMessage,
      outputMessage,
      format,
      formatOptions,
    );
  }

  return outputMessage;
};

const parseArrayByKey = (
  key: string,
  inputMessage: Map<string, any>,
  outputMessage: Map<string, any>,
  format: string,
  formatOptions: IFormatOptions,
) => {
  const [isArray, keyPrefix, suffix] = isArrayPath(key);
  if (!isArray) {
    throw new Error(`Path ${key} is treated as an array path, but no array indexer was found.`);
  }

  let isSubArray;
  let suffixPrefix;
  let suffixSuffix;
  if (suffix) {
    [isSubArray, suffixPrefix, suffixSuffix] = isArrayPath(suffix);
  }
  const prefixPath = splitPath(keyPrefix);
  const keyArray = inputMessage.getIn(prefixPath);
  if (List.isList(keyArray)) {
    if (!outputMessage.hasIn(prefixPath)) {
      outputMessage = outputMessage.setIn(prefixPath, List());
    }
    keyArray.forEach((v, i) => {
      let keyPath = prefixPath.concat([i]);
      let newListPath = prefixPath.concat([i]);
      if (isSubArray && suffixPrefix) {
        keyPath = keyPath.concat([suffixPrefix]);
        newListPath = newListPath.concat([suffixPrefix]);
      }

      const prefixValue = inputMessage.getIn(keyPath);
      if (List.isList(prefixValue)) {
        outputMessage = parseArrayByKey(
          `${keyPath.join(".")}${isSubArray ? "[*]" + (suffixSuffix || "") : suffix}`,
          inputMessage,
          outputMessage,
          format,
          formatOptions,
        );
      } else {
        if (suffix) {
          keyPath = keyPath.concat(splitPath(suffix));
          newListPath = newListPath.concat(splitPath(suffix));
        }
        let keyValue = inputMessage.getIn(keyPath);
        if (keyValue === null) {
          outputMessage = outputMessage.setIn(newListPath, null);
        } else if (keyValue !== undefined) {
          if (Map.isMap(keyValue)) {
            let mapValue = keyValue.getIn(splitPath(suffix));
            mapValue = transform(
              format,
              mapValue,
              formatOptions,
            );
            if (mapValue !== undefined) {
              outputMessage = outputMessage.setIn(newListPath, mapValue);
            }
          } else if (List.isList(keyValue)) {
            const joinedKeyPath = keyPath.join(".");
            const newKey = joinedKeyPath + key.substr(joinedKeyPath.length + (2 - i.toString().length));
            outputMessage = parseArrayByKey(
              newKey,
              inputMessage,
              outputMessage,
              format,
              formatOptions,
            );
          } else {
            keyValue = transform(
              format,
              keyValue,
              formatOptions,
            );
            outputMessage = outputMessage.setIn(newListPath, keyValue);
          }
        }
      }
    });
  }

  return outputMessage;
};

const proxyByKey = (
  key: string,
  inputMessage: Map<string, any>,
  outputMessage: Map<string, any>,
) => {
  const [isArray] = isArrayPath(key);
  if (!isArray) {
    const keyPath = splitPath(key);
    const keyValue = inputMessage.getIn(keyPath);
    if (keyValue !== undefined) {
      outputMessage = outputMessage.setIn(keyPath, keyValue);
    }
  } else {
    outputMessage = proxyArrayByKey(
      key,
      inputMessage,
      outputMessage,
    );
  }

  return outputMessage;
};

const proxyArrayByKey = (
  key: string,
  inputMessage: Map<string, any>,
  outputMessage: Map<string, any>,
) => {
  const [isArray, keyPrefix, suffix] = isArrayPath(key);
  if (!isArray) {
    throw new Error(`Path ${key} is treated as an array path, but no array indexer was found.`);
  }

  let isSubArray;
  let suffixPrefix;
  let suffixSuffix;
  if (suffix) {
    [isSubArray, suffixPrefix, suffixSuffix] = isArrayPath(suffix);
  }
  const prefixPath = splitPath(keyPrefix);
  const keyArray = inputMessage.getIn(prefixPath);
  if (!keyArray) {
    return outputMessage;
  }

  if (!List.isList(keyArray)) {
    throw new Error(`Path ${prefixPath} is treated as an array, but no array found in this path.`);
  }
  if (!outputMessage.hasIn(prefixPath)) {
    outputMessage = outputMessage.setIn(prefixPath, List());
  }
  keyArray.forEach((v, i) => {
    let keyPath = prefixPath.concat([i]);
    let newListPath = prefixPath.concat([i]);
    if (isSubArray && suffixPrefix) {
      keyPath = keyPath.concat([suffixPrefix]);
      newListPath = newListPath.concat([suffixPrefix]);
    }
    const prefixValue = inputMessage.getIn(keyPath);
    if (List.isList(prefixValue)) {
      outputMessage = proxyArrayByKey(
        `${keyPath.join(".")}${isSubArray ? "[*]" + (suffixSuffix || "") : suffix}`,
        inputMessage,
        outputMessage,
      );
    } else {
      if (suffix) {
        keyPath = keyPath.concat(splitPath(suffix));
        newListPath = newListPath.concat(splitPath(suffix));
      }
      const keyValue = inputMessage.getIn(keyPath);
      if (keyValue === null) {
        outputMessage = outputMessage.setIn(newListPath, null);
      } else if (keyValue !== undefined) {
        if (Map.isMap(keyValue)) {
          const mapValue = keyValue.getIn(splitPath(suffix));
          if (mapValue !== undefined) {
            outputMessage = outputMessage.setIn(newListPath, mapValue);
          }
        } else if (List.isList(keyValue)) {
          const joinedKeyPath = keyPath.join(".");
          const newKey = joinedKeyPath + key.substr(joinedKeyPath.length + (2 - i.toString().length));
          outputMessage = proxyArrayByKey(
            newKey,
            inputMessage,
            outputMessage,
          );
        } else {
          outputMessage = outputMessage.setIn(newListPath, keyValue);
        }
      }
    }
  });
  return outputMessage;
};

export const mapMessage = (config: ITopicConfig, jsonMessage: any) => {
  const inputMessage = fromJS(jsonMessage);
  let outputMessage = Map<string, any>();

  if (inputMessage.has("offset")) {
    outputMessage = outputMessage.set("offset", inputMessage.get("offset"));
  }

  if (inputMessage.has("partition")) {
    outputMessage = outputMessage.set("partition", inputMessage.get("partition"));
  }

  if (inputMessage.has("timestamp")) {
    outputMessage = outputMessage.set("timestamp", inputMessage.get("timestamp"));
  }

  if (config.newName || inputMessage.has("topic")) {
    outputMessage = outputMessage.set("topic", config.newName || inputMessage.get("topic"));
  }

  outputMessage = mapMessageKey(config, inputMessage, outputMessage);
  outputMessage = mapMessageValue(config, inputMessage, outputMessage);
  return outputMessage.toJS();
};

export class AnonKafkaMirror {
  public config: IConfig = undefined;
  public app: any;
  public metrics: Metrics;
  public alive: boolean;
  public server: any;
  private stream: KStream;

  constructor(config: IConfig) {
    this.config = config;
    this.app = express();
    this.metrics = null;
    this.alive = true;

    const kafkaStreams = new KafkaStreams(this.config.consumer);
    this.stream = kafkaStreams.getKStream();
    this.stream
      .from(config.topic.name)
      .mapJSONConvenience()
      .map((m) => mapMessage(config.topic, m))
      .tap((message) => {
        debugLogger(message, "Transformed message");
        if (this.metrics) {
          this.metrics.transformedCounter.inc();
        }
      })
      .to();
  }

  public run() {
    this.app.get("/admin/healthcheck", (_, res) => {
      res.status(this.alive ? 200 : 503).end();
    });

    this.app.get("/admin/health", (_, res) => {
      res.status(200).json({
        status: this.alive ? "UP" : "DOWN",
        uptime: process.uptime(),
      });
    });

    if (this.config.metrics && this.config.metrics.port && this.config.metrics.probeIntervalMs) {
      this.metrics = new Metrics(this.config.metrics);
      this.metrics.collect(this.app);
      this.app.get("/metrics", Metrics.exposeMetricsRequestHandler);
    }

    this.app.listen(this.config.metrics.port, () => {
      debugLogger(`Service up @ http://localhost:${this.config.metrics.port}`);
    });

    // @ts-ignore
    return this.stream.start({ outputKafkaConfig: this.config.producer })
      .catch((e: Error) => {
        this.alive = false;
        console.error(e);
        process.exit(1);
      });
  }
}

const mapMessageKey = (
  config: ITopicConfig,
  inputMessage: Map<string, any>,
  outputMessage: Map<string, any>,
): Map<string, any> => {
  if (!config.key) {
    return outputMessage;
  }

  if (config.key && config.key.proxy) {
    return outputMessage.set("key", inputMessage.get("key") || null);
  }

  if (!config.key.format) {
    throw new Error("Key should be altered, but no format was given.");
  }

  const {
    type,
    ignoreLeft,
    ignoreRight,
    paramName,
    paramFormat,
    upperCase,
    prefixLength,
    prefix,
  } = config.key;

  const formatOptions = {
    type,
    ignoreLeft,
    ignoreRight,
    paramName,
    paramFormat,
    upperCase,
    prefixLength,
    prefix,
  };

  const keyValue = transform(
    config.key.format,
    inputMessage.get("key"),
    formatOptions,
  );

  return outputMessage.set("key", keyValue || null);
};

const mapMessageValue = (
  config: ITopicConfig,
  inputMessage: Map<string, any>,
  outputMessage: Map<string, any>,
): Map<string, any> => {
  const inputMessageValue = inputMessage.get("value");
  if (!inputMessageValue || typeof inputMessageValue !== "object") {
    outputMessage = outputMessage.set("value", inputMessageValue === undefined ? null : inputMessageValue);
    return outputMessage;
  }

  if (inputMessageValue.size === 0) {
    outputMessage = outputMessage.set("value", "{}");
    return outputMessage;
  }

  if (config.proxy && config.proxy instanceof Array) {
    config.proxy.forEach((key) => {
      outputMessage = proxyByKey(`value.${key}`, inputMessage, outputMessage);
    });
  }

  if (config.alter && config.alter instanceof Array) {
    config.alter.forEach((key) => {
      const {
        type,
        ignoreLeft,
        ignoreRight,
        paramName,
        paramFormat,
        upperCase,
        prefixLength,
        prefix,
      } = key;

      const formatOptions = {
        type,
        ignoreLeft,
        ignoreRight,
        paramName,
        paramFormat,
        upperCase,
        prefixLength,
        prefix,
      };

      const patternRegExp = key.pattern ? new RegExp(key.pattern) : undefined;

      outputMessage = parseByKey(
        `value.${key.name}`,
        outputMessage,
        inputMessage,
        key.format,
        formatOptions,
        patternRegExp,
      );
    });
  }

  let value = outputMessage.get("value");
  if (!value && inputMessageValue.size > 0) {
    value = "{}";
  } else if (typeof value === "object") {
    value = JSON.stringify(value);
  } else {
    value = null;
  }
  outputMessage = outputMessage.set("value", value);
  return outputMessage;
};
