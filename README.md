# chrome-perf-monitor — Runtime Performance Monitoring
> **Built by [Zovo](https://zovo.one)** | `npm i chrome-perf-monitor`

Benchmark storage read/write, message latency, time any operation, and track historical averages.

```typescript
import { PerfMonitor } from 'chrome-perf-monitor';
const perf = new PerfMonitor();
const metrics = await perf.runBenchmark();
const { result, durationMs } = await perf.time('API call', () => fetch(url));
const avgs = perf.getAverages();
```
MIT License
