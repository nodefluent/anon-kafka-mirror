import { Logger, LoggerOptions } from "pino";
export interface IConfig {
    logger?: LoggerOptions;
    consumer: {
        noptions: {
            [key: string]: string;
        };
        tconf: {
            [key: string]: string;
        };
        logger?: Logger;
    };
    producer: {
        noptions: {
            [key: string]: string;
        };
        tconf: {
            [key: string]: string | number;
        };
        logger?: Logger;
    };
    topic: {
        name: string;
        newName?: string;
        key: {
            proxy: boolean;
            type?: string;
            format?: string;
        };
        proxy: string[];
        alter: Array<{
            name: string;
            type?: string;
            format?: string;
        }>;
    };
}
export declare const arrayMatch: RegExp;
export declare const splitPath: (path: string) => (string | number)[];
export declare const fake: (format: string) => string | number;
export declare const mapMessage: (config: IConfig, m: any) => any;
export declare class AnonKafkaMirror {
    config: IConfig;
    private stream;
    constructor(config: IConfig);
    run(): void;
}
