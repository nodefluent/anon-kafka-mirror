#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var commanderProgram = require("commander");
var debug_1 = require("debug");
var fs_1 = require("fs");
var path_1 = require("path");
var pino = require("pino");
var AnonKafkaMirror_1 = require("./lib/AnonKafkaMirror");
var default_1 = require("./lib/config/default");
var utils_1 = require("./lib/utils");
var localConfig = default_1.default;
var debugLogger = debug_1.default("anon-kafka-mirror:cli");
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
    debugLogger("Got config file", commanderProgram.configFile);
    try {
        localConfig = require(path_1.resolve(commanderProgram.configFile));
    }
    catch (e) {
        console.error("Could not read config file", e);
    }
}
debugLogger("Loaded config file", utils_1.clearConfig(localConfig));
if (commanderProgram.topicConfigFile && fs_1.existsSync(commanderProgram.topicConfigFile)) {
    debugLogger("Got topic config file", commanderProgram.topicConfigFile);
    try {
        var data = fs_1.readFileSync(path_1.resolve(commanderProgram.topicConfigFile));
        localConfig.topic = JSON.parse(data.toString());
    }
    catch (e) {
        console.error("Could not read config file", e);
    }
}
debugLogger("Loaded topic config file", localConfig.topic);
if (!localConfig.topic ||
    !localConfig.consumer || !localConfig.consumer.noptions ||
    !localConfig.producer || !localConfig.producer.noptions) {
    console.error("Config file does not contains topic, consumer or producer configurations.");
    console.error("Config:", localConfig);
    commanderProgram.help();
}
if (commanderProgram.consumerGroup) {
    debugLogger("Rewrite consumer group from arg", commanderProgram.consumerGroup);
    localConfig.consumer.noptions["group.id"] = commanderProgram.consumerGroup;
    localConfig.producer.noptions["group.id"] = commanderProgram.consumerGroup;
}
if (commanderProgram.consumerBrokerList) {
    debugLogger("Rewrite consumer broker list from arg", commanderProgram.consumerBrokerList);
    localConfig.consumer.noptions["metadata.broker.list"] = commanderProgram.consumerBrokerList;
}
if (!localConfig.consumer.noptions["metadata.broker.list"]) {
    console.error("Consumer broker list is required.");
    commanderProgram.help();
}
if (commanderProgram.producerBrokerList) {
    debugLogger("Rewrite producer broker list from arg", commanderProgram.producerBrokerList);
    localConfig.producer.noptions["metadata.broker.list"] = commanderProgram.producerBrokerList;
}
if (!localConfig.producer.noptions["metadata.broker.list"]) {
    console.error("Producer broker list is required.");
    commanderProgram.help();
}
if (commanderProgram.consumerTopic) {
    debugLogger("Rewrite consumer topic name from arg", commanderProgram.consumerTopic);
    localConfig.topic.name = commanderProgram.consumerTopic;
}
if (!localConfig.topic.name) {
    console.error("Topic name is required.");
    commanderProgram.help();
}
if (commanderProgram.producerTopic) {
    debugLogger("Rewrite producer topic name from arg", commanderProgram.producerTopic);
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
debugLogger("Initialize with config", utils_1.clearConfig(localConfig));
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
    debugLogger("Start mirror");
    mirror.run();
}
//# sourceMappingURL=index.js.map