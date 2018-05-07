#!/usr/bin/env node

const commander = require("commander");
const pino = require("pino");
const fs = require("fs");
const path = require("path");

const {AnonKafkaMirror} = require("./../index.js");
const pjson = require("./../package.json");
let config = require("./../config/default");

commander
    .version(pjson.version)
    .option("-b, --consumer-broker-list [string]", "The broker list string to consumer in the form HOST1:PORT1,HOST2:PORT2.")
    .option("-p, --producer-broker-list [string]", "The broker list string to produce in the form HOST1:PORT1,HOST2:PORT2.")
    .option("-t, --consumer-topic [string]", "Kafka topic to consume.")
    .option("-n, --producer-topic [string]", "Kafka topic to produce.")
    .option("-g, --consumer-group [string]", "Kafka consumer group.")
    .option("-c, --config-file [string]", "Anon kafka config file.")
    .option("-f, --topic-config-file [string]", "Anon kafka topic config file.")
    .option("-l, --level [string]", "Log level (debug,info,warn,error)")
    .option("-d, --dry-run", "Just read message from stdin, convert, print output and exit.")
    .parse(process.argv);

if (commander.configFile && fs.existsSync(commander.configFile)) {
    try {
        config = require(path.resolve(commander.configFile));
    } catch(e) {
        console.error("Could not read config file", e);
    }
}

if (commander.topicConfigFile && fs.existsSync(commander.topicConfigFile)) {
    try {
        config.topic = require(path.resolve(commander.topicConfigFile));
    } catch (e) {
        console.error("Could not read config file", e);
    }
}

if (!config.topic ||
    !config.consumer || !config.consumer.noptions || 
    !config.producer || !config.producer.noptions) {
    console.error("Config file does not contains topic, consumer or producer configurations.");
    commander.help();
}

if(commander.consumerGroup) {
    config.consumer.noptions["group.id"] = commander.consumerGroup;
    config.producer.noptions["group.id"] = commander.consumerGroup;
}

if (commander.consumerBrokerList) {
    config.consumer.noptions["metadata.broker.list"] = commander.consumerBrokerList;
}

if (!config.consumer.noptions["metadata.broker.list"]) {
    console.error("Consumer broker list is required.");
    commander.help();
}

if (commander.producerBrokerList) {
    config.producer.noptions["metadata.broker.list"] = commander.producerBrokerList;
}

if (!config.producer.noptions["metadata.broker.list"]) {
    console.error("Producer broker list is required.");
    commander.help();
}

if(commander.consumerTopic){
    config.topic.name = commander.consumerTopic;
}

if (!config.topic.name) {
    console.error("Topic name is required.");
    commander.help();
}

if (commander.producerTopic) {
    config.topic.newName = commander.producerTopic;
}

if(config.logger){
    if (commander.loglevel) {
        config.logger.level = commander.loglevel;
    }
    const logger = pino(config.logger);
    config.logger = logger;
    config.consumer.logger = logger.child({"stream": "consumer"});
    config.producer.logger = logger.child({"stream": "producer"});
}

const mirror = new AnonKafkaMirror(config);

if (commander.dryRun) {
    const stdin = process.stdin;
    const stdout = process.stdout;
    const inputChunks = [];
    stdin.resume();
    stdin.setEncoding("utf8");
    stdin.on("data", function (chunk) {
        inputChunks.push(chunk);
    });
    stdin.on("end", function () {
        try {
            const inputJSON = inputChunks.join();
            const parsedData = JSON.parse(inputJSON);
            const mappedJSON = mirror.mapMessage(parsedData);
            const outputJSON = JSON.stringify(mappedJSON, null, 4);
            stdout.write(outputJSON);
            stdout.write("\n");
        } catch (e) {
            console.log("Could not map message: ", e);
        }
        process.exit(0);
    });
} else {
    mirror.run();
}
