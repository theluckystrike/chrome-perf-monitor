/**
 * Perf Monitor — Runtime performance tracking for extensions
 */
export interface PerfMetrics { storageReadMs: number; storageWriteMs: number; messageLatencyMs: number; wakeTimeMs: number; timestamp: number; }

export class PerfMonitor {
    private metrics: PerfMetrics[] = [];
    private maxHistory: number;

    constructor(maxHistory: number = 100) { this.maxHistory = maxHistory; }

    /** Benchmark storage read speed */
    async benchmarkStorageRead(key: string = '__perf_test__'): Promise<number> {
        await chrome.storage.local.set({ [key]: { test: true, ts: Date.now() } });
        const start = performance.now();
        await chrome.storage.local.get(key);
        const duration = performance.now() - start;
        await chrome.storage.local.remove(key);
        return Math.round(duration * 100) / 100;
    }

    /** Benchmark storage write speed */
    async benchmarkStorageWrite(sizeBytes: number = 1024): Promise<number> {
        const data = 'x'.repeat(sizeBytes);
        const start = performance.now();
        await chrome.storage.local.set({ __perf_write__: data });
        const duration = performance.now() - start;
        await chrome.storage.local.remove('__perf_write__');
        return Math.round(duration * 100) / 100;
    }

    /** Measure message round-trip latency */
    async benchmarkMessageLatency(): Promise<number> {
        const start = performance.now();
        await chrome.runtime.sendMessage({ type: '__perf_ping__' }).catch(() => { });
        return Math.round((performance.now() - start) * 100) / 100;
    }

    /** Time an async operation */
    async time<T>(label: string, fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
        const start = performance.now();
        const result = await fn();
        const durationMs = Math.round((performance.now() - start) * 100) / 100;
        console.log(`[Perf] ${label}: ${durationMs}ms`);
        return { result, durationMs };
    }

    /** Run full benchmark suite */
    async runBenchmark(): Promise<PerfMetrics> {
        const storageReadMs = await this.benchmarkStorageRead();
        const storageWriteMs = await this.benchmarkStorageWrite();
        const messageLatencyMs = await this.benchmarkMessageLatency();
        const wakeTimeMs = performance.now();
        const metrics: PerfMetrics = { storageReadMs, storageWriteMs, messageLatencyMs, wakeTimeMs, timestamp: Date.now() };
        this.metrics.push(metrics);
        if (this.metrics.length > this.maxHistory) this.metrics.shift();
        return metrics;
    }

    /** Get metrics history */
    getHistory(): PerfMetrics[] { return [...this.metrics]; }

    /** Get averages */
    getAverages(): Omit<PerfMetrics, 'timestamp'> | null {
        if (!this.metrics.length) return null;
        const sum = this.metrics.reduce((acc, m) => ({
            storageReadMs: acc.storageReadMs + m.storageReadMs, storageWriteMs: acc.storageWriteMs + m.storageWriteMs,
            messageLatencyMs: acc.messageLatencyMs + m.messageLatencyMs, wakeTimeMs: acc.wakeTimeMs + m.wakeTimeMs, timestamp: 0,
        }));
        const n = this.metrics.length;
        return {
            storageReadMs: Math.round(sum.storageReadMs / n * 100) / 100, storageWriteMs: Math.round(sum.storageWriteMs / n * 100) / 100,
            messageLatencyMs: Math.round(sum.messageLatencyMs / n * 100) / 100, wakeTimeMs: Math.round(sum.wakeTimeMs / n * 100) / 100
        };
    }

    /** Save metrics to storage */
    async save(): Promise<void> { await chrome.storage.local.set({ __perf_metrics__: this.metrics }); }
}
