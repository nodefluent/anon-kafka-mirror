import { IConfig } from "./types";
export declare const clearConfig: (config: IConfig) => IConfig;
export declare const arrayMatch: RegExp;
export declare const splitPath: (path: string) => (string | number)[];
export declare const isUUIDRegExp: RegExp;
export declare const hashUUID: (uuid: string) => string;
