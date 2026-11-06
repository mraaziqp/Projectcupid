import { useEffect, useState } from "react";
import { ImageOff, Loader2, Mic } from "lucide-react";
import { apiBlobUrl } from "../../lib/api";
import type { Memory } from "../../lib/memoryGarden/model";

/**
 * One file from a memory. The bytes come through Cupid's server, which checks
 * the memory is visible to whoever is asking. Audio and video never autoplay.
 */
export default function MediaView({ memory, index = 0, size = "full", className = "" }: { memory: Memory; index?: number; size?: "thumb" | "full"; className?: string }) {
  const media = memory.media[index];
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSrc(null); setError(null);
    if (!media) return;
    const ctl = new AbortController();
    let url: string | null = null;
    apiBlobUrl(`memories/media?id=${encodeURIComponent(memory.id)}&i=${index}&size=${size}`, ctl.signal)
      .then((u) => { url = u; setSrc(u); })
      .catch((e) => { if (!ctl.signal.aborted) setError(e?.code === "savestate_unreachable" || e?.status === 503 ? "SaveState is offline right now — this will come back." : e?.message ?? "Couldn't load this file."); });
    return () => { ctl.abort(); if (url) URL.revokeObjectURL(url); };
  }, [memory.id, index, size, media?.ref?.photoId, media?.ref?.rowId]);

  if (!media) return null;
  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-[#efe6d2] text-[#7a6a55] text-xs p-6 text-center ${className}`}>
        {memory.thumbnail && media.kind !== "voice" ? <img src={memory.thumbnail} alt="" className="max-h-48 rounded opacity-80" /> : <ImageOff className="w-6 h-6" />}
        <span>{error}</span>
      </div>
    );
  }
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-[#efe6d2] ${className}`}>
        {memory.thumbnail && media.kind === "photo" ? <img src={memory.thumbnail} alt="" className="w-full h-full object-contain blur-[1px]" /> : <Loader2 className="w-6 h-6 text-[#9a8a70] animate-spin" />}
      </div>
    );
  }
  if (media.kind === "photo") return <img src={src} alt={memory.title} className={`object-contain ${className}`} />;
  if (media.kind === "video") return <video src={src} controls playsInline preload="metadata" className={className} />;
  return (
    <div className={`flex flex-col items-center justify-center gap-3 bg-[#efe6d2] p-6 ${className}`}>
      <Mic className="w-8 h-8 text-[#8a5a5a]" />
      <audio src={src} controls preload="metadata" className="w-full max-w-sm" />
    </div>
  );
}
