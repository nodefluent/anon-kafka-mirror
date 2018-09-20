"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var gcProfiler = require("gc-profiler");
var promClient = require("prom-client");
var Metrics = (function () {
    function Metrics(config) {
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
    Metrics.exposeMetricsRequestHandler = function (req, res) {
        res.set("Content-Type", "text/plain; version=0.0.4");
        res.status(200).end(promClient.register.metrics());
    };
    Metrics.prototype.startTimer = function () {
        var start = process.hrtime();
        return function () {
            var delta = process.hrtime(start);
            return (delta[0] * 1e9 + delta[1]) / 1e9;
        };
    };
    Metrics.prototype.collect = function (expressApp) {
        var _this = this;
        this.defaultMetricsInterval = promClient.collectDefaultMetrics({
            timeout: this.config.probeIntervalMs,
        });
        gcProfiler.on("gc", function (event) { return _this.gcHistogram.observe({ type: event.type }, event.duration / 1000); });
        expressApp.use(this.makeHttpServerResponseDurationMiddleware());
    };
    Metrics.prototype.makeHttpServerResponseDurationMiddleware = function () {
        var _this = this;
        return function (req, res, next) {
            var timer = _this.startTimer();
            res.on("finish", function () { return _this.httpServerResponseDurationHistogram.observe({ method: req.method, statusCode: res.statusCode }, timer()); });
            next();
        };
    };
    Metrics.prototype.disable = function () {
        clearInterval(this.defaultMetricsInterval);
        promClient.register.clear();
    };
    return Metrics;
}());
exports.default = Metrics;
//# sourceMappingURL=Metrics.js.map