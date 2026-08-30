interface HistoryPoint {
  timestamp: string;
  cpu: number;
  ram: number;
  temp: number;
  download: number;
  upload: number;
}

export class TelemetryTracker {
  // Fixed size rolling buffers
  public history1m: HistoryPoint[] = [];
  public history5m: HistoryPoint[] = [];
  public history15m: HistoryPoint[] = [];
  public history1h: HistoryPoint[] = [];
  public history6h: HistoryPoint[] = [];
  public history24h: HistoryPoint[] = [];

  // Ticks collectors
  private ticks5: HistoryPoint[] = [];
  private ticks15: HistoryPoint[] = [];
  private ticks30: HistoryPoint[] = [];
  private ticks300: HistoryPoint[] = [];
  private ticks900: HistoryPoint[] = [];

  private counter = 0;

  public addPoint(cpu: number, ram: number, temp: number, download: number, upload: number) {
    this.counter++;
    const point: HistoryPoint = {
      timestamp: new Date().toISOString(),
      cpu,
      ram,
      temp,
      download,
      upload
    };

    // 1. 1 Minute (sampled every 2s, max 30 points)
    this.history1m.push(point);
    if (this.history1m.length > 30) this.history1m.shift();

    // Collect ticks for higher level calculations
    this.ticks5.push(point);
    this.ticks15.push(point);
    this.ticks30.push(point);
    this.ticks300.push(point);
    this.ticks900.push(point);

    // 2. 5 Minutes (every 5 ticks / 10s, max 30 points)
    if (this.counter % 5 === 0) {
      this.history5m.push(this.calculateAverage(this.ticks5));
      if (this.history5m.length > 30) this.history5m.shift();
      this.ticks5 = [];
    }

    // 3. 15 Minutes (every 15 ticks / 30s, max 30 points)
    if (this.counter % 15 === 0) {
      this.history15m.push(this.calculateAverage(this.ticks15));
      if (this.history15m.length > 30) this.history15m.shift();
      this.ticks15 = [];
    }

    // 4. 1 Hour (every 30 ticks / 60s, max 60 points)
    if (this.counter % 30 === 0) {
      this.history1h.push(this.calculateAverage(this.ticks30));
      if (this.history1h.length > 60) this.history1h.shift();
      this.ticks30 = [];
    }

    // 5. 6 Hours (every 300 ticks / 10m, max 36 points)
    if (this.counter % 300 === 0) {
      this.history6h.push(this.calculateAverage(this.ticks300));
      if (this.history6h.length > 36) this.history6h.shift();
      this.ticks300 = [];
    }

    // 6. 24 Hours (every 900 ticks / 30m, max 48 points)
    if (this.counter % 900 === 0) {
      this.history24h.push(this.calculateAverage(this.ticks900));
      if (this.history24h.length > 48) this.history24h.shift();
      this.ticks900 = [];
    }

    // Prevent overflow of counter
    if (this.counter >= 90000) {
      this.counter = 0;
    }
  }

  private calculateAverage(points: HistoryPoint[]): HistoryPoint {
    if (points.length === 0) {
      return {
        timestamp: new Date().toISOString(),
        cpu: 0, ram: 0, temp: 0, download: 0, upload: 0
      };
    }

    const sum = points.reduce((acc, p) => {
      acc.cpu += p.cpu;
      acc.ram += p.ram;
      acc.temp += p.temp;
      acc.download += p.download;
      acc.upload += p.upload;
      return acc;
    }, { cpu: 0, ram: 0, temp: 0, download: 0, upload: 0 });

    const count = points.length;
    return {
      timestamp: points[points.length - 1].timestamp,
      cpu: Math.round(sum.cpu / count),
      ram: Math.round(sum.ram / count),
      temp: parseFloat((sum.temp / count).toFixed(1)),
      download: Math.round(sum.download / count),
      upload: Math.round(sum.upload / count)
    };
  }

  public getHistory(range: string): HistoryPoint[] {
    switch (range) {
      case '1m': return this.history1m;
      case '5m': return this.history5m;
      case '15m': return this.history15m;
      case '1h': return this.history1h;
      case '6h': return this.history6h;
      case '24h': return this.history24h;
      default: return this.history1m;
    }
  }
}

export const telemetryTracker = new TelemetryTracker();
