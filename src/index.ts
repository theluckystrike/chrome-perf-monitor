/**
 * chrome-perf-monitor
 * Runtime performance monitoring for Chrome Extensions
 */

export interface PerformanceMetrics {
  timestamp: number;
  serviceWorkerWakeTime?: number;
  messageLatency?: number;
  storageReadThroughput?: number;
  storageWriteThroughput?: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

export interface WebVitals {
  LCP: number;
  FID: number;
  CLS: number;
  FCP: number;
  TTFB: number;
}

export interface MonitorConfig {
  enableServiceWorkerMonitoring: boolean;
  enableMessageLatency: boolean;
  enableStorageMetrics: boolean;
  enableMemoryTracking: boolean;
  sampleRate: number;
  storageKey: string;
}

type MetricsListener = (metrics: PerformanceMetrics) => void;

export class PerformanceMonitor {
  private config: MonitorConfig;
  private metrics: PerformanceMetrics[] = [];
  private listeners: Set<MetricsListener> = new Set();
  private messageStartTimes: Map<number, number> = new Map();
  private isMonitoring = false;
  private sampleCounter = 0;

  constructor(config: Partial<MonitorConfig> = {}) {
    this.config = {
      enableServiceWorkerMonitoring: true,
      enableMessageLatency: true,
      enableStorageMetrics: true,
      enableMemoryTracking: true,
      sampleRate: 1.0,
      storageKey: 'perf_monitor_metrics',
      ...config
    };
  }

  start(): void {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    if (this.config.enableMessageLatency) {
      this.setupMessageMonitoring();
    }

    if (this.config.enableServiceWorkerMonitoring) {
      this.setupServiceWorkerMonitoring();
    }

    console.log('[PerfMonitor] Started monitoring');
  }

  stop(): void {
    this.isMonitoring = false;
    console.log('[PerfMonitor] Stopped monitoring');
  }

