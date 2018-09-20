"use strict";

import debug from "debug";
import * as express from "express";
import * as faker from "faker";
import { fromJS, List, Map } from "immutable";
import { KafkaStreams, KStream } from "kafka-streams";
import Metrics from "./Metrics";
import { IConfig } from "./types";
import { arrayMatch, hashUUID, splitPath } from "./utils";

const debugLogger = debug("anon-kafka-mirror:mirror");

export const fake = (format: string, type?: string) => {
  if (format === "hashed.uuid") {
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

const parseArrayByKey = (
  key: string,
  map: Map<string, any>,
  s: string = "",
  inputMessage: Map<string, any>,
  format?: string,
  type?: string,
) => {
  const keyPathMatch = key.match(arrayMatch);
  const prefix = keyPathMatch[1];
  const suffix = s || keyPathMatch[3];
  if (prefix) {
    const prefixPath = splitPath(prefix);
    const keyArray = inputMessage.getIn(prefixPath);
    if (List.isList(keyArray)) {
      map = map.setIn(prefixPath, List());
      let newListIndex = 0;
      keyArray.forEach((v, i) => {
        let keyPath = prefixPath.concat([i]);
        let newListPath = prefixPath.concat([newListIndex]);
        const prefixValue = inputMessage.getIn(keyPath);
        if (List.isList(prefixValue)) {
          map = parseArrayByKey(keyPath.join("."), map, suffix, inputMessage, format, type);
        } else {
          if (suffix) {
            keyPath = keyPath.concat(splitPath(suffix));
            newListPath = newListPath.concat(splitPath(suffix));
          }
          let keyValue = inputMessage.getIn(keyPath);
          if (keyValue === null) {
            map = map.setIn(newListPath, null);
            newListIndex += 1;
          } else if (keyValue !== undefined) {
            if (Map.isMap(keyValue)) {
              let mapValue = keyValue.getIn(splitPath(suffix));
              if (format) {
                mapValue = fake(format, type);
              }
              if (mapValue !== undefined) {
                map = map.setIn(newListPath, mapValue);
                newListIndex += 1;
              }
            } else {
              if (format) {
                keyValue = fake(format, type);
              }
              map = map.setIn(newListPath, keyValue);
              newListIndex += 1;
            }
          }
        }
      });
    }
  }
  return map;
};

const parseByKey = (
  key: string,
  map: Map<string, any>,
  inputMessage: Map<string, any>,
  format?: string,
  type?: string,
) => {
  if (key && typeof key === "string") {
    if (!key.match(arrayMatch)[2]) {
      const keyPath = splitPath(key);
      let keyValue = inputMessage.getIn(keyPath);
      if (keyValue === null) {
        map = map.setIn(keyPath, null);
      } else if (keyValue !== undefined) {
        if (format) {
          if (format === "hashed.uuid") {
            keyValue = hashUUID(keyValue);
          } else {
            keyValue = fake(format, type);
          }
        }
        map = map.setIn(keyPath, keyValue);
      }
    } else {
      map = parseArrayByKey(key, map, undefined, inputMessage, format, type);
    }
  }
  return map;
};

export const mapMessage = (config: IConfig, m: any) => {
  const inputMessage = fromJS(m);
  if (config.consumer && config.consumer.logger && config.consumer.logger.debug) {
    config.consumer.logger.debug(inputMessage.toJS(), "Got message");
  }
  let outputMessage = Map<string, any>();
  if (inputMessage.get("offset")) {
    outputMessage = outputMessage.set("offset", inputMessage.get("offset"));
  }
  if (inputMessage.get("partition")) {
    outputMessage = outputMessage.set("partition", inputMessage.get("partition"));
  }
  if (inputMessage.get("timestamp")) {
    outputMessage = outputMessage.set("timestamp", inputMessage.get("timestamp"));
  }
  if (config.topic.newName || inputMessage.get("topic")) {
    outputMessage = outputMessage.set("topic", config.topic.newName || inputMessage.get("topic"));
  }

  if (config.topic.key && config.topic.key.proxy === false) {
    if (config.topic.key.format) {
      const newKey = fake(config.topic.key.format, config.topic.key.type);
      if (newKey) {
        outputMessage = outputMessage.set("key", newKey);
      }
    }
  }

  if (config.topic.key && config.topic.key.proxy) {
    outputMessage = outputMessage.set("key", inputMessage.get("key"));
  }

  if (!outputMessage.get("key")) {
    outputMessage = outputMessage.set("key", null);
  }

  if (!inputMessage.get("value") || typeof inputMessage.get("value") !== "object") {
    const v = inputMessage.get("value") === undefined ? null : inputMessage.get("value");
    outputMessage = outputMessage.set("value", v);
    return outputMessage.toJS();
  }
  if (inputMessage.get("value").size === 0) {
    outputMessage = outputMessage.set("value", "{}");
    return outputMessage.toJS();
  }

  if (config.topic.proxy && config.topic.proxy instanceof Array) {
    config.topic.proxy.forEach((key) => {
      outputMessage = parseByKey(`value.${key}`, outputMessage, inputMessage);
    });
  }

  if (config.topic.alter && config.topic.alter instanceof Array) {
    config.topic.alter.forEach((key) => {
      outputMessage = parseByKey(`value.${key.name}`, outputMessage, inputMessage, key.format, key.type);
    });
  }
  let value = outputMessage.get("value");
  if (!value && inputMessage.get("value").size) {
    value = "{}";
  } else if (typeof value === "object") {
    value = JSON.stringify(value);
  } else {
    value = null;
  }
  outputMessage = outputMessage.set("value", value);
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
      .map((m) => mapMessage(config, m))
      .tap((message) => {
        debugLogger(message, "Transformed message");
        if (this.metrics) {
          this.metrics.transformedCounter.inc();
        }
      })
      .to();
  }

  public run() {
    if (this.config.metrics && this.config.metrics.port && this.config.metrics.probeIntervalMs) {
      this.metrics = new Metrics(this.config.metrics);
      this.metrics.collect(this.app);
      this.app.get("/metrics", Metrics.exposeMetricsRequestHandler);

      this.app.get("/admin/healthcheck", (_, res) => {
        res.status(this.alive ? 200 : 503).end();
      });

      this.app.get("/admin/health", (_, res) => {
        res.status(200).json({
          status: this.alive ? "UP" : "DOWN",
          uptime: process.uptime(),
        });
      });

      this.app.listen(this.config.metrics.port, () => {
        debugLogger(`Service up @ http://localhost:${this.config.metrics.port}`);
      });
    }

    // @ts-ignore
    return this.stream.start({ outputKafkaConfig: this.config.producer })
      .catch((e: Error) => {
        this.alive = false;
        console.error(e);
        process.exit(1);
      });
  }
}
