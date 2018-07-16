#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var commanderProgram = require("commander");
var fs_1 = require("fs");
var path_1 = require("path");
var pino = require("pino");
var AnonKafkaMirror_1 = require("./lib/AnonKafkaMirror");
var default_1 = require("./lib/config/default");
var localConfig = default_1.default;
commanderProgram
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
if (commanderProgram.configFile && fs_1.existsSync(commanderProgram.configFile)) {
    try {
        localConfig = require(path_1.resolve(commanderProgram.configFile));
    }
    catch (e) {
        console.error("Could not read config file", e);
    }
}
if (commanderProgram.topicConfigFile && fs_1.existsSync(commanderProgram.topicConfigFile)) {
    try {
        var data = fs_1.readFileSync(path_1.resolve(commanderProgram.topicConfigFile));
        localConfig.topic = JSON.parse(data.toString());
    }
    catch (e) {
        console.error("Could not read config file", e);
    }
}
if (!localConfig.topic ||
    !localConfig.consumer || !localConfig.consumer.noptions ||
    !localConfig.producer || !localConfig.producer.noptions) {
    console.error("Config file does not contains topic, consumer or producer configurations.");
    console.error("Config:", localConfig);
    commanderProgram.help();
}
if (commanderProgram.consumerGroup) {
    localConfig.consumer.noptions["group.id"] = commanderProgram.consumerGroup;
    localConfig.producer.noptions["group.id"] = commanderProgram.consumerGroup;
}
if (commanderProgram.consumerBrokerList) {
    localConfig.consumer.noptions["metadata.broker.list"] = commanderProgram.consumerBrokerList;
}
if (!localConfig.consumer.noptions["metadata.broker.list"]) {
    console.error("Consumer broker list is required.");
    commanderProgram.help();
}
if (commanderProgram.producerBrokerList) {
    localConfig.producer.noptions["metadata.broker.list"] = commanderProgram.producerBrokerList;
}
if (!localConfig.producer.noptions["metadata.broker.list"]) {
    console.error("Producer broker list is required.");
    commanderProgram.help();
}
if (commanderProgram.consumerTopic) {
    localConfig.topic.name = commanderProgram.consumerTopic;
}
if (!localConfig.topic.name) {
    console.error("Topic name is required.");
    commanderProgram.help();
}
if (commanderProgram.producerTopic) {
    localConfig.topic.newName = commanderProgram.producerTopic;
}
if (localConfig.logger) {
    if (commanderProgram.loglevel) {
        localConfig.logger.level = commanderProgram.loglevel;
    }
    var logger = pino(localConfig.logger);
    localConfig.consumer.logger = logger.child({ stream: "consumer" });
    localConfig.producer.logger = logger.child({ stream: "producer" });
}
var mirror = new AnonKafkaMirror_1.AnonKafkaMirror(localConfig);
if (commanderProgram.dryRun) {
    var stdin = process.stdin;
    var stdout_1 = process.stdout;
    var inputChunks_1 = [];
    stdin.resume();
    stdin.setEncoding("utf8");
    stdin.on("data", function (chunk) {
        inputChunks_1.push(chunk);
    });
    stdin.on("end", function () {
        try {
            var inputJSON = inputChunks_1.join();
            var parsedData = JSON.parse(inputJSON);
            var mappedJSON = AnonKafkaMirror_1.mapMessage(localConfig, parsedData);
            var outputJSON = JSON.stringify(mappedJSON, null, "    ");
            stdout_1.write(outputJSON);
            stdout_1.write("\n");
        }
        catch (e) {
            console.log("Could not map message: ", e);
        }
        process.exit(0);
    });
}
else {
    mirror.run();
}
//# sourceMappingURL=index.js.map