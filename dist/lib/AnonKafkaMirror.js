"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var debug_1 = require("debug");
var express = require("express");
var faker = require("faker");
var immutable_1 = require("immutable");
var sinek_1 = require("sinek");
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
var transform = function (format, keyValue, formatOptions) {
    switch (format) {
        case "hashed.uuid":
            return utils_1.hashUUID(keyValue);
        case "hashed.string":
            return utils_1.hashString(keyValue, formatOptions.ignoreLeft, formatOptions.ignoreRight);
        case "hashed.queryParam":
            return utils_1.hashQueryParam(keyValue, formatOptions.paramName, formatOptions.paramFormat);
        case "hashed.alphanumerical":
            return utils_1.hashAlphanumerical(keyValue, formatOptions.ignoreLeft, formatOptions.upperCase);
        case "luhn.string":
            return utils_1.hashLuhnString(keyValue, formatOptions.prefixLength, formatOptions.prefix);
        default:
            return fake(format, formatOptions.type);
    }
};
var parseByKey = function (key, outputMessage, inputMessage, format, formatOptions, pattern) {
    var isArray = utils_1.isArrayPath(key)[0];
    if (!isArray) {
        var keyPath = utils_1.splitPath(key);
        var keyValue = inputMessage.getIn(keyPath);
        if (keyValue === null) {
            outputMessage = outputMessage.setIn(keyPath, null);
        }
        else if (keyValue !== undefined) {
            if (pattern) {
                if (!immutable_1.Map.isMap(keyValue)) {
                    throw new Error("Pattern " + pattern + " is currently only supported in object path.");
                }
                var names = Array.from(keyValue.keys());
                for (var _i = 0, names_1 = names; _i < names_1.length; _i++) {
                    var name_1 = names_1[_i];
                    if (pattern.test(name_1)) {
                        var alteredValue = transform(format, keyValue.get(name_1), formatOptions);
                        outputMessage = outputMessage.setIn(keyPath.concat([name_1]), alteredValue);
                    }
                }
            }
            else {
                keyValue = transform(format, keyValue, formatOptions);
                outputMessage = outputMessage.setIn(keyPath, keyValue);
            }
        }
    }
    else {
        outputMessage = parseArrayByKey(key, inputMessage, outputMessage, format, formatOptions);
    }
    return outputMessage;
};
var parseArrayByKey = function (key, inputMessage, outputMessage, format, formatOptions) {
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
                outputMessage = parseArrayByKey("" + keyPath.join(".") + (isSubArray ? "[*]" + (suffixSuffix || "") : suffix), inputMessage, outputMessage, format, formatOptions);
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
                        mapValue = transform(format, mapValue, formatOptions);
                        if (mapValue !== undefined) {
                            outputMessage = outputMessage.setIn(newListPath, mapValue);
                        }
                    }
                    else if (immutable_1.List.isList(keyValue)) {
                        var joinedKeyPath = keyPath.join(".");
                        var newKey = joinedKeyPath + key.substr(joinedKeyPath.length + (2 - i.toString().length));
                        outputMessage = parseArrayByKey(newKey, inputMessage, outputMessage, format, formatOptions);
                    }
                    else {
                        keyValue = transform(format, keyValue, formatOptions);
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
        this.config = undefined;
        this.config = config;
        this.app = express();
        this.metrics = null;
        this.alive = true;
        this.consumer = new sinek_1.NConsumer(this.config.topic.name, this.config.consumer);
        this.producer = new sinek_1.NProducer(this.config.producer, null, this.config.topic.partitions || "auto");
    }
    AnonKafkaMirror.prototype.run = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        process.on("unhandledRejection", function (reason, p) {
                            var stack = reason instanceof Error && reason.hasOwnProperty("stack") ? ", stack: " + reason.stack : "";
                            debugLogger("[Uncaught] Unhandled Rejection at: Promise " + p + ", reason: " + reason + stack);
                            process.exit(1);
                        });
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
                        this.consumer.on("error", function (error) { return debugLogger("Kafka consumer error for topics " + _this.config.topic.name + ": " + error); });
                        this.consumer.on("analytics", function (analytics) { return debugLogger("Kafka consumer analytics for topics " + _this.config.topic.name + ": " +
                            ("" + JSON.stringify(analytics))); });
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, , 6]);
                        return [4, this.producer.connect()];
                    case 2:
                        _a.sent();
                        return [4, this.consumer.connect()];
                    case 3:
                        _a.sent();
                        debugLogger("Kafka consumer for topics " + this.config.topic.name + " connected.");
                        return [4, this.consumer.enableAnalytics({
                                analyticsInterval: 1000 * 60 * 4,
                                lagFetchInterval: 1000 * 60 * 5,
                            })];
                    case 4:
                        _a.sent();
                        this.consumer.consume(function (batchOfMessages, callback) { return __awaiter(_this, void 0, void 0, function () {
                            var topicPromises, batchSuccessful;
                            var _this = this;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        topicPromises = Object
                                            .keys(batchOfMessages)
                                            .map(function (topic) { return _this.handleSingleTopic(topic, batchOfMessages[topic], function (batch) { return _this.processBatch(batch); }); });
                                        return [4, Promise.all(topicPromises)];
                                    case 1:
                                        batchSuccessful = _a.sent();
                                        if (batchSuccessful.every(function (b) { return b === true; })) {
                                            callback();
                                        }
                                        else {
                                            throw new Error("Failed to consume topics " + this.config.topic.name + ".Stopping consumer...");
                                        }
                                        return [2];
                                }
                            });
                        }); }, false, true, this.config.batchConfig);
                        return [3, 6];
                    case 5:
                        error_1 = _a.sent();
                        debugLogger("Kafka consumer connection error for topics " + this.config.topic.name + ": " + error_1 + " ");
                        console.error(error_1);
                        process.exit(1);
                        return [3, 6];
                    case 6: return [2];
                }
            });
        });
    };
    AnonKafkaMirror.prototype.handleSingleTopic = function (topic, messages, singleTopicHandler) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, singleTopicHandler(messages)];
                    case 1:
                        result = _a.sent();
                        (result.lastSuccessfulOffsets || [])
                            .forEach(function (p2o) {
                            return Object.keys(p2o).map(function (p) { return _this.consumer.commitOffsetHard(topic, parseInt(p, 10), p2o[p], false); });
                        });
                        return [2, !result.hasErrors];
                }
            });
        });
    };
    AnonKafkaMirror.prototype.processBatch = function (partitionedMessages) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, partitions, partitionResults, result, x, partition, lastMessage, offset;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        partitions = Object.keys(partitionedMessages);
                        return [4, Promise.all(partitions.map(function (p) { return _this.processPartition(partitionedMessages[p]); }))];
                    case 1:
                        partitionResults = _b.sent();
                        result = {
                            hasErrors: partitionResults.some(function (pr) { return pr !== null; }),
                            lastSuccessfulOffsets: [],
                        };
                        for (x = 0; x < partitions.length; x++) {
                            partition = partitions[x];
                            lastMessage = partitionedMessages[partitions[x]][partitionedMessages[partitions[x]].length - 1];
                            offset = partitionResults[x] || lastMessage ? lastMessage.offset : undefined;
                            if (offset) {
                                result.lastSuccessfulOffsets.push((_a = {}, _a[partition] = offset, _a));
                            }
                        }
                        return [2, result];
                }
            });
        });
    };
    AnonKafkaMirror.prototype.processPartition = function (messages) {
        return __awaiter(this, void 0, void 0, function () {
            var failedMessageOffset, _i, messages_1, message, mappedMessage, produceResult, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        failedMessageOffset = null;
                        _i = 0, messages_1 = messages;
                        _a.label = 1;
                    case 1:
                        if (!(_i < messages_1.length)) return [3, 6];
                        message = messages_1[_i];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        mappedMessage = exports.mapMessage(this.config.topic, message);
                        return [4, this.producer.send(this.config.topic.newName || this.config.topic.name, mappedMessage.value, null, mappedMessage.key)];
                    case 3:
                        produceResult = _a.sent();
                        return [3, 5];
                    case 4:
                        error_2 = _a.sent();
                        failedMessageOffset = message.offset;
                        debugLogger("Error processing message of partition " + message.partition + " with offset " +
                            (message.offset + ": " + error_2));
                        return [3, 6];
                    case 5:
                        _i++;
                        return [3, 1];
                    case 6: return [2, failedMessageOffset];
                }
            });
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
    var _a = config.key, type = _a.type, ignoreLeft = _a.ignoreLeft, ignoreRight = _a.ignoreRight, paramName = _a.paramName, paramFormat = _a.paramFormat, upperCase = _a.upperCase, prefixLength = _a.prefixLength, prefix = _a.prefix;
    var formatOptions = {
        type: type,
        ignoreLeft: ignoreLeft,
        ignoreRight: ignoreRight,
        paramName: paramName,
        paramFormat: paramFormat,
        upperCase: upperCase,
        prefixLength: prefixLength,
        prefix: prefix,
    };
    var keyValue = transform(config.key.format, inputMessage.get("key").toString(), formatOptions);
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
            var type = key.type, ignoreLeft = key.ignoreLeft, ignoreRight = key.ignoreRight, paramName = key.paramName, paramFormat = key.paramFormat, upperCase = key.upperCase, prefixLength = key.prefixLength, prefix = key.prefix;
            var formatOptions = {
                type: type,
                ignoreLeft: ignoreLeft,
                ignoreRight: ignoreRight,
                paramName: paramName,
                paramFormat: paramFormat,
                upperCase: upperCase,
                prefixLength: prefixLength,
                prefix: prefix,
            };
            var patternRegExp = key.pattern ? new RegExp(key.pattern) : undefined;
            outputMessage = parseByKey("value." + key.name, outputMessage, inputMessage, key.format, formatOptions, patternRegExp);
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