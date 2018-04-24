"use strict";

const config = {
    logger: {
        level: "info",
        name: "anon-kafka-mirror",
        prettyPrint: process.env.NODE_ENV !== "production"
    },
    consumer: {
        noptions: {
            "metadata.broker.list": "localhost:9092",
            "group.id": "anon-kafka-default-1",
        },
        tconf: {
            "auto.offset.reset": "earliest",
        },
    },
    producer: {
        noptions: {
            "metadata.broker.list": "localhost:9092",
            "group.id": "anon-kafka-default-2",
            "client.id": "lol-was-geht-ab",
        },
        tconf: {
            "request.required.acks": 1,
        },
    },
    topic: {
        name: "test",
        newName: "test-new",
        key: {
            proxy: false,
            type: "string"
        },
        proxy: ["bla.blup", "derp", "xyz"],
        alter: [{
            name: "id",
            type: "string",
            format: "random.uuid4"
        },
        {
            name: "mail",
            dataType: "string",
            format: "internet.email" //<- https://github.com/marak/Faker.js/
        },
        {
            name: "kaese.relation_id",
            type: "integer",
            format: "random.number"
        }]
    }
};

module.exports = config;
