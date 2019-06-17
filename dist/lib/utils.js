"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var murmurhash = require("murmurhash");
var url_1 = require("url");
var arrayMatch = new RegExp(/([^\[\*\]]*)((?:\[[\*\d+]\]\.?){1})(.*)/);
exports.isArrayPath = function (path) {
    var matchResult = path.match(arrayMatch);
    if (matchResult === null || matchResult.length <= 2 || !matchResult[2]) {
        return [false];
    }
    return [true, matchResult[1] || undefined, matchResult[3] || undefined];
};
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
var isUUIDRegExp = new RegExp(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/, "i");
exports.hashUUID = function (uuid) {
    if (!isUUIDRegExp.test(uuid)) {
        return uuid;
    }
    var firstPart = uuid.substr(0, 6);
    var hashedfirstPart = murmurhash.v3(firstPart, 0).toString().substr(0, 6);
    var lastPart = uuid.substr(-6, 6);
    var hashedLastPart = murmurhash.v3(lastPart, 0).toString().substr(0, 6);
    var hashedUUID = "" + hashedfirstPart +
        ("" + uuid.substring(hashedfirstPart.length, uuid.length - hashedLastPart.length)) +
        ("" + hashedLastPart);
    return hashedUUID;
};
exports.hashQueryParam = function (input, paramName, paramFormat) {
    if (!input ||
        !paramName ||
        !paramFormat) {
        return input;
    }
    var url;
    url = new url_1.URL(input, "https://www.github.com");
    var paramValue = url.searchParams.get(paramName);
    if (!paramValue) {
        return input;
    }
    var hashedValue;
    switch (paramFormat) {
        case "hashed.uuid":
            hashedValue = exports.hashUUID(paramValue);
            break;
        default:
            return input;
    }
    var result = input.replace(paramValue, hashedValue);
    return result;
};
exports.hashString = function (input, ignoreLeft, ignoreRight) {
    if (!input ||
        (ignoreLeft || 0) + (ignoreRight || 0) >= input.length) {
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
exports.hashAlphanumerical = function (input, ignoreLeft, upperCase) {
    if (!input) {
        return input;
    }
    var candidate = ignoreLeft ?
        input.substring(ignoreLeft)
        : input;
    var parts = candidate.split("-");
    var hashedParts = parts.map(function (part) { return murmurhash.v3(part, 0).toString(36).substring(0, 3); });
    if (upperCase) {
        hashedParts = hashedParts.map(function (part) { return part.toUpperCase(); });
    }
    var result = "" + input.substring(0, ignoreLeft) + hashedParts.join("-");
    return result;
};
exports.hashLuhnString = function (input, prefixLength, prefix) {
    if (!input) {
        return input;
    }
    if (prefixLength) {
        var stringWithoutPrefixAndChecksum = input.substring(prefixLength, input.length - 1);
        var hashedNumber = murmurhash.v3(murmurhash.v3(stringWithoutPrefixAndChecksum, 0).toString(), 0).toString();
        var shortenedHashedNumber = hashedNumber.substring(0, stringWithoutPrefixAndChecksum.length);
        var resultWithoutChecksum = "" + input.substring(0, prefixLength) + shortenedHashedNumber;
        var checksum = calculateChecksum(resultWithoutChecksum);
        return "" + resultWithoutChecksum + checksum;
    }
    else if (prefix) {
        var stringWithoutChecksum = input.substring(0, input.length - 1);
        var hashedNumber = murmurhash.v3(murmurhash.v3(stringWithoutChecksum, 0).toString(), 0).toString();
        var shortenedHashedNumber = hashedNumber.substring(0, stringWithoutChecksum.length);
        var checksum = calculateChecksum("" + prefix + shortenedHashedNumber);
        return "" + shortenedHashedNumber + checksum;
    }
    else {
        var stringWithoutChecksum = input.substring(prefixLength, input.length - 1);
        var hashedNumber = murmurhash.v3(murmurhash.v3(stringWithoutChecksum, 0).toString(), 0).toString();
        var shortenedHashedNumber = hashedNumber.substring(0, stringWithoutChecksum.length);
        var checksum = calculateChecksum(shortenedHashedNumber);
        return "" + shortenedHashedNumber + checksum;
    }
};
var calculateChecksum = function (input) {
    var invertedDigits = input
        .split("")
        .reverse()
        .map(function (digit) { return parseInt(digit, 10); });
    var multiplicators = [];
    for (var i = 0; i < invertedDigits.length; i++) {
        multiplicators.push(((i + 1) % 2) + 1);
    }
    var sum = invertedDigits
        .reduce(function (accumulator, currentValue, currentIndex) {
        var product = currentValue * multiplicators[currentIndex];
        return accumulator + (sumOfDigits(product));
    }, 0);
    var remainder = sum % 10;
    var checksum = remainder === 0 ? 0 : 10 - remainder;
    return checksum.toString();
};
var sumOfDigits = function (value) {
    return value
        .toString()
        .split("")
        .map(Number)
        .reduce(function (a, b) { return a + b; }, 0);
};
//# sourceMappingURL=utils.js.map