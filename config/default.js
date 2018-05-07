"use strict";

const config = {
    logger: {
        level: "info",
        name: "anon-kafka-mirror",
        prettyPrint: process.env.NODE_ENV !== "production"
    },
    consumer: {
        noptions: {
            "metadata.broker.list": "",
            "group.id": "",
        },
        tconf: {
            "auto.offset.reset": "earliest",
        },
    },
    producer: {
        noptions: {
            "metadata.broker.list": "",
            "group.id": "",
            "client.id": "anon-kafka-mirror",
        },
        tconf: {
            "request.required.acks": 1,
        },
    },
    topic: {
        name: "",
        newName: "",
        key: {
            proxy: false,
            type: "string"
        },
        proxy: ["bla.blup", "derp", "xyz"],
        alter: [{
            name: "id",
            type: "string",
            format: "random.uuid"
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
