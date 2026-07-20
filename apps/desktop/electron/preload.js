const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("friday", {
  ping: () => ipcRenderer.invoke("friday:ping"),

  chat: {
    send: (messages) => ipcRenderer.invoke("chat:send", messages),
  },

  system: {
    getInfo: () => ipcRenderer.invoke("system:getInfo"),
    getMetrics: () => ipcRenderer.invoke("system:getMetrics"),
  },

  memory: {
    getAll: () => ipcRenderer.invoke("memory:getAll"),
    save: (memory) => ipcRenderer.invoke("memory:save", memory),
    delete: (id) => ipcRenderer.invoke("memory:delete", id),
    search: (query) => ipcRenderer.invoke("memory:search", query),
    pin: (id) => ipcRenderer.invoke("memory:pin", id),
  },

  calendar: {
    isConnected: () => ipcRenderer.invoke("calendar:isConnected"),
    authenticate: () => ipcRenderer.invoke("calendar:authenticate"),
    disconnect: () => ipcRenderer.invoke("calendar:disconnect"),
    getUpcoming: (maxResults) => ipcRenderer.invoke("calendar:getUpcoming", maxResults),
  },

  getApiConfig: () => ipcRenderer.invoke("get:apiConfig"),

  // Phase 3: Desktop Control
  clipboard: {
    read: () => ipcRenderer.invoke("clipboard:read"),
    write: (text) => ipcRenderer.invoke("clipboard:write", text),
    readImage: () => ipcRenderer.invoke("clipboard:readImage"),
  },

  volume: {
    get: () => ipcRenderer.invoke("system:getVolume"),
    set: (level) => ipcRenderer.invoke("system:setVolume", level),
    toggleMute: () => ipcRenderer.invoke("system:toggleMute"),
  },

  brightness: {
    get: () => ipcRenderer.invoke("system:getBrightness"),
    set: (level) => ipcRenderer.invoke("system:setBrightness", level),
  },

  desktop: {
    launchApp: (appName) => ipcRenderer.invoke("desktop:launchApp", appName),
    launchUrl: (url) => ipcRenderer.invoke("desktop:launchUrl", url),
    openFolder: (path) => ipcRenderer.invoke("desktop:openFolder", path),
    listApps: () => ipcRenderer.invoke("desktop:listApps"),
    screenshot: () => ipcRenderer.invoke("desktop:screenshot"),
    execCommand: (command) => ipcRenderer.invoke("desktop:execCommand", command),
  },
});

window.addEventListener("DOMContentLoaded", () => {
  console.log("Friday preload initialized.");
});
