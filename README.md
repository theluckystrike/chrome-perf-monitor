# chrome-perf-monitor

[![npm version](https://img.shields.io/npm/v/chrome-perf-monitor)](https://npmjs.com/package/chrome-perf-monitor)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Chrome Web Extension](https://img.shields.io/badge/Chrome-Web%20Extension-orange.svg)](https://developer.chrome.com/docs/extensions/)
[![CI Status](https://github.com/theluckystrike/chrome-perf-monitor/actions/workflows/ci.yml/badge.svg)](https://github.com/theluckystrike/chrome-perf-monitor/actions)
[![Discord](https://img.shields.io/badge/Discord-Zovo-blueviolet.svg?logo=discord)](https://discord.gg/zovo)
[![Website](https://img.shields.io/badge/Website-zovo.one-blue)](https://zovo.one)
[![GitHub Stars](https://img.shields.io/github/stars/theluckystrike/chrome-perf-monitor?style=social)](https://github.com/theluckystrike/chrome-perf-monitor)

> Monitor page performance in Chrome extensions.

**chrome-perf-monitor** provides utilities to measure and track page performance metrics. Part of the Zovo Chrome extension utilities.

Part of the [Zovo](https://zovo.one) developer tools family.

## Overview

chrome-perf-monitor provides utilities to measure and track page performance metrics including FCP, LCP, FID, CLS, and more.

## Features

- ✅ **Performance Metrics** - Track FCP, LCP, FID, CLS
- ✅ **Real-time Monitoring** - Listen for metric updates
- ✅ **TypeScript Support** - Full type definitions included
- ✅ **MV3 Compatible** - Works with Manifest V3 extensions

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

## Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/perf-improvement`
3. **Make** your changes
4. **Test** your changes: `npm test`
5. **Commit** your changes: `git commit -m 'Add new feature'`
6. **Push** to the branch: `git push origin feature/perf-improvement`
7. **Submit** a Pull Request

### Development Setup

```bash
# Clone the repository
git clone https://github.com/theluckystrike/chrome-perf-monitor.git
cd chrome-perf-monitor

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```

## Built by Zovo

Part of the [Zovo](https://zovo.one) developer tools family — privacy-first Chrome extensions built by developers, for developers.

## See Also

### Related Zovo Repositories

- [zovo-extension-template](https://github.com/theluckystrike/zovo-extension-template) - Boilerplate for building privacy-first Chrome extensions
- [zovo-types-webext](https://github.com/theluckystrike/zovo-types-webext) - Comprehensive TypeScript type definitions for browser extensions
- [chrome-network-monitor](https://github.com/theluckystrike/chrome-network-monitor) - Network request monitoring

### Zovo Chrome Extensions

- [Zovo Tab Manager](https://chrome.google.com/webstore/detail/zovo-tab-manager) - Manage tabs efficiently
- [Zovo Focus](https://chrome.google.com/webstore/detail/zovo-focus) - Block distractions

Visit [zovo.one](https://zovo.one) for more information.

## License

MIT - [Zovo](https://zovo.one)

---

*Built by developers, for developers. No compromises on privacy.*
