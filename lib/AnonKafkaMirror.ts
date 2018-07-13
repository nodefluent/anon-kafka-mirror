"use strict";

import * as faker from "faker";
import { fromJS, List, Map } from "immutable";
import KafkaStreams from "kafka-streams";
import * as murmurhash from "murmurhash";
import { Logger, LoggerOptions } from "pino";

export interface IConfig {
  logger?: LoggerOptions;
  consumer: {
    noptions: {
      [key: string]: string;
    },
    tconf: {
      [key: string]: string;
    },
    logger?: Logger;
  };
  producer: {
    noptions: {
      [key: string]: string;
    },
    tconf: {
      [key: string]: string | number;
    },
    logger?: Logger;
  };
  topic: {
    name: string,
    newName?: string,
    key: {
      proxy: boolean,
      type?: string,
      format?: string,
    },
    proxy: string[],
    alter: Array<{
      name: string,
      type?: string,
      format?: string,
    }>,
  };
}

export const arrayMatch = new RegExp(/([^\[\*\]]*)((?:\[[\*\d+]\]\.?){0,})([^\[\*\]]*)/);

export const splitPath = (path: string) => {
  if (!path) {
    return [];
  }
  return path.split(".").map((p) => {
    try {
      const pathKey = parseInt(p, 10);
      if (isNaN(pathKey)) {
        return p;
      }
      return pathKey;
    } catch (e) {
      return p;
    }
  });
};

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
const isUUIDRegExp = new RegExp(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/, "i");
const hashUUID = (uuid: string): string => {
  if (!isUUIDRegExp.test(uuid)) {
    return uuid;
  }

  const firstPart = uuid.substr(0, 6);
  const hashedfirstPart = murmurhash.v3(firstPart, 0).toString().substr(0, 6);
  const lastPart = uuid.substr(-6, 6);
  const hashedlastPart = murmurhash.v3(firstPart, 0).toString().substr(0, 6);

  return uuid.replace(firstPart, hashedfirstPart).replace(lastPart, hashedlastPart);
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
  private stream: any = {};
  constructor(config: IConfig) {
    this.config = config;

    const kafkaStreams = new KafkaStreams(this.config.consumer);
    this.stream = kafkaStreams.getKStream();
    this.stream
      .from(config.topic.name)
      .mapJSONConvenience()
      .map((m) => mapMessage(config, m))
      .tap((message) => {
        if (config.consumer.logger && config.consumer.logger.debug) {
          config.producer.logger.debug(message, "Transformed message");
        }
      })
      .to();
  }

  public run() {
    this.stream.start({ outputKafkaConfig: this.config.producer });
  }
}
