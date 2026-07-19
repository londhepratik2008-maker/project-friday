import { useEffect, useState } from "react";

type AICoreProps = {
  isTyping: boolean;
};

export default function AICore({ isTyping }: AICoreProps) {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation((r) => (r + 0.5) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const ticks = Array.from({ length: 60 }, (_, i) => i);
  const majorTicks = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <div className="relative flex items-center justify-center" style={{ width: 280, height: 280 }}>
      {/* Outer coordinate labels */}
      <div className="coord-label absolute" style={{ top: -8, left: "50%", transform: "translateX(-50%)" }}>N 0°</div>
      <div className="coord-label absolute" style={{ bottom: -8, left: "50%", transform: "translateX(-50%)" }}>S 180°</div>
      <div className="coord-label absolute" style={{ left: -20, top: "50%", transform: "translateY(-50%)" }}>W 270°</div>
      <div className="coord-label absolute" style={{ right: -20, top: "50%", transform: "translateY(-50%)" }}>E 90°</div>

      {/* Outermost ring - static with ticks */}
      <svg className="absolute" width="280" height="280" viewBox="0 0 280 280">
        <circle cx="140" cy="140" r="135" fill="none" stroke="rgba(145,166,198,0.1)" strokeWidth="1" />
        {ticks.map((i) => {
          const angle = (i * 6) * (Math.PI / 180);
          const isMajor = majorTicks.includes(i);
          const r1 = isMajor ? 126 : 130;
          const r2 = 135;
          return (
            <line
              key={i}
              x1={140 + r1 * Math.cos(angle)}
              y1={140 + r1 * Math.sin(angle)}
              x2={140 + r2 * Math.cos(angle)}
              y2={140 + r2 * Math.sin(angle)}
              stroke={isMajor ? "rgba(255,157,46,0.4)" : "rgba(145,166,198,0.15)"}
              strokeWidth={isMajor ? 1.5 : 0.5}
            />
          );
        })}
      </svg>

      {/* Rotating ring 1 */}
      <svg
        className="absolute"
        width="240"
        height="240"
        viewBox="0 0 240 240"
        style={{ animation: "coreRotate 20s linear infinite" }}
      >
        <circle cx="120" cy="120" r="115" fill="none" stroke="rgba(255,157,46,0.15)" strokeWidth="1" strokeDasharray="8 12" />
        <circle cx="120" cy="120" r="108" fill="none" stroke="rgba(145,166,198,0.08)" strokeWidth="0.5" />
        {/* Arc segments */}
        <path d="M 120 5 A 115 115 0 0 1 230 100" fill="none" stroke="rgba(255,157,46,0.25)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M 120 235 A 115 115 0 0 1 10 140" fill="none" stroke="rgba(255,157,46,0.15)" strokeWidth="1" strokeLinecap="round" />
      </svg>

      {/* Rotating ring 2 - reverse */}
      <svg
        className="absolute"
        width="200"
        height="200"
        viewBox="0 0 200 200"
        style={{ animation: "coreRotateReverse 15s linear infinite" }}
      >
        <circle cx="100" cy="100" r="95" fill="none" stroke="rgba(145,166,198,0.12)" strokeWidth="1" strokeDasharray="4 8" />
        <path d="M 100 5 A 95 95 0 0 1 190 80" fill="none" stroke="rgba(145,166,198,0.2)" strokeWidth="1" strokeLinecap="round" />
        <path d="M 100 195 A 95 95 0 0 1 15 120" fill="none" stroke="rgba(145,166,198,0.12)" strokeWidth="0.5" strokeLinecap="round" />
      </svg>

      {/* Rotating ring 3 - scan arc */}
      <svg
        className="absolute"
        width="170"
        height="170"
        viewBox="0 0 170 170"
        style={{ animation: "scanArc 4s linear infinite" }}
      >
        <defs>
          <linearGradient id="scanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,157,46,0)" />
            <stop offset="100%" stopColor="rgba(255,157,46,0.4)" />
          </linearGradient>
        </defs>
        <path d="M 85 10 A 75 75 0 0 1 155 55" fill="none" stroke="url(#scanGrad)" strokeWidth="2" strokeLinecap="round" />
      </svg>

      {/* Inner ring */}
      <svg className="absolute" width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="65" fill="none" stroke="rgba(255,157,46,0.1)" strokeWidth="0.5" />
        <circle cx="70" cy="70" r="55" fill="none" stroke="rgba(145,166,198,0.06)" strokeWidth="0.5" strokeDasharray="2 4" />
      </svg>

      {/* Core energy center */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: 80,
          height: 80,
          animation: isTyping ? "corePulse 1s ease-in-out infinite" : "corePulse 3s ease-in-out infinite",
        }}
      >
        {/* Glow */}
        <div
          className="absolute rounded-full"
          style={{
            width: 80,
            height: 80,
            background: "radial-gradient(circle, rgba(255,157,46,0.2) 0%, rgba(255,157,46,0.05) 50%, transparent 70%)",
            animation: "coreGlow 3s ease-in-out infinite",
          }}
        />
        {/* Inner circle */}
        <div
          className="rounded-full flex items-center justify-center"
          style={{
            width: 40,
            height: 40,
            background: "radial-gradient(circle, rgba(255,157,46,0.3) 0%, rgba(255,157,46,0.1) 60%, transparent 100%)",
            border: "1px solid rgba(255,157,46,0.3)",
          }}
        >
          <div
            className="rounded-full"
            style={{
              width: 12,
              height: 12,
              background: "rgba(255,157,46,0.8)",
              boxShadow: "0 0 10px rgba(255,157,46,0.5), 0 0 20px rgba(255,157,46,0.3)",
            }}
          />
        </div>
      </div>

      {/* Crosshair */}
      <svg className="absolute" width="280" height="280" viewBox="0 0 280 280" style={{ opacity: 0.15 }}>
        <line x1="140" y1="0" x2="140" y2="280" stroke="var(--friday-steel)" strokeWidth="0.5" />
        <line x1="0" y1="140" x2="280" y2="140" stroke="var(--friday-steel)" strokeWidth="0.5" />
      </svg>

      {/* Status labels */}
      <div className="hud-accent absolute" style={{ bottom: 30, left: "50%", transform: "translateX(-50%)", fontSize: 8, letterSpacing: "0.2em" }}>
        {isTyping ? "PROCESSING" : "STANDBY"}
      </div>
      <div className="annotation absolute" style={{ top: 20, right: 20 }}>
        SYS.CORE v2.1
      </div>
      <div className="annotation absolute" style={{ bottom: 20, left: 20 }}>
        FRIDAY AI
      </div>
    </div>
  );
}
