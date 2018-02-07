"use strict";

const config = {
  logger: {
    productionMode: false,
    logDir: "logs",
    skipEnhance: true,
    namespace: "",
    silence: false,
    loggerName: "dev",
    dockerMode: false,
    varKey: "LOG",
    level: "INFO",
    serviceName: "anon-kafka-mirror"
  },
  consumer: {
    noptions: {
      "metadata.broker.list": "localhost:9092",
      "group.id": "anon-kafka-default",
    },
    tconf: {
      "auto.offset.reset": "earliest",
    },
  },
  producer: {
    noptions: {
      "metadata.broker.list": "localhost:9092",
      "group.id": "anon-kafka-default",
    },
    tconf: {
      "request.required.acks": 1,
    },
  },
  topic: {
    name: "test",
    key: {
      proxy: false,
      dataType: "string",
      synType: null
    },
    proxy: ["bla.blup", "derp", "xyz"],
    alter: [
      {
        name: "id",
        dataType: "string",
        synType: "uuid4"
      },
      {
        name: "mail",
        dataType: "string",
        synType: "email" //<- https://github.com/marak/Faker.js/
      },
      {
        name: "kaese.relation_id",
        dataType: "number",
        synType: null
      }
    ]
  }
};

/*
const config = {
    consumeKafka: { .. }, //<- sinek
    produceKafka: { .. },
    topics: {
        topic1: {
            key: { //if key cant be proxied, it must be deterministic! z.b. murmurhash3
                proxy: false,
                dataType: "string",
                synType: null //<- https://github.com/marak/Faker.js/
            },
            proxy: ["bla.blup", "derp", "xyz"],
            alter: [
                {
                    name: "id",
                    dataType: "string",
                    synType: "uuid4"
                },
                {
                    name: "mail",
                    dataType: "string",
                    synType: "email" //<- https://github.com/marak/Faker.js/
                },
                {
                    name: "kaese.relation_id",
                    dataType: "number",
                    synType: null
                }
            ]
        }
    }
};

const consumedMessage = {
    key: "123123123"
    value: {
        bla: {
            blup: "abc",
            "hans": "peter"
        },
        derp: "abc",
        xyz: "abc",
        id: "1234-1234-1234-1234",
        mail: "bla@blup.de",
        kaese: {
            "relation_id": 123456,
            more: "xd"
        },
        hihi: "bla"
    }
};

const expectedMessage = {
    key: "43214312"
    value: {
        bla: {
            blup: "abc"
        },
        derp: "abc",
        xyz: "abc",
        id: "4312-4321-1432-4312",
        mail: "xyz@lulz.de",
        kaese: {
            "relation_id": 56789
        }
    }
};
*/

module.exports = config;
