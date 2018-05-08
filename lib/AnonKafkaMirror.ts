"use strict";

import * as faker from "faker";
import { fromJS, List, Map } from "immutable";
import KafkaStreams from "kafka-streams";
import { LoggerOptions, Logger } from "pino";

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

const splitPath = (path: string) => {
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

const parseArrayByKey = (key: string, map: Map<string, any>, s: string = "", inputMessage: Map<string, any>, format?: string) => {
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
                    map = parseArrayByKey(keyPath.join("."), map, suffix, inputMessage, format);
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
                                mapValue = faker.fake(`{{${format}}}`);
                            }
                            if (mapValue !== undefined) {
                                map = map.setIn(newListPath, mapValue);
                                newListIndex += 1;
                            }
                        } else {
                            if (format) {
                                keyValue = faker.fake(`{{${format}}}`);
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

const parseByKey = (key: string, map: Map<string, any>, inputMessage: Map<string, any>, format?: string) => {
    if (key && typeof key === "string") {
        if (!key.match(arrayMatch)[2]) {
            const keyPath = splitPath(key);
            let keyValue = inputMessage.getIn(keyPath);
            if (keyValue === null) {
                map = map.setIn(keyPath, null);
            } else if (keyValue !== undefined) {
                if (format) {
                    keyValue = faker.fake(`{{${format}}}`);
                }
                map = map.setIn(keyPath, keyValue);
            }
        } else {
            map = parseArrayByKey(key, map, undefined, inputMessage, format);
        }
    }
    return map;
};

export class AnonKafkaMirror {
    private config: IConfig = undefined;
    private stream: any = {};
    constructor(config: IConfig) {
        this.config = config;

        const kafkaStreams = new KafkaStreams(this.config.consumer);
        this.stream = kafkaStreams.getKStream();
        this.stream
            .from(config.topic.name)
            .mapJSONConvenience()
            .map(this.mapMessage)
            .tap((message) => {
                config.producer.logger.debug(message, "Transformed message");
            })
            .to();
    }

    public mapMessage(m) {
        const inputMessage = fromJS(m);
        this.config.consumer.logger.debug(inputMessage.toJS(), "Got message");
        let outputMessage = Map<string, any>();
        outputMessage = outputMessage.set("offset", inputMessage.get("offset"));
        outputMessage = outputMessage.set("partition", inputMessage.get("partition"));
        outputMessage = outputMessage.set("timestamp", inputMessage.get("timestamp"));
        outputMessage = outputMessage.set("topic", this.config.topic.newName || inputMessage.get("topic"));

        if (this.config.topic.key && this.config.topic.key.proxy === false) {
            if (this.config.topic.key.format) {
                const newKey = faker.fake(`{{${this.config.topic.key.format}}}`);
                if (newKey) {
                    outputMessage = outputMessage.set("key", newKey);
                }
            }
        }
        if (this.config.topic.key && this.config.topic.key.proxy) {
            outputMessage = outputMessage.set("key", inputMessage.get("key"));
        }
        if (!outputMessage.get("key")) {
            outputMessage = outputMessage.set("key", null);
        }

        if (!inputMessage.get("value") || typeof inputMessage.get("value") !== "object") {
            outputMessage = outputMessage.set("value", inputMessage.get("value"));
            return outputMessage.toJS();
        }

        if (this.config.topic.proxy && this.config.topic.proxy instanceof Array) {
            this.config.topic.proxy.forEach((key) => {
                outputMessage = parseByKey(`value.${key}`, outputMessage, inputMessage);
            });
        }

        if (this.config.topic.alter && this.config.topic.alter instanceof Array) {
            this.config.topic.alter.forEach((key) => {
                outputMessage = parseByKey(`value.${key.name}`, outputMessage, inputMessage, key.format);
            });
        }
        let value = outputMessage.get("value");
        if (value && typeof value === "object") {
            value = JSON.stringify(value);
        }
        outputMessage = outputMessage.set("value", value);
        return outputMessage.toJS();
    }
    public run() {
        this.stream.start({ outputKafkaConfig: this.config.producer });
    }
}
