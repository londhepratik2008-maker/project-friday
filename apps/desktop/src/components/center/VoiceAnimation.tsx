export default function VoiceAnimation() {
  const rings = [
    {
      size: 320,
      border: "border-[#FF9D2E]/20",
      animation: "orbit-x 18s linear infinite",
      dot: "#FFD166",
    },
    {
      size: 300,
      border: "border-[#FFB347]/25",
      animation: "orbit-y 24s linear infinite",
      dot: "#FFB347",
    },
    {
      size: 280,
      border: "border-[#FFD166]/30",
      animation: "orbit-diagonal 15s linear infinite",
      dot: "#FFD166",
    },
    {
      size: 250,
      border: "border-[#FF9D2E]/15",
      animation: "orbit-diagonal-reverse 28s linear infinite",
      dot: "#FF9D2E",
    },
    {
      size: 210,
      border: "border-[#FFD166]/40",
      animation: "orbit-diagonal 12s linear infinite reverse",
      dot: "#FFD166",
    },
  ];

  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      style={{
        perspective: "1000px",
        transformStyle: "preserve-3d",
      }}
    >
      {/* Ambient Glow */}
      <div className="absolute h-96 w-96 rounded-full bg-[#FF9D2E]/10 blur-[120px]" />

      {/* Orbital Rings */}
      {rings.map((ring, index) => (
        <div
          key={index}
          className="absolute"
          style={{
            width: ring.size,
            height: ring.size,
            animation: ring.animation,
          }}
        >
          <div
            className={`absolute inset-0 rounded-full border ${ring.border}`}
          />

          {/* Rotating Energy Node */}
          <div
            className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full"
            style={{
              background: ring.dot,
              boxShadow: `0 0 12px ${ring.dot}, 0 0 24px ${ring.dot}`,
            }}
          />
        </div>
      ))}

      {/* Core Glow */}
      <div className="absolute h-32 w-32 rounded-full bg-[#FF9D2E]/30 blur-3xl" />

      {/* Core */}
      <div
        className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD166] via-[#FFB347] to-[#FF9D2E] shadow-[0_0_70px_rgba(255,157,46,.65)]"
        style={{
          animation: "energyPulse 3s ease-in-out infinite",
        }}
      >
        <div className="absolute inset-2 rounded-full bg-white/10 blur-sm" />
        <div className="absolute h-4 w-4 rounded-full bg-white/60 blur-[2px]" />
      </div>

      {/* Status Text */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-[#8C8C8C]">
          AI Ready
        </p>
      </div>
    </div>
  );
}
