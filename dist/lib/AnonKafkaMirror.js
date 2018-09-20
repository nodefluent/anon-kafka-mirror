"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var debug_1 = require("debug");
var express = require("express");
var faker = require("faker");
var immutable_1 = require("immutable");
var kafka_streams_1 = require("kafka-streams");
var Metrics_1 = require("./Metrics");
var utils_1 = require("./utils");
var debugLogger = debug_1.default("anon-kafka-mirror:mirror");
exports.fake = function (format, type) {
    if (format === "hashed.uuid") {
        return;
    }
    var value = faker.fake("{{" + format + "}}");
    if ((type === "number" || type === "integer") &&
        typeof value === "string" &&
        !isNaN(parseInt(value, 10))) {
        value = parseInt(value, 10);
    }
    return value;
};
var parseArrayByKey = function (key, map, s, inputMessage, format, type) {
    if (s === void 0) { s = ""; }
    var keyPathMatch = key.match(utils_1.arrayMatch);
    var prefix = keyPathMatch[1];
    var suffix = s || keyPathMatch[3];
    if (prefix) {
        var prefixPath_1 = utils_1.splitPath(prefix);
        var keyArray = inputMessage.getIn(prefixPath_1);
        if (immutable_1.List.isList(keyArray)) {
            map = map.setIn(prefixPath_1, immutable_1.List());
            var newListIndex_1 = 0;
            keyArray.forEach(function (v, i) {
                var keyPath = prefixPath_1.concat([i]);
                var newListPath = prefixPath_1.concat([newListIndex_1]);
                var prefixValue = inputMessage.getIn(keyPath);
                if (immutable_1.List.isList(prefixValue)) {
                    map = parseArrayByKey(keyPath.join("."), map, suffix, inputMessage, format, type);
                }
                else {
                    if (suffix) {
                        keyPath = keyPath.concat(utils_1.splitPath(suffix));
                        newListPath = newListPath.concat(utils_1.splitPath(suffix));
                    }
                    var keyValue = inputMessage.getIn(keyPath);
                    if (keyValue === null) {
                        map = map.setIn(newListPath, null);
                        newListIndex_1 += 1;
                    }
                    else if (keyValue !== undefined) {
                        if (immutable_1.Map.isMap(keyValue)) {
                            var mapValue = keyValue.getIn(utils_1.splitPath(suffix));
                            if (format) {
                                mapValue = exports.fake(format, type);
                            }
                            if (mapValue !== undefined) {
                                map = map.setIn(newListPath, mapValue);
                                newListIndex_1 += 1;
                            }
                        }
                        else {
                            if (format) {
                                keyValue = exports.fake(format, type);
                            }
                            map = map.setIn(newListPath, keyValue);
                            newListIndex_1 += 1;
                        }
                    }
                }
            });
        }
    }
    return map;
};
var parseByKey = function (key, map, inputMessage, format, type) {
    if (key && typeof key === "string") {
        if (!key.match(utils_1.arrayMatch)[2]) {
            var keyPath = utils_1.splitPath(key);
            var keyValue = inputMessage.getIn(keyPath);
            if (keyValue === null) {
                map = map.setIn(keyPath, null);
            }
            else if (keyValue !== undefined) {
                if (format) {
                    if (format === "hashed.uuid") {
                        keyValue = utils_1.hashUUID(keyValue);
                    }
                    else {
                        keyValue = exports.fake(format, type);
                    }
                }
                map = map.setIn(keyPath, keyValue);
            }
        }
        else {
            map = parseArrayByKey(key, map, undefined, inputMessage, format, type);
        }
    }
    return map;
};
exports.mapMessage = function (config, m) {
    var inputMessage = immutable_1.fromJS(m);
    if (config.consumer && config.consumer.logger && config.consumer.logger.debug) {
        config.consumer.logger.debug(inputMessage.toJS(), "Got message");
    }
    var outputMessage = immutable_1.Map();
    if (inputMessage.get("offset")) {
        outputMessage = outputMessage.set("offset", inputMessage.get("offset"));
    }
    if (inputMessage.get("partition")) {
        outputMessage = outputMessage.set("partition", inputMessage.get("partition"));
    }
    if (inputMessage.get("timestamp")) {
        outputMessage = outputMessage.set("timestamp", inputMessage.get("timestamp"));
    }
    if (config.topic.newName || inputMessage.get("topic")) {
        outputMessage = outputMessage.set("topic", config.topic.newName || inputMessage.get("topic"));
    }
    if (config.topic.key && config.topic.key.proxy === false) {
        if (config.topic.key.format) {
            var newKey = exports.fake(config.topic.key.format, config.topic.key.type);
            if (newKey) {
                outputMessage = outputMessage.set("key", newKey);
            }
        }
    }
    if (config.topic.key && config.topic.key.proxy) {
        outputMessage = outputMessage.set("key", inputMessage.get("key"));
    }
    if (!outputMessage.get("key")) {
        outputMessage = outputMessage.set("key", null);
    }
    if (!inputMessage.get("value") || typeof inputMessage.get("value") !== "object") {
        var v = inputMessage.get("value") === undefined ? null : inputMessage.get("value");
        outputMessage = outputMessage.set("value", v);
        return outputMessage.toJS();
    }
    if (inputMessage.get("value").size === 0) {
        outputMessage = outputMessage.set("value", "{}");
        return outputMessage.toJS();
    }
    if (config.topic.proxy && config.topic.proxy instanceof Array) {
        config.topic.proxy.forEach(function (key) {
            outputMessage = parseByKey("value." + key, outputMessage, inputMessage);
        });
    }
    if (config.topic.alter && config.topic.alter instanceof Array) {
        config.topic.alter.forEach(function (key) {
            outputMessage = parseByKey("value." + key.name, outputMessage, inputMessage, key.format, key.type);
        });
    }
    var value = outputMessage.get("value");
    if (!value && inputMessage.get("value").size) {
        value = "{}";
    }
    else if (typeof value === "object") {
        value = JSON.stringify(value);
    }
    else {
        value = null;
    }
    outputMessage = outputMessage.set("value", value);
    return outputMessage.toJS();
};
var AnonKafkaMirror = (function () {
    function AnonKafkaMirror(config) {
        var _this = this;
        this.config = undefined;
        this.config = config;
        this.app = express();
        this.metrics = null;
        this.alive = true;
        var kafkaStreams = new kafka_streams_1.KafkaStreams(this.config.consumer);
        this.stream = kafkaStreams.getKStream();
        this.stream
            .from(config.topic.name)
            .mapJSONConvenience()
            .map(function (m) { return exports.mapMessage(config, m); })
            .tap(function (message) {
            debugLogger(message, "Transformed message");
            if (_this.metrics) {
                _this.metrics.transformedCounter.inc();
            }
        })
            .to();
    }
    AnonKafkaMirror.prototype.run = function () {
        var _this = this;
        if (this.config.metrics && this.config.metrics.port && this.config.metrics.probeIntervalMs) {
            this.metrics = new Metrics_1.default(this.config.metrics);
            this.metrics.collect(this.app);
            this.app.get("/metrics", Metrics_1.default.exposeMetricsRequestHandler);
            this.app.get("/admin/healthcheck", function (_, res) {
                res.status(_this.alive ? 200 : 503).end();
            });
            this.app.get("/admin/health", function (_, res) {
                res.status(200).json({
                    status: _this.alive ? "UP" : "DOWN",
                    uptime: process.uptime(),
                });
            });
            this.app.listen(this.config.metrics.port, function () {
                debugLogger("Service up @ http://localhost:" + _this.config.metrics.port);
            });
        }
        return this.stream.start({ outputKafkaConfig: this.config.producer })
            .catch(function (e) {
            _this.alive = false;
            console.error(e);
            process.exit(1);
        });
    };
    return AnonKafkaMirror;
}());
exports.AnonKafkaMirror = AnonKafkaMirror;
//# sourceMappingURL=AnonKafkaMirror.js.map