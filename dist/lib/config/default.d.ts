declare const config: {
    logger: {
        level: string;
        name: string;
        prettyPrint: boolean;
    };
    consumer: {
        noptions: {
            "metadata.broker.list": string;
            "group.id": string;
        };
        tconf: {
            "auto.offset.reset": "earliest";
        };
        logger: any;
    };
    producer: {
        noptions: {
            "metadata.broker.list": string;
            "group.id": string;
            "client.id": string;
        };
        tconf: {
            "request.required.acks": number;
        };
        logger: any;
    };
    batchConfig: {
        batchSize: number;
        noBatchCommits: boolean;
        manualBatching: boolean;
        sortedManualBatch: boolean;
    };
    topic: {
        name: string;
        newName: string;
        key: {
            proxy: boolean;
            type: string;
        };
        proxy: string[];
        alter: ({
            name: string;
            type: string;
            format: string;
            dataType?: undefined;
        } | {
            name: string;
            dataType: string;
            format: string;
            type?: undefined;
        })[];
    };
    metrics: {
        port: number;
        probeIntervalMs: number;
    };
};
export default config;
