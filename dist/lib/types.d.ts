import { KafkaStreamsConfig } from "kafka-streams";
import { Logger, LoggerOptions } from "pino";
export interface ITopicConfig {
    name: string;
    newName?: string;
    key: {
        proxy: boolean;
        type?: string;
        format?: string;
        ignoreLeft?: number;
        ignoreRight?: number;
        upperCase?: boolean;
        prefixLength?: number;
        prefix?: string;
        paramName?: string;
        paramFormat?: string;
    };
    proxy: string[];
    alter: Array<{
        name: string;
        type?: string;
        format: string;
        ignoreLeft?: number;
        ignoreRight?: number;
        upperCase?: boolean;
        prefixLength?: number;
        prefix?: string;
        paramName?: string;
        paramFormat?: string;
    }>;
}
export interface IConfig {
    logger?: LoggerOptions;
    consumer: KafkaStreamsConfig;
    producer: {
        noptions: {
            [key: string]: string;
        };
        tconf: {
            [key: string]: string | number;
        };
        logger?: Logger;
    };
    topic: ITopicConfig;
    metrics: {
        port: number;
        probeIntervalMs: number;
    };
}
