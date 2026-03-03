# chrome-perf-monitor

Monitor page performance in Chrome extensions.

## Overview

chrome-perf-monitor provides utilities to measure and track page performance metrics.

## Installation

```bash
npm install chrome-perf-monitor
```

## Usage

```javascript
import { PerfMonitor } from 'chrome-perf-monitor';

const metrics = await PerfMonitor.getMetrics();
console.log(metrics.FCP, metrics.LCP);
```

## API

- `getMetrics()` - Get performance metrics
- `on('metric', callback)` - Listen for metric updates

## License

MIT
