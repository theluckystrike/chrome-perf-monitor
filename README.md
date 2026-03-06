# chrome-perf-monitor

Runtime performance monitoring for Chrome extensions. Benchmarks storage throughput, message latency, and service worker wake time in MV3 environments.

INSTALL

```
npm install chrome-perf-monitor
```

QUICK START

```typescript
import { PerfMonitor } from 'chrome-perf-monitor';

const monitor = new PerfMonitor();

// run the full benchmark suite
const metrics = await monitor.runBenchmark();
console.log(metrics.storageReadMs);
console.log(metrics.storageWriteMs);
console.log(metrics.messageLatencyMs);
console.log(metrics.wakeTimeMs);
```

API

PerfMonitor class

Constructor takes an optional maxHistory parameter (defaults to 100) that controls how many benchmark snapshots are retained in memory.

```typescript
const monitor = new PerfMonitor(50);
```

benchmarkStorageRead(key?)

Writes a test record to chrome.storage.local, reads it back, removes it, and returns the read duration in milliseconds. The key parameter defaults to `__perf_test__`.

```typescript
const readMs = await monitor.benchmarkStorageRead();
```

benchmarkStorageWrite(sizeBytes?)

Writes a payload of the given size (default 1024 bytes) to chrome.storage.local, measures the write duration, cleans up, and returns the time in milliseconds.

```typescript
const writeMs = await monitor.benchmarkStorageWrite(2048);
```

benchmarkMessageLatency()

Sends a runtime message via chrome.runtime.sendMessage and returns the round-trip time in milliseconds. Failures are silently caught so the benchmark does not throw in contexts without a listener.

```typescript
const latencyMs = await monitor.benchmarkMessageLatency();
```

time(label, fn)

Generic timing wrapper for any async operation. Logs the duration to the console and returns both the result and the elapsed time.

```typescript
const { result, durationMs } = await monitor.time('fetch config', async () => {
  return await fetch('/config.json').then(r => r.json());
});
```

runBenchmark()

Runs all three benchmarks (storage read, storage write, message latency) in sequence, records the service worker wake time from performance.now(), and appends the snapshot to the internal history. Returns a PerfMetrics object.

```typescript
const metrics = await monitor.runBenchmark();
```

getHistory()

Returns a copy of all recorded PerfMetrics snapshots.

```typescript
const history = monitor.getHistory();
```

getAverages()

Computes the arithmetic mean of each metric across all recorded snapshots. Returns null if no benchmarks have been run yet.

```typescript
const avg = monitor.getAverages();
if (avg) {
  console.log('avg read', avg.storageReadMs);
}
```

save()

Persists the current metrics history to chrome.storage.local under the key `__perf_metrics__`.

```typescript
await monitor.save();
```

PerfMetrics type

```typescript
interface PerfMetrics {
  storageReadMs: number;
  storageWriteMs: number;
  messageLatencyMs: number;
  wakeTimeMs: number;
  timestamp: number;
}
```

REQUIREMENTS

- Chrome extension environment with access to chrome.storage.local and chrome.runtime
- Manifest V3 compatible
- TypeScript 5.x

BUILD FROM SOURCE

```
git clone https://github.com/theluckystrike/chrome-perf-monitor.git
cd chrome-perf-monitor
npm install
npm run build
```

Output lands in the dist/ directory.

LICENSE

MIT. See LICENSE file for details.

---

A zovo.one project. Built by theluckystrike.
