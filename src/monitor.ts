/**
 * Perf Monitor — Runtime performance tracking for extensions
 */

export interface PerfMetrics { storageReadMs: number; storageWriteMs: number; messageLatencyMs: number; wakeTimeMs: number; timestamp: number; }

export class PerfMonitorError extends Error {
    constructor(
        message: string,
        public code: string,
        public originalError?: Error
    ) {
        super(message);
        this.name = 'PerfMonitorError';
        if (originalError?.stack) {
            this.stack = originalError.stack;
        }
    }
}

export const PerfMonitorErrorCode = {
    BENCHMARK_FAILED: 'BENCHMARK_FAILED',
    SAVE_FAILED: 'SAVE_FAILED',
    INVALID_PARAMS: 'INVALID_PARAMS',
} as const;

export class PerfMonitor {
    private metrics: PerfMetrics[] = [];
    private maxHistory: number;

    constructor(maxHistory: number = 100) { 
        if (maxHistory < 1 || maxHistory > 10000) {
            throw new PerfMonitorError(
                `Invalid maxHistory: ${maxHistory}. Must be between 1 and 10000.`,
                PerfMonitorErrorCode.INVALID_PARAMS
            );
        }
        this.maxHistory = maxHistory; 
    }

    /** Benchmark storage read speed */
    async benchmarkStorageRead(key: string = '__perf_test__'): Promise<number> {
        if (!key || typeof key !== 'string') {
            throw new PerfMonitorError(
                `Invalid key: ${key}. Must be a non-empty string.`,
                PerfMonitorErrorCode.INVALID_PARAMS
            );
        }
        try {
            await chrome.storage.local.set({ [key]: { test: true, ts: Date.now() } });
            const start = performance.now();
            await chrome.storage.local.get(key);
            const duration = performance.now() - start;
            await chrome.storage.local.remove(key);
            return Math.round(duration * 100) / 100;
        } catch (error) {
            const err = error as Error;
            throw new PerfMonitorError(
                `Storage read benchmark failed: ${err.message}. ` +
                `Check if storage.local is available and has sufficient quota.`,
                PerfMonitorErrorCode.BENCHMARK_FAILED,
                err
            );
        }
    }

    /** Benchmark storage write speed */
    async benchmarkStorageWrite(sizeBytes: number = 1024): Promise<number> {
        if (sizeBytes < 1 || sizeBytes > 1024 * 1024) {
            throw new PerfMonitorError(
                `Invalid sizeBytes: ${sizeBytes}. Must be between 1 and 1048576 (1MB).`,
                PerfMonitorErrorCode.INVALID_PARAMS
            );
        }
        try {
            const data = 'x'.repeat(sizeBytes);
            const start = performance.now();
            await chrome.storage.local.set({ __perf_write__: data });
            const duration = performance.now() - start;
            await chrome.storage.local.remove('__perf_write__');
            return Math.round(duration * 100) / 100;
        } catch (error) {
            const err = error as Error;
            throw new PerfMonitorError(
                `Storage write benchmark failed: ${err.message}. ` +
                `Check if storage.local has sufficient quota for ${sizeBytes} bytes.`,
                PerfMonitorErrorCode.BENCHMARK_FAILED,
                err
            );
        }
    }

    /** Measure message round-trip latency */
    async benchmarkMessageLatency(): Promise<{ latencyMs: number; error?: string }> {
        const start = performance.now();
        try {
            await chrome.runtime.sendMessage({ type: '__perf_ping__' });
            return { latencyMs: Math.round((performance.now() - start) * 100) / 100 };
        } catch (error) {
            // This often fails when there's no listener - which is expected for a benchmark
            const err = error as Error;
            return { 
                latencyMs: Math.round((performance.now() - start) * 100) / 100,
                error: err.message || 'No listener (this is normal if no background handler)'
            };
        }
    }

    /** Time an async operation */
    async time<T>(label: string, fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
        if (!label || typeof label !== 'string') {
            throw new PerfMonitorError(
                `Invalid label: ${label}. Must be a non-empty string.`,
                PerfMonitorErrorCode.INVALID_PARAMS
            );
        }
        if (typeof fn !== 'function') {
            throw new PerfMonitorError(
                'Invalid function provided to time(). Must be a function.',
                PerfMonitorErrorCode.INVALID_PARAMS
            );
        }
        const start = performance.now();
        const result = await fn();
        const durationMs = Math.round((performance.now() - start) * 100) / 100;
        console.log(`[Perf] ${label}: ${durationMs}ms`);
        return { result, durationMs };
    }

    /** Run full benchmark suite */
    async runBenchmark(): Promise<PerfMetrics> {
        try {
            const storageReadMs = await this.benchmarkStorageRead();
            const storageWriteMs = await this.benchmarkStorageWrite();
            const messageLatencyResult = await this.benchmarkMessageLatency();
            const messageLatencyMs = messageLatencyResult.latencyMs;
            const wakeTimeMs = performance.now();
            const metrics: PerfMetrics = { storageReadMs, storageWriteMs, messageLatencyMs, wakeTimeMs, timestamp: Date.now() };
            this.metrics.push(metrics);
            if (this.metrics.length > this.maxHistory) this.metrics.shift();
            return metrics;
        } catch (error) {
            const err = error as Error;
            throw new PerfMonitorError(
                `Benchmark failed: ${err.message}`,
                PerfMonitorErrorCode.BENCHMARK_FAILED,
                err
            );
        }
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
    async save(): Promise<void> {
        try {
            await chrome.storage.local.set({ __perf_metrics__: this.metrics });
        } catch (error) {
            const err = error as Error;
            throw new PerfMonitorError(
                `Failed to save metrics: ${err.message}. ` +
                `Check if storage quota is sufficient.`,
                PerfMonitorErrorCode.SAVE_FAILED,
                err
            );
        }
    }
}
