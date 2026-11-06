import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Camera, Video, Mic, PenLine, X, Square, Lock, Users, Loader2, MapPin } from "lucide-react";
import { preparePhoto, readAsDataUrl, saveMoment, todayLocal, videoThumbnail } from "../../lib/memoryGarden/client";
import { UPLOAD_RULES, type UploadKind, type Visibility } from "../../lib/memoryGarden/model";

type Mode = "photo" | "video" | "voice" | "write";

/**
 * Save This Moment. Quick on purpose: a photo and a tap is enough.
 * Visibility has no default — you pick shared or private every time.
 */
export default function SaveMomentModal({ onClose, onSaved, savestateLinked }: { onClose: () => void; onSaved: (id: string) => void; savestateLinked: boolean }) {
  const [mode, setMode] = useState<Mode>(savestateLinked ? "photo" : "write");
  const [file, setFile] = useState<{ kind: UploadKind; data: string; preview?: string; name: string } | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [date, setDate] = useState(todayLocal());
  const [tags, setTags] = useState("");
  const [location, setLocation] = useState("");
  const [showPlace, setShowPlace] = useState(false);
  const [special, setSpecial] = useState(false);
  const [visibility, setVisibility] = useState<Visibility | null>(null);
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);

  useEffect(() => () => { stream.current?.getTracks().forEach((t) => t.stop()); }, []);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  const pick = async (f: File | undefined, kind: UploadKind) => {
    if (!f) return;
    setError(null); setPreparing(true);
    try {
      if (kind === "photo") {
        const p = await preparePhoto(f);
        setFile({ kind, data: p.data, preview: p.thumbnail, name: f.name });
        setThumbnail(p.thumbnail);
      } else {
        if (f.size > UPLOAD_RULES[kind].maxBytes) throw new Error(`That file is ${(f.size / 1048576).toFixed(1)} MB. For now the limit is ${UPLOAD_RULES[kind].maxBytes / 1048576} MB — try a shorter clip.`);
        const data = await readAsDataUrl(f);
        const thumb = kind === "video" ? await videoThumbnail(f) : null;
        setFile({ kind, data, preview: thumb ?? undefined, name: f.name });
        setThumbnail(thumb);
      }
      if (!title) setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").slice(0, 80));
    } catch (e: any) {
      setError(e?.message ?? "That file couldn't be used.");
    } finally { setPreparing(false); }
  };

  const startRecording = async () => {
    setError(null);
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      const r = new MediaRecorder(stream.current, type ? { mimeType: type, audioBitsPerSecond: 48_000 } : undefined);
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = async () => {
        stream.current?.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: r.mimeType || "audio/webm" });
        if (blob.size > UPLOAD_RULES.voice.maxBytes) { setError("That recording is too long for now (3 MB). Try a shorter note."); return; }
        setFile({ kind: "voice", data: await readAsDataUrl(blob), name: "Voice note" });
        if (!title) setTitle("A little voice note");
      };
      r.start();
      recorder.current = r;
      setRecording(true);
    } catch {
      setError("Microphone access wasn't allowed. You can upload a voice file instead.");
    }
  };
  const stopRecording = () => { recorder.current?.stop(); setRecording(false); };

  const save = async () => {
    setError(null);
    if (!visibility) { setError("Choose whether this is shared with your partner or private to you."); return; }
    if (mode !== "write" && !file) { setError("Add a file first, or switch to writing."); return; }
    if (mode === "write" && !caption.trim() && !title.trim()) { setError("Write a few words first."); return; }
    setBusy(true);
    try {
      const m = await saveMoment({
        title: title.trim(), caption: caption.trim(), memoryDate: date, visibility,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean), location: location.trim() || undefined,
        isSpecialOccasion: special, file: mode === "write" || !file ? null : { kind: file.kind, data: file.data }, thumbnail,
      });
      onSaved(m.id);
    } catch (e: any) {
      setError(e?.code === "savestate_signin_needed" ? "Photos are kept in SaveState. Link your SaveState account in Settings first (or save this as words only)." : e?.message ?? "That moment wasn't saved. Please try again.");
    } finally { setBusy(false); }
  };

  const tabs: Array<{ id: Mode; label: string; icon: any; needsMedia: boolean }> = [
    { id: "photo", label: "Photo", icon: Camera, needsMedia: true },
    { id: "video", label: "Video", icon: Video, needsMedia: true },
    { id: "voice", label: "Voice", icon: Mic, needsMedia: true },
    { id: "write", label: "Words", icon: PenLine, needsMedia: false },
  ];

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="Save this moment">
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full sm:max-w-lg max-h-[94dvh] overflow-y-auto overscroll-contain bg-[#f7f0e1] text-[#3e3326] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-[#e2d4b6]">
        <div className="sticky top-0 z-10 bg-[#f7f0e1] px-5 pt-4 pb-3 flex items-center justify-between border-b border-[#e7dbc1]">
          <div>
            
            <h3 className="font-serif text-xl sm:text-2xl">Save this moment</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 flex items-center justify-center" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-4 sm:px-5 pt-4 space-y-3 sm:space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {tabs.map((t) => {
              const disabled = t.needsMedia && !savestateLinked;
              return (
                <button key={t.id} disabled={disabled} onClick={() => { setMode(t.id); setFile(null); setThumbnail(null); }}
                  className={`py-2.5 rounded-xl text-xs flex flex-col items-center gap-1 border transition ${mode === t.id ? "bg-[#6b7a4f] text-white border-[#6b7a4f]" : "bg-white/60 border-[#e2d4b6] text-[#5e4f3b] hover:bg-white"} disabled:opacity-40`}
                  title={disabled ? "Link SaveState in Settings to add media" : undefined}>
                  <t.icon className="w-4 h-4" />{t.label}
                </button>
              );
            })}
          </div>
          {!savestateLinked && <p className="text-[11px] text-[#8a6f4e]">Photos, videos and voice notes are kept in SaveState. Link your SaveState account in Settings to add them.</p>}

          {mode === "photo" && (
            <label className="block cursor-pointer">
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => pick(e.target.files?.[0], "photo")} />
              <div className="aspect-[16/9] sm:aspect-[4/3] rounded-2xl border-2 border-dashed border-[#d8c7a4] bg-white/50 flex items-center justify-center overflow-hidden">
                {preparing ? <Loader2 className="w-6 h-6 animate-spin text-[#8a7a5c]" /> : file?.preview ? <img src={file.preview} alt="" className="w-full h-full object-cover" /> : <span className="text-sm text-[#8a7a5c] flex items-center gap-2"><Camera className="w-5 h-5" /> Take or choose a photo</span>}
              </div>
            </label>
          )}
          {mode === "video" && (
            <label className="block cursor-pointer">
              <input type="file" accept="video/mp4,video/quicktime,video/webm" className="sr-only" onChange={(e) => pick(e.target.files?.[0], "video")} />
              <div className="aspect-[4/3] rounded-2xl border-2 border-dashed border-[#d8c7a4] bg-white/50 flex items-center justify-center overflow-hidden">
                {preparing ? <Loader2 className="w-6 h-6 animate-spin" /> : file ? (file.preview ? <img src={file.preview} alt="" className="w-full h-full object-cover" /> : <span className="text-sm">{file.name}</span>) : <span className="text-sm text-[#8a7a5c] flex items-center gap-2"><Video className="w-5 h-5" /> Choose a short video (up to 3 MB)</span>}
              </div>
            </label>
          )}
          {mode === "voice" && (
            <div className="rounded-2xl border border-[#e2d4b6] bg-white/50 p-4 flex flex-col items-center gap-3">
              {file ? <audio src={file.data} controls className="w-full" /> : <p className="text-sm text-[#8a7a5c]">Record a little note, or upload one.</p>}
              <div className="flex gap-2">
                {!recording ? <button onClick={startRecording} className="px-4 py-2 rounded-full bg-[#c98b8b] text-white text-sm flex items-center gap-1.5"><Mic className="w-4 h-4" /> {file ? "Record again" : "Record"}</button>
                  : <button onClick={stopRecording} className="px-4 py-2 rounded-full bg-[#8a3f3f] text-white text-sm flex items-center gap-1.5 animate-pulse"><Square className="w-4 h-4" /> Stop</button>}
                <label className="px-4 py-2 rounded-full bg-white border border-[#e2d4b6] text-sm cursor-pointer">
                  Upload<input type="file" accept="audio/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0], "voice")} />
                </label>
              </div>
            </div>
          )}

          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="A title (optional)" className="w-full px-3.5 py-2.5 rounded-xl bg-white/70 border border-[#e2d4b6] font-serif text-lg placeholder:text-[#b3a283] focus:outline-none focus:border-[#b8955a]" />
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={4000} rows={mode === "write" ? 4 : 2} placeholder={mode === "write" ? "What happened, and why it mattered…" : "A few words (optional)"} className="w-full px-3.5 py-2.5 rounded-xl bg-white/70 border border-[#e2d4b6] font-serif placeholder:text-[#b3a283] focus:outline-none focus:border-[#b8955a]" />

          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-[#8a7a5c]">When
              <input type="date" value={date} max="2100-12-31" min="1950-01-01" onChange={(e) => setDate(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl bg-white/70 border border-[#e2d4b6] text-sm text-[#3e3326]" />
            </label>
            <label className="text-[11px] text-[#8a7a5c]">Tags
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="first, beach" className="mt-1 w-full px-3 py-2 rounded-xl bg-white/70 border border-[#e2d4b6] text-sm text-[#3e3326]" />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={special} onChange={(e) => setSpecial(e.target.checked)} className="accent-[#b8955a]" /> Special occasion</label>
            {!showPlace ? (
              <button onClick={() => setShowPlace(true)} className="flex items-center gap-1 text-[#6b7a4f] underline-offset-2 hover:underline"><MapPin className="w-3.5 h-3.5" /> Add a place</button>
            ) : (
              <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={120} placeholder="Where was this? (you type it — Cupid never reads your location)" className="flex-1 min-w-[12rem] px-3 py-1.5 rounded-lg bg-white/70 border border-[#e2d4b6]" />
            )}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-[11px] uppercase tracking-widest text-[#8a7a5c] mb-1">Who can see this?</legend>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setVisibility("shared")} aria-pressed={visibility === "shared"} className={`p-3 rounded-xl border text-left text-sm flex gap-2 ${visibility === "shared" ? "bg-[#6b7a4f] text-white border-[#6b7a4f]" : "bg-white/60 border-[#e2d4b6]"}`}>
                <Users className="w-4 h-4 mt-0.5 shrink-0" /><span><strong className="block">Shared</strong><span className="text-[11px] opacity-80">Both of us</span></span>
              </button>
              <button onClick={() => setVisibility("private")} aria-pressed={visibility === "private"} className={`p-3 rounded-xl border text-left text-sm flex gap-2 ${visibility === "private" ? "bg-[#5a4636] text-white border-[#5a4636]" : "bg-white/60 border-[#e2d4b6]"}`}>
                <Lock className="w-4 h-4 mt-0.5 shrink-0" /><span><strong className="block">Private to me</strong><span className="text-[11px] opacity-80">Only you</span></span>
              </button>
            </div>
          </fieldset>

          {error && <p className="text-sm text-[#8a3f3f] bg-[#c98b8b]/15 border border-[#c98b8b]/40 rounded-xl p-3">{error}</p>}

          <p className="text-[11px] text-center text-[#7a6a55]">It goes to your Inbox first. Organising it later is optional.</p>
        </div>
        <div className="sticky bottom-0 z-10 bg-[#f7f0e1] px-4 sm:px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] border-t border-[#e7dbc1] mt-3">
          <button onClick={save} disabled={busy || preparing || recording} className="w-full py-3 rounded-2xl bg-[#b8955a] hover:bg-[#a8854b] text-white font-serif text-lg disabled:opacity-50 flex items-center justify-center gap-2">
            {busy ? <><Loader2 className="w-5 h-5 animate-spin" /> Planting it in the garden…</> : "Keep this moment"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
