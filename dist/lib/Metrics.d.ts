import * as promClient from "prom-client";
export default class Metrics {
    static exposeMetricsRequestHandler(req: any, res: any): void;
    errorCounter: promClient.Counter;
    transformedCounter: promClient.Counter;
    defaultMetricsInterval: number;
    httpServerResponseDurationHistogram: promClient.Histogram;
    gcHistogram: promClient.Histogram;
    config: any;
    constructor(config: any);
    startTimer(): () => number;
    collect(expressApp: any): void;
    makeHttpServerResponseDurationMiddleware(): (req: any, res: any, next: any) => void;
    disable(): void;
}
