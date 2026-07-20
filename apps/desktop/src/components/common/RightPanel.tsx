import { useState } from "react";
import SessionsPanel from "../sessions/SessionsPanel";
import SystemMonitor from "../monitor/SystemMonitor";
import DesktopControl from "../desktop/DesktopControl";

type Session = {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
};

type RightPanelProps = {
  sessions: Session[];
  activeSession: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onScreenshot: (dataUrl: string) => void;
};

type Tab = "sessions" | "monitor" | "control";

const tabs: { id: Tab; label: string }[] = [
  { id: "sessions", label: "SESSIONS" },
  { id: "monitor", label: "SYSTEM" },
  { id: "control", label: "CONTROL" },
];

export default function RightPanel({
  sessions,
  activeSession,
  onSelectSession,
  onNewSession,
  onScreenshot,
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("sessions");

  return (
    <div
      className="panel flex flex-col rounded overflow-hidden"
      style={{ width: 260, flexShrink: 0 }}
    >
      {/* Tab Bar */}
      <div className="flex" style={{ borderBottom: "1px solid var(--friday-border)" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2.5 hud-label transition-colors"
            style={{
              fontSize: 7,
              letterSpacing: "0.15em",
              color: activeTab === tab.id ? "var(--friday-accent)" : "var(--friday-muted)",
              borderBottom: activeTab === tab.id ? "2px solid var(--friday-accent)" : "2px solid transparent",
              background: "transparent",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "sessions" && (
          <div className="px-4 py-3">
            <SessionsPanel
              sessions={sessions}
              activeSession={activeSession}
              onSelectSession={onSelectSession}
              onNewSession={onNewSession}
            />
          </div>
        )}
        {activeTab === "monitor" && (
          <div className="px-4 py-3">
            <SystemMonitor />
          </div>
        )}
        {activeTab === "control" && (
          <div className="h-full">
            <DesktopControl onScreenshot={onScreenshot} />
          </div>
        )}
      </div>
    </div>
  );
}
