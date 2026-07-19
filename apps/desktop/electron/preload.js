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
});

window.addEventListener("DOMContentLoaded", () => {
  console.log("Friday preload initialized.");
});
