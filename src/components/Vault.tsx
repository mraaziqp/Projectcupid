import { motion } from "motion/react";
import { Lock, LockOpen, Heart, Sparkles, Wind, Moon } from "lucide-react";
import GlassPanel from "./GlassPanel";
import { cn } from "../lib/utils";

interface VaultItem {
  id: string;
  category: string;
  title: string;
  icon: any;
  content: string;
}

const VAULT_ITEMS: VaultItem[] = [
  {
    id: "1",
    category: "stressed",
    title: "Open when you are stressed",
    icon: Wind,
    content: "Take a deep breath, my love. Everything we are building, everything you are working on—it's all moving in the right direction. I'm right here with you."
  },
  {
    id: "2",
    category: "miss",
    title: "Open when you miss me",
    icon: Heart,
    content: "I'm probably missing you even more. Close your eyes for a second and feel my heart reaching out to yours. I'll be home soon."
  },
  {
    id: "3",
    category: "sleep",
    title: "Open when you can't sleep",
    icon: Moon,
    content: "I wish I was there to hold you while you drift off. Think of the quietest, most peaceful place we've ever been together. That's where we are in my dreams."
  },
  {
    id: "4",
    category: "argued",
    title: "Open when we just argued",
    icon: Sparkles,
    content: "No matter the noise, you are my signal. I'm sorry for my part in it. Let's find our way back to the quiet. I love you more than being right."
  }
];

export default function Vault({ onOpenLetter }: { onOpenLetter: (letter: any) => void }) {
  return (
    <div className="space-y-8 py-8 px-2 max-w-6xl mx-auto">
      <div className="space-y-2">
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs uppercase tracking-[0.4em] text-pink-500 font-bold"
        >
          Permanent Sanctuary
        </motion.p>
        <motion.h1 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl font-light italic font-serif text-white decoration-pink-500/20 underline underline-offset-8"
        >
          The Archive
        </motion.h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {VAULT_ITEMS.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -5 }}
            onClick={() => onOpenLetter({
              id: `vault-${item.id}`,
              title: item.title,
              content: item.content,
              publishDate: { toDate: () => new Date() },
              isFavorite: true,
              isVault: true
            })}
            className="group cursor-pointer"
          >
            <GlassPanel className="p-8 h-64 flex flex-col justify-between relative overflow-hidden group-hover:bg-white/10 transition-all border-white/5 group-hover:border-pink-500/30">
              <div className="absolute -top-4 -right-4 text-white/5 transform rotate-12 group-hover:scale-110 transition-transform">
                <item.icon size={120} />
              </div>

              <div className="space-y-4 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 group-hover:text-pink-400 group-hover:border-pink-500/50 transition-all shadow-inner">
                   <Lock className="group-hover:hidden w-5 h-5" />
                   <LockOpen className="hidden group-hover:block w-5 h-5" />
                </div>
                <h3 className="text-xl font-medium text-white/90 group-hover:text-white transition-colors leading-snug">
                  {item.title}
                </h3>
              </div>

              <div className="flex items-center justify-between relative z-10">
                <span className="text-[10px] uppercase tracking-widest text-white/20 group-hover:text-pink-500/50 transition-colors font-bold">
                  Unlocked by Intention
                </span>
                <div className="w-8 h-8 rounded-full border border-white/5 flex items-center justify-center text-white/10 group-hover:text-pink-400 group-hover:border-pink-500/20">
                  <Heart size={14} fill="currentColor" />
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
