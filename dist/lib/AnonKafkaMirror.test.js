"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
require("mocha");
var AnonKafkaMirror_1 = require("./AnonKafkaMirror");
describe("AnonKafkaMirror", function () {
    describe("mapMessage:" + typeof AnonKafkaMirror_1.mapMessage, function () {
        it("should proxy key based on the config", function () {
            chai_1.expect(AnonKafkaMirror_1.mapMessage({ topic: {} }, { key: null })).to.be.deep.equal({ key: null, value: null });
            chai_1.expect(AnonKafkaMirror_1.mapMessage({
                topic: {
                    key: {
                        proxy: true,
                        type: "number",
                    },
                },
            }, { key: 123 })).to.be.deep.equal({ key: 123, value: null });
            chai_1.expect(AnonKafkaMirror_1.mapMessage({
                topic: {
                    key: {
                        proxy: true,
                        type: "string",
                    },
                },
            }, { key: "123" })).to.be.deep.equal({ key: "123", value: null });
        });
        it("should proxy message based on the config", function () {
            var config = {
                topic: {
                    proxy: [
                        "test",
                        "a[*]",
                        "b[*]c",
                        "b[*]d",
                        "c[*][*]",
                        "d[*][*].e",
                        "f[*].g[*]",
                    ],
                },
            };
            chai_1.expect(AnonKafkaMirror_1.mapMessage(config, {})).to.deep.equal({ key: null, value: null });
            chai_1.expect(AnonKafkaMirror_1.mapMessage(config, { value: "" })).to.deep.equal({ key: null, value: "" });
            chai_1.expect(AnonKafkaMirror_1.mapMessage(config, { value: null })).to.deep.equal({ key: null, value: null });
            chai_1.expect(AnonKafkaMirror_1.mapMessage(config, { value: {} })).to.deep.equal({ key: null, value: "{}" });
            chai_1.expect(AnonKafkaMirror_1.mapMessage(config, { value: { a: 1 } })).to.deep.equal({ key: null, value: "{}" });
            chai_1.expect(AnonKafkaMirror_1.mapMessage(config, { value: { test: 1 } })).to.deep.equal({ key: null, value: "{\"test\":1}" });
            chai_1.expect(AnonKafkaMirror_1.mapMessage(config, { value: { a: [1, 2, 3] } })).to.deep.equal({ key: null, value: "{\"a\":[1,2,3]}" });
            chai_1.expect(AnonKafkaMirror_1.mapMessage(config, { value: { b: [{ c: 1, d: 2 }] } }))
                .to.deep.equal({ key: null, value: "{\"b\":[{\"c\":1,\"d\":2}]}" });
            chai_1.expect(AnonKafkaMirror_1.mapMessage(config, { value: { c: [[1], [2, 3]] } }))
                .to.deep.equal({ key: null, value: "{\"c\":[[1],[2,3]]}" });
        });
        it("should map message with y[*]", function () {
            var config = {
                topic: {
                    alter: [
                        {
                            name: "y[*]",
                            type: "integer",
                            format: "random.number",
                        },
                    ],
                },
            };
            var outputMessage = AnonKafkaMirror_1.mapMessage(config, { value: { y: [1, 2, 3] } });
            chai_1.expect(outputMessage.key).to.be.equal(null);
            var y = JSON.parse(outputMessage.value).y;
            chai_1.expect(y[0]).to.be.an("number");
            chai_1.expect(y[1]).to.be.an("number");
            chai_1.expect(y[1]).to.be.an("number");
        });
        it("should map message with x[*]x", function () {
            var config = {
                topic: {
                    alter: [
                        {
                            name: "x[*]x",
                            type: "integer",
                            format: "random.number",
                        },
                    ],
                },
            };
            var outputMessage = AnonKafkaMirror_1.mapMessage(config, { value: { x: [{ x: 1 }, { a: 1 }, { b: "" }] } });
            chai_1.expect(outputMessage.key).to.be.equal(null);
            var value = JSON.parse(outputMessage.value);
            chai_1.expect(value.x.length).to.be.equal(1);
            chai_1.expect(value.x[0].x).to.be.an("number");
            chai_1.expect(value.x[1]).to.be.not.ok;
            chai_1.expect(value.x[2]).to.be.not.ok;
        });
        it("should map message with z[*][*]", function () {
            var config = {
                topic: {
                    alter: [
                        {
                            name: "z[*][*]",
                            type: "string",
                            format: "lorem.word",
                        },
                    ],
                },
            };
            var outputMessage = AnonKafkaMirror_1.mapMessage(config, { value: { z: [["a", "b"], ["c"]], a: 1, b: { c: 2 } } });
            chai_1.expect(outputMessage.key).to.be.equal(null);
            var value = JSON.parse(outputMessage.value);
            chai_1.expect(value.z.length).to.be.equal(2);
            chai_1.expect(value.z[0][0]).to.be.an("string");
            chai_1.expect(value.a).to.be.not.ok;
            chai_1.expect(value.b).to.be.not.ok;
        });
    });
    it("should map message with hashed.queryParam", function () {
        var config = {
            topic: {
                alter: [
                    {
                        name: "someURL",
                        type: "string",
                        format: "hashed.queryParam",
                        paramName: "param",
                        paramFormat: "hashed.uuid",
                    },
                ],
            },
        };
        var outputMessage = AnonKafkaMirror_1.mapMessage(config, { value: { someURL: "/home/page?queryParam=e3712624-2373-4316-95d0-04a4c18845fa" } });
        var urlWithHashedParam = JSON.parse(outputMessage.value).someURL;
        chai_1.expect(urlWithHashedParam).to.equal("/home/page?queryParam=e3712624-2373-4316-95d0-04a4c18845fa");
    });
    it("should map message with hashed.uuid", function () {
        var config = {
            topic: {
                alter: [
                    {
                        name: "someUUID",
                        type: "string",
                        format: "hashed.uuid",
                    },
                ],
            },
        };
        var outputMessage = AnonKafkaMirror_1.mapMessage(config, { value: { someUUID: "fd8acd65-a3d4-4a7f-b4c5-7f0099052884" } });
        var hashedUUID = JSON.parse(outputMessage.value).someUUID;
        chai_1.expect(hashedUUID).to.equal("27364565-a3d4-4a7f-b4c5-7f0099185599");
    });
    it("should map message with hashed.string", function () {
        var config = {
            topic: {
                alter: [
                    {
                        name: "someString",
                        type: "string",
                        format: "hashed.string",
                    },
                ],
            },
        };
        var outputMessage = AnonKafkaMirror_1.mapMessage(config, { value: { someString: "2401234567899" } });
        var hashedString = JSON.parse(outputMessage.value).someString;
        chai_1.expect(hashedString).to.equal("2582443132258");
    });
    it("should map message with hashed.string and ignore left chars", function () {
        var config = {
            topic: {
                alter: [
                    {
                        name: "someString",
                        type: "string",
                        format: "hashed.string",
                        ignoreLeft: 3,
                    },
                ],
            },
        };
        var outputMessage = AnonKafkaMirror_1.mapMessage(config, { value: { someString: "2401234567899" } });
        var hashedString = JSON.parse(outputMessage.value).someString;
        chai_1.expect(hashedString).to.equal("2401462429965");
    });
    it("should map message with hashed.string and ignore right chars", function () {
        var config = {
            topic: {
                alter: [
                    {
                        name: "someString",
                        type: "string",
                        format: "hashed.string",
                        ignoreRight: 3,
                    },
                ],
            },
        };
        var outputMessage = AnonKafkaMirror_1.mapMessage(config, { value: { someString: "2401234567899" } });
        var hashedString = JSON.parse(outputMessage.value).someString;
        chai_1.expect(hashedString).to.equal("3173783966899");
    });
    it("should map message with hashed.string and ignore left and right chars", function () {
        var config = {
            topic: {
                alter: [
                    {
                        name: "someString",
                        type: "string",
                        format: "hashed.string",
                        ignoreLeft: 3,
                        ignoreRight: 2,
                    },
                ],
            },
        };
        var outputMessage = AnonKafkaMirror_1.mapMessage(config, { value: { someString: "2401234567899" } });
        var hashedString = JSON.parse(outputMessage.value).someString;
        chai_1.expect(hashedString).to.equal("2401293827499");
    });
    it("should map message with hashed.alphanumerical and acknowledge dashes", function () {
        var config = {
            topic: {
                alter: [
                    {
                        name: "someString",
                        type: "string",
                        format: "hashed.alphanumerical",
                        ignoreLeft: 2,
                        upperCase: true,
                    },
                ],
            },
        };
        var outputMessage = AnonKafkaMirror_1.mapMessage(config, { value: { someString: "A-1B2-C3D-4E5" } });
        var hashedString = JSON.parse(outputMessage.value).someString;
        chai_1.expect(hashedString).to.equal("A-NBP-P9B-7PK");
    });
    it("should map message with luhn algorithm and prefix", function () {
        var config = {
            topic: {
                alter: [
                    {
                        name: "someString",
                        type: "string",
                        format: "luhn.string",
                        prefixLength: 3,
                    },
                ],
            },
        };
        var outputMessage = AnonKafkaMirror_1.mapMessage(config, { value: { someString: "1231234567891" } });
        var hashedString = JSON.parse(outputMessage.value).someString;
        chai_1.expect(hashedString).to.equal("1232843971175");
    });
    it("should map message with luhn algorithm and without prefix", function () {
        var config = {
            topic: {
                alter: [
                    {
                        name: "someString",
                        type: "string",
                        format: "luhn.string",
                        prefix: "123",
                    },
                ],
            },
        };
        var outputMessage = AnonKafkaMirror_1.mapMessage(config, { value: { someString: "1234567891" } });
        var hashedString = JSON.parse(outputMessage.value).someString;
        chai_1.expect(hashedString).to.equal("2843971175");
    });
});
//# sourceMappingURL=AnonKafkaMirror.test.js.map