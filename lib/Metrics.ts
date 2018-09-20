import * as gcProfiler from "gc-profiler";
import * as promClient from "prom-client";

export default class Metrics {

  // express request handler which exposes the metrics
  public static exposeMetricsRequestHandler(req, res) {
    // set header due to https://prometheus.io/docs/instrumenting/exposition_formats/#format-version-0.0.4
    res.set("Content-Type", "text/plain; version=0.0.4");
    res.status(200).end(promClient.register.metrics());
  }
  public errorCounter: promClient.Counter;
  public transformedCounter: promClient.Counter;
  public defaultMetricsInterval: number;
  public httpServerResponseDurationHistogram: promClient.Histogram;
  public gcHistogram: promClient.Histogram;
  public config: any;

  constructor(config) {
    this.config = config;
    this.gcHistogram = new promClient.Histogram({
      name: "nodejs_gc_duration_seconds",
      help: "Node.js Garbage Collection timings, labeled by type",
      labelNames: ["type"],
      buckets: [0.001, 0.005, 0.010, 0.025, 0.050, 0.075, 0.100, 0.250, 0.5, 1],
    });
    this.httpServerResponseDurationHistogram = new promClient.Histogram({
      name: "http_server_request_duration_seconds",
      help: "HTTP server request durations",
      labelNames: ["statusCode", "method"],
    });
    this.transformedCounter = new promClient.Counter({
      name: "anon_kafka_mirror_total_transformed",
      help: "Total transformed kafka messages",
    });
  }

  public startTimer() {
    const start = process.hrtime();
    return () => {
      const delta = process.hrtime(start);
      return (delta[0] * 1e9 + delta[1]) / 1e9;
    };
  }

  public collect(expressApp) {
    this.defaultMetricsInterval = promClient.collectDefaultMetrics({
      timeout: this.config.probeIntervalMs,
    });

    gcProfiler.on("gc", (event) => this.gcHistogram.observe({ type: event.type }, event.duration / 1000));

    expressApp.use(this.makeHttpServerResponseDurationMiddleware());
  }

  public makeHttpServerResponseDurationMiddleware() {
    return (req, res, next) => {
      const timer = this.startTimer();
      res.on(
        "finish",
        () => this.httpServerResponseDurationHistogram.observe(
          { method: req.method, statusCode: res.statusCode },
          timer()));
      next();
    };
  }

  // disables all prom-client metrics
  public disable() {
    clearInterval(this.defaultMetricsInterval);
    promClient.register.clear();
  }
}
