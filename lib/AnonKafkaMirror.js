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
    this.consumerStream = consumerKafkaStreams.getKStream(topicName);

    const producerKafkaStreams = new KafkaStreams(producerConfig);
    this.producerStream = producerKafkaStreams.getKStream(topicName);

  }

  run() {
    this.consumerStream.forEach(message => {
      console.log("consumed message", message);
      this.producerStream.writeToStream(message);
    });

    this.consumerStream.start(null, e => console.error(e));
    this.producerStream.start(null, e => console.error(e));
  }
}

module.exports = AnonKafkaMirror;
