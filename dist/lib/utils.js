"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var murmurhash = require("murmurhash");
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
exports.hashString = function (input, ignoreLeft, ignoreRight) {
    if ((ignoreLeft || 0) + (ignoreRight || 0) >= input.length) {
        return input;
    }
    var unhashed = input;
    if (ignoreLeft) {
        unhashed = unhashed.substring(ignoreLeft);
    }
    if (ignoreRight) {
        unhashed = unhashed.substring(0, unhashed.length - ignoreRight);
    }
    var hashed = murmurhash.v3(murmurhash.v3(unhashed, 0).toString(), 0).toString();
    if (unhashed.length < hashed.length) {
        hashed = hashed.substring(0, unhashed.length);
    }
    else if (unhashed.length > hashed.length) {
        var diff = unhashed.length - hashed.length;
        hashed = "" + hashed + hashed.substring(0, diff);
    }
    var result = hashed;
    if (ignoreLeft) {
        result = "" + input.substring(0, ignoreLeft) + result;
    }
    if (ignoreRight) {
        result = "" + result + input.substring(input.length - ignoreRight);
    }
    return result;
};
//# sourceMappingURL=utils.js.map