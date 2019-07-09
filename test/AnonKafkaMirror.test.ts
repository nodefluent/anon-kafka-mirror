import { expect } from "chai";
import "mocha";
import { mapMessage } from "../lib/AnonKafkaMirror";
import { IConfig } from "../lib/types";

// tslint:disable:no-unused-expression
describe("AnonKafkaMirror", () => {

  context("mapMessage", () => {

    describe("proxy the key", () => {

      it("should proxy a null key", () => {
        const config = { name: "test", key: { proxy: true }, proxy: [], alter: [] };
        const message = { key: null, value: null };
        expect(mapMessage(config, message)).to.deep.equal({ key: null, value: null });
      });

      it("should proxy a number key", () => {
        const config = { name: "test", key: { proxy: true, type: "number" }, proxy: [], alter: [] };
        const message = { key: 123, value: null };
        expect(mapMessage(config, message)).to.deep.equal({ key: 123, value: null });
      });

      it("should proxy a string key", () => {
        const config = { name: "test", key: { proxy: true, type: "string" }, proxy: [], alter: [] };
        const message = { key: "123", value: null };
        expect(mapMessage(config, message)).to.deep.equal({ key: "123", value: null });
      });
    });

    describe("alter the key", () => {

      it("should hash a uuid key", () => {
        const config = {
          name: "test",
          key: { proxy: false, type: "string", format: "hashed.uuid" },
          proxy: [],
          alter: [],
        };
        const message = { key: "9ad4722c-0b5b-47e5-8d23-8122b0bc29c5", value: null };
        expect(mapMessage(config, message)).to.deep.equal({ key: "2904842c-0b5b-47e5-8d23-8122b0328437", value: null });
      });
    });

    describe("proxy properties in the value", () => {

      it("should proxy properties with multiple levels of nesting", () => {
        const config = {
          name: "test",
          key: { proxy: true, type: "string" },
          proxy: [
            "a.b.c.d.e",
            "a.b.f[*].g",
            "a.b.f[*].h[*].i",
            "a.b.f[*].h[*].j.k",
          ],
          alter: [
            { name: "a.b.f[*].l", type: "string", format: "hashed.string" },
            { name: "a.b.f[*].h[*].m", type: "string", format: "hashed.string" },
          ],
        };

        const message = {
          key: "c7810d50-d607-47e9-9caf-68d07a17fe2a",
          a: {
            b: {
              c: {
                d: { e: 1 },
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
        expect(mapMessage(config, { key: message.key, value: message }))
          .to.deep.equal({
            key: "c7810d50-d607-47e9-9caf-68d07a17fe2a",
            value:
              "{\"a\":{\"b\":{\"c\":{\"d\":{\"e\":1}}," +
              "\"f\":[{\"g\":\"test\",\"h\":[{\"i\":\"12345\",\"j\":{\"k\":true}}]}]}}}",
          });
      });

      it("should proxy properties and arrays with and without dot notation", () => {
        const config = {
          name: "test",
          key: { proxy: true },
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
          alter: [],
        };
        expect(mapMessage(config, {})).to.deep.equal({ key: null, value: null });
        expect(mapMessage(config, { value: "" })).to.deep.equal({ key: null, value: "" });
        expect(mapMessage(config, { value: null })).to.deep.equal({ key: null, value: null });
        expect(mapMessage(config, { value: {} })).to.deep.equal({ key: null, value: "{}" });
        expect(mapMessage(config, { value: { x: 1 } })).to.deep.equal({ key: null, value: "{}" });

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

      it("should proxy arrays of values and objects only with matching content", () => {
        const config = {
          name: "test",
          key: { proxy: true },
          proxy: [
            "a[*]",
            "b[*]d",
            "b[*]c",
          ],
          alter: [],
        };
        expect(mapMessage(config, { value: { a: [1, null, 3] } }))
          .to.deep.equal({ key: null, value: "{\"a\":[1,3]}" });
        expect(mapMessage(config, { value: { b: [{ d: 1 }, null, { e: 1 }, { c: 1 }] } }))
          .to.deep.equal({ key: null, value: "{\"b\":[{\"d\":1},{\"c\":1}]}" });
      });
    });

    describe("alter properties in the value", () => {

      it("should alter numbers in an array", () => {
        const config = {
          name: "test",
          key: { proxy: true },
          proxy: [],
          alter: [
            {
              name: "y[*]",
              type: "integer",
              format: "random.number",
            },
          ],
        };
        const outputMessage = mapMessage(config, { value: { y: [1, 2, 3] } });
        expect(outputMessage.key).to.be.equal(null);
        const y = JSON.parse(outputMessage.value).y;
        expect(y[0]).to.be.a("number");
        expect(y[1]).to.be.a("number");
        expect(y[2]).to.be.a("number");
      });

      it("should alter a number in an array of objects without dot notation", () => {
        const config = {
          name: "test",
          key: { proxy: true },
          proxy: [],
          alter: [
            {
              name: "x[*]y",
              type: "integer",
              format: "random.number",
            },
          ],
        };
        const outputMessage = mapMessage(config, { value: { x: [{ y: 1 }, { a: 1 }, { b: "" }] } });
        expect(outputMessage.key).to.be.equal(null);
        const value = JSON.parse(outputMessage.value);
        expect(value.x.length).to.be.equal(1);
        expect(value.x[0].y).to.be.a("number");
      });

      it("should alter a string in an array of objects with dot notation", () => {
        const config = {
          name: "test",
          key: { proxy: true },
          proxy: [],
          alter: [
            {
              name: "x.y[*].z",
              type: "string",
              format: "hashed.string",
            },
          ],
        };
        const outputMessage = mapMessage(config, { value: { x: { y: [{ z: "12345" }] } } });
        expect(outputMessage.key).to.be.equal(null);
        const value = JSON.parse(outputMessage.value);
        expect(value.x).to.be.an("object");
        expect(value.x.y).to.be.an("array");
        expect(value.x.y[0].z).to.be.a("string");
      });

      it("should alter a nested array of strings", () => {
        const config = {
          name: "test",
          key: { proxy: true },
          proxy: [],
          alter: [
            {
              name: "z[*][*]",
              type: "string",
              format: "lorem.word",
            },
          ],
        };
        const outputMessage = mapMessage(config, { value: { z: [["a", "b"], ["c"]], a: 1, b: { c: 2 } } });
        expect(outputMessage.key).to.be.equal(null);
        const value = JSON.parse(outputMessage.value);
        expect(value.z.length).to.be.equal(2);
        expect(value.z[0][0]).to.be.an("string");
        expect(value.a).to.be.not.ok;
        expect(value.b).to.be.not.ok;
      });

      it("should alter a nested array of objects", () => {
        const config = {
          name: "test",
          key: { proxy: true },
          proxy: [],
          alter: [
            {
              name: "z[*][*]y",
              type: "string",
              format: "lorem.word",
            },
          ],
        };
        const outputMessage = mapMessage(
          config,
          {
            value: { z: [[{ y: "a" }, { y: "b" }], [{ y: "c" }]], a: 1, b: { c: 2 } },
          });
        expect(outputMessage.key).to.be.null;
        const value = JSON.parse(outputMessage.value);
        expect(value.z).to.have.length(2);
        expect(value.z[0][0].y).to.be.a("string");
        expect(value.a).to.be.not.ok;
        expect(value.b).to.be.not.ok;
      });

      it("should alter arrays of values and objects only with matching content", () => {
        const config = {
          name: "test",
          key: { proxy: true },
          proxy: [],
          alter: [
            {
              name: "a[*]",
              type: "number",
              format: "random.number",
            },
            {
              name: "b[*]d",
              type: "number",
              format: "random.number",
            },
            {
              name: "b[*]c",
              type: "number",
              format: "random.number",
            },
          ],
        };
        const result = mapMessage(
          config,
          {
            value: {
              a: [1, null, 3],
              b: [{ d: 1 }, null, { e: 1 }, { c: 1 }],
            },
          });
        const value = JSON.parse(result.value);
        expect(value.a).to.have.length(2);
        expect(value.b).to.have.length(2);
      });

      it("should hash uuids in query parameters", () => {
        const config = {
          name: "test",
          key: { proxy: true },
          proxy: [],
          alter: [
            {
              name: "someURL",
              type: "string",
              format: "hashed.queryParam",
              paramName: "param",
              paramFormat: "hashed.uuid",
            },
          ],
        };
        const outputMessage = mapMessage(
          config,
          { value: { someURL: "/home/page?param=e3712624-2373-4316-95d0-04a4c18845fa" } },
        );
        const urlWithHashedParam = JSON.parse(outputMessage.value).someURL;
        expect(urlWithHashedParam).to.equal("/home/page?param=38965224-2373-4316-95d0-04a4c1286198");
      });

      it("should hash a uuid", () => {
        const config = {
          name: "test",
          key: { proxy: true },
          proxy: [],
          alter: [
            {
              name: "someUUID",
              type: "string",
              format: "hashed.uuid",
            },
          ],
        };
        const outputMessage = mapMessage(config, { value: { someUUID: "fd8acd65-a3d4-4a7f-b4c5-7f0099052884" } });
        const hashedUUID = JSON.parse(outputMessage.value).someUUID;
        expect(hashedUUID).to.equal("27364565-a3d4-4a7f-b4c5-7f0099185599");
      });

      it("should hash a string", () => {
        const config = {
          name: "test",
          key: { proxy: true },
          proxy: [],
          alter: [
            {
              name: "someString",
              type: "string",
              format: "hashed.string",
            },
          ],
        };
        const outputMessage = mapMessage(config, { value: { someString: "2401234567899" } });
        const hashedString = JSON.parse(outputMessage.value).someString;
        expect(hashedString).to.equal("2582443132258");
      });

      it("should hash a string in pattern matched properties", () => {
        const config = {
          name: "test",
          key: { proxy: true },
          proxy: [],
          alter: [
            {
              name: "someObject",
              pattern: "abc%7c_.+_part",
              type: "string",
              format: "hashed.string",
            },
          ],
        };
        const outputMessage = mapMessage(
          config,
          {
            value: {
              someObject: {
                "abc%7c_ignorethis_part": "2401234567899",
                "abc%7c_thistoo_part": "2401234567899",
                "abc_thisisdropped_part": "123",
              },
            },
          });
        const parsedMessage = JSON.parse(outputMessage.value);
        expect(parsedMessage.someObject["abc%7c_ignorethis_part"]).to.equal("2582443132258");
        expect(parsedMessage.someObject["abc%7c_thistoo_part"]).to.equal("2582443132258");
        expect(parsedMessage.someObject.abc_thisisdropped_part).to.be.undefined;
      });

      it("should hash a string and ignore left chars", () => {
        const config = {
          name: "test",
          key: { proxy: true },
          proxy: [],
          alter: [
            {
              name: "someString",
              type: "string",
              format: "hashed.string",
              ignoreLeft: 3,
            },
          ],
        };
        const outputMessage = mapMessage(config, { value: { someString: "2401234567899" } });
        const hashedString = JSON.parse(outputMessage.value).someString;
        expect(hashedString).to.equal("2401462429965");
      });

      it("should hash a string and ignore right chars", () => {
        const config = {
          name: "test",
          key: { proxy: true },
          proxy: [],
          alter: [
            {
              name: "someString",
              type: "string",
              format: "hashed.string",
              ignoreRight: 3,
            },
          ],
        };
        const outputMessage = mapMessage(config, { value: { someString: "2401234567899" } });
        const hashedString = JSON.parse(outputMessage.value).someString;
        expect(hashedString).to.equal("3173783966899");
      });

      it("should hash a string and ignore left and right chars", () => {
        const config = {
          name: "test",
          key: { proxy: true },
          proxy: [],
          alter: [
            {
              name: "someString",
              type: "string",
              format: "hashed.string",
              ignoreLeft: 3,
              ignoreRight: 2,
            },
          ],
        };
        const outputMessage = mapMessage(config, { value: { someString: "2401234567899" } });
        const hashedString = JSON.parse(outputMessage.value).someString;
        expect(hashedString).to.equal("2401293827499");
      });

      it("should hashed an alphanumerical string and keep dashes", () => {
        const config = {
          name: "test",
          key: { proxy: true },
          proxy: [],
          alter: [
            {
              name: "someString",
              type: "string",
              format: "hashed.alphanumerical",
              ignoreLeft: 2,
              upperCase: true,
            },
          ],
        };
        const outputMessage = mapMessage(config, { value: { someString: "A-1B2-C3D-4E5" } });
        const hashedString = JSON.parse(outputMessage.value).someString;
        expect(hashedString).to.equal("A-NBP-P9B-7PK");
      });

      it("should hash a luhn encoded string and prefix length", () => {
        const config = {
          name: "test",
          key: { proxy: true },
          proxy: [],
          alter: [
            {
              name: "someString",
              type: "string",
              format: "luhn.string",
              prefixLength: 3,
            },
          ],
        };
        const outputMessage = mapMessage(config, { value: { someString: "1231234567891" } });
        const hashedString = JSON.parse(outputMessage.value).someString;
        expect(hashedString).to.equal("1232843971175");
      });

      it("should hash a luhn encoded string with a given prefix", () => {
        const config = {
          name: "test",
          key: { proxy: true },
          proxy: [],
          alter: [
            {
              name: "someString",
              type: "string",
              format: "luhn.string",
              prefix: "123",
            },
          ],
        };
        const outputMessage = mapMessage(config, { value: { someString: "1234567891" } });
        const hashedString = JSON.parse(outputMessage.value).someString;
        expect(hashedString).to.equal("2843971175");
      });
    });
  });
});
