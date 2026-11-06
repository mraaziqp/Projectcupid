import { useEffect, useMemo, useState } from "react";
import { Flower2, Plus, Search, Sprout, Inbox, BookHeart, FolderHeart, Gem, Plug, Trash2, Pencil, Lock, Users, Archive, Check } from "lucide-react";
import MemoryCard, { formatMemoryDate, SOURCE_LABEL } from "./MemoryCard";
import MemoryTheatre from "./MemoryTheatre";
import SaveMomentModal from "./SaveMomentModal";
import SourcesPanel from "./SourcesPanel";
import { createCollection, removeCollection, renameCollection, todayLocal, updateMemory, useCollections, useMemories } from "../../lib/memoryGarden/client";
import { forgottenTreasures, type Memory } from "../../lib/memoryGarden/model";
import type { UserProfile } from "../../types";

type Tab = "garden" | "story" | "inbox" | "collections" | "treasures" | "sources";
type Filter = "all" | "photo" | "video" | "voice" | "letter" | "booklet" | "favourites" | "special";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All memories" }, { id: "photo", label: "Photos" }, { id: "video", label: "Videos" }, { id: "voice", label: "Voice" },
  { id: "letter", label: "Letters" }, { id: "booklet", label: "Booklets" }, { id: "favourites", label: "Favourites" }, { id: "special", label: "Special occasions" },
];
const SUGGESTED_COLLECTIONS = ["Our Firsts", "Wedding Memories", "Little Adventures", "Ordinary Days", "Favourite Photographs", "Letters to Each Other", "Special Occasions", "Places We've Been", "Our Future"];
const tilt = (id: string) => ((id.charCodeAt(0) + id.charCodeAt(id.length - 1)) % 5) - 2;

