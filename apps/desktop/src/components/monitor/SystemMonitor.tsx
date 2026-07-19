import { useEffect, useState } from "react";

type Metric = {
  label: string;
  value: number;
  max: number;
  unit: string;
  status: "nominal" | "warning" | "critical";
};

type SystemMetrics = {
  cpu: number;
  memory: { used: number; total: number; percentage: number };
  disk: { used: number; total: number; percentage: number };
  temperature: number;
  battery: { percentage: number; charging: boolean; present: boolean };
  network: { download: number; upload: number };
  uptime: number;
  cpuModel: string;
  cpuCores: number;
  platform: string;
  hostname: string;
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function SystemMonitor() {
  const [metrics, setMetrics] = useState<Metric[]>([
    { label: "CPU", value: 0, max: 100, unit: "%", status: "nominal" },
    { label: "RAM", value: 0, max: 100, unit: "%", status: "nominal" },
    { label: "GPU", value: 0, max: 100, unit: "%", status: "nominal" },
    { label: "DSK", value: 0, max: 100, unit: "%", status: "nominal" },
    { label: "TMP", value: 0, max: 100, unit: "°C", status: "nominal" },
    { label: "BAT", value: 0, max: 100, unit: "%", status: "nominal" },
  ]);

  const [uptime, setUptime] = useState("00:00:00");
  const [processes, setProcesses] = useState<{ name: string; status: string }[]>([
    { name: "FRIDAY", status: "active" },
  ]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let heavyInterval: ReturnType<typeof setInterval>;

    const fetchMetrics = async () => {
      if (window.friday?.system?.getMetrics) {
        try {
          const data: SystemMetrics = await window.friday.system.getMetrics();

          setMetrics([
            { label: "CPU", value: Math.round(data.cpu), max: 100, unit: "%", status: data.cpu > 85 ? "critical" : data.cpu > 65 ? "warning" : "nominal" },
            { label: "RAM", value: data.memory.percentage, max: 100, unit: "%", status: data.memory.percentage > 85 ? "critical" : data.memory.percentage > 65 ? "warning" : "nominal" },
            { label: "GPU", value: 0, max: 100, unit: "%", status: "nominal" },
            { label: "DSK", value: data.disk.percentage, max: 100, unit: "%", status: data.disk.percentage > 85 ? "critical" : data.disk.percentage > 65 ? "warning" : "nominal" },
            { label: "TMP", value: data.temperature || 0, max: 100, unit: "°C", status: (data.temperature || 0) > 80 ? "critical" : (data.temperature || 0) > 60 ? "warning" : "nominal" },
            { label: "BAT", value: data.battery.present ? data.battery.percentage : 100, max: 100, unit: "%", status: data.battery.present && data.battery.percentage < 20 ? "critical" : data.battery.present && data.battery.percentage < 50 ? "warning" : "nominal" },
          ]);

          setUptime(formatUptime(data.uptime));
        } catch (err) {
          console.error("Failed to fetch system metrics:", err);
        }
      }
    };

    fetchMetrics();
    interval = setInterval(fetchMetrics, 5000);

    return () => {
      clearInterval(interval);
      clearInterval(heavyInterval);
    };
  }, []);

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="led led-green" />
          <span className="hud-label">System Monitor</span>
        </div>
        <span className="hud-accent" style={{ fontSize: 8 }}>{uptime}</span>
      </div>

      <div className="divider-h" />

      {/* Metrics */}
      <div className="flex flex-col gap-2.5 flex-1">
        {metrics.map((m) => (
          <div key={m.label} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="hud-label">{m.label}</span>
              <span className="hud-value" style={{ fontSize: 11 }}>
                {m.value}{m.unit}
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${(m.value / m.max) * 100}%`,
                  background:
                    m.status === "critical"
                      ? "#EF4444"
                      : m.status === "warning"
                      ? "#F59E0B"
                      : undefined,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="divider-h" />

      {/* Process status */}
      <div className="flex flex-col gap-1.5">
        <span className="hud-label">Processes</span>
        {processes.map((p, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className={`led ${p.status === "active" ? "led-green" : p.status === "idle" ? "led-blue" : "led-dim"}`} />
              <span style={{ fontSize: 10, color: "var(--friday-text-muted)" }}>{p.name}</span>
            </div>
            <span className="hud-accent" style={{ fontSize: 8 }}>
              {p.status.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
