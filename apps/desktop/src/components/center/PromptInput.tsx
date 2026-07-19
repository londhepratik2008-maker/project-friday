import { useState } from "react";

type PromptInputProps = {
  onSend: (text: string) => void;
  isTyping: boolean;
  onStop?: () => void;
};

export default function PromptInput({ onSend, isTyping, onStop }: PromptInputProps) {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !isTyping) {
      onSend(text.trim());
      setText("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      {/* Top line annotation */}
      <div className="flex items-center justify-between mb-2">
        <span className="annotation">INPUT TERMINAL</span>
        <div className="flex items-center gap-2">
          <span className="annotation">
            {isTyping ? "BUSY" : "READY"}
          </span>
          <div
            className="led"
            style={{
              background: isTyping ? "#F59E0B" : "var(--friday-accent)",
              animation: isTyping ? "breathe 0.8s ease-in-out infinite" : undefined,
            }}
          />
        </div>
      </div>

      {/* Input container */}
      <div
        className="relative rounded"
        style={{
          background: "var(--friday-bg)",
          border: "1px solid var(--friday-border)",
          transition: "border-color 0.2s",
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter command..."
          disabled={isTyping}
          rows={2}
          className="w-full resize-none bg-transparent px-4 py-3 outline-none disabled:opacity-50"
          style={{
            fontSize: 13,
            color: "var(--friday-text)",
            fontFamily: "var(--font-body)",
          }}
        />

        {/* Bottom bar */}
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{ borderTop: "1px solid var(--friday-border)" }}
        >
          <div className="flex items-center gap-3">
            <span className="annotation">
              {isTyping ? "FRIDAY IS PROCESSING..." : "PRESS ENTER TO TRANSMIT"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isTyping && onStop && (
              <button
                type="button"
                onClick={onStop}
                className="flex items-center gap-2 rounded px-3 py-1.5 transition-all"
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#EF4444",
                  fontSize: 9,
                  fontFamily: "var(--font-hud)",
                  letterSpacing: "0.1em",
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: 10, height: 10 }}>
                  <path d="M6 6h12v12H6z" />
                </svg>
                STOP
              </button>
            )}

            <button
              type="submit"
              disabled={!text.trim() || isTyping}
              className="flex items-center gap-2 rounded px-3 py-1.5 transition-all disabled:opacity-30"
              style={{
                background: "rgba(255, 157, 46, 0.1)",
                border: "1px solid rgba(255, 157, 46, 0.3)",
                color: "var(--friday-accent)",
                fontSize: 9,
                fontFamily: "var(--font-hud)",
                letterSpacing: "0.1em",
              }}
            >
              <span>TRANSMIT</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                style={{ width: 12, height: 12 }}
              >
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Corner marks */}
      <div className="coord-label absolute" style={{ top: -12, left: 0 }}>SYS.INPUT</div>
      <div className="coord-label absolute" style={{ bottom: -12, right: 0 }}>ENC.AES256</div>
    </form>
  );
}
