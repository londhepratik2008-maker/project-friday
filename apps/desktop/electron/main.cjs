console.log("🚀 main.cjs started");
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const https = require("https");
const { execSync } = require("child_process");

let googleCalendar = null;
try {
  googleCalendar = require("./google-calendar.cjs");
} catch (err) {
  console.warn("Google Calendar module skipped:", err.message);
}

const configPath = path.join(__dirname, "data", "config.json");
function loadConfig() {
  try {
    if (!fs.existsSync(configPath)) return { apiKey: "", model: "nvidia/llama-3.3-nemotron-super-49b-v1" };
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {
    return { apiKey: "", model: "nvidia/llama-3.3-nemotron-super-49b-v1" };
  }
}

const apiConfigPath = path.join(__dirname, "data", "api-config.json");
function loadApiConfig() {
  try {
    if (!fs.existsSync(apiConfigPath)) return null;
    return JSON.parse(fs.readFileSync(apiConfigPath, "utf8"));
  } catch {
    return null;
  }
}

function chatWithProvider(hostname, path, apiKey, body, extraHeaders) {
  return new Promise((resolve, reject) => {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    };
    const req = https.request({ hostname, path, method: "POST", headers }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) reject(new Error(parsed.error.message || "API error"));
          else resolve(parsed.choices[0].message.content);
        } catch (err) { reject(err); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function chatWithFallback(messages) {
  const config = loadConfig();
  const systemMsg = { role: "system", content: "You are FRIDAY, a helpful personal AI assistant. Be concise and friendly. Reply in short paragraphs." };
  const body = (model) => JSON.stringify({ model, max_tokens: 1024, messages: [systemMsg, ...messages] });

  const orConfig = loadApiConfig()?.openrouter || {};

  const providers = [
    { name: "NVIDIA", hostname: "integrate.api.nvidia.com", path: "/v1/chat/completions", key: config.apiKey, model: config.model, extra: {} },
    { name: "OpenRouter", hostname: "openrouter.ai", path: "/v1/chat/completions", key: orConfig.key || "", model: orConfig.textModel || "openrouter/free", extra: { "HTTP-Referer": "http://localhost:5173", "X-Title": "FRIDAY AI Assistant" } },
  ];

  let lastError = "";
  for (const p of providers) {
    try {
      const reply = await chatWithProvider(p.hostname, p.path, p.key, body(p.model), p.extra);
      return reply;
    } catch (err) {
      lastError = err.message;
      console.warn(`${p.name} failed: ${err.message}`);
    }
  }
  throw new Error(lastError || "All providers failed");
}

const memoryFile = path.join(__dirname, "data", "memory.json");

function readMemories() {
  try {
    if (!fs.existsSync(memoryFile)) return [];
    const data = fs.readFileSync(memoryFile, "utf8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeMemories(memories) {
  const dir = path.dirname(memoryFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(memoryFile, JSON.stringify(memories, null, 2), "utf8");
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    autoHideMenuBar: true,
    title: "FRIDAY",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // In production, load the built HTML; in dev, load localhost
  const isDev = !app.isPackaged;
  if (isDev) {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

// System
ipcMain.handle("system:getInfo", async () => ({
  hostname: os.hostname(),
  platform: os.platform(),
  arch: os.arch(),
  cpu: os.cpus()[0].model,
  cpuCores: os.cpus().length,
  totalMemory: os.totalmem(),
  freeMemory: os.freemem(),
  uptime: os.uptime(),
}));

// Real-time system metrics
let prevCpuInfo = null;

function getCpuUsage() {
  try {
    const cpus = os.cpus();
    let totalIdle = 0, totalTick = 0;
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    if (prevCpuInfo) {
      const idleDiff = idle - prevCpuInfo.idle;
      const totalDiff = total - prevCpuInfo.total;
      prevCpuInfo = { idle, total };
      return Math.max(0, Math.min(100, 100 - (100 * idleDiff) / totalDiff));
    }
    prevCpuInfo = { idle, total };
    return 0;
  } catch {
    return 0;
  }
}

function getMemoryUsage() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  return {
    used,
    total,
    percentage: Math.round((used / total) * 100),
  };
}

function getDiskUsage() {
  try {
    const output = execSync('powershell -Command "Get-PSDrive C | Select-Object Used,Free | ConvertTo-Json"', {
      encoding: "utf8",
      timeout: 5000,
      stdio: "pipe",
    });
    const data = JSON.parse(output.trim());
    const used = data.Used || 0;
    const free = data.Free || 0;
    const total = used + free;
    return {
      used,
      total,
      percentage: total > 0 ? Math.round((used / total) * 100) : 0,
    };
  } catch {
    return { used: 0, total: 0, percentage: 0 };
  }
}

function getTemperature() {
  try {
    const output = execSync('powershell -Command "Get-WmiObject MSAcpi_ThermalZoneTemperature -Namespace root/wmi | Select-Object -First 1 | ForEach-Object { [math]::Round(($_.CurrentTemperature - 2732) / 10) }"', {
      encoding: "utf8",
      timeout: 5000,
      stdio: "pipe",
    });
    return parseInt(output.trim()) || 0;
  } catch {
    return 0;
  }
}

function getBatteryInfo() {
  try {
    const output = execSync('powershell -Command "Get-WmiObject Win32_Battery | Select-Object EstimatedChargeRemaining, BatteryStatus | ConvertTo-Json"', {
      encoding: "utf8",
      timeout: 5000,
      stdio: "pipe",
    });
    const data = JSON.parse(output.trim());
    return {
      percentage: data.EstimatedChargeRemaining || 0,
      charging: data.BatteryStatus === 2 || data.BatteryStatus === 6 || data.BatteryStatus === 7,
      present: true,
    };
  } catch {
    return { percentage: 0, charging: false, present: false };
  }
}

function getNetworkSpeed() {
  try {
    const output = execSync('powershell -Command "Get-NetAdapter | Where-Object {$_.Status -eq \'Up\'} | Select-Object Name,ReceiveBytes,TransmitBytes | ConvertTo-Json"', {
      encoding: "utf8",
      timeout: 5000,
      stdio: "pipe",
    });
    const adapters = JSON.parse(output.trim());
    const adapter = Array.isArray(adapters) ? adapters[0] : adapters;
    if (!adapter) return { download: 0, upload: 0 };
    return {
      download: adapter.ReceiveBytes || 0,
      upload: adapter.TransmitBytes || 0,
    };
  } catch {
    return { download: 0, upload: 0 };
  }
}

// Cache for expensive operations
let cachedMetrics = {
  disk: { used: 0, total: 0, percentage: 0 },
  temperature: 0,
  battery: { percentage: 0, charging: false, present: false },
  network: { download: 0, upload: 0 },
  lastUpdate: 0,
};

const CACHE_TTL = 10000; // 10 seconds

ipcMain.handle("system:getMetrics", async () => {
  const now = Date.now();
  const cacheExpired = now - cachedMetrics.lastUpdate > CACHE_TTL;

  if (cacheExpired) {
    cachedMetrics.disk = getDiskUsage();
    cachedMetrics.temperature = getTemperature();
    cachedMetrics.battery = getBatteryInfo();
    cachedMetrics.network = getNetworkSpeed();
    cachedMetrics.lastUpdate = now;
  }

  return {
    cpu: getCpuUsage(),
    memory: getMemoryUsage(),
    disk: cachedMetrics.disk,
    temperature: cachedMetrics.temperature,
    battery: cachedMetrics.battery,
    network: cachedMetrics.network,
    uptime: os.uptime(),
    cpuModel: os.cpus()[0]?.model || "Unknown",
    cpuCores: os.cpus().length,
    platform: os.platform(),
    hostname: os.hostname(),
  };
});

// Memory
ipcMain.handle("memory:getAll", async () => readMemories());

ipcMain.handle("memory:save", async (_, memory) => {
  const memories = readMemories();
  const newMemory = {
    id: Date.now().toString(),
    content: memory.content,
    category: memory.category || "general",
    pinned: memory.pinned || false,
    timestamp: new Date().toISOString(),
  };
  memories.unshift(newMemory);
  writeMemories(memories);
  return newMemory;
});

ipcMain.handle("memory:delete", async (_, id) => {
  const memories = readMemories();
  const updated = memories.filter((m) => m.id !== id);
  writeMemories(updated);
  return updated;
});

ipcMain.handle("memory:search", async (_, query) => {
  const memories = readMemories();
  const lowerQuery = query.toLowerCase();
  return memories.filter(
    (m) =>
      m.content.toLowerCase().includes(lowerQuery) ||
      (m.category && m.category.toLowerCase().includes(lowerQuery))
  );
});

ipcMain.handle("memory:pin", async (_, id) => {
  const memories = readMemories();
  const updated = memories.map((m) =>
    m.id === id ? { ...m, pinned: !m.pinned } : m
  );
  writeMemories(updated);
  return updated;
});

// Ping
ipcMain.handle("friday:ping", async () => ({
  status: "online",
  message: "Hello from Electron!",
  timestamp: Date.now(),
}));

// Chat
ipcMain.handle("chat:send", async (_, messages) => {
  try {
    const reply = await chatWithFallback(messages);
    return { success: true, reply };
  } catch (err) {
    return { success: false, reply: "Sorry, I encountered an error: " + err.message };
  }
});

// Calendar
ipcMain.handle("calendar:isConnected", async () => {
  return googleCalendar ? googleCalendar.isConnected() : false;
});

ipcMain.handle("calendar:authenticate", async () => {
  if (!googleCalendar) throw new Error("Calendar not available");
  await googleCalendar.authenticate();
  return true;
});

ipcMain.handle("calendar:disconnect", async () => {
  if (googleCalendar) googleCalendar.disconnect();
  return true;
});

ipcMain.handle("calendar:getUpcoming", async (_, maxResults) => {
  if (!googleCalendar) return [];
  return googleCalendar.getUpcomingEvents(maxResults || 10);
});

ipcMain.handle("get:apiConfig", async () => {
  return loadApiConfig() || {};
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
