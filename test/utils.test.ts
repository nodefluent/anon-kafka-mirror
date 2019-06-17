import { expect } from "chai";
import "mocha";

import { isArrayPath, splitPath } from "../lib/utils";

// tslint:disable:no-unused-expression
context("utils", () => {

  describe("isArrayPath", () => {
    it("should match supported patterns", () => {
      let [isArray, prefix, suffix] = isArrayPath("");
      expect(isArray).to.be.false;

      [isArray] = isArrayPath("a");
      expect(isArray).to.be.false;

      [isArray] = isArrayPath("a.b");
      expect(isArray).to.be.false;

      [isArray, prefix, suffix] = isArrayPath("a.b[*]");
      expect(isArray).to.be.true;
      expect(prefix).to.equal("a.b");
      expect(suffix).to.be.undefined;

      [isArray, prefix, suffix] = isArrayPath("[*]b");
      expect(isArray).to.be.true;
      expect(prefix).to.be.undefined;
      expect(suffix).to.equal("b");

      [isArray, prefix, suffix] = isArrayPath("[*]c.d");
      expect(isArray).to.be.true;
      expect(prefix).to.be.undefined;
      expect(suffix).to.equal("c.d");

      [isArray, prefix, suffix] = isArrayPath("a.b[*][*]");
      expect(isArray).to.be.true;
      expect(prefix).to.equal("a.b");
      expect(suffix).to.equal("[*]");

      [isArray, prefix, suffix] = isArrayPath("a.b[*][*]c");
      expect(isArray).to.be.true;
      expect(prefix).to.equal("a.b");
      expect(suffix).to.equal("[*]c");

      [isArray, prefix, suffix] = isArrayPath("a.b[*]c.d");
      expect(isArray).to.be.true;
      expect(prefix).to.equal("a.b");
      expect(suffix).to.equal("c.d");
    });
  });

  describe("splitPath:${typeof splitPath}", () => {
    it("should parse supported patterns", () => {
      expect(splitPath("")).to.be.deep.equal([]);
      expect(splitPath("a")).to.be.deep.equal(["a"]);
      expect(splitPath("a.b")).to.be.deep.equal(["a", "b"]);
      expect(splitPath("a.b.1")).to.be.deep.equal(["a", "b", 1]);
      expect(splitPath("a.b.1.c")).to.be.deep.equal(["a", "b", 1, "c"]);
    });
  });
});
