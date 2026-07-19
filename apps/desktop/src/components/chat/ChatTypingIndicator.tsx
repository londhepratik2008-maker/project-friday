export default function ChatTypingIndicator() {
  return (
    <div className="flex justify-start mb-3 animate-fadeIn">
      <div
        className="relative px-4 py-3"
        style={{
          background: "rgba(44, 54, 71, 0.6)",
          border: "1px solid var(--friday-border)",
          borderRadius: "12px 12px 12px 2px",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div
            className="led"
            style={{
              background: "var(--friday-steel)",
              boxShadow: "0 0 6px rgba(145,166,198,0.5)",
              width: 5,
              height: 5,
              animation: "breathe 1.5s ease-in-out infinite",
            }}
          />
          <span className="hud-label" style={{ fontSize: 7, color: "var(--friday-steel)" }}>
            FRIDAY
          </span>
        </div>
        <div className="flex items-center gap-1.5 py-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-full"
              style={{
                width: 5,
                height: 5,
                background: "var(--friday-accent)",
                opacity: 0.4,
                animation: `breathe 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
          <span className="annotation ml-2">PROCESSING</span>
        </div>
      </div>
    </div>
  );
}
