import { KafkaStreamsConfig } from "kafka-streams";
import { Logger, LoggerOptions } from "pino";

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
  consumer: KafkaStreamsConfig;
  producer: {
    noptions: {
      [key: string]: string;
    },
    tconf: {
      [key: string]: string | number;
    },
    logger?: Logger;
  };
  topic: ITopicConfig;
  metrics: {
    port: number,
    probeIntervalMs: number,
  };
}
