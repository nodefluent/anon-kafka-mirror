"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var murmurhash = require("murmurhash");
exports.clearConfig = function (config) {
    var cleanConfig = Object.assign({}, config);
    var secretPlaceholder = "***";
    if (cleanConfig.consumer.noptions) {
        if (cleanConfig.consumer.noptions["ssl.key.password"]) {
            cleanConfig.consumer.noptions["ssl.key.password"] = secretPlaceholder;
        }
        if (cleanConfig.consumer.noptions["sasl.password"]) {
            cleanConfig.consumer.noptions["sasl.password"] = secretPlaceholder;
        }
        if (cleanConfig.consumer.logger) {
            delete cleanConfig.consumer.logger;
        }
    }
    if (cleanConfig.producer.noptions) {
        if (cleanConfig.producer.noptions["ssl.key.password"]) {
            cleanConfig.producer.noptions["ssl.key.password"] = secretPlaceholder;
        }
        if (cleanConfig.producer.noptions["sasl.password"]) {
            cleanConfig.producer.noptions["sasl.password"] = secretPlaceholder;
        }
        if (cleanConfig.producer.logger) {
            delete cleanConfig.producer.logger;
        }
    }
    return cleanConfig;
};
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
exports.isUUIDRegExp = new RegExp(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/, "i");
exports.hashUUID = function (uuid) {
    if (!exports.isUUIDRegExp.test(uuid)) {
        return uuid;
    }
    var firstPart = uuid.substr(0, 6);
    var hashedfirstPart = murmurhash.v3(firstPart, 0).toString().substr(0, 6);
    var lastPart = uuid.substr(-6, 6);
    var hashedlastPart = murmurhash.v3(firstPart, 0).toString().substr(0, 6);
    return uuid.replace(firstPart, hashedfirstPart).replace(lastPart, hashedlastPart);
};
//# sourceMappingURL=utils.js.map