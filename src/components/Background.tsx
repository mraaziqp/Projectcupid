import { motion } from "motion/react";

export default function Background() {
  return (
    <div className="fixed inset-0 -z-10 bg-neutral-950 overflow-hidden">
      {/* Primary Aurora Blob */}
      <motion.div
        animate={{
          x: [0, 80, -40, 0],
          y: [0, -40, 80, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] rounded-full bg-purple-900/30 blur-[120px]"
      />
      
      {/* Secondary Aurora Blob */}
      <motion.div
        animate={{
          x: [0, -120, 40, 0],
          y: [0, 80, -40, 0],
          scale: [1, 0.85, 1.05, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[100px]"
      />

      {/* Tertiary Aurora Blob (Pink) */}
      <motion.div
        animate={{
          opacity: [0.1, 0.2, 0.1],
          scale: [0.8, 1.2, 0.8],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-pink-900/15 blur-[100px]"
      />
    </div>
  );
}
