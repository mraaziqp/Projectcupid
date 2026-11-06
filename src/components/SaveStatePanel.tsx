import { useEffect, useState } from "react";
import { Link2, Unlink, RefreshCw, ImageIcon, KeyRound } from "lucide-react";
import GlassPanel from "./GlassPanel";
import { apiFetch, apiBlobUrl } from "../lib/api";
import type { UserProfile } from "../types";

type SaveStateProfile = { userId: string; username: string; displayName: string; avatar: string | null; avatarColor: string | null; bio: string | null; mediaAccess: boolean; canUpload: boolean; syncedAt: string };

function ProfileImage({ uid, id }: { uid: string; id: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let url: string | null = null;
    const ctl = new AbortController();
    apiBlobUrl(`savestate/profile-image?uid=${encodeURIComponent(uid)}&id=${encodeURIComponent(id)}`, ctl.signal)
      .then((u) => { url = u; setSrc(u); })
      .catch(() => setFailed(true));
    return () => { ctl.abort(); if (url) URL.revokeObjectURL(url); };
  }, [uid, id]);
  if (failed) return <div className="aspect-square rounded-xl bg-white/5 flex items-center justify-center text-white/30 text-[10px]">unavailable</div>;
  return src ? <img src={src} alt="" className="aspect-square w-full object-cover rounded-xl" /> : <div className="aspect-square rounded-xl bg-white/5 animate-pulse" />;
}

export default function SaveStatePanel({ currentProfile, partnerProfile }: { currentProfile: UserProfile | null; partnerProfile?: UserProfile | null }) {
  const linked = (currentProfile as any)?.savestate as SaveStateProfile | undefined;
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [images, setImages] = useState<Array<{ id: string; isPublic: boolean }>>([]);
  const [partnerImages, setPartnerImages] = useState<Array<{ id: string }>>([]);

  useEffect(() => {
    if (!linked || !currentProfile) return;
    apiFetch<{ images: any[] }>("savestate/profile-images").then((r) => setImages(r.images)).catch(() => setImages([]));
  }, [linked?.userId, currentProfile?.uid]);

  useEffect(() => {
    const p = partnerProfile as any;
    if (!p?.uid || !p?.savestate) return;
    apiFetch<{ images: any[] }>(`savestate/profile-images?uid=${encodeURIComponent(p.uid)}`).then((r) => setPartnerImages(r.images)).catch(() => setPartnerImages([]));
  }, [(partnerProfile as any)?.uid]);

  const link = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      await apiFetch("auth/savestate/link", { body: { identifier: identifier.trim(), password } });
      setPassword("");
      setMsg({ ok: true, text: "Linked. You can now sign in to Cupid with your SaveState username and password." });
    } catch (err: any) {
      setMsg({ ok: false, text: err?.message ?? "Linking failed." });
    } finally { setBusy(false); }
  };

  const action = async (path: string, ok: string) => {
    setBusy(true); setMsg(null);
    try { await apiFetch(path, { body: {} }); setMsg({ ok: true, text: ok }); }
    catch (err: any) { setMsg({ ok: false, text: err?.message ?? "That didn't work." }); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <GlassPanel className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-300"><Link2 className="w-5 h-5" /></div>
          <div>
            <h3 className="text-lg font-serif text-white">SaveState account</h3>
            <p className="text-xs text-white/60 max-w-xl">Sign in to Cupid with your SaveState login, keep your SaveState profile and photos in sync, and send Cupid's emails through SaveState's mail.</p>
          </div>
        </div>

        {linked ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg overflow-hidden" style={{ background: linked.avatarColor ?? "#3f2a33" }}>
                {linked.avatar && linked.avatar.startsWith("https://") ? <img src={linked.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <span>{linked.avatar || linked.displayName.slice(0, 1)}</span>}
              </div>
              <div>
                <div className="text-white font-medium">{linked.displayName} <span className="text-white/40 text-xs">@{linked.username}</span></div>
                <div className="text-[11px] text-white/50">Synced {new Date(linked.syncedAt).toLocaleString()} · photos {linked.mediaAccess ? "available" : "not enabled on SaveState"} · uploads {linked.canUpload ? "allowed" : "not allowed"}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button disabled={busy} onClick={() => action("auth/savestate/sync", "Profile refreshed from SaveState.")} className="px-3 py-2 rounded-xl bg-white/10 text-xs text-white flex items-center gap-1.5 disabled:opacity-50"><RefreshCw className="w-3.5 h-3.5" /> Sync profile</button>
              <button disabled={busy} onClick={() => action("auth/savestate/unlink", "Unlinked. Sign in with Google next time.")} className="px-3 py-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-xs text-rose-200 flex items-center gap-1.5 disabled:opacity-50"><Unlink className="w-3.5 h-3.5" /> Unlink</button>
            </div>
          </div>
        ) : (
          <form onSubmit={link} className="grid sm:grid-cols-[1fr_1fr_auto] gap-2">
            <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="SaveState username" autoComplete="username" className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm" required />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="SaveState password" autoComplete="current-password" className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm" required />
            <button disabled={busy} className="px-4 py-2.5 rounded-xl bg-amber-500/80 hover:bg-amber-500 text-sm text-white flex items-center justify-center gap-1.5 disabled:opacity-50"><KeyRound className="w-4 h-4" /> {busy ? "Checking…" : "Link"}</button>
          </form>
        )}
        {msg && <p className={`text-xs rounded-lg p-2.5 border ${msg.ok ? "text-emerald-200 bg-emerald-500/10 border-emerald-500/20" : "text-rose-200 bg-rose-500/10 border-rose-500/20"}`}>{msg.text}</p>}
        <p className="text-[11px] text-white/40">Your password goes straight to SaveState and is never stored by Cupid. Cupid keeps only an encrypted SaveState session.</p>
      </GlassPanel>

      {linked && (
        <GlassPanel className="p-6 space-y-3">
          <h4 className="text-white font-medium flex items-center gap-2"><ImageIcon className="w-4 h-4 text-rose-300" /> Your SaveState profile pictures</h4>
          {images.length ? (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {images.slice(0, 12).map((i) => (
                <div key={i.id} className="relative">
                  <ProfileImage uid={currentProfile!.uid} id={i.id} />
                  {!i.isPublic && <span className="absolute bottom-1 left-1 text-[9px] px-1.5 py-0.5 rounded bg-black/60 text-white/80">only you</span>}
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-white/50">No profile pictures in SaveState yet.</p>}
          {partnerImages.length > 0 && partnerProfile && (
            <>
              <h4 className="text-white font-medium pt-2">{partnerProfile.displayName}'s public SaveState pictures</h4>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {partnerImages.slice(0, 12).map((i) => <ProfileImage key={i.id} uid={partnerProfile.uid} id={i.id} />)}
              </div>
            </>
          )}
        </GlassPanel>
      )}
    </div>
  );
}
