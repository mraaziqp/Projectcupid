import { useEffect, useState } from "react";
import { Loader2, Lock, CheckCircle2, Plug, Unplug, FolderOpen, Users, RefreshCw } from "lucide-react";
import { apiFetch } from "../../lib/api";

type SourceId = "savestate" | "weddingapp" | "memory_book" | "letters" | "timeline";
interface PreviewItem { source: SourceId; sourceRecordId: string; title: string; date: string | null; mediaType: string; visibility: "shareable" | "restricted"; reason?: string; imported: boolean; group?: string }
interface Status {
  savestate: { linked: boolean; reachable: boolean; detail: string };
  weddingapp: { configured: boolean; reachable: boolean; detail: string; disconnected: boolean };
  memory_book: { count: number | null };
  letters: { count: number | null };
  timeline: { count: number | null };
}

const SOURCES: Array<{ id: SourceId; name: string; about: string }> = [
  { id: "savestate", name: "SaveState photo booklet", about: "Albums on your SaveState host. PIN-locked albums stay private and can't be imported." },
  { id: "weddingapp", name: "WeddingApp", about: "The photographer's gallery and guests' photos from the wedding site. Only what is public and not hidden there can come in." },
  { id: "memory_book", name: "Our Memory Book", about: "Entries already in Cupid's scrapbook." },
  { id: "letters", name: "Letters", about: "Published letters from Our Love. Drafts never appear here." },
  { id: "timeline", name: "Our Story timeline", about: "Milestones from Our Love's timeline. Dates that can't be read are tagged 'date unsure' for you to fix." },
];

/**
 * Import preview. Nothing is imported automatically: you see each record, its
 * source and whether it may be shared, then choose which to bring in and who
 * sees them. The originals are never changed.
 */
