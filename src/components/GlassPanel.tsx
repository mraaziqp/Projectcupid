import { ReactNode } from "react";
import { cn } from "../lib/utils";
import { motion } from "motion/react";

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export default function GlassPanel({ children, className, delay = 0 }: GlassPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={cn(
        "relative overflow-hidden bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] shadow-2xl",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
