import { motion } from "motion/react";
import { useMemo } from "react";

export default function Background() {
  const stars = useMemo(() => {
    return Array.from({ length: 65 }, (_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 2.2 + 0.8,
      duration: Math.random() * 5 + 3,
      delay: Math.random() * 6,
      isGolden: i % 4 === 0,
    }));
  }, []);

  return (
    <div className="fixed inset-0 -z-10 bg-[#07060a] overflow-hidden pointer-events-none select-none">
      {/* Whimsical Starlight Field */}
      <div className="absolute inset-0 opacity-45">
        {stars.map((star) => (
          <motion.div
            key={star.id}
            initial={{ opacity: 0.1, scale: 0.7 }}
            animate={{
              opacity: [0.15, 0.9, 0.15],
              scale: [0.7, 1.25, 0.7],
            }}
            transition={{
              duration: star.duration,
              repeat: Infinity,
              delay: star.delay,
              ease: "easeInOut",
            }}
            className={`absolute rounded-full ${
              star.isGolden
                ? "bg-[#dfc298] shadow-[0_0_6px_rgba(223,194,152,0.9)]"
                : "bg-[#fffaf0] shadow-[0_0_4px_rgba(255,250,240,0.8)]"
            }`}
            style={{
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
            }}
          />
        ))}
      </div>

      {/* Primary Moonlit Garden Aura (Muted Plum) */}
      <motion.div
        animate={{
          x: [0, 60, -30, 0],
          y: [0, -30, 60, 0],
          scale: [1, 1.08, 0.96, 1],
        }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -top-[15%] -left-[10%] w-[65%] h-[65%] rounded-full bg-[#2a1325]/35 blur-[130px]"
      />

      {/* Secondary Ethereal Glow (Antique Gold & Rose) */}
      <motion.div
        animate={{
          x: [0, -70, 30, 0],
          y: [0, 50, -40, 0],
          scale: [1, 0.9, 1.1, 1],
        }}
        transition={{
          duration: 32,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -bottom-[12%] -right-[8%] w-[55%] h-[55%] rounded-full bg-[#3d2417]/25 blur-[120px]"
      />

      {/* Tertiary Moonlit Sage Mist */}
      <motion.div
        animate={{
          opacity: [0.1, 0.22, 0.1],
          scale: [0.85, 1.15, 0.85],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-[28%] right-[12%] w-[42%] h-[42%] rounded-full bg-[#182820]/25 blur-[110px]"
      />
    </div>
  );
}
