"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
require("mocha");
var AnonKafkaMirror_1 = require("./AnonKafkaMirror");
describe("AnonKafkaMirror", function () {
    it("should match supported patterns", function () {
        var match = "".match(AnonKafkaMirror_1.arrayMatch);
        chai_1.expect(match).to.be.ok;
        chai_1.expect(match[1]).to.be.equal("");
        chai_1.expect(match[2]).to.be.equal("");
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
    });
    it("should not match unsupported patterns", function () {
        var match = "a.b[1]".match(AnonKafkaMirror_1.arrayMatch);
        chai_1.expect(match).to.be.ok;
        chai_1.expect(match[1]).to.be.equal("a.b[1]");
        chai_1.expect(match[2]).to.be.equal("");
    });
});
//# sourceMappingURL=AnonKafkaMirror.test.js.map