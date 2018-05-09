"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var faker = require("faker");
var immutable_1 = require("immutable");
var kafka_streams_1 = require("kafka-streams");
exports.arrayMatch = new RegExp(/([^\[\*\]]*)((?:\[[\*\d+]\]\.?){0,})([^\[\*\]]*)/);
exports.splitPath = function (path) {
    if (!path) {
        return [];
    }
    return path.split(".").map(function (p) {
        try {
            var pathKey = parseInt(p, 10);
            if (isNaN(pathKey)) {
                return p;
            }
            return pathKey;
        }
        catch (e) {
            return p;
        }
    });
};
exports.fake = function (format) {
    var value = faker.fake("{{" + format + "}}");
    if (!isNaN(parseInt(value, 10))) {
        value = parseInt(value, 10);
    }
    return value;
};
var parseArrayByKey = function (key, map, s, inputMessage, format) {
    if (s === void 0) { s = ""; }
    var keyPathMatch = key.match(exports.arrayMatch);
    var prefix = keyPathMatch[1];
    var suffix = s || keyPathMatch[3];
    if (prefix) {
        var prefixPath_1 = exports.splitPath(prefix);
        var keyArray = inputMessage.getIn(prefixPath_1);
        if (immutable_1.List.isList(keyArray)) {
            map = map.setIn(prefixPath_1, immutable_1.List());
            var newListIndex_1 = 0;
            keyArray.forEach(function (v, i) {
                var keyPath = prefixPath_1.concat([i]);
                var newListPath = prefixPath_1.concat([newListIndex_1]);
                var prefixValue = inputMessage.getIn(keyPath);
                if (immutable_1.List.isList(prefixValue)) {
                    map = parseArrayByKey(keyPath.join("."), map, suffix, inputMessage, format);
                }
                else {
                    if (suffix) {
                        keyPath = keyPath.concat(exports.splitPath(suffix));
                        newListPath = newListPath.concat(exports.splitPath(suffix));
                    }
                    var keyValue = inputMessage.getIn(keyPath);
                    if (keyValue === null) {
                        map = map.setIn(newListPath, null);
                        newListIndex_1 += 1;
                    }
                    else if (keyValue !== undefined) {
                        if (immutable_1.Map.isMap(keyValue)) {
                            var mapValue = keyValue.getIn(exports.splitPath(suffix));
                            if (format) {
                                mapValue = exports.fake(format);
                            }
                            if (mapValue !== undefined) {
                                map = map.setIn(newListPath, mapValue);
                                newListIndex_1 += 1;
                            }
                        }
                        else {
                            if (format) {
                                keyValue = exports.fake(format);
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
var parseByKey = function (key, map, inputMessage, format) {
    if (key && typeof key === "string") {
        if (!key.match(exports.arrayMatch)[2]) {
            var keyPath = exports.splitPath(key);
            var keyValue = inputMessage.getIn(keyPath);
            if (keyValue === null) {
                map = map.setIn(keyPath, null);
            }
            else if (keyValue !== undefined) {
                if (format) {
                    keyValue = exports.fake(format);
                }
                map = map.setIn(keyPath, keyValue);
            }
        }
        else {
            map = parseArrayByKey(key, map, undefined, inputMessage, format);
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
            var newKey = exports.fake(config.topic.key.format);
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
            outputMessage = parseByKey("value." + key.name, outputMessage, inputMessage, key.format);
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
        this.config = undefined;
        this.stream = {};
        this.config = config;
        var kafkaStreams = new kafka_streams_1.default(this.config.consumer);
        this.stream = kafkaStreams.getKStream();
        this.stream
            .from(config.topic.name)
            .mapJSONConvenience()
            .map(function (m) { return exports.mapMessage(config, m); })
            .tap(function (message) {
            if (config.consumer.logger && config.consumer.logger.debug) {
                config.producer.logger.debug(message, "Transformed message");
            }
        })
            .to();
    }
    AnonKafkaMirror.prototype.run = function () {
        this.stream.start({ outputKafkaConfig: this.config.producer });
    };
    return AnonKafkaMirror;
}());
exports.AnonKafkaMirror = AnonKafkaMirror;
//# sourceMappingURL=AnonKafkaMirror.js.map