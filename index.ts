#!/usr/bin/env node

import * as commanderProgram from "commander";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import * as pino from "pino";
import { AnonKafkaMirror, mapMessage } from "./lib/AnonKafkaMirror";
import config from "./lib/config/default";
let localConfig = config;

commanderProgram
    .option("-b, --consumer-broker-list [string]",
        "The broker list string to consumer in the form HOST1:PORT1,HOST2:PORT2.")
    .option("-p, --producer-broker-list [string]",
        "The broker list string to produce in the form HOST1:PORT1,HOST2:PORT2.")
    .option("-t, --consumer-topic [string]", "Kafka topic to consume.")
    .option("-n, --producer-topic [string]", "Kafka topic to produce.")
    .option("-g, --consumer-group [string]", "Kafka consumer group.")
    .option("-c, --config-file [string]", "Anon kafka config file.")
    .option("-f, --topic-config-file [string]", "Anon kafka topic config file.")
    .option("-l, --level [string]", "Log level (debug,info,warn,error)")
    .option("-d, --dry-run", "Just read message from stdin, convert, print output and exit.")
    .parse(process.argv);

if (commanderProgram.configFile && existsSync(commanderProgram.configFile)) {
    try {
        // tslint:disable-next-line
        localConfig = require(resolve(commanderProgram.configFile)) as any;
    } catch (e) {
        console.error("Could not read config file", e);
    }
}

if (commanderProgram.topicConfigFile && existsSync(commanderProgram.topicConfigFile)) {
    try {
        const data = readFileSync(resolve(commanderProgram.topicConfigFile));
        localConfig.topic = JSON.parse(data.toString());
    } catch (e) {
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
    const logger = pino(localConfig.logger);
    localConfig.consumer.logger = logger.child({ stream: "consumer" });
    localConfig.producer.logger = logger.child({ stream: "producer" });
}

const mirror = new AnonKafkaMirror(localConfig);

if (commanderProgram.dryRun) {
    const stdin = process.stdin;
    const stdout = process.stdout;
    const inputChunks = [];
    stdin.resume();
    stdin.setEncoding("utf8");
    stdin.on("data", (chunk) => {
        inputChunks.push(chunk);
    });
    stdin.on("end", () => {
        try {
            const inputJSON = inputChunks.join();
            const parsedData = JSON.parse(inputJSON);
            const mappedJSON = mapMessage(localConfig, parsedData);
            const outputJSON = JSON.stringify(mappedJSON, null, "    ");
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
