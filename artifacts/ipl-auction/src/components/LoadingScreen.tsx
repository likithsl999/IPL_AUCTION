import React, { useEffect, useState } from "react";

export default function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 200);
    const t2 = setTimeout(() => setPhase(2), 1000);
    const t3 = setTimeout(() => setPhase(3), 2000);
    const t4 = setTimeout(() => onDone(), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 bg-black flex flex-col items-center justify-center z-50 transition-opacity duration-500 ${
        phase >= 3 ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Glow background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, rgba(251,191,36,0.06) 0%, transparent 70%)",
        }}
      />

      {/* Cricket ball */}
      <div
        className={`mb-8 transition-all duration-700 ${
          phase >= 1 ? "scale-100 opacity-100" : "scale-0 opacity-0"
        }`}
      >
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center text-5xl"
          style={{
            border: "2px solid rgba(251,191,36,0.4)",
            boxShadow: "0 0 60px rgba(251,191,36,0.3), inset 0 0 30px rgba(251,191,36,0.1)",
            background: "radial-gradient(circle, rgba(251,191,36,0.05), transparent)",
          }}
        >
          🏏
        </div>
      </div>

      {/* Title */}
      <div
        className={`text-center transition-all duration-700 ${
          phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >
        <div className="text-xs text-white/20 uppercase tracking-[0.4em] font-bold mb-2">
          IPL Auction Simulator
        </div>
        <div
          className="text-8xl font-black leading-none"
          style={{
            background: "linear-gradient(135deg, #facc15 0%, #f97316 50%, #ef4444 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 0 30px rgba(251,191,36,0.5))",
          }}
        >
          2026
        </div>
      </div>

      {/* Tagline */}
      <div
        className={`mt-6 text-white/30 text-xs uppercase tracking-[0.3em] transition-all duration-500 ${
          phase >= 2 ? "opacity-100" : "opacity-0"
        }`}
      >
        Mega Auction Edition
      </div>

      {/* Loading bar */}
      <div
        className={`mt-10 w-48 h-px bg-white/5 overflow-hidden transition-all duration-300 ${
          phase >= 2 ? "opacity-100" : "opacity-0"
        }`}
      >
        <div
          className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-[2500ms] ease-out"
          style={{ width: phase >= 2 ? "100%" : "0%" }}
        />
      </div>

      {/* Developer credit */}
      <div
        className={`absolute bottom-8 text-center transition-all duration-500 ${
          phase >= 2 ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="text-[10px] text-white/15 uppercase tracking-[0.3em]">
          Developed by
        </div>
        <div className="text-white/30 text-sm font-bold tracking-widest mt-0.5">
          LIKITH
        </div>
      </div>
    </div>
  );
}
