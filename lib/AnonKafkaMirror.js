"use strict";

const {KafkaStreams} = require("kafka-streams");

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
    const topicName = config.topic.name;
    const consumerConfig = config.consumer;
    const producerConfig = config.producer;

    const consumerKafkaStreams = new KafkaStreams(consumerConfig);
    this.consumerStream = consumerKafkaStreams.getKStream();
    this.consumerStream
      .from(topicName)
      .mapJSONConvenience()
      .map(message => {
        message.topic = message.topic + "-env";
        return message;
      });

    const producerKafkaStreams = new KafkaStreams(producerConfig);
    this.producerStream = producerKafkaStreams.getKStream();
    this.producerStream.to();

    this.consumerStream.forEach(message => {
      console.log("consumed message", message.key);
      this.producerStream.writeToStream(message);
    });
  }

  async run() {
    await this.producerStream.start();
    //await this.consumerStream.start();
  }
}

module.exports = AnonKafkaMirror;
