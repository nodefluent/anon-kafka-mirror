"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
require("mocha");
var AnonKafkaMirror_1 = require("./AnonKafkaMirror");
describe("AnonKafkaMirror", function () {
    describe("arrayMatch:" + typeof AnonKafkaMirror_1.arrayMatch, function () {
        it("should match supported patterns", function () {
            var match = "".match(AnonKafkaMirror_1.arrayMatch);
            chai_1.expect(match).to.be.ok;
            chai_1.expect(match[1]).to.be.equal("");
            chai_1.expect(match[2]).to.be.equal("");
            match = "a".match(AnonKafkaMirror_1.arrayMatch);
            chai_1.expect(match).to.be.ok;
            chai_1.expect(match[1]).to.be.equal("a");
            chai_1.expect(match[2]).to.be.equal("");
            chai_1.expect(match[3]).to.be.equal("");
            match = "a.b".match(AnonKafkaMirror_1.arrayMatch);
            chai_1.expect(match).to.be.ok;
            chai_1.expect(match[1]).to.be.equal("a.b");
            chai_1.expect(match[2]).to.be.equal("");
            chai_1.expect(match[3]).to.be.equal("");
            match = "a.b[*]".match(AnonKafkaMirror_1.arrayMatch);
            chai_1.expect(match).to.be.ok;
            chai_1.expect(match[1]).to.be.equal("a.b");
            chai_1.expect(match[2]).to.be.equal("[*]");
            chai_1.expect(match[3]).to.be.equal("");
            match = "a.b[*][*]".match(AnonKafkaMirror_1.arrayMatch);
            chai_1.expect(match).to.be.ok;
            chai_1.expect(match[1]).to.be.equal("a.b");
            chai_1.expect(match[2]).to.be.equal("[*][*]");
            chai_1.expect(match[3]).to.be.equal("");
            match = "a.b[*][*]".match(AnonKafkaMirror_1.arrayMatch);
            chai_1.expect(match).to.be.ok;
            chai_1.expect(match[1]).to.be.equal("a.b");
            chai_1.expect(match[2]).to.be.equal("[*][*]");
            chai_1.expect(match[3]).to.be.equal("");
            match = "a.b[*][*]c".match(AnonKafkaMirror_1.arrayMatch);
            chai_1.expect(match).to.be.ok;
            chai_1.expect(match[1]).to.be.equal("a.b");
            chai_1.expect(match[2]).to.be.equal("[*][*]");
            chai_1.expect(match[3]).to.be.equal("c");
            match = "a.b[*]c.d".match(AnonKafkaMirror_1.arrayMatch);
            chai_1.expect(match).to.be.ok;
            chai_1.expect(match[1]).to.be.equal("a.b");
            chai_1.expect(match[2]).to.be.equal("[*]");
            chai_1.expect(match[3]).to.be.equal("c.d");
        });
    });
    describe("splitPath:" + typeof AnonKafkaMirror_1.splitPath, function () {
        it("should parse supported patterns", function () {
            chai_1.expect(AnonKafkaMirror_1.splitPath("")).to.be.deep.equal([]);
            chai_1.expect(AnonKafkaMirror_1.splitPath("a")).to.be.deep.equal(["a"]);
            chai_1.expect(AnonKafkaMirror_1.splitPath("a.b")).to.be.deep.equal(["a", "b"]);
            chai_1.expect(AnonKafkaMirror_1.splitPath("a.b.1")).to.be.deep.equal(["a", "b", 1]);
            chai_1.expect(AnonKafkaMirror_1.splitPath("a.b.1.c")).to.be.deep.equal(["a", "b", 1, "c"]);
        });
    });
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
                        "b[*].c",
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
            chai_1.expect(AnonKafkaMirror_1.mapMessage(config, { value: { b: [{ c: 1 }] } }))
                .to.deep.equal({ key: null, value: "{\"b\":[{\"c\":1}]}" });
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
        chai_1.expect(hashedUUID).to.equal("27364565-a3d4-4a7f-b4c5-7f0099273645");
    });
});
//# sourceMappingURL=AnonKafkaMirror.test.js.map