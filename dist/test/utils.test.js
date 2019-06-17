"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
require("mocha");
var utils_1 = require("../lib/utils");
context("utils", function () {
    describe("isArrayPath", function () {
        it("should match supported patterns", function () {
            var _a, _b, _c, _d, _e, _f;
            var _g = utils_1.isArrayPath(""), isArray = _g[0], prefix = _g[1], suffix = _g[2];
            chai_1.expect(isArray).to.be.false;
            isArray = utils_1.isArrayPath("a")[0];
            chai_1.expect(isArray).to.be.false;
            isArray = utils_1.isArrayPath("a.b")[0];
            chai_1.expect(isArray).to.be.false;
            _a = utils_1.isArrayPath("a.b[*]"), isArray = _a[0], prefix = _a[1], suffix = _a[2];
            chai_1.expect(isArray).to.be.true;
            chai_1.expect(prefix).to.equal("a.b");
            chai_1.expect(suffix).to.be.undefined;
            _b = utils_1.isArrayPath("[*]b"), isArray = _b[0], prefix = _b[1], suffix = _b[2];
            chai_1.expect(isArray).to.be.true;
            chai_1.expect(prefix).to.be.undefined;
            chai_1.expect(suffix).to.equal("b");
            _c = utils_1.isArrayPath("[*]c.d"), isArray = _c[0], prefix = _c[1], suffix = _c[2];
            chai_1.expect(isArray).to.be.true;
            chai_1.expect(prefix).to.be.undefined;
            chai_1.expect(suffix).to.equal("c.d");
            _d = utils_1.isArrayPath("a.b[*][*]"), isArray = _d[0], prefix = _d[1], suffix = _d[2];
            chai_1.expect(isArray).to.be.true;
            chai_1.expect(prefix).to.equal("a.b");
            chai_1.expect(suffix).to.equal("[*]");
            _e = utils_1.isArrayPath("a.b[*][*]c"), isArray = _e[0], prefix = _e[1], suffix = _e[2];
            chai_1.expect(isArray).to.be.true;
            chai_1.expect(prefix).to.equal("a.b");
            chai_1.expect(suffix).to.equal("[*]c");
            _f = utils_1.isArrayPath("a.b[*]c.d"), isArray = _f[0], prefix = _f[1], suffix = _f[2];
            chai_1.expect(isArray).to.be.true;
            chai_1.expect(prefix).to.equal("a.b");
            chai_1.expect(suffix).to.equal("c.d");
        });
    });
    describe("splitPath:${typeof splitPath}", function () {
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