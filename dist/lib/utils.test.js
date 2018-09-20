"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
require("mocha");
var utils_1 = require("./utils");
describe("utils", function () {
    describe("arrayMatch:" + typeof utils_1.arrayMatch, function () {
        it("should match supported patterns", function () {
            var match = "".match(utils_1.arrayMatch);
            chai_1.expect(match).to.be.ok;
            chai_1.expect(match[1]).to.be.equal("");
            chai_1.expect(match[2]).to.be.equal("");
            match = "a".match(utils_1.arrayMatch);
            chai_1.expect(match).to.be.ok;
            chai_1.expect(match[1]).to.be.equal("a");
            chai_1.expect(match[2]).to.be.equal("");
            chai_1.expect(match[3]).to.be.equal("");
            match = "a.b".match(utils_1.arrayMatch);
            chai_1.expect(match).to.be.ok;
            chai_1.expect(match[1]).to.be.equal("a.b");
            chai_1.expect(match[2]).to.be.equal("");
            chai_1.expect(match[3]).to.be.equal("");
            match = "a.b[*]".match(utils_1.arrayMatch);
            chai_1.expect(match).to.be.ok;
            chai_1.expect(match[1]).to.be.equal("a.b");
            chai_1.expect(match[2]).to.be.equal("[*]");
            chai_1.expect(match[3]).to.be.equal("");
            match = "a.b[*][*]".match(utils_1.arrayMatch);
            chai_1.expect(match).to.be.ok;
            chai_1.expect(match[1]).to.be.equal("a.b");
            chai_1.expect(match[2]).to.be.equal("[*][*]");
            chai_1.expect(match[3]).to.be.equal("");
            match = "a.b[*][*]".match(utils_1.arrayMatch);
            chai_1.expect(match).to.be.ok;
            chai_1.expect(match[1]).to.be.equal("a.b");
            chai_1.expect(match[2]).to.be.equal("[*][*]");
            chai_1.expect(match[3]).to.be.equal("");
            match = "a.b[*][*]c".match(utils_1.arrayMatch);
            chai_1.expect(match).to.be.ok;
            chai_1.expect(match[1]).to.be.equal("a.b");
            chai_1.expect(match[2]).to.be.equal("[*][*]");
            chai_1.expect(match[3]).to.be.equal("c");
            match = "a.b[*]c.d".match(utils_1.arrayMatch);
            chai_1.expect(match).to.be.ok;
            chai_1.expect(match[1]).to.be.equal("a.b");
            chai_1.expect(match[2]).to.be.equal("[*]");
            chai_1.expect(match[3]).to.be.equal("c.d");
        });
    });
    describe("splitPath:" + typeof utils_1.splitPath, function () {
        it("should parse supported patterns", function () {
            chai_1.expect(utils_1.splitPath("")).to.be.deep.equal([]);
            chai_1.expect(utils_1.splitPath("a")).to.be.deep.equal(["a"]);
            chai_1.expect(utils_1.splitPath("a.b")).to.be.deep.equal(["a", "b"]);
            chai_1.expect(utils_1.splitPath("a.b.1")).to.be.deep.equal(["a", "b", 1]);
            chai_1.expect(utils_1.splitPath("a.b.1.c")).to.be.deep.equal(["a", "b", 1, "c"]);
        });
    });
});
//# sourceMappingURL=utils.test.js.map