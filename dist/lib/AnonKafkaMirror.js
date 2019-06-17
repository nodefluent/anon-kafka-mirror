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
var fake = function (format, type) {
    if (format === "hashed.uuid" ||
        format === "hashed.string" ||
        format === "hashed.alphanumerical" ||
        format === "hashed.queryParam" ||
        format === "luhn.string") {
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
var transform = function (format, keyValue, type, ignoreLeft, ignoreRight, paramName, paramFormat, upperCase, prefixLength, prefix) {
    switch (format) {
        case "hashed.uuid":
            return utils_1.hashUUID(keyValue);
        case "hashed.string":
            return utils_1.hashString(keyValue, ignoreLeft, ignoreRight);
        case "hashed.queryParam":
            return utils_1.hashQueryParam(keyValue, paramName, paramFormat);
        case "hashed.alphanumerical":
            return utils_1.hashAlphanumerical(keyValue, ignoreLeft, upperCase);
        case "luhn.string":
            return utils_1.hashLuhnString(keyValue, prefixLength, prefix);
        default:
            return fake(format, type);
    }
};
var parseArrayByKey = function (key, inputMessage, outputMessage, format, type, ignoreLeft, ignoreRight, paramName, paramFormat, upperCase, prefixLength, prefix) {
    var _a;
    var _b = utils_1.isArrayPath(key), isArray = _b[0], keyPrefix = _b[1], suffix = _b[2];
    if (!isArray) {
        throw new Error("Path " + key + " is treated as an array path, but no array indexer was found.");
    }
    var isSubArray;
    var suffixPrefix;
    var suffixSuffix;
    if (suffix) {
        _a = utils_1.isArrayPath(suffix), isSubArray = _a[0], suffixPrefix = _a[1], suffixSuffix = _a[2];
    }
    var prefixPath = utils_1.splitPath(keyPrefix);
    var keyArray = inputMessage.getIn(prefixPath);
    if (immutable_1.List.isList(keyArray)) {
        if (!outputMessage.hasIn(prefixPath)) {
            outputMessage = outputMessage.setIn(prefixPath, immutable_1.List());
        }
        keyArray.forEach(function (v, i) {
            var keyPath = prefixPath.concat([i]);
            var newListPath = prefixPath.concat([i]);
            if (isSubArray && suffixPrefix) {
                keyPath = keyPath.concat([suffixPrefix]);
                newListPath = newListPath.concat([suffixPrefix]);
            }
            var prefixValue = inputMessage.getIn(keyPath);
            if (immutable_1.List.isList(prefixValue)) {
                outputMessage = parseArrayByKey("" + keyPath.join(".") + (isSubArray ? "[*]" + (suffixSuffix || "") : suffix), inputMessage, outputMessage, format, type, ignoreLeft, ignoreRight, paramName, paramFormat, upperCase, prefixLength, prefix);
            }
            else {
                if (suffix) {
                    keyPath = keyPath.concat(utils_1.splitPath(suffix));
                    newListPath = newListPath.concat(utils_1.splitPath(suffix));
                }
                var keyValue = inputMessage.getIn(keyPath);
                if (keyValue === null) {
                    outputMessage = outputMessage.setIn(newListPath, null);
                }
                else if (keyValue !== undefined) {
                    if (immutable_1.Map.isMap(keyValue)) {
                        var mapValue = keyValue.getIn(utils_1.splitPath(suffix));
                        mapValue = transform(format, mapValue, type, ignoreLeft, ignoreRight, paramName, paramFormat, upperCase, prefixLength, prefix);
                        if (mapValue !== undefined) {
                            outputMessage = outputMessage.setIn(newListPath, mapValue);
                        }
                    }
                    else if (immutable_1.List.isList(keyValue)) {
                        var joinedKeyPath = keyPath.join(".");
                        var newKey = joinedKeyPath + key.substr(joinedKeyPath.length + (2 - i.toString().length));
                        outputMessage = parseArrayByKey(newKey, inputMessage, outputMessage, format, type, ignoreLeft, ignoreRight, paramName, paramFormat, upperCase, prefixLength, prefix);
                    }
                    else {
                        keyValue = transform(format, keyValue, type, ignoreLeft, ignoreRight, paramName, paramFormat, upperCase, prefixLength, prefix);
                        outputMessage = outputMessage.setIn(newListPath, keyValue);
                    }
                }
            }
        });
    }
    return outputMessage;
};
var proxyByKey = function (key, inputMessage, outputMessage) {
    var isArray = utils_1.isArrayPath(key)[0];
    if (!isArray) {
        var keyPath = utils_1.splitPath(key);
        var keyValue = inputMessage.getIn(keyPath);
        if (keyValue !== undefined) {
            outputMessage = outputMessage.setIn(keyPath, keyValue);
        }
    }
    else {
        outputMessage = proxyArrayByKey(key, inputMessage, outputMessage);
    }
    return outputMessage;
};
var proxyArrayByKey = function (key, inputMessage, outputMessage) {
    var _a;
    var _b = utils_1.isArrayPath(key), isArray = _b[0], keyPrefix = _b[1], suffix = _b[2];
    if (!isArray) {
        throw new Error("Path " + key + " is treated as an array path, but no array indexer was found.");
    }
    var isSubArray;
    var suffixPrefix;
    var suffixSuffix;
    if (suffix) {
        _a = utils_1.isArrayPath(suffix), isSubArray = _a[0], suffixPrefix = _a[1], suffixSuffix = _a[2];
    }
    var prefixPath = utils_1.splitPath(keyPrefix);
    var keyArray = inputMessage.getIn(prefixPath);
    if (!keyArray) {
        return outputMessage;
    }
    if (!immutable_1.List.isList(keyArray)) {
        throw new Error("Path " + prefixPath + " is treated as an array, but no array found in this path.");
    }
    if (!outputMessage.hasIn(prefixPath)) {
        outputMessage = outputMessage.setIn(prefixPath, immutable_1.List());
    }
    keyArray.forEach(function (v, i) {
        var keyPath = prefixPath.concat([i]);
        var newListPath = prefixPath.concat([i]);
        if (isSubArray && suffixPrefix) {
            keyPath = keyPath.concat([suffixPrefix]);
            newListPath = newListPath.concat([suffixPrefix]);
        }
        var prefixValue = inputMessage.getIn(keyPath);
        if (immutable_1.List.isList(prefixValue)) {
            outputMessage = proxyArrayByKey("" + keyPath.join(".") + (isSubArray ? "[*]" + (suffixSuffix || "") : suffix), inputMessage, outputMessage);
        }
        else {
            if (suffix) {
                keyPath = keyPath.concat(utils_1.splitPath(suffix));
                newListPath = newListPath.concat(utils_1.splitPath(suffix));
            }
            var keyValue = inputMessage.getIn(keyPath);
            if (keyValue === null) {
                outputMessage = outputMessage.setIn(newListPath, null);
            }
            else if (keyValue !== undefined) {
                if (immutable_1.Map.isMap(keyValue)) {
                    var mapValue = keyValue.getIn(utils_1.splitPath(suffix));
                    if (mapValue !== undefined) {
                        outputMessage = outputMessage.setIn(newListPath, mapValue);
                    }
                }
                else if (immutable_1.List.isList(keyValue)) {
                    var joinedKeyPath = keyPath.join(".");
                    var newKey = joinedKeyPath + key.substr(joinedKeyPath.length + (2 - i.toString().length));
                    outputMessage = proxyArrayByKey(newKey, inputMessage, outputMessage);
                }
                else {
                    outputMessage = outputMessage.setIn(newListPath, keyValue);
                }
            }
        }
    });
    return outputMessage;
};
var parseByKey = function (key, outputMessage, inputMessage, format, type, ignoreLeft, ignoreRight, upperCase, prefixLength, prefix, paramName, paramFormat) {
    var isArray = utils_1.isArrayPath(key)[0];
    if (!isArray) {
        var keyPath = utils_1.splitPath(key);
        var keyValue = inputMessage.getIn(keyPath);
        if (keyValue === null) {
            outputMessage = outputMessage.setIn(keyPath, null);
        }
        else if (keyValue !== undefined) {
            keyValue = transform(format, keyValue, type, ignoreLeft, ignoreRight, paramName, paramFormat, upperCase, prefixLength, prefix);
            outputMessage = outputMessage.setIn(keyPath, keyValue);
        }
    }
    else {
        outputMessage = parseArrayByKey(key, inputMessage, outputMessage, format, type, ignoreLeft, ignoreRight, paramName, paramFormat, upperCase, prefixLength, prefix);
    }
    return outputMessage;
};
exports.mapMessage = function (config, jsonMessage) {
    var inputMessage = immutable_1.fromJS(jsonMessage);
    var outputMessage = immutable_1.Map();
    if (inputMessage.has("offset")) {
        outputMessage = outputMessage.set("offset", inputMessage.get("offset"));
    }
    if (inputMessage.has("partition")) {
        outputMessage = outputMessage.set("partition", inputMessage.get("partition"));
    }
    if (inputMessage.has("timestamp")) {
        outputMessage = outputMessage.set("timestamp", inputMessage.get("timestamp"));
    }
    if (config.newName || inputMessage.has("topic")) {
        outputMessage = outputMessage.set("topic", config.newName || inputMessage.get("topic"));
    }
    outputMessage = mapMessageKey(config, inputMessage, outputMessage);
    outputMessage = mapMessageValue(config, inputMessage, outputMessage);
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
            .map(function (m) { return exports.mapMessage(config.topic, m); })
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
        this.app.get("/admin/healthcheck", function (_, res) {
            res.status(_this.alive ? 200 : 503).end();
        });
        this.app.get("/admin/health", function (_, res) {
            res.status(200).json({
                status: _this.alive ? "UP" : "DOWN",
                uptime: process.uptime(),
            });
        });
        if (this.config.metrics && this.config.metrics.port && this.config.metrics.probeIntervalMs) {
            this.metrics = new Metrics_1.default(this.config.metrics);
            this.metrics.collect(this.app);
            this.app.get("/metrics", Metrics_1.default.exposeMetricsRequestHandler);
        }
        this.app.listen(this.config.metrics.port, function () {
            debugLogger("Service up @ http://localhost:" + _this.config.metrics.port);
        });
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
var mapMessageKey = function (config, inputMessage, outputMessage) {
    if (!config.key) {
        return outputMessage;
    }
    if (config.key && config.key.proxy) {
        return outputMessage.set("key", inputMessage.get("key") || null);
    }
    if (!config.key.format) {
        throw new Error("Key should be altered, but no format was given.");
    }
    var keyValue = transform(config.key.format, inputMessage.get("key"), config.key.type, config.key.ignoreLeft, config.key.ignoreRight, config.key.paramName, config.key.paramFormat, config.key.upperCase, config.key.prefixLength, config.key.prefix);
    return outputMessage.set("key", keyValue || null);
};
var mapMessageValue = function (config, inputMessage, outputMessage) {
    var inputMessageValue = inputMessage.get("value");
    if (!inputMessageValue || typeof inputMessageValue !== "object") {
        outputMessage = outputMessage.set("value", inputMessageValue === undefined ? null : inputMessageValue);
        return outputMessage;
    }
    if (inputMessageValue.size === 0) {
        outputMessage = outputMessage.set("value", "{}");
        return outputMessage;
    }
    if (config.proxy && config.proxy instanceof Array) {
        config.proxy.forEach(function (key) {
            outputMessage = proxyByKey("value." + key, inputMessage, outputMessage);
        });
    }
    if (config.alter && config.alter instanceof Array) {
        config.alter.forEach(function (key) {
            outputMessage = parseByKey("value." + key.name, outputMessage, inputMessage, key.format, key.type, key.ignoreLeft, key.ignoreRight, key.upperCase, key.prefixLength, key.prefix, key.paramName, key.paramFormat);
        });
    }
    var value = outputMessage.get("value");
    if (!value && inputMessageValue.size > 0) {
        value = "{}";
    }
    else if (typeof value === "object") {
        value = JSON.stringify(value);
    }
    else {
        value = null;
    }
    outputMessage = outputMessage.set("value", value);
    return outputMessage;
};
//# sourceMappingURL=AnonKafkaMirror.js.map