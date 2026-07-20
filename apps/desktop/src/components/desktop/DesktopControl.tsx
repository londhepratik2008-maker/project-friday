import { useState, useEffect, useCallback } from "react";

type DesktopControlProps = {
  onScreenshot?: (dataUrl: string) => void;
};

export default function DesktopControl({ onScreenshot }: DesktopControlProps) {
  const [volume, setVolume] = useState(50);
  const [muted, setMuted] = useState(false);
  const [brightness, setBrightness] = useState(80);
  const [brightnessSupported, setBrightnessSupported] = useState(true);
  const [clipboardText, setClipboardText] = useState("");
  const [apps, setApps] = useState<{ name: string; path: string; icon: string }[]>([]);
  const [activeTab, setActiveTab] = useState<"controls" | "apps">("controls");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (window.friday?.volume?.get) {
      window.friday.volume.get().then((v) => { setVolume(v.volume); setMuted(v.muted); });
    }
    if (window.friday?.brightness?.get) {
      window.friday.brightness.get().then((b) => { setBrightness(b.brightness); setBrightnessSupported(b.supported); });
    }
    if (window.friday?.desktop?.listApps) {
      window.friday.desktop.listApps().then(setApps);
    }
  }, []);

  const showStatus = useCallback((msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus(""), 2000);
  }, []);

  const handleVolumeChange = async (val: number) => {
    setVolume(val);
    if (window.friday?.volume?.set) {
      await window.friday.volume.set(val);
    }
  };

  const handleMuteToggle = async () => {
    if (window.friday?.volume?.toggleMute) {
      await window.friday.volume.toggleMute();
      setMuted(!muted);
    }
  };

  const handleBrightnessChange = async (val: number) => {
    setBrightness(val);
    if (window.friday?.brightness?.set) {
      await window.friday.brightness.set(val);
    }
  };

  const handleCopyText = async (text: string) => {
    if (window.friday?.clipboard?.write) {
      await window.friday.clipboard.write(text);
      showStatus("Copied to clipboard");
    }
  };

  const handleReadClipboard = async () => {
    if (window.friday?.clipboard?.read) {
      const result = await window.friday.clipboard.read();
      setClipboardText(result.text);
    }
  };

  const handleScreenshot = async () => {
    if (window.friday?.desktop?.screenshot) {
      showStatus("Capturing screen...");
      const result = await window.friday.desktop.screenshot();
      if (result.success && result.data && onScreenshot) {
        onScreenshot(result.data);
        showStatus("Screenshot captured — sending to FRIDAY");
      } else {
        showStatus(result.error || "Screenshot failed");
      }
    }
  };

  const handleOpenApp = async (appPath: string) => {
    if (window.friday?.desktop?.launchApp) {
      await window.friday.desktop.launchApp(appPath);
      showStatus(`Launched ${appPath}`);
    }
  };

  const handleOpenUrl = async () => {
    const url = prompt("Enter URL:");
    if (url && window.friday?.desktop?.launchUrl) {
      await window.friday.desktop.launchUrl(url.startsWith("http") ? url : `https://${url}`);
      showStatus(`Opened ${url}`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--friday-border)" }}
      >
        <div className="flex items-center gap-2">
          <div className="led led-blue" />
          <span className="hud-label">DESKTOP CONTROL</span>
        </div>
        {status && (
          <span className="annotation animate-pulse" style={{ color: "var(--friday-accent)", fontSize: 8 }}>
            {status}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex" style={{ borderBottom: "1px solid var(--friday-border)" }}>
        {(["controls", "apps"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2 hud-label transition-colors"
            style={{
              fontSize: 8,
              letterSpacing: "0.15em",
              color: activeTab === tab ? "var(--friday-accent)" : "var(--friday-muted)",
              borderBottom: activeTab === tab ? "2px solid var(--friday-accent)" : "2px solid transparent",
            }}
          >
            {tab === "controls" ? "CONTROLS" : "LAUNCHER"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {activeTab === "controls" ? (
          <div className="space-y-4">
            {/* Volume */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="hud-label" style={{ fontSize: 8 }}>VOLUME</span>
                <span className="annotation">{volume}%</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="flex-1"
                  style={{ accentColor: "var(--friday-accent)" }}
                />
                <button
                  onClick={handleMuteToggle}
                  className="hud-btn rounded px-2 py-1"
                  style={{ fontSize: 9, minWidth: 32, opacity: muted ? 1 : 0.6 }}
                >
                  {muted ? "🔇" : "🔊"}
                </button>
              </div>
            </div>

            {/* Brightness */}
            {brightnessSupported && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="hud-label" style={{ fontSize: 8 }}>BRIGHTNESS</span>
                  <span className="annotation">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={brightness}
                  onChange={(e) => handleBrightnessChange(Number(e.target.value))}
                  className="w-full"
                  style={{ accentColor: "var(--friday-accent)" }}
                />
              </div>
            )}

            {/* Clipboard */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="hud-label" style={{ fontSize: 8 }}>CLIPBOARD</span>
              </div>
              <button
                onClick={handleReadClipboard}
                className="hud-btn rounded w-full px-3 py-1.5 mb-2"
                style={{ fontSize: 9 }}
              >
                READ CLIPBOARD
              </button>
              {clipboardText && (
                <div
                  className="rounded p-2 text-xs max-h-16 overflow-y-auto"
                  style={{ background: "rgba(26, 35, 50, 0.6)", border: "1px solid var(--friday-border)", color: "var(--friday-text)", fontSize: 10 }}
                >
                  {clipboardText.slice(0, 200)}
                </div>
              )}
            </div>

            {/* Screenshot */}
            <button
              onClick={handleScreenshot}
              className="hud-btn rounded w-full px-3 py-2 flex items-center justify-center gap-2"
              style={{ fontSize: 9 }}
            >
              <span>📸</span>
              <span>CAPTURE & ANALYZE</span>
            </button>

            {/* Quick Open */}
            <div>
              <span className="hud-label mb-1.5 block" style={{ fontSize: 8 }}>QUICK OPEN</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: "FOLDER", action: () => window.friday?.desktop?.openFolder() },
                  { label: "URL", action: handleOpenUrl },
                ].map((q) => (
                  <button
                    key={q.label}
                    onClick={q.action}
                    className="hud-btn rounded px-2 py-1.5"
                    style={{ fontSize: 8 }}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* App Launcher */
          <div className="space-y-1">
            {apps.length === 0 ? (
              <p className="annotation text-center py-4" style={{ fontSize: 9 }}>Scanning for apps...</p>
            ) : (
              apps.map((app) => (
                <button
                  key={app.path}
                  onClick={() => handleOpenApp(app.path)}
                  className="w-full flex items-center gap-2.5 rounded px-3 py-2 text-left transition-colors"
                  style={{
                    background: "rgba(255, 157, 46, 0.04)",
                    border: "1px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 157, 46, 0.2)";
                    e.currentTarget.style.background = "rgba(255, 157, 46, 0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "transparent";
                    e.currentTarget.style.background = "rgba(255, 157, 46, 0.04)";
                  }}
                >
                  <span style={{ fontSize: 16 }}>{app.icon}</span>
                  <div className="min-w-0">
                    <span className="hud-label block" style={{ fontSize: 9 }}>{app.name}</span>
                    <span className="annotation block truncate" style={{ fontSize: 7 }}>{app.path}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
