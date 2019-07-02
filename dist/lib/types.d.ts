import { LoggerOptions } from "pino";
import { BatchConfig, KafkaConsumerConfig, KafkaProducerConfig } from "sinek";
export interface ITopicBatchResponse {
    hasErrors: boolean;
    lastSuccessfulOffsets: Array<{
        [partition: string]: number;
    }>;
}
export interface IFormatOptions {
    type?: string;
    ignoreLeft?: number;
    ignoreRight?: number;
    upperCase?: boolean;
    prefixLength?: number;
    prefix?: string;
    paramName?: string;
    paramFormat?: string;
}
export interface ITopicConfig {
    name: string;
    newName?: string;
    partitions?: number;
    key: {
        proxy: boolean;
        format?: string;
    } & IFormatOptions;
    proxy: string[];
    alter: Array<{
        name: string;
        pattern?: string;
        format: string;
    } & IFormatOptions>;
}
export interface IConfig {
    logger?: LoggerOptions;
    consumer: KafkaConsumerConfig;
    producer: KafkaProducerConfig;
    batchConfig: BatchConfig;
    topic: ITopicConfig;
    metrics: {
        port: number;
        probeIntervalMs: number;
    };
}
