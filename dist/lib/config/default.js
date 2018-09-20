"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var config = {
    logger: {
        level: "info",
        name: "anon-kafka-mirror",
        prettyPrint: process.env.NODE_ENV !== "production",
    },
    consumer: {
        noptions: {
            "metadata.broker.list": "",
            "group.id": "",
        },
        tconf: {
            "auto.offset.reset": "earliest",
        },
        logger: null,
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
        logger: null,
    },
    topic: {
        name: "",
        newName: "",
        key: {
            proxy: false,
            type: "string",
        },
        proxy: ["bla.blup", "derp", "xyz"],
        alter: [{
                name: "id",
                type: "string",
                format: "random.uuid",
            },
            {
                name: "mail",
                dataType: "string",
                format: "internet.email",
            },
            {
                name: "kaese.relation_id",
                type: "integer",
                format: "random.number",
            }],
    },
    metrics: {
        port: 8383,
        probeIntervalMs: 5000,
    },
};
exports.default = config;
//# sourceMappingURL=default.js.map