  private setupMessageMonitoring(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      const startTime = performance.now();
      const messageId = Date.now() + Math.random();

      const originalSendResponse = sendResponse;
      sendResponse = ((response?: unknown) => {
        const latency = performance.now() - startTime;
        this.recordMessageLatency(latency, message, sender);
        return originalSendResponse(response);
      }) as typeof sendResponse;
    });
  }

  private setupServiceWorkerMonitoring(): void {
    chrome.runtime.onStartup.addListener(() => {
      const wakeTime = Date.now();
      this.recordServiceWorkerWake(wakeTime);
    });

    chrome.runtime.onInstalled.addListener(() => {
      const wakeTime = Date.now();
      this.recordServiceWorkerWake(wakeTime);
    });
  }

  private recordServiceWorkerWake(wakeTime: number): void {
    if (!this.shouldSample()) return;

    const metrics: PerformanceMetrics = {
      timestamp: wakeTime,
      serviceWorkerWakeTime: wakeTime
    };

    this.addMetrics(metrics);
  }

  private recordMessageLatency(latency: number, message: unknown, sender: chrome.runtime.MessageSender): void {
    if (!this.shouldSample()) return;

    const metrics: PerformanceMetrics = {
      timestamp: Date.now(),
      messageLatency: latency
    };

    this.addMetrics(metrics);
  }

  async measureStorageRead<T>(key: string, readFn: () => Promise<T>): Promise<T> {
    const startMemory = this.getMemoryUsage();
    const startTime = performance.now();

    const result = await readFn();

    const duration = performance.now() - startTime;
    const endMemory = this.getMemoryUsage();

    if (this.config.enableStorageMetrics && this.shouldSample()) {
      const metrics: PerformanceMetrics = {
        timestamp: Date.now(),
        storageReadThroughput: duration,
        memoryUsage: endMemory - startMemory
      };
      this.addMetrics(metrics);
    }

    return result;
  }

  async measureStorageWrite<T>(key: string, writeFn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();

    const result = await writeFn();

    const duration = performance.now() - startTime;

    if (this.config.enableStorageMetrics && this.shouldSample()) {
      const metrics: PerformanceMetrics = {
        timestamp: Date.now(),
        storageWriteThroughput: duration
      };
      this.addMetrics(metrics);
    }

    return result;
  }

  recordCustomMetric(name: string, value: number): void {
    if (!this.shouldSample()) return;

    const metrics: PerformanceMetrics = {
      timestamp: Date.now(),
      [name as keyof PerformanceMetrics]: value
    } as PerformanceMetrics;

    this.addMetrics(metrics);
  }

  getMemoryUsage(): number {
    return (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize || 0;
  }

  private addMetrics(metrics: PerformanceMetrics): void {
    if (this.config.enableMemoryTracking) {
      metrics.memoryUsage = this.getMemoryUsage();
    }

    this.metrics.push(metrics);

    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    this.notifyListeners(metrics);
  }

  private shouldSample(): boolean {
    this.sampleCounter++;
    return Math.random() < this.config.sampleRate;
  }

  getMetrics(filter?: {
    since?: number;
    type?: keyof PerformanceMetrics;
    limit?: number;
  }): PerformanceMetrics[] {
    let result = [...this.metrics];

    if (filter?.since) {
      result = result.filter(m => m.timestamp >= filter.since);
    }

    if (filter?.type) {
      result = result.filter(m => m[filter.type!] !== undefined);
    }

    if (filter?.limit) {
      result = result.slice(-filter.limit);
    }

    return result;
  }

  getAverageLatency(): number {
    const latencies = this.metrics
      .filter(m => m.messageLatency !== undefined)
      .map(m => m.messageLatency!);

    if (latencies.length === 0) return 0;
    return latencies.reduce((a, b) => a + b, 0) / latencies.length;
  }

  getP95Latency(): number {
    const latencies = this.metrics
      .filter(m => m.messageLatency !== undefined)
      .map(m => m.messageLatency!)
      .sort((a, b) => a - b);

    if (latencies.length === 0) return 0;
    const index = Math.floor(latencies.length * 0.95);
    return latencies[index];
  }

  getStorageStats(): {
    avgReadTime: number;
    avgWriteTime: number;
    totalReads: number;
    totalWrites: number;
  } {
    const reads = this.metrics.filter(m => m.storageReadThroughput !== undefined);
    const writes = this.metrics.filter(m => m.storageWriteThroughput !== undefined);

    return {
      avgReadTime: reads.length > 0
        ? reads.reduce((a, b) => a + b.storageReadThroughput!, 0) / reads.length
        : 0,
      avgWriteTime: writes.length > 0
        ? writes.reduce((a, b) => a + b.storageWriteThroughput!, 0) / writes.length
        : 0,
      totalReads: reads.length,
      totalWrites: writes.length
    };
  }

  getMemoryTrend(): { timestamp: number; usage: number }[] {
    return this.metrics
      .filter(m => m.memoryUsage !== undefined)
      .map(m => ({ timestamp: m.timestamp, usage: m.memoryUsage! }));
  }

  subscribe(listener: MetricsListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(metrics: PerformanceMetrics): void {
    this.listeners.forEach(listener => {
      try {
        listener(metrics);
      } catch (e) {
        console.error('[PerfMonitor] Listener error:', e);
      }
    });
  }

  async saveToStorage(): Promise<void> {
    await chrome.storage.local.set({
      [this.config.storageKey]: this.metrics.slice(-500)
    });
  }

  async loadFromStorage(): Promise<void> {
    const stored = await chrome.storage.local.get(this.config.storageKey);
    if (stored[this.config.storageKey]) {
      this.metrics = stored[this.config.storageKey];
    }
  }

  clear(): void {
    this.metrics = [];
  }

  exportJSON(): string {
    return JSON.stringify(this.metrics, null, 2);
  }
}

export class WebVitalsMonitor {
  private vitals: WebVitals = { LCP: 0, FID: 0, CLS: 0, FCP: 0, TTFB: 0 };
  private listeners: Set<(vitals: WebVitals) => void> = new Set();

  start(): void {
    this.observeLCP();
    this.observeFID();
    this.observeCLS();
    this.observeFCP();
    this.observeTTFB();
  }

  private observeLCP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries() as PerformancePaintTiming[];
        const lastEntry = entries[entries.length - 1] as PerformancePaintTiming;
        if (lastEntry.entryType === 'largest-contentful-paint') {
          this.vitals.LCP = lastEntry.startTime;
          this.notifyListeners();
        }
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.warn('[WebVitals] LCP not supported');
    }
  }

  private observeFID(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries() as InputEvent[];
        const firstEntry = entries[0];
        if (firstEntry && 'processingStart' in firstEntry) {
          this.vitals.FID = firstEntry.processingStart - firstEntry.startTime;
          this.notifyListeners();
        }
      });
      observer.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      console.warn('[WebVitals] FID not supported');
    }
  }

  private observeCLS(): void {
    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as LayoutShift[]) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        this.vitals.CLS = clsValue;
        this.notifyListeners();
      });
      observer.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.warn('[WebVitals] CLS not supported');
    }
  }

  private observeFCP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries() as PerformancePaintTiming[];
        const fcp = entries.find(e => e.name === 'first-contentful-paint');
        if (fcp) {
          this.vitals.FCP = fcp.startTime;
          this.notifyListeners();
        }
      });
      observer.observe({ entryTypes: ['paint'] });
    } catch (e) {
      console.warn('[WebVitals] FCP not supported');
    }
  }

  private observeTTFB(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries() as PerformanceNavigationTiming[];
        const navigation = entries[0];
        if (navigation) {
          this.vitals.TTFB = navigation.responseStart - navigation.requestStart;
          this.notifyListeners();
        }
      });
      observer.observe({ entryTypes: ['navigation'] });
    } catch (e) {
      console.warn('[WebVitals] TTFB not supported');
    }
  }

  getVitals(): WebVitals {
    return { ...this.vitals };
  }

  getScore(): { lcp: string; fid: string; cls: string } {
    return {
      lcp: this.getLCPScore(),
      fid: this.getFIDScore(),
      cls: this.getCLSScore()
    };
  }

  private getLCPScore(): string {
    if (this.vitals.LCP <= 2500) return 'good';
    if (this.vitals.LCP <= 4000) return 'needs-improvement';
    return 'poor';
  }

  private getFIDScore(): string {
    if (this.vitals.FID <= 100) return 'good';
    if (this.vitals.FID <= 300) return 'needs-improvement';
    return 'poor';
  }

  private getCLSScore(): string {
    if (this.vitals.CLS <= 0.1) return 'good';
    if (this.vitals.CLS <= 0.25) return 'needs-improvement';
    return 'poor';
  }

  subscribe(listener: (vitals: WebVitals) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getVitals()));
  }
}

export function createPerformanceMonitor(config?: Partial<MonitorConfig>): PerformanceMonitor {
  return new PerformanceMonitor(config);
}

export function createWebVitalsMonitor(): WebVitalsMonitor {
  return new WebVitalsMonitor();
}
