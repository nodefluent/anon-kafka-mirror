"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var faker = require("faker");
var immutable_1 = require("immutable");
var kafka_streams_1 = require("kafka-streams");
exports.arrayMatch = new RegExp(/([^\[\*\]]*)((?:\[[\*\d+]\]\.?){0,})([^\[\*\]]*)/);
var splitPath = function (path) {
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
var parseArrayByKey = function (key, map, s, inputMessage, format) {
    if (s === void 0) { s = ""; }
    var keyPathMatch = key.match(exports.arrayMatch);
    var prefix = keyPathMatch[1];
    var suffix = s || keyPathMatch[3];
    if (prefix) {
        var prefixPath_1 = splitPath(prefix);
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
                        keyPath = keyPath.concat(splitPath(suffix));
                        newListPath = newListPath.concat(splitPath(suffix));
                    }
                    var keyValue = inputMessage.getIn(keyPath);
                    if (keyValue === null) {
                        map = map.setIn(newListPath, null);
                        newListIndex_1 += 1;
                    }
                    else if (keyValue !== undefined) {
                        if (immutable_1.Map.isMap(keyValue)) {
                            var mapValue = keyValue.getIn(splitPath(suffix));
                            if (format) {
                                mapValue = faker.fake("{{" + format + "}}");
                            }
                            if (mapValue !== undefined) {
                                map = map.setIn(newListPath, mapValue);
                                newListIndex_1 += 1;
                            }
                        }
                        else {
                            if (format) {
                                keyValue = faker.fake("{{" + format + "}}");
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
            var keyPath = splitPath(key);
            var keyValue = inputMessage.getIn(keyPath);
            if (keyValue === null) {
                map = map.setIn(keyPath, null);
            }
            else if (keyValue !== undefined) {
                if (format) {
                    keyValue = faker.fake("{{" + format + "}}");
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
            .map(this.mapMessage)
            .tap(function (message) {
            config.producer.logger.debug(message, "Transformed message");
        })
            .to();
    }
    AnonKafkaMirror.prototype.mapMessage = function (m) {
        var inputMessage = immutable_1.fromJS(m);
        this.config.consumer.logger.debug(inputMessage.toJS(), "Got message");
        var outputMessage = immutable_1.Map();
        outputMessage = outputMessage.set("offset", inputMessage.get("offset"));
        outputMessage = outputMessage.set("partition", inputMessage.get("partition"));
        outputMessage = outputMessage.set("timestamp", inputMessage.get("timestamp"));
        outputMessage = outputMessage.set("topic", this.config.topic.newName || inputMessage.get("topic"));
        if (this.config.topic.key && this.config.topic.key.proxy === false) {
            if (this.config.topic.key.format) {
                var newKey = faker.fake("{{" + this.config.topic.key.format + "}}");
                if (newKey) {
                    outputMessage = outputMessage.set("key", newKey);
                }
            }
        }
        if (this.config.topic.key && this.config.topic.key.proxy) {
            outputMessage = outputMessage.set("key", inputMessage.get("key"));
        }
        if (!outputMessage.get("key")) {
            outputMessage = outputMessage.set("key", null);
        }
        if (!inputMessage.get("value") || typeof inputMessage.get("value") !== "object") {
            outputMessage = outputMessage.set("value", inputMessage.get("value"));
            return outputMessage.toJS();
        }
        if (this.config.topic.proxy && this.config.topic.proxy instanceof Array) {
            this.config.topic.proxy.forEach(function (key) {
                outputMessage = parseByKey("value." + key, outputMessage, inputMessage);
            });
        }
        if (this.config.topic.alter && this.config.topic.alter instanceof Array) {
            this.config.topic.alter.forEach(function (key) {
                outputMessage = parseByKey("value." + key.name, outputMessage, inputMessage, key.format);
            });
        }
        var value = outputMessage.get("value");
        if (value && typeof value === "object") {
            value = JSON.stringify(value);
        }
        outputMessage = outputMessage.set("value", value);
        return outputMessage.toJS();
    };
    AnonKafkaMirror.prototype.run = function () {
        this.stream.start({ outputKafkaConfig: this.config.producer });
    };
    return AnonKafkaMirror;
}());
exports.AnonKafkaMirror = AnonKafkaMirror;
//# sourceMappingURL=AnonKafkaMirror.js.map