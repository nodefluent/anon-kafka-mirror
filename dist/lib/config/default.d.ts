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
            "auto.offset.reset": string;
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
};
export default config;
