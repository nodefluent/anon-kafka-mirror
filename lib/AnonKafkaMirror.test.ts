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

    it("should alter key based on the config", () => {
      expect(mapMessage({
        topic: {
          key: {
            proxy: false,
            type: "string",
            format: "hashed.uuid",
          },
        },
      } as IConfig, { key: "9ad4722c-0b5b-47e5-8d23-8122b0bc29c5", value: null }))
        .to.be.deep.equal({ key: "2904842c-0b5b-47e5-8d23-8122b0328437", value: null });
    });

    it("should map messages with multiple levels of nesting", () => {
      const config = {
        topic: {
          key: {
            proxy: true,
            type: "string",
          },
          proxy: [
            "a.b.c.d.e",
            "a.b.f[*].g",
            "a.b.f[*].h[*].i",
            "a.b.f[*].h[*].j.k",
          ],
          alter: [
            {
              name: "a.b.f[*].l",
              type: "string",
              format: "hashed.string",
            },
            {
              name: "a.b.f[*].h[*].m",
              type: "string",
              format: "hashed.string",
            },
          ],
        },
      } as IConfig;

      const msg = {
        key: "c7810d50-d607-47e9-9caf-68d07a17fe2a",
        a: {
          b: {
            c: {
              d: {
                e: 1,
              },
            },
            f: [
              {
                g: "test",
                h: [{
                  i: "12345",
                  j: {
                    k: true,
                    pickupTime: "2018-03-27T13:42:00Z",
                  },
                }],
              }],
          },
        },
      };
      expect(mapMessage(config, { key: msg.key, value: msg }))
        .to.deep.equal({
          key: "c7810d50-d607-47e9-9caf-68d07a17fe2a",
          value:
            "{\"a\":{\"b\":{\"c\":{\"d\":{\"e\":1}}," +
            "\"f\":[{\"g\":\"test\",\"h\":[{\"i\":\"12345\",\"j\":{\"k\":true}}]}]}}}",
        });
    });

    it("should proxy message based on the config", () => {
      const config = {
        topic: {
          proxy: [
            "test",
            "a[*]",
            "b[*]c",
            "b[*].d",
            "c[*][*]",
            "d[*][*]e",
            "d[*][*].f",
            "g[*]h[*]",
            "i[*].j[*]",
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
      expect(mapMessage(config, { value: { b: [{ c: 1, d: 2, x: 3 }] } }))
        .to.deep.equal({ key: null, value: "{\"b\":[{\"c\":1,\"d\":2}]}" });
      expect(mapMessage(config, { value: { c: [[1], [2, 3]] } }))
        .to.deep.equal({ key: null, value: "{\"c\":[[1],[2,3]]}" });
      expect(mapMessage(config, { value: { d: [[{ e: 1, x: 2 }], [{ e: 2, x: 3 }, { e: 3, x: 4 }]] } }))
        .to.deep.equal({ key: null, value: "{\"d\":[[{\"e\":1}],[{\"e\":2},{\"e\":3}]]}" });
      expect(mapMessage(config, { value: { d: [[{ f: 1, x: 2 }], [{ f: 2, x: 3 }, { f: 3, x: 4 }]] } }))
        .to.deep.equal({ key: null, value: "{\"d\":[[{\"f\":1}],[{\"f\":2},{\"f\":3}]]}" });
      expect(mapMessage(config, { value: { g: [{ h: [1, 2] }, { y: [2, 3] }] } }))
        .to.deep.equal({ key: null, value: "{\"g\":[{\"h\":[1,2]}]}" });
      expect(mapMessage(config, { value: { i: [{ j: [1, 2] }, { y: [2, 3] }] } }))
        .to.deep.equal({ key: null, value: "{\"i\":[{\"j\":[1,2]}]}" });
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

    it("should map message with x[*]y", () => {
      const config = {
        topic: {
          alter: [
            {
              name: "x[*]y",
              type: "integer",
              format: "random.number",
            },
          ],
        },
      } as IConfig;
      const outputMessage = mapMessage(config, { value: { x: [{ y: 1 }, { a: 1 }, { b: "" }] } });
      expect(outputMessage.key).to.be.equal(null);
      const value = JSON.parse(outputMessage.value);
      expect(value.x.length).to.be.equal(1);
      expect(value.x[0].y).to.be.a("number");
    });

    it("should map message with x.y[*].z", () => {
      const config = {
        topic: {
          alter: [
            {
              name: "x.y[*].z",
              type: "string",
              format: "hashed.string",
            },
          ],
        },
      } as IConfig;
      const outputMessage = mapMessage(config, { value: { x: { y: [{ z: "12345" }] } } });
      expect(outputMessage.key).to.be.equal(null);
      const value = JSON.parse(outputMessage.value);
      expect(value.x).to.be.an("object");
      expect(value.x.y).to.be.an("array");
      expect(value.x.y[0].z).to.be.a("string");
    });

    it("should map message with x[*].x", () => {
      const config = {
        topic: {
          alter: [
            {
              name: "x[*].y",
              type: "integer",
              format: "random.number",
            },
          ],
        },
      } as IConfig;
      const outputMessage = mapMessage(config, { value: { x: [{ y: 1 }, { a: 1 }, { b: "" }] } });
      expect(outputMessage.key).to.be.equal(null);
      const value = JSON.parse(outputMessage.value);
      expect(value.x).to.have.length(1);
      expect(value.x[0].y).to.be.a("number");
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

  it("should map message with hashed.queryParam", () => {
    const config = {
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
    } as IConfig;
    const outputMessage = mapMessage(
      config,
      { value: { someURL: "/home/page?param=e3712624-2373-4316-95d0-04a4c18845fa" } },
    );
    const urlWithHashedParam = JSON.parse(outputMessage.value).someURL;
    expect(urlWithHashedParam).to.equal("/home/page?param=38965224-2373-4316-95d0-04a4c1286198");
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
    expect(hashedUUID).to.equal("27364565-a3d4-4a7f-b4c5-7f0099185599");
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

  it("should map message with hashed.alphanumerical and acknowledge dashes", () => {
    const config = {
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
    } as IConfig;
    const outputMessage = mapMessage(config, { value: { someString: "A-1B2-C3D-4E5" } });
    const hashedString = JSON.parse(outputMessage.value).someString;
    expect(hashedString).to.equal("A-NBP-P9B-7PK");
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
