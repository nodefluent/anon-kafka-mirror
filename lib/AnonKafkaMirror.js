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
                const message = fromJS(m);
                config.consumer.logger.info(message.toJS(), "Got message");
                let newMessage = Map();
                newMessage = newMessage.set("offset", message.get("offset"));
                newMessage = newMessage.set("partition", message.get("partition"));
                newMessage = newMessage.set("timestamp", message.get("timestamp"));
                newMessage = newMessage.set("topic", config.topic.newName || message.get("topic"));

                if (config.topic.key && config.topic.key.proxy === false) {
                    if (config.topic.key.format){
                        const newKey = faker.fake(`{{${config.topic.key.format}}}`);
                        if (newKey) {
                            newMessage = newMessage.set("key", newKey);
                        }
                    }
                }

                if (!message.get("value") || typeof message.get("value") !== "object"){
                    newMessage = newMessage.set("value", message.get("value"));
                    return newMessage.toJS();
                }
        
                if (config.topic.proxy && config.topic.proxy instanceof Array){
                    config.topic.proxy.forEach((key) => {
                        if (key && typeof key === "string") {
                            const keyPath = `value.${key}`.split(".");
                            const keyValue = message.getIn(keyPath);
                            if (keyValue){
                                newMessage = newMessage.setIn(keyPath, keyValue);
                            }
                        }
                    });
                }

                if (config.topic.alter && config.topic.alter instanceof Array) {
                    config.topic.alter.forEach((key) => {
                        if (key && key.name && key.type) {
                            const keyPath = `value.${key.name}`.split(".");
                            const keyValue = message.getIn(keyPath);
                            if (keyValue && key.format) {
                                newMessage = newMessage.setIn(keyPath, faker.fake(`{{${key.format}}}`));
                            }
                        }
                    });
                }

                return newMessage.toJS();
            })
            .tap(message => {
                config.producer.logger.info(message, "Transformed message");
            })
            .to();
    }

    run() {
        this.stream.start({ outputKafkaConfig: this.config.producer });
    }
}

module.exports = AnonKafkaMirror;
