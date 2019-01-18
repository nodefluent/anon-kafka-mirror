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
            ignoreLeft?: number;
            ignoreRight?: number;
            upperCase?: boolean;
        };
        proxy: string[];
        alter: Array<{
            name: string;
            type?: string;
            format?: string;
            ignoreLeft?: number;
            ignoreRight?: number;
            upperCase?: boolean;
            prefixLength?: number;
            prefix?: string;
        }>;
    };
    metrics: {
        port: number;
        probeIntervalMs: number;
    };
}
