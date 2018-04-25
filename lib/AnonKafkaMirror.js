"use strict";

const {KafkaStreams} = require("kafka-streams");
var faker = require("faker");
const { Map, fromJS } = require("immutable");

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
            .map(m => {
                const inputMessage = fromJS(m);
                config.consumer.logger.debug(inputMessage.toJS(), "Got message");
                let outputMessage = Map();
                outputMessage = outputMessage.set("offset", inputMessage.get("offset"));
                outputMessage = outputMessage.set("partition", inputMessage.get("partition"));
                outputMessage = outputMessage.set("timestamp", inputMessage.get("timestamp"));
                outputMessage = outputMessage.set("topic", config.topic.newName || inputMessage.get("topic"));

                if (config.topic.key && config.topic.key.proxy === false) {
                    if (config.topic.key.format){
                        const newKey = faker.fake(`{{${config.topic.key.format}}}`);
                        if (newKey) {
                            outputMessage = outputMessage.set("key", newKey);
                        }
                    }
                }
                if(!outputMessage.get("key")){
                    outputMessage = outputMessage.set("key", null);
                }

                if (!inputMessage.get("value") || typeof inputMessage.get("value") !== "object"){
                    outputMessage = outputMessage.set("value", inputMessage.get("value"));
                    return outputMessage.toJS();
                }
        
                if (config.topic.proxy && config.topic.proxy instanceof Array){
                    config.topic.proxy.forEach((key) => {
                        if (key && typeof key === "string") {
                            const keyPath = `value.${key}`.split(".");
                            const keyValue = inputMessage.getIn(keyPath);
                            if (keyValue){
                                outputMessage = outputMessage.setIn(keyPath, keyValue);
                            }
                        }
                    });
                }

                if (config.topic.alter && config.topic.alter instanceof Array) {
                    config.topic.alter.forEach((key) => {
                        if (key && key.name && key.type) {
                            const keyPath = `value.${key.name}`.split(".");
                            const keyValue = inputMessage.getIn(keyPath);
                            if (keyValue && key.format) {
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
            })
            .tap(message => {
                config.producer.logger.debug(message, "Transformed message");
            })
            .to();
    }

    run() {
        this.stream.start({ outputKafkaConfig: this.config.producer });
    }
}

module.exports = AnonKafkaMirror;
