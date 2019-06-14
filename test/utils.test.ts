import { expect } from "chai";
import "mocha";
import { arrayMatch, splitPath } from "../lib/utils";

// tslint:disable:no-unused-expression
describe("utils", () => {

  describe(`arrayMatch:${typeof arrayMatch}`, () => {
    it("should match supported patterns", () => {
      let match = "".match(arrayMatch);
      expect(match).to.be.ok;
      expect(match[1]).to.be.equal("");
      expect(match[2]).to.be.equal("");

      match = "a".match(arrayMatch);
      expect(match).to.be.ok;
      expect(match[1]).to.be.equal("a");
      expect(match[2]).to.be.equal("");
      expect(match[3]).to.be.equal("");

      match = "a.b".match(arrayMatch);
      expect(match).to.be.ok;
      expect(match[1]).to.be.equal("a.b");
      expect(match[2]).to.be.equal("");
      expect(match[3]).to.be.equal("");

      match = "a.b[*]".match(arrayMatch);
      expect(match).to.be.ok;
      expect(match[1]).to.be.equal("a.b");
      expect(match[2]).to.be.equal("[*]");
      expect(match[3]).to.be.equal("");

      match = "a.b[*][*]".match(arrayMatch);
      expect(match).to.be.ok;
      expect(match[1]).to.be.equal("a.b");
      expect(match[2]).to.be.equal("[*][*]");
      expect(match[3]).to.be.equal("");

      match = "a.b[*][*]".match(arrayMatch);
      expect(match).to.be.ok;
      expect(match[1]).to.be.equal("a.b");
      expect(match[2]).to.be.equal("[*][*]");
      expect(match[3]).to.be.equal("");

      match = "a.b[*][*]c".match(arrayMatch);
      expect(match).to.be.ok;
      expect(match[1]).to.be.equal("a.b");
      expect(match[2]).to.be.equal("[*][*]");
      expect(match[3]).to.be.equal("c");

      match = "a.b[*]c.d".match(arrayMatch);
      expect(match).to.be.ok;
      expect(match[1]).to.be.equal("a.b");
      expect(match[2]).to.be.equal("[*]");
      expect(match[3]).to.be.equal("c.d");
    });
  });

  describe(`splitPath:${typeof splitPath}`, () => {
    it("should parse supported patterns", () => {
      expect(splitPath("")).to.be.deep.equal([]);
      expect(splitPath("a")).to.be.deep.equal(["a"]);
      expect(splitPath("a.b")).to.be.deep.equal(["a", "b"]);
      expect(splitPath("a.b.1")).to.be.deep.equal(["a", "b", 1]);
      expect(splitPath("a.b.1.c")).to.be.deep.equal(["a", "b", 1, "c"]);
    });
  });
});