export default function SourcesPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [active, setActive] = useState<SourceId | null>(null);
  const [albums, setAlbums] = useState<any[] | null>(null);
  const [albumId, setAlbumId] = useState<string | null>(null);
  const [items, setItems] = useState<PreviewItem[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [visibility, setVisibility] = useState<"shared" | "private" | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const loadStatus = () => apiFetch<Status>("memories/sources").then(setStatus).catch((e) => setMsg({ ok: false, text: e.message }));
  useEffect(() => { loadStatus(); }, []);

  const open = async (id: SourceId, album?: string) => {
    setActive(id); setItems(null); setSelected(new Set()); setMsg(null); setBusy(true); setVisibility(null);
    if (id !== "savestate") { setAlbums(null); setAlbumId(null); }
    try {
      if (id === "savestate" && !album) {
        const r = await apiFetch<{ albums: any[] }>("memories/sources/savestate");
        setAlbums(r.albums); setAlbumId(null);
      } else {
        const r = await apiFetch<{ items: PreviewItem[] }>(`memories/sources/${id}${album ? `?albumId=${encodeURIComponent(album)}` : ""}`);
        setItems(r.items);
        if (album) setAlbumId(album);
      }
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message ?? "Couldn't open that source." });
    } finally { setBusy(false); }
  };

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const doImport = async () => {
    if (!active || !selected.size) return;
    if (!visibility) { setMsg({ ok: false, text: "Choose who can see these before importing." }); return; }
    setBusy(true); setMsg(null);
    try {
      const r = { imported: 0, skipped: 0, refused: [] as Array<{ reason: string }> };
      const all = [...selected];
      for (let i = 0; i < all.length; i += 20) {
        setMsg({ ok: true, text: `Bringing them in… ${Math.min(i + 20, all.length)} of ${all.length}` });
        const part = await apiFetch<typeof r>("memories/import", { body: { source: active, ids: all.slice(i, i + 20), visibility } });
        r.imported += part.imported; r.skipped += part.skipped; r.refused.push(...part.refused);
      }
      setMsg({ ok: true, text: `${r.imported} added to your Inbox${r.skipped ? `, ${r.skipped} were already there` : ""}${r.refused.length ? `, ${r.refused.length} refused (${[...new Set(r.refused.map((x) => x.reason))].join(", ")})` : ""}.` });
      await open(active, albumId ?? undefined);
    } catch (e: any) { setMsg({ ok: false, text: e?.message ?? "Import failed." }); }
    finally { setBusy(false); }
  };

  const disconnect = async (source: SourceId) => {
    const remove = confirm("Also remove the memories you imported from it? (The originals are never touched.) OK = remove them, Cancel = keep them.");
    setBusy(true);
    try {
      const r = await apiFetch<{ removed: number }>("memories/sources/disconnect", { body: { source, removeImported: remove } });
      setMsg({ ok: true, text: `Disconnected${remove ? `; ${r.removed} imported references removed` : ""}.` });
      setActive(null); setItems(null);
      await loadStatus();
    } catch (e: any) { setMsg({ ok: false, text: e?.message }); } finally { setBusy(false); }
  };

  const reconnect = async () => {
    setBusy(true);
    try { await apiFetch("memories/sources/reconnect", { body: { source: "weddingapp" } }); await loadStatus(); }
    catch (e: any) { setMsg({ ok: false, text: e?.message }); } finally { setBusy(false); }
  };

  const stateOf = (id: SourceId) => {
    if (!status) return { ok: false, label: "…" };
    if (id === "savestate") return status.savestate.linked ? { ok: status.savestate.reachable, label: status.savestate.reachable ? "Connected" : "SaveState offline" } : { ok: false, label: "Link SaveState in Settings" };
    if (id === "weddingapp") return !status.weddingapp.configured ? { ok: false, label: "Not configured" } : status.weddingapp.disconnected ? { ok: false, label: "Disconnected" } : { ok: status.weddingapp.reachable, label: status.weddingapp.reachable ? "Connected" : "Unreachable" };
    const c = status[id].count;
    return { ok: true, label: c === null ? "Available" : `${c} items` };
  };

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-3">
        {SOURCES.map((s) => {
          const st = stateOf(s.id);
          const canOpen = s.id === "savestate" ? !!status?.savestate.linked : s.id === "weddingapp" ? !!status && !status.weddingapp.disconnected : true;
          return (
            <div key={s.id} className={`p-4 rounded-2xl border ${active === s.id ? "border-[#b8955a] bg-[#fbf6ea]" : "border-[#e2d4b6] bg-[#f7f0e1]"} text-[#3e3326]`}>
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-serif text-lg">{s.name}</h4>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${st.ok ? "bg-[#6b7a4f]/15 text-[#4d5b3a]" : "bg-[#c98b8b]/20 text-[#8a3f3f]"}`}>{st.label}</span>
              </div>
              <p className="text-xs text-[#7a6a55] mt-1">{s.about}</p>
              <div className="flex gap-2 mt-3">
                <button disabled={!canOpen || busy} onClick={() => open(s.id)} className="px-3 py-1.5 rounded-lg bg-[#6b7a4f] text-white text-xs disabled:opacity-40 flex items-center gap-1"><FolderOpen className="w-3.5 h-3.5" /> Preview</button>
                {s.id === "weddingapp" && status?.weddingapp.configured && (status.weddingapp.disconnected
                  ? <button disabled={busy} onClick={reconnect} className="px-3 py-1.5 rounded-lg bg-white border border-[#e2d4b6] text-xs flex items-center gap-1"><Plug className="w-3.5 h-3.5" /> Reconnect</button>
                  : <button disabled={busy} onClick={() => disconnect("weddingapp")} className="px-3 py-1.5 rounded-lg bg-white border border-[#e2d4b6] text-xs flex items-center gap-1"><Unplug className="w-3.5 h-3.5" /> Disconnect</button>)}
                {s.id === "savestate" && status?.savestate.linked && <button disabled={busy} onClick={() => disconnect("savestate")} className="px-3 py-1.5 rounded-lg bg-white border border-[#e2d4b6] text-xs flex items-center gap-1" title="Removes imported references only; unlink the account in Settings"><Unplug className="w-3.5 h-3.5" /> Remove imports</button>}
              </div>
            </div>
          );
        })}
      </div>

      {msg && <p className={`text-sm rounded-xl p-3 border ${msg.ok ? "bg-[#6b7a4f]/10 border-[#6b7a4f]/30 text-[#d9e2c6]" : "bg-[#c98b8b]/10 border-[#c98b8b]/30 text-[#f0caca]"}`}>{msg.text}</p>}
      {busy && <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-[#c9a46a]" /></div>}

      {active === "savestate" && albums && !albumId && !busy && (
        <div className="grid sm:grid-cols-3 gap-3">
          {albums.length === 0 && <p className="text-sm text-white/60">No albums in SaveState yet.</p>}
          {albums.map((a) => (
            <button key={a.id} disabled={a.visibility === "restricted"} onClick={() => open("savestate", a.id)} className="text-left p-4 rounded-2xl bg-[#f7f0e1] border border-[#e2d4b6] text-[#3e3326] disabled:opacity-60">
              <div className="font-serif">{a.name}</div>
              <div className="text-[11px] text-[#8a7a5c]">{a.photoCount} files</div>
              {a.visibility === "restricted" && <div className="text-[11px] text-[#8a3f3f] mt-1 flex items-center gap-1"><Lock className="w-3 h-3" /> {a.reason}</div>}
            </button>
          ))}
        </div>
      )}

      {items && !busy && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[#f7f0e1] border border-[#e2d4b6] text-[#3e3326]">
            <div className="text-sm">{items.length} records · {selected.size} selected <button onClick={() => setSelected(new Set(items.filter((x) => x.visibility === "shareable" && !x.imported).map((x) => x.sourceRecordId)))} className="ml-2 text-xs underline">select all</button> {active === "savestate" && <button onClick={() => open("savestate")} className="ml-2 text-xs underline"><RefreshCw className="inline w-3 h-3" /> albums</button>}</div>
            <div className="flex items-center gap-2 text-xs">
              <span>Import as</span>
              <button onClick={() => setVisibility("shared")} className={`px-2.5 py-1 rounded-lg border ${visibility === "shared" ? "bg-[#6b7a4f] text-white" : "bg-white border-[#e2d4b6]"}`}><Users className="inline w-3 h-3 mr-1" />Shared</button>
              <button onClick={() => setVisibility("private")} className={`px-2.5 py-1 rounded-lg border ${visibility === "private" ? "bg-[#5a4636] text-white" : "bg-white border-[#e2d4b6]"}`}><Lock className="inline w-3 h-3 mr-1" />Private to me</button>
              <button disabled={!selected.size || busy} onClick={doImport} className="px-3 py-1.5 rounded-lg bg-[#b8955a] text-white disabled:opacity-40">Import</button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-xs text-white/80">
              <thead className="bg-white/5 text-white/50 uppercase tracking-wider text-[10px]">
                <tr><th className="p-2"></th><th className="p-2 text-left">Title</th><th className="p-2 text-left">Date</th><th className="p-2 text-left">Type</th><th className="p-2 text-left">Can be shared</th><th className="p-2 text-left">Status</th></tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const restricted = it.visibility === "restricted";
                  return (
                    <tr key={it.sourceRecordId} className="border-t border-white/5">
                      <td className="p-2"><input type="checkbox" disabled={restricted || it.imported} checked={selected.has(it.sourceRecordId)} onChange={() => toggle(it.sourceRecordId)} aria-label={`Select ${it.title}`} /></td>
                      <td className="p-2">{it.title}{it.group ? <span className="text-white/40"> · {it.group}</span> : null}</td>
                      <td className="p-2 whitespace-nowrap">{it.date ?? "—"}</td>
                      <td className="p-2">{it.mediaType}</td>
                      <td className="p-2">{restricted ? <span className="text-rose-300 flex items-center gap-1"><Lock className="w-3 h-3" />{it.reason ?? "restricted"}</span> : "yes"}</td>
                      <td className="p-2">{it.imported ? <span className="text-emerald-300 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />imported</span> : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