export default function MemoryGarden({ currentProfile, partnerProfile, initialMemoryId, onConsumedInitial }: {
  currentProfile: UserProfile | null; partnerProfile?: UserProfile | null; initialMemoryId?: string | null; onConsumedInitial?: () => void;
}) {
  const uid = currentProfile?.uid ?? "";
  const { memories, loading, error } = useMemories(uid);
  const collections = useCollections(uid);
  const [tab, setTab] = useState<Tab>("garden");
  const [filter, setFilter] = useState<Filter>("all");
  const [year, setYear] = useState<string>("all");
  const [tag, setTag] = useState<string>("all");
  const [source, setSource] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [newCol, setNewCol] = useState({ name: "", visibility: null as null | "shared" | "private" });
  const [colMsg, setColMsg] = useState<string | null>(null);

  useEffect(() => { if (initialMemoryId) { setOpenId(initialMemoryId); onConsumedInitial?.(); } }, [initialMemoryId]);

  const visible = useMemo(() => memories.filter((m) => m.status !== "archived"), [memories]);
  const years = useMemo(() => [...new Set(visible.map((m) => m.memoryDate.slice(0, 4)))].sort().reverse(), [visible]);
  const tags = useMemo(() => [...new Set(visible.flatMap((m) => m.tags))].sort(), [visible]);
  const sources = useMemo(() => [...new Set(visible.map((m) => m.source))], [visible]);

  const filtered = useMemo(() => visible.filter((m) => {
    if (filter === "favourites" && !m.favouritedBy.includes(uid)) return false;
    if (filter === "special" && !m.isSpecialOccasion) return false;
    if (["photo", "video", "voice", "letter", "booklet"].includes(filter) && m.mediaType !== filter) return false;
    if (year !== "all" && !m.memoryDate.startsWith(year)) return false;
    if (tag !== "all" && !m.tags.includes(tag)) return false;
    if (source !== "all" && m.source !== source) return false;
    if (activeCollection && !m.collectionIds.includes(activeCollection)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!`${m.title} ${m.caption} ${m.tags.join(" ")}`.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [visible, filter, year, tag, source, search, uid, activeCollection]);

  const inbox = useMemo(() => memories.filter((m) => m.status === "inbox" && m.ownerId === uid), [memories, uid]);
  const treasures = useMemo(() => forgottenTreasures(visible, { date: todayLocal(), count: 6 }), [visible]);
  const story = useMemo(() => {
    const byMonth = new Map<string, Memory[]>();
    for (const m of [...visible].sort((a, b) => (a.memoryDate < b.memoryDate ? -1 : 1))) {
      const k = m.memoryDate.slice(0, 7);
      byMonth.set(k, [...(byMonth.get(k) ?? []), m]);
    }
    return [...byMonth.entries()];
  }, [visible]);

  const open = memories.find((m) => m.id === openId) ?? null;
  const openList = tab === "story" ? story.flatMap(([, l]) => l) : tab === "inbox" ? inbox : tab === "treasures" ? treasures : filtered;

  const tabs: Array<{ id: Tab; label: string; icon: any; count?: number }> = [
    { id: "garden", label: "The Garden", icon: Flower2 },
    { id: "story", label: "Our Story", icon: BookHeart },
    { id: "inbox", label: "Inbox", icon: Inbox, count: inbox.length },
    { id: "collections", label: "Collections", icon: FolderHeart },
    { id: "treasures", label: "Forgotten Treasures", icon: Gem },
    { id: "sources", label: "Bring memories in", icon: Plug },
  ];

  const addCollection = async (name: string) => {
    if (!newCol.visibility) { setColMsg("Choose shared or private for the collection."); return; }
    if (!name.trim()) return;
    try { await createCollection(uid, name, newCol.visibility); setNewCol({ name: "", visibility: newCol.visibility }); setColMsg(null); }
    catch (e: any) { setColMsg(e?.message ?? "Couldn't create it."); }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-[#e2d4b6]/30 bg-[radial-gradient(ellipse_at_top_left,#2c2a1e,#15120d_70%)] p-6 sm:p-8">
        <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-[#6b7a4f]/20 blur-3xl pointer-events-none" />
        <div className="absolute right-24 bottom-0 w-40 h-40 rounded-full bg-[#c98b8b]/15 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[#c9a46a]">Project Cupid 5.0</p>
            <h1 className="font-serif text-4xl sm:text-5xl text-[#f3e8cf] tracking-tight">The Memory Garden</h1>
            <p className="font-serif italic text-[#d9c9a6] mt-1">A living story of us</p>
          </div>
          <button onClick={() => setSaving(true)} className="self-start sm:self-auto px-5 py-3 rounded-full bg-[#b8955a] hover:bg-[#a8854b] text-white font-serif text-lg shadow-lg flex items-center gap-2">
            <Plus className="w-5 h-5" /> Save this moment
          </button>
        </div>
      </header>

      <nav className="flex gap-1.5 overflow-x-auto pb-1" aria-label="Memory Garden sections">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => { setTab(t.id); setActiveCollection(null); }} className={`px-3.5 py-2 rounded-full text-xs whitespace-nowrap flex items-center gap-1.5 border transition ${tab === t.id ? "bg-[#f3e8cf] text-[#3e3326] border-[#f3e8cf]" : "text-[#d9c9a6] border-[#e2d4b6]/20 hover:bg-white/5"}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}{t.count ? <span className="ml-0.5 px-1.5 rounded-full bg-[#c98b8b] text-white text-[10px]">{t.count}</span> : null}
          </button>
        ))}
      </nav>

      {error && <p className="text-sm text-rose-200 bg-rose-950/40 border border-rose-500/30 rounded-xl p-3">{error}</p>}

      {(tab === "garden" || (tab === "collections" && activeCollection)) && (
        <>
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#a8987a]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search our memories" className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30" />
            </div>
            <div className="flex gap-2 flex-wrap">
              <select value={year} onChange={(e) => setYear(e.target.value)} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white" aria-label="Year"><option value="all">Every year</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
              <select value={tag} onChange={(e) => setTag(e.target.value)} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white" aria-label="Tag"><option value="all">Any tag</option>{tags.map((t) => <option key={t} value={t}>#{t}</option>)}</select>
              <select value={source} onChange={(e) => setSource(e.target.value)} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white" aria-label="Source"><option value="all">Every source</option>{sources.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s] ?? s}</option>)}</select>
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {FILTERS.map((f) => <button key={f.id} onClick={() => setFilter(f.id)} className={`px-3 py-1.5 rounded-full text-[11px] whitespace-nowrap border ${filter === f.id ? "bg-[#6b7a4f] text-white border-[#6b7a4f]" : "text-[#d9c9a6] border-white/10"}`}>{f.label}</button>)}
          </div>
          {activeCollection && (
            <div className="flex items-center justify-between text-sm text-[#f3e8cf]">
              <span className="font-serif text-xl">{collections.find((c) => c.id === activeCollection)?.name}</span>
              <button onClick={() => setActiveCollection(null)} className="text-xs underline text-[#d9c9a6]">All collections</button>
            </div>
          )}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[4/5] rounded bg-white/5 animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <Empty onSave={() => setSaving(true)} filtered={visible.length > 0} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-7 pt-2">
              {filtered.map((m) => <MemoryCard key={m.id} memory={m} uid={uid} tilt={tilt(m.id)} onOpen={() => setOpenId(m.id)} />)}
            </div>
          )}
        </>
      )}

      {tab === "story" && (
        story.length === 0 ? <Empty onSave={() => setSaving(true)} /> : (
          <div className="space-y-2">
            <div className="flex gap-1.5 overflow-x-auto pb-2">{years.slice().reverse().map((y) => <a key={y} href={`#story-${y}`} className="px-3 py-1 rounded-full text-xs border border-white/10 text-[#d9c9a6] hover:bg-white/5">{y}</a>)}</div>
            <ol className="relative border-l-2 border-[#c9a46a]/40 ml-3 space-y-8">
              {story.map(([month, list], i) => {
                const y = month.slice(0, 4);
                const firstOfYear = i === 0 || story[i - 1][0].slice(0, 4) !== y;
                return (
                  <li key={month} id={firstOfYear ? `story-${y}` : undefined} className="pl-6 relative">
                    <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-[#c9a46a] border-4 border-[#15120d]" />
                    <h3 className="font-serif text-xl text-[#f3e8cf]">{new Date(`${month}-15T12:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h3>
                    <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {list.map((m) => (
                        <button key={m.id} onClick={() => setOpenId(m.id)} className="text-left flex gap-3 p-3 rounded-2xl bg-[#f7f0e1] text-[#3e3326] border border-[#e2d4b6] hover:-translate-y-0.5 transition">
                          {m.thumbnail ? <img src={m.thumbnail} alt="" className="w-16 h-16 object-cover rounded-lg shrink-0" /> : <div className="w-16 h-16 rounded-lg bg-[#ece2cc] shrink-0 flex items-center justify-center"><Sprout className="w-5 h-5 text-[#8a7a5c]" /></div>}
                          <div className="min-w-0">
                            <p className="font-serif leading-snug line-clamp-2">{m.title}</p>
                            <p className="text-[11px] text-[#8a7a5c]">{formatMemoryDate(m)}{m.isSpecialOccasion ? " · special" : ""}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ol>
            <p className="text-xs text-[#a8987a] pt-4">Dates come from each memory. Wrong one? Open it and edit the date.</p>
          </div>
        )
      )}

      {tab === "inbox" && (
        inbox.length === 0 ? (
          <p className="text-center py-16 font-serif italic text-[#d9c9a6]">Nothing waiting. Everything you've saved has found its place.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-[#d9c9a6]">New moments land here. Give them a title or date when you feel like it — or just mark them done.</p>
            {inbox.map((m) => (
              <div key={m.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-2xl bg-[#f7f0e1] text-[#3e3326] border border-[#e2d4b6]">
                <button onClick={() => setOpenId(m.id)} className="flex items-center gap-3 flex-1 text-left">
                  {m.thumbnail ? <img src={m.thumbnail} alt="" className="w-14 h-14 rounded-lg object-cover" /> : <div className="w-14 h-14 rounded-lg bg-[#ece2cc]" />}
                  <div><p className="font-serif">{m.title}</p><p className="text-[11px] text-[#8a7a5c]">{formatMemoryDate(m)} · {m.visibility === "shared" ? "shared" : "private"} · {m.provenance?.label ?? SOURCE_LABEL[m.source]}</p></div>
                </button>
                <div className="flex gap-2">
                  <button onClick={() => setOpenId(m.id)} className="px-3 py-1.5 rounded-lg bg-white border border-[#e2d4b6] text-xs flex items-center gap-1"><Pencil className="w-3 h-3" /> Organise</button>
                  <button onClick={() => updateMemory(m.id, { status: "organised" })} className="px-3 py-1.5 rounded-lg bg-[#6b7a4f] text-white text-xs flex items-center gap-1"><Check className="w-3 h-3" /> Done</button>
                  <button onClick={() => updateMemory(m.id, { status: "archived" })} className="px-3 py-1.5 rounded-lg bg-white border border-[#e2d4b6] text-xs flex items-center gap-1"><Archive className="w-3 h-3" /> Archive</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === "collections" && !activeCollection && (
        <div className="space-y-5">
          <div className="p-4 rounded-2xl bg-[#f7f0e1] text-[#3e3326] border border-[#e2d4b6] space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input value={newCol.name} onChange={(e) => setNewCol({ ...newCol, name: e.target.value })} maxLength={60} placeholder="New collection name" className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#e2d4b6] text-sm" />
              <div className="flex gap-2 text-xs">
                <button onClick={() => setNewCol({ ...newCol, visibility: "shared" })} className={`px-3 py-2 rounded-xl border ${newCol.visibility === "shared" ? "bg-[#6b7a4f] text-white" : "bg-white border-[#e2d4b6]"}`}><Users className="inline w-3 h-3 mr-1" />Shared</button>
                <button onClick={() => setNewCol({ ...newCol, visibility: "private" })} className={`px-3 py-2 rounded-xl border ${newCol.visibility === "private" ? "bg-[#5a4636] text-white" : "bg-white border-[#e2d4b6]"}`}><Lock className="inline w-3 h-3 mr-1" />Private</button>
                <button onClick={() => addCollection(newCol.name)} className="px-4 py-2 rounded-xl bg-[#b8955a] text-white">Create</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_COLLECTIONS.filter((n) => !collections.some((c) => c.name === n)).map((n) => <button key={n} onClick={() => setNewCol({ ...newCol, name: n })} className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-[#e2d4b6]">{n}</button>)}
            </div>
            {colMsg && <p className="text-xs text-[#8a3f3f]">{colMsg}</p>}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map((c) => {
              const items = visible.filter((m) => m.collectionIds.includes(c.id));
              const cover = items.find((m) => m.thumbnail);
              return (
                <div key={c.id} className="rounded-2xl overflow-hidden bg-[#f7f0e1] text-[#3e3326] border border-[#e2d4b6]">
                  <button onClick={() => { setActiveCollection(c.id); setFilter("all"); }} className="block w-full aspect-[16/9] bg-[#ece2cc]">
                    {cover ? <img src={cover.thumbnail!} alt="" className="w-full h-full object-cover" /> : <FolderHeart className="w-8 h-8 mx-auto text-[#a8987a]" />}
                  </button>
                  <div className="p-3 flex items-center justify-between">
                    <div><p className="font-serif">{c.name}</p><p className="text-[11px] text-[#8a7a5c]">{items.length} memories · {c.visibility}</p></div>
                    {(c.ownerId === uid || c.visibility === "shared") && (
                      <div className="flex gap-1">
                        <button onClick={() => { const n = prompt("Rename collection", c.name); if (n?.trim()) renameCollection(c.id, n, c.description ?? ""); }} className="p-1.5 rounded-lg hover:bg-black/5" aria-label="Rename"><Pencil className="w-3.5 h-3.5" /></button>
                        {c.ownerId === uid && <button onClick={() => confirm(`Delete the collection "${c.name}"? The memories in it stay.`) && removeCollection(c.id)} className="p-1.5 rounded-lg hover:bg-black/5 text-[#8a3f3f]" aria-label="Delete"><Trash2 className="w-3.5 h-3.5" /></button>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "treasures" && (
        treasures.length === 0 ? (
          <p className="text-center py-16 font-serif italic text-[#d9c9a6]">Treasures appear once memories have had a little time to grow — older than a year, or not opened in a while.</p>
        ) : (
          <div className="space-y-4">
            <p className="font-serif italic text-[#d9c9a6]">A few things you might have forgotten, chosen fresh each week.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">{treasures.map((m) => <MemoryCard key={m.id} memory={m} uid={uid} tilt={tilt(m.id)} onOpen={() => setOpenId(m.id)} />)}</div>
          </div>
        )
      )}

      {tab === "sources" && <SourcesPanel />}

      {open && (
        <MemoryTheatre memory={open} list={openList.some((m) => m.id === open.id) ? openList : [open]} uid={uid} me={currentProfile} partner={partnerProfile}
          collections={collections} onClose={() => setOpenId(null)} onNavigate={setOpenId} />
      )}
      {saving && (
        <SaveMomentModal savestateLinked={!!currentProfile?.savestate} onClose={() => setSaving(false)} onSaved={(id) => { setSaving(false); setTab("inbox"); setOpenId(id); }} />
      )}
    </div>
  );
}

function Empty({ onSave, filtered = false }: { onSave: () => void; filtered?: boolean }) {
  return (
    <div className="text-center py-16 space-y-3">
      <Sprout className="w-10 h-10 mx-auto text-[#6b7a4f]" />
      <p className="font-serif text-2xl text-[#f3e8cf]">{filtered ? "Nothing matches those filters." : "The garden is ready for its first memory."}</p>
      {!filtered && <button onClick={onSave} className="px-5 py-2.5 rounded-full bg-[#b8955a] text-white font-serif">Save this moment</button>}
    </div>
  );
}
