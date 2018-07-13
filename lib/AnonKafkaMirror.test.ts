import { expect } from "chai";
import "mocha";
import { arrayMatch, IConfig, mapMessage, splitPath } from "./AnonKafkaMirror";

// tslint:disable:no-unused-expression
describe("AnonKafkaMirror", () => {

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

  describe(`mapMessage:${typeof mapMessage}`, () => {
    it("should proxy key based on the config", () => {
      expect(mapMessage({ topic: {} } as IConfig, { key: null })).to.be.deep.equal({ key: null, value: null });
      expect(mapMessage({
        topic: {
          key: {
            proxy: true,
            type: "number",
          },
        },
      } as IConfig, { key: 123 })).to.be.deep.equal({ key: 123, value: null });
      expect(mapMessage({
        topic: {
          key: {
            proxy: true,
            type: "string",
          },
        },
      } as IConfig, { key: "123" })).to.be.deep.equal({ key: "123", value: null });
    });

    it("should proxy message based on the config", () => {
      const config = {
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
      } as IConfig;
      expect(mapMessage(config, {})).to.deep.equal({ key: null, value: null });
      expect(mapMessage(config, { value: "" })).to.deep.equal({ key: null, value: "" });
      expect(mapMessage(config, { value: null })).to.deep.equal({ key: null, value: null });
      expect(mapMessage(config, { value: {} })).to.deep.equal({ key: null, value: "{}" });
      expect(mapMessage(config, { value: { a: 1 } })).to.deep.equal({ key: null, value: "{}" });
      expect(mapMessage(config, { value: { test: 1 } })).to.deep.equal({ key: null, value: "{\"test\":1}" });
      expect(mapMessage(config, { value: { a: [1, 2, 3] } })).to.deep.equal({ key: null, value: "{\"a\":[1,2,3]}" });
      expect(mapMessage(config, { value: { b: [{ c: 1 }] } }))
        .to.deep.equal({ key: null, value: "{\"b\":[{\"c\":1}]}" });
      expect(mapMessage(config, { value: { c: [[1], [2, 3]] } }))
        .to.deep.equal({ key: null, value: "{\"c\":[[1],[2,3]]}" });
    });

    it("should map message with y[*]", () => {
      const config = {
        topic: {
          alter: [
            {
              name: "y[*]",
              type: "integer",
              format: "random.number",
            },
          ],
        },
      } as IConfig;
      const outputMessage = mapMessage(config, { value: { y: [1, 2, 3] } });
      expect(outputMessage.key).to.be.equal(null);
      const y = JSON.parse(outputMessage.value).y;
      expect(y[0]).to.be.an("number");
      expect(y[1]).to.be.an("number");
      expect(y[1]).to.be.an("number");
    });

    it("should map message with x[*]x", () => {
      const config = {
        topic: {
          alter: [
            {
              name: "x[*]x",
              type: "integer",
              format: "random.number",
            },
          ],
        },
      } as IConfig;
      const outputMessage = mapMessage(config, { value: { x: [{ x: 1 }, { a: 1 }, { b: "" }] } });
      expect(outputMessage.key).to.be.equal(null);
      const value = JSON.parse(outputMessage.value);
      expect(value.x.length).to.be.equal(1);
      expect(value.x[0].x).to.be.an("number");
      expect(value.x[1]).to.be.not.ok;
      expect(value.x[2]).to.be.not.ok;
    });

    it("should map message with z[*][*]", () => {
      const config = {
        topic: {
          alter: [
            {
              name: "z[*][*]",
              type: "string",
              format: "lorem.word",
            },
          ],
        },
      } as IConfig;
      const outputMessage = mapMessage(config, { value: { z: [["a", "b"], ["c"]], a: 1, b: { c: 2 } } });
      expect(outputMessage.key).to.be.equal(null);
      const value = JSON.parse(outputMessage.value);
      expect(value.z.length).to.be.equal(2);
      expect(value.z[0][0]).to.be.an("string");
      expect(value.a).to.be.not.ok;
      expect(value.b).to.be.not.ok;
    });
  });

  it("should map message with hashed.uuid", () => {
    const config = {
      topic: {
        alter: [
          {
            name: "someUUID",
            type: "string",
            format: "hashed.uuid",
          },
        ],
      },
    } as IConfig;
    const outputMessage = mapMessage(config, { value: { someUUID: "fd8acd65-a3d4-4a7f-b4c5-7f0099052884" } });
    const hashedUUID = JSON.parse(outputMessage.value).someUUID;
    expect(hashedUUID).to.equal("27364565-a3d4-4a7f-b4c5-7f0099273645");
  });
});
