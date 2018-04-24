#!/usr/bin/env node

const program = require("commander");
const pino = require("pino");
const fs = require("fs");
const path = require("path");

const {AnonKafkaMirror} = require("./../index.js");
const pjson = require("./../package.json");
let config = require("./../config/default");

program
    .version(pjson.version)
    .option("-b, --consume-broker-list [string]", "The broker list string to consumer in the form HOST1:PORT1,HOST2:PORT2.")
    .option("-p, --produce-broker-list [string]", "The broker list string to produce in the form HOST1:PORT1,HOST2:PORT2.")
    .option("-t, --consume-topic [string]", "Kafka topic to consume.")
    .option("-n, --produce-topic [string]", "Kafka topic to produce.")
    .option("-c, --config-file [string]", "Anon kafka config file.")
    .option("-f, --topic-config-file [string]", "Anon kafka topic config file.")
    .option("-l, --level [string]", "Log level (debug,info,warn,error)")
    .parse(process.argv);

if (program.configFile && fs.existsSync(program.configFile)) {
    try {
        config = require(path.resolve(program.configFile));
    } catch(e) {
        console.error("Could not read config file", e);
    }
}

if (program.topicConfigFile && fs.existsSync(program.topicConfigFile)) {
    try {
        config.topic = require(path.resolve(program.topicConfigFile));
    } catch (e) {
        console.error("Could not read config file", e);
    }
}

if(program.topic){
    config.topic.name = program.topic;
}

if (program.newTopic) {
    config.topic.newName = program.newTopic;
}

if(config.logger){
    if (program.loglevel) {
        config.logger.level = program.loglevel;
    }
    const logger = pino(config.logger);
    config.logger = logger;
    config.consumer.logger = logger.child({"stream": "consumer"});
    config.producer.logger = logger.child({"stream": "producer"});
}

const mirror = new AnonKafkaMirror(config);
mirror.run();
