
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const messages = [
  "AI is designing your cards…",
  "Mixing colors and layouts…",
  "Crafting something beautiful…",
  "Picking the perfect template…",
  "Almost ready…",
];

/* ── Single skeleton card ──────────────────────────────────────────── */
function SkeletonCard({ delay }: { delay: number }) {
  return (
    <div
      className="w-[280px] h-[160px] rounded-lg overflow-hidden relative bg-gray-100 shadow-md"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Shimmer sweep */}
      <div
        className="absolute inset-0 z-10"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.08) 30%, rgba(99,102,241,0.15) 50%, rgba(99,102,241,0.08) 70%, transparent 100%)",
          backgroundSize: "200% 100%",
          animation: `shimmer 1.8s ease-in-out infinite`,
          animationDelay: `${delay}ms`,
        }}
      />

      {/* Fake card skeleton elements */}
      <div className="absolute inset-0 p-5 flex flex-col justify-between">
        {/* Top section: name + title */}
        <div className="space-y-2">
          <div className="h-3.5 w-28 rounded bg-gray-200/80 animate-pulse" style={{ animationDelay: `${delay}ms` }} />
          <div className="h-2 w-16 rounded bg-gray-200/60 animate-pulse" style={{ animationDelay: `${delay + 100}ms` }} />
          <div className="h-2 w-20 rounded bg-gray-200/50 animate-pulse" style={{ animationDelay: `${delay + 200}ms` }} />
        </div>

        {/* Bottom section: contacts */}
        <div className="space-y-1.5">
          <div className="h-1.5 w-32 rounded bg-gray-200/60 animate-pulse" style={{ animationDelay: `${delay + 300}ms` }} />
          <div className="h-1.5 w-24 rounded bg-gray-200/60 animate-pulse" style={{ animationDelay: `${delay + 400}ms` }} />
          <div className="h-1.5 w-28 rounded bg-gray-200/60 animate-pulse" style={{ animationDelay: `${delay + 500}ms` }} />
        </div>
      </div>

      {/* Fake logo circle */}
      <div
        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-200/70 animate-pulse"
        style={{ animationDelay: `${delay + 150}ms` }}
      />

      {/* Accent stripe */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-200 via-purple-200 to-blue-200 opacity-60"
        style={{ animation: `accentPulse 2s ease-in-out infinite`, animationDelay: `${delay}ms` }}
      />
    </div>
  );
}

/* ── Main overlay ──────────────────────────────────────────────────── */
export default function LoadingOverlay() {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setMsgIdx((i) => (i + 1) % messages.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
      {/* Inline keyframes */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes accentPulse {
          0%, 100% { opacity: 0.3; }
          50%      { opacity: 0.7; }
        }
        @keyframes fadeUp {
          0%   { opacity: 0; transform: translateY(6px); }
          15%  { opacity: 1; transform: translateY(0); }
          85%  { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-6px); }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center gap-2 mb-8">
        <Sparkles size={22} className="text-indigo-500 animate-pulse" />
        <span className="text-lg font-semibold text-gray-800">AI is generating designs</span>
      </div>

      {/* Skeleton grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} delay={i * 120} />
        ))}
      </div>

      {/* Rotating message */}
      <p
        key={msgIdx}
        className="mt-8 text-sm font-medium text-indigo-500"
        style={{ animation: "fadeUp 2.2s ease-in-out" }}
      >
        {messages[msgIdx]}
      </p>
    </div>
  );
}
