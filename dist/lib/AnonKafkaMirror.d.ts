import Metrics from "./Metrics";
import { IConfig, ITopicConfig } from "./types";
export declare const mapMessage: (config: ITopicConfig, jsonMessage: any) => any;
export declare class AnonKafkaMirror {
    config: IConfig;
    app: any;
    metrics: Metrics;
    alive: boolean;
    server: any;
    private consumer;
    private producer;
    constructor(config: IConfig);
    run(): Promise<void>;
    private handleSingleTopic;
    private processBatch;
    private processPartition;
}
