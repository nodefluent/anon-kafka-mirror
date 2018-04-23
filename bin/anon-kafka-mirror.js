#!/usr/bin/env node

const program = require("commander");
const pino = require("pino");

const {AnonKafkaMirror} = require("./../index.js");
const config = require("./../config/default");
const pjson = require("./../package.json");

program
  .version(pjson.version)
  .option("-z, --zookeeper [string]", "Zookeeper Connection String")
  .option("-t, --topic [string]", "Kafka Topic")
  .option("-l, --loglevel [string]", "LogLevel (debug,info,warn,error)")
  .parse(process.argv);


if(program.topic){
  config.topic.name = program.topic;
}

if(program.loglevel){
  config.logger.level = program.loglevel;
}

if(config.logger){
  const logger = pino(config.logger);
  config.logger = logger;
  config.consumer.logger = logger.child({"stream": "consumer"});
  config.producer.logger = logger.child({"stream": "producer"});
}

const mirror = new AnonKafkaMirror(config);
mirror.run();
