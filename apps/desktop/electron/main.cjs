console.log("🚀 main.cjs started");
const { app, BrowserWindow, ipcMain, clipboard, desktopCapturer, shell, screen } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const https = require("https");
const { execSync, exec: execCb } = require("child_process");

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
        if (res.statusCode >= 400) {
          reject(new Error(`${hostname} returned ${res.statusCode}: ${data.slice(0, 200)}`));
          return;
        }
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) reject(new Error(parsed.error.message || "API error"));
          else resolve(parsed.choices[0].message.content);
        } catch (err) { reject(new Error(`Invalid JSON from ${hostname}: ${data.slice(0, 100)}`)); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function chatWithFallback(messages) {
  const config = loadConfig();
  const systemMsg = { role: "system", content: `You are FRIDAY, an advanced AI personal assistant inspired by the FRIDAY AI from the Marvel Cinematic Universe. You work alongside your user like JARVIS and FRIDAY worked with Tony Stark.

PERSONALITY:
- Confident, sharp, and slightly witty — like the real FRIDAY
- Professional but with personality; never robotic or generic
- Proactive — anticipate what the user needs and offer helpful follow-ups
- Loyal and dedicated; you genuinely care about helping

CAPABILITIES:
- Write, debug, review, and explain code in any language with expert-level detail
- Analyze files, images, and documents thoroughly
- Break down complex concepts into clear explanations
- Provide real-world context and practical suggestions
- Remember the conversation context and build on previous messages
- Help users navigate their desktop: suggest commands, open apps, manage clipboard
- When users ask about system info, guide them to use the Desktop Control panel or suggest PowerShell commands

RESPONSE STYLE:
- Be detailed and thorough when explaining code, files, or complex topics
- Use markdown formatting: headers, code blocks, bullet points, bold text as needed
- When analyzing code: explain what it does, how it works, highlight issues, and suggest improvements
- When answering questions: give comprehensive answers with examples when helpful
- Match your detail level to the complexity of the question
- Keep your wit and personality even in technical responses` };
  const body = (model) => JSON.stringify({ model, max_tokens: 1024, messages: [systemMsg, ...messages] });

  const orConfig = loadApiConfig()?.openrouter || {};
  const nvConfig = loadApiConfig()?.nvidia || {};

  const providers = [
    { name: "NVIDIA", hostname: "integrate.api.nvidia.com", path: "/v1/chat/completions", key: nvConfig.key || config.apiKey, model: nvConfig.model || config.model, extra: {} },
    { name: "OpenRouter", hostname: "openrouter.ai", path: "/api/v1/chat/completions", key: orConfig.key || "", model: orConfig.textModel || "openrouter/free", extra: { "HTTP-Referer": "http://localhost:5173", "X-Title": "FRIDAY AI Assistant" } },
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

// ═══════════════════════════════════════════
// PHASE 3: DESKTOP CONTROL
// ═══════════════════════════════════════════

// --- Clipboard ---
ipcMain.handle("clipboard:read", async () => {
  return { text: clipboard.readText(), html: clipboard.readHTML(), image: clipboard.readImage().isEmpty() ? null : "image-present" };
});

ipcMain.handle("clipboard:write", async (_, text) => {
  clipboard.writeText(text);
  return { success: true };
});

ipcMain.handle("clipboard:readImage", async () => {
  const img = clipboard.readImage();
  if (img.isEmpty()) return { data: null };
  return { data: img.toDataURL() };
});

// --- Volume ---
ipcMain.handle("system:getVolume", async () => {
  try {
    const output = execSync('powershell -Command "(Get-AudioDevice -PlaybackVolume)"', { encoding: "utf8", timeout: 5000, stdio: "pipe" });
    const vol = parseInt(output.trim());
    return { volume: isNaN(vol) ? 0 : vol, muted: false };
  } catch {
    try {
      const output = execSync('powershell -Command "$wsh = New-Object -ComObject WScript.Shell; $wsh.SendKeys([char]173)" 2>$null; (Get-AudioDevice -PlaybackVolume) 2>$null"', { encoding: "utf8", timeout: 5000, stdio: "pipe" });
      return { volume: parseInt(output.trim()) || 0, muted: false };
    } catch {
      return { volume: 0, muted: false };
    }
  }
});

ipcMain.handle("system:setVolume", async (_, level) => {
  try {
    execSync(`powershell -Command "Set-AudioDevice -PlaybackVolume ${Math.max(0, Math.min(100, level))}"`, { encoding: "utf8", timeout: 5000, stdio: "pipe" });
    return { success: true, volume: level };
  } catch {
    return { success: false, volume: 0 };
  }
});

ipcMain.handle("system:toggleMute", async () => {
  try {
    execSync('powershell -Command "Set-AudioDevice -PlaybackMute (-not (Get-AudioDevice -PlaybackMute))"', { encoding: "utf8", timeout: 5000, stdio: "pipe" });
    return { success: true };
  } catch {
    return { success: false };
  }
});

// --- Brightness ---
ipcMain.handle("system:getBrightness", async () => {
  try {
    const output = execSync('powershell -Command "(Get-WmiObject -Namespace root/wmi -Class WmiMonitorBrightnessMethods).WmiGetBrightness()"', { encoding: "utf8", timeout: 5000, stdio: "pipe" });
    return { brightness: parseInt(output.trim()) || 0, supported: true };
  } catch {
    return { brightness: 0, supported: false };
  }
});

ipcMain.handle("system:setBrightness", async (_, level) => {
  try {
    execSync(`powershell -Command "(Get-WmiObject -Namespace root/wmi -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1, ${Math.max(0, Math.min(100, level))})"`, { encoding: "utf8", timeout: 5000, stdio: "pipe" });
    return { success: true, brightness: level };
  } catch {
    return { success: false };
  }
});

// --- App Launcher ---
ipcMain.handle("desktop:launchApp", async (_, appName) => {
  try {
    shell.openPath(appName);
    return { success: true, app: appName };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("desktop:launchUrl", async (_, url) => {
  try {
    shell.openExternal(url);
    return { success: true, url };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("desktop:openFolder", async (_, folderPath) => {
  try {
    shell.openPath(folderPath || os.homedir());
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("desktop:listApps", async () => {
  const commonApps = [
    { name: "Notepad", path: "notepad.exe", icon: "📝" },
    { name: "Calculator", path: "calc.exe", icon: "🔢" },
    { name: "File Explorer", path: "explorer.exe", icon: "📁" },
    { name: "Chrome", path: "chrome.exe", icon: "🌐" },
    { name: "Edge", path: "msedge.exe", icon: "🌐" },
    { name: "Firefox", path: "firefox.exe", icon: "🦊" },
    { name: "VS Code", path: "code.exe", icon: "💻" },
    { name: "Terminal", path: "wt.exe", icon: "⬛" },
    { name: "PowerShell", path: "powershell.exe", icon: "🔵" },
    { name: "Task Manager", path: "taskmgr.exe", icon: "📊" },
    { name: "Settings", path: "ms-settings:", icon: "⚙️" },
    { name: "Paint", path: "mspaint.exe", icon: "🎨" },
    { name: "WordPad", path: "wordpad.exe", icon: "📝" },
    { name: "Snipping Tool", path: "SnippingTool.exe", icon: "✂️" },
  ];

  const found = [];
  const pathDirs = (process.env.PATH || "").split(path.delimiter);
  for (const app of commonApps) {
    for (const dir of pathDirs) {
      const fullPath = path.join(dir, app.path);
      if (fs.existsSync(fullPath)) {
        found.push({ ...app, fullPath });
        break;
      }
    }
  }
  return found;
});

// --- Screenshot ---
ipcMain.handle("desktop:screenshot", async () => {
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;

    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width, height },
    });

    if (sources.length > 0) {
      const thumbnail = sources[0].thumbnail;
      if (!thumbnail.isEmpty()) {
        return { success: true, data: thumbnail.toDataURL(), width, height };
      }
    }
    return { success: false, error: "Failed to capture screen" };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// --- Execute Command (sandboxed) ---
ipcMain.handle("desktop:execCommand", async (_, command) => {
  const allowedCommands = [
    "ipconfig", "ipconfig /all",
    "systeminfo", "hostname",
    "tasklist", "tasklist /fi",
    "wmic os get caption", "wmic cpu get name",
    "dir", "tree",
    "netstat", "netstat -an",
    "ping",
  ];

  const cmdLower = command.toLowerCase().trim();
  const isAllowed = allowedCommands.some((c) => cmdLower.startsWith(c.toLowerCase()));

  if (!isAllowed) {
    return { success: false, error: `Command not allowed: "${command}". FRIDAY only supports safe read-only commands.` };
  }

  try {
    const output = execSync(command, { encoding: "utf8", timeout: 10000, stdio: "pipe", maxBuffer: 1024 * 512 });
    return { success: true, output: output.slice(0, 5000) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
