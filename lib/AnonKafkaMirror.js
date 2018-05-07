"use strict";

const {KafkaStreams} = require("kafka-streams");
const faker = require("faker");
const {
    Map,
    fromJS,
    List,
} = require("immutable");

const arrayMatch = new RegExp(/([^\[\*\]]*)((?:\[[\*\d+]\]\.?){0,})([^\[\*\]]*)/); //eslint-disable-line

class AnonKafkaMirror {
    /**
   * @param {Object} config
   * @param {Object} config.topic
   * @param {string} config.topic.name
   * @param {Object} consumerConfig
   * @param {Object} consumerConfig.noptions
   * @param {Object} producerConfig
   * @param {Object} producerConfig.noptions
   */
    constructor(config) {
        this.config = config;

        const kafkaStreams = new KafkaStreams(this.config.consumer);
        this.stream = kafkaStreams.getKStream();
        this.stream
            .from(config.topic.name)
            .mapJSONConvenience()
            .map(this.mapMessage)
            .tap(message => {
                config.producer.logger.debug(message, "Transformed message");
            })
            .to();
    }

    mapMessage(m) {
        const inputMessage = fromJS(m);
        this.config.consumer.logger.debug(inputMessage.toJS(), "Got message");
        let outputMessage = Map();
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
        const splitPath = (path) => {
            if(!path){
                return [];
            }
            return path.split(".").map(p => {
                try{
                    const pathKey = parseInt(p);
                    if (isNaN(pathKey)){
                        return p;
                    }
                    return pathKey;
                } catch(e){
                    return p;
                }
            }); 
        };
        const parseArrayByKey = (key, map, s = "") => {
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
                        if (List.isList(prefixValue)){
                            map = parseArrayByKey(keyPath.join("."), map, suffix);
                        } else {
                            if (suffix) {
                                keyPath = keyPath.concat(splitPath(suffix));
                                newListPath = newListPath.concat(splitPath(suffix));
                            }
                            const keyValue = inputMessage.getIn(keyPath);
                            if (keyValue === null) {
                                map = map.setIn(newListPath, null);
                                newListIndex += 1;
                            } else if (keyValue !== undefined) {
                                if (Map.isMap(keyValue)) {
                                    const mapValue = keyValue.getIn(splitPath(suffix));
                                    if (mapValue !== undefined) {
                                        map = map.setIn(newListPath, mapValue); // TODO make it recursive
                                        newListIndex += 1;
                                    }
                                } else {
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
        const parseByKey = (key, map) => {
            if (key && typeof key === "string") {
                if (!key.match(arrayMatch)[2]) {
                    const keyPath = splitPath(key);
                    const keyValue = inputMessage.getIn(keyPath);
                    if (keyValue === null) {
                        map = map.setIn(keyPath, null);
                    } else if (keyValue !== undefined) {
                        map = map.setIn(keyPath, keyValue);
                    }
                } else {
                    map = parseArrayByKey(key, map);
                }
            }
            return map;
        };

        if (this.config.topic.proxy && this.config.topic.proxy instanceof Array) {
            this.config.topic.proxy.forEach((key) => {
                outputMessage = parseByKey(`value.${key}`, outputMessage);
            });
        }

        if (this.config.topic.alter && this.config.topic.alter instanceof Array) {
            this.config.topic.alter.forEach((key) => {
                if (key && key.name && key.type) {
                    const keyPath = splitPath(`value.${key.name}`);
                    const keyValue = inputMessage.getIn(keyPath);
                    if (keyValue === null) {
                        outputMessage = outputMessage.setIn(keyPath, null);
                    } else if (keyValue !== undefined && key.format) {
                        outputMessage = outputMessage.setIn(keyPath, faker.fake(`{{${key.format}}}`));
                    }
                }
            });
        }
        let value = outputMessage.get("value");
        if (value && typeof value === "object") {
            value = JSON.stringify(value);
        }
        outputMessage = outputMessage.set("value", value);
        return outputMessage.toJS();
    }
    run() {
        this.stream.start({ outputKafkaConfig: this.config.producer });
    }
}

module.exports = AnonKafkaMirror;
