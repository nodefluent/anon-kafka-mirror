import Metrics from "./Metrics";
import { IConfig } from "./types";
export declare const mapMessage: (config: IConfig, m: any) => any;
export declare class AnonKafkaMirror {
    config: IConfig;
    app: any;
    metrics: Metrics;
    alive: boolean;
    server: any;
    private stream;
    constructor(config: IConfig);
    run(): any;
}
