type Session = {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
};

type SessionsPanelProps = {
  sessions: Session[];
  activeSession: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
};

export default function SessionsPanel({
  sessions,
  activeSession,
  onSelectSession,
  onNewSession,
}: SessionsPanelProps) {
  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="led" />
          <span className="hud-label">Sessions</span>
        </div>
        <span className="hud-accent" style={{ fontSize: 8 }}>{sessions.length} ACTIVE</span>
      </div>

      <div className="divider-h" />

      {/* Session list */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-1.5">
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className="relative text-left px-3 py-2.5 rounded transition-all"
            style={{
              background:
                activeSession === session.id
                  ? "rgba(255, 157, 46, 0.08)"
                  : "transparent",
              border: `1px solid ${
                activeSession === session.id
                  ? "rgba(255, 157, 46, 0.25)"
                  : "transparent"
              }`,
            }}
          >
            {activeSession === session.id && (
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2"
                style={{
                  width: 2,
                  height: "60%",
                  background: "var(--friday-accent)",
                  borderRadius: 1,
                }}
              />
            )}
            <div className="flex items-center justify-between mb-1">
              <span
                className="hud-label"
                style={{
                  fontSize: 9,
                  color:
                    activeSession === session.id
                      ? "var(--friday-accent)"
                      : "var(--friday-text)",
                }}
              >
                {session.title}
              </span>
            </div>
            <p
              className="truncate"
              style={{
                fontSize: 10,
                color: "var(--friday-text-muted)",
                lineHeight: 1.4,
              }}
            >
              {session.lastMessage || "No messages yet"}
            </p>
          </button>
        ))}
      </div>

      <div className="divider-h" />

      {/* New session button */}
      <button
        onClick={onNewSession}
        className="flex items-center justify-center gap-2 rounded px-3 py-2.5 transition-all"
        style={{
          background: "rgba(255, 157, 46, 0.06)",
          border: "1px solid rgba(255, 157, 46, 0.2)",
          color: "var(--friday-accent)",
          fontSize: 10,
          fontFamily: "var(--font-hud)",
          letterSpacing: "0.1em",
        }}
      >
        <span style={{ fontSize: 14 }}>+</span>
        NEW SESSION
      </button>
    </div>
  );
}
