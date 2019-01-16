import { expect } from "chai";
import "mocha";
import { mapMessage } from "./AnonKafkaMirror";
import { IConfig } from "./types";

// tslint:disable:no-unused-expression
describe("AnonKafkaMirror", () => {

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

  it("should map message with hashed.string", () => {
    const config = {
      topic: {
        alter: [
          {
            name: "someString",
            type: "string",
            format: "hashed.string",
          },
        ],
      },
    } as IConfig;
    const outputMessage = mapMessage(config, { value: { someString: "2401234567899" } });
    const hashedString = JSON.parse(outputMessage.value).someString;
    expect(hashedString).to.equal("2582443132258");
  });

  it("should map message with hashed.string and ignore left chars", () => {
    const config = {
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
    } as IConfig;
    const outputMessage = mapMessage(config, { value: { someString: "2401234567899" } });
    const hashedString = JSON.parse(outputMessage.value).someString;
    expect(hashedString).to.equal("2401462429965");
  });

  it("should map message with hashed.string and ignore right chars", () => {
    const config = {
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
    } as IConfig;
    const outputMessage = mapMessage(config, { value: { someString: "2401234567899" } });
    const hashedString = JSON.parse(outputMessage.value).someString;
    expect(hashedString).to.equal("3173783966899");
  });

  it("should map message with hashed.string and ignore left and right chars", () => {
    const config = {
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
    } as IConfig;
    const outputMessage = mapMessage(config, { value: { someString: "2401234567899" } });
    const hashedString = JSON.parse(outputMessage.value).someString;
    expect(hashedString).to.equal("2401293827499");
  });

  it("should map message with luhn algorithm and prefix", () => {
    const config = {
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
    } as IConfig;
    const outputMessage = mapMessage(config, { value: { someString: "1231234567891" } });
    const hashedString = JSON.parse(outputMessage.value).someString;
    expect(hashedString).to.equal("1232843971175");
  });

  it("should map message with luhn algorithm and without prefix", () => {
    const config = {
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
    } as IConfig;
    const outputMessage = mapMessage(config, { value: { someString: "1234567891" } });
    const hashedString = JSON.parse(outputMessage.value).someString;
    expect(hashedString).to.equal("2843971175");
  });
});
