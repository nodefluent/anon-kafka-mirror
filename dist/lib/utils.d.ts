export declare const arrayMatch: RegExp;
export declare const splitPath: (path: string) => (string | number)[];
export declare const isUUIDRegExp: RegExp;
export declare const hashUUID: (uuid: string) => string;
export declare const hashQueryParam: (input: string, paramName?: string, paramFormat?: string) => string;
export declare const hashString: (input: string, ignoreLeft?: number, ignoreRight?: number) => string;
export declare const hashAlphanumerical: (input: string, ignoreLeft?: number, upperCase?: boolean) => string;
export declare const hashLuhnString: (input: string, prefixLength?: number, prefix?: string) => string;
