"use strict";

import debug from "debug";
import * as express from "express";
import * as faker from "faker";
import { fromJS, List, Map } from "immutable";

import {
  KafkaMessage,
  NConsumer,
  NProducer,
  SortedMessageBatch,
} from "sinek";
import Metrics from "./Metrics";
import {
  IConfig,
  IFormatOptions,
  ITopicBatchResponse,
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
      let listIndex = prefixPath.concat([i]);
      if (isSubArray && suffixPrefix) {
        keyPath = keyPath.concat([suffixPrefix]);
        listIndex = listIndex.concat([suffixPrefix]);
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
        }
        let keyValue = inputMessage.getIn(keyPath);
        if (keyValue === null) {
          outputMessage = outputMessage.setIn(keyPath, null);
        } else if (keyValue !== undefined) {
          if (Map.isMap(keyValue)) {
            let mapValue = keyValue.getIn(splitPath(suffix));
            mapValue = transform(
              format,
              mapValue,
              formatOptions,
            );
            if (mapValue !== undefined) {
              outputMessage = outputMessage.setIn(keyPath, mapValue);
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
            if (!outputMessage.hasIn(listIndex)) {
              outputMessage = outputMessage.setIn(listIndex, Map());
            }
            outputMessage = outputMessage.setIn(keyPath, keyValue);
          }
        }
      }
    });

    const outputKeyArray = outputMessage.getIn(prefixPath);
    outputMessage = outputMessage.setIn(prefixPath, outputKeyArray.filter((v) => v !== null && v !== undefined));
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
    let listIndex = prefixPath.concat([i]);
    if (isSubArray && suffixPrefix) {
      keyPath = keyPath.concat([suffixPrefix]);
      listIndex = prefixPath.concat([suffixPrefix]);
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
      }
      const keyValue = inputMessage.getIn(keyPath);
      if (keyValue === null) {
        outputMessage = outputMessage.setIn(listIndex, null);
      } else if (keyValue !== undefined) {
        if (Map.isMap(keyValue)) {
          const mapValue = keyValue.getIn(splitPath(suffix));
          if (mapValue !== undefined) {
            outputMessage = outputMessage.setIn(keyPath, mapValue);
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
          if (!outputMessage.hasIn(listIndex)) {
            outputMessage = outputMessage.setIn(listIndex, Map());
          }
          outputMessage = outputMessage.setIn(keyPath, keyValue);
        }
      }
    }
  });

  const outputKeyArray = outputMessage.getIn(prefixPath);
  outputMessage = outputMessage.setIn(prefixPath, outputKeyArray.filter((v) => v !== null && v !== undefined));

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
  private consumer: NConsumer;
  private producer: NProducer;

  constructor(config: IConfig) {
    this.config = config;
    this.app = express();
    this.metrics = null;
    this.alive = true;

    this.consumer = new NConsumer(this.config.topic.name, this.config.consumer);
    this.producer = new NProducer(this.config.producer, null, this.config.topic.partitions || "auto");
  }

  public async run() {

    process.on("unhandledRejection", (reason, p) => {
      const stack = reason instanceof Error && reason.hasOwnProperty("stack") ? `, stack: ${reason.stack}` : "";
      debugLogger(`[Uncaught] Unhandled Rejection at: Promise ${p}, reason: ${reason}${stack}`);
      process.exit(1);
    });

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

    this.consumer.on(
      "error",
      (error) => debugLogger(`Kafka consumer error for topics ${this.config.topic.name}: ${error}`),
    );

    this.consumer.on(
      "analytics",
      (analytics) => debugLogger(`Kafka consumer analytics for topics ${this.config.topic.name}: ` +
        `${JSON.stringify(analytics)}`),
    );

    try {
      await this.producer.connect();
      await this.consumer.connect();
      debugLogger(`Kafka consumer for topics ${this.config.topic.name} connected.`);
      await this.consumer.enableAnalytics({
        analyticsInterval: 1000 * 60 * 4, // runs every 4 minutes
        lagFetchInterval: 1000 * 60 * 5, // runs every 5 minutes
      });

      this.consumer.consume(
        async (batchOfMessages, callback) => {
          const topicPromises = Object
            .keys(batchOfMessages)
            .map((topic) => this.handleSingleTopic(
              topic,
              (batchOfMessages as SortedMessageBatch)[topic],
              (batch) => this.processBatch(batch)));

          const batchSuccessful = await Promise.all(topicPromises);
          if (batchSuccessful.every((b) => b === true)) {
            callback();
          } else {
            throw new Error(`Failed to consume topics ${this.config.topic.name}.Stopping consumer...`);
          }
        },
        false,
        true,
        this.config.batchConfig);

    } catch (error) {
      debugLogger(`Kafka consumer connection error for topics ${this.config.topic.name}: ${error} `);
      console.error(error);
      process.exit(1);
    }
  }

  private async handleSingleTopic(
    topic: string,
    messages: { [partition: string]: KafkaMessage[] },
    singleTopicHandler: (partitions: { [partition: string]: KafkaMessage[] }) => Promise<ITopicBatchResponse>,
  ) {
    const result = await singleTopicHandler(messages);

    (result.lastSuccessfulOffsets || [])
      .forEach((p2o: { [partition: string]: number }) =>
        Object.keys(p2o).map((p) => this.consumer.commitOffsetHard(topic, parseInt(p, 10), p2o[p], false)));

    return !result.hasErrors;
  }

  private async processBatch(
    partitionedMessages: { [partition: string]: KafkaMessage[] },
  ): Promise<ITopicBatchResponse> {
    const partitions = Object.keys(partitionedMessages);
    const partitionResults = await Promise.all(partitions.map((p) => this.processPartition(partitionedMessages[p])));

    const result = {
      hasErrors: partitionResults.some((pr) => pr !== null),
      lastSuccessfulOffsets: [],
    } as ITopicBatchResponse;
    for (let x = 0; x < partitions.length; x++) {
      const partition = partitions[x];
      const lastMessage = partitionedMessages[partitions[x]][partitionedMessages[partitions[x]].length - 1];
      const offset = partitionResults[x] || lastMessage ? lastMessage.offset : undefined;
      if (offset) {
        result.lastSuccessfulOffsets.push({ [partition]: offset });
      }
    }

    return result;
  }

  private async processPartition(messages: KafkaMessage[]): Promise<number | null> {
    let failedMessageOffset = null;
    for (const message of messages) {
      try {
        const mappedMessage = mapMessage(this.config.topic, message);
        const produceResult = await this.producer.send(
          this.config.topic.newName || this.config.topic.name,
          mappedMessage.value,
          null,
          mappedMessage.key,
        );
      } catch (error) {
        failedMessageOffset = message.offset;
        debugLogger(`Error processing message of partition ${message.partition} with offset ` +
          `${message.offset}: ${error}`);
        break;
      }
    }

    return failedMessageOffset;
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
    inputMessage.get("key").toString(),
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
