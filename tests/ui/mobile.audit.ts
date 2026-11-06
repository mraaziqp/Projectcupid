/**
 * Mobile UI audit: the real signed-in app, in Chrome at phone sizes, against
 * the emulators with realistic data. Takes screenshots and measures what a
 * person feels on a phone: sideways overflow, small tap targets, tiny text.
 *
 * Run: npm run test:ui          (fails on sideways overflow)
 * Screenshots go to the folder in UI_OUT (default: tests/ui/out, gitignored).
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page, type BrowserContext } from "playwright-core";
import { adminAuth, adminDb } from "../../lib/server/firebaseAdmin";

const PORT = 3099;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = process.env.UI_OUT || "tests/ui/out";
const VIEWPORTS = [
  { name: "phone", width: 390, height: 844 },
  { name: "small", width: 360, height: 640 },
];
const ONLY = process.env.UI_ONLY?.split(",");
const RAAZIQ = { uid: "ui_raaziq", email: "backupe9@gmail.com", name: "Raaziq" };
const RAZIA = { uid: "ui_razia", email: "raziashade4@gmail.com", name: "Razia" };

async function thumbs(): Promise<string[]> {
  try {
    const r = await fetch("https://www.raziaraaziq.co.za/api/media?visibility=public&limit=10&source=photographer");
    const b: any = await r.json();
    const out: string[] = [];
    for (const i of b.items ?? []) {
      const t = await fetch(`https://www.raziaraaziq.co.za/_next/image?url=${encodeURIComponent(`/api/media/${i.id}/raw`)}&w=384&q=60`, { headers: { Accept: "image/jpeg" } });
      if (t.ok) out.push(`data:image/jpeg;base64,${Buffer.from(await t.arrayBuffer()).toString("base64")}`);
    }
    return out;
  } catch { return []; }
}

async function seed() {
  const db = adminDb();
  for (const u of [RAAZIQ, RAZIA]) {
    await adminAuth().createUser({ uid: u.uid, email: u.email, emailVerified: true, displayName: u.name }).catch(() => {});
    await db.doc(`users/${u.uid}`).set({ uid: u.uid, email: u.email, role: u === RAAZIQ ? "admin" : "sanctuary_owner", displayName: u.name });
  }
  const t = await thumbs();
  const titles = ["Sunset at the beach", "Our first walk in the rain, the long way home past the old bakery", "Nikkah morning", "Sunday pancakes", "A very long title that keeps going to see how the polaroid card handles it on a small phone", "The drive up the coast"];
  for (let i = 0; i < 12; i++) {
    await db.doc(`memories/ui_m${i}`).set({
      ownerId: i % 2 ? RAZIA.uid : RAAZIQ.uid, visibility: i % 5 === 4 ? "private" : "shared", title: titles[i % titles.length],
      caption: "We laughed until our sides hurt, and on the way back we stopped for ice cream even though it was far too cold for it.",
      memoryDate: `20${24 + (i % 3)}-${String((i % 12) + 1).padStart(2, "0")}-14`, datePrecision: "day", mediaType: i % 4 === 3 ? "text" : "photo",
      media: [], thumbnail: i % 4 === 3 ? null : t[i % Math.max(1, t.length)] ?? null, tags: i % 2 ? ["first", "beach"] : ["ordinary"], location: null,
      collectionIds: [], favouritedBy: i % 3 ? [] : [RAAZIQ.uid], isSpecialOccasion: i % 4 === 0, status: i < 3 ? "inbox" : "organised", source: i % 3 ? "cupid" : "weddingapp",
      sourceRecordId: null, provenance: { label: i % 3 ? "Saved in Project Cupid" : "WeddingApp · Nikkah" }, lastOpenedAt: null, createdAt: new Date(), updatedAt: new Date(),
    });
  }
  await db.doc("memory_collections/ui_c1").set({ ownerId: RAAZIQ.uid, name: "Our Firsts", description: "", visibility: "shared", createdAt: new Date() });
  for (let i = 0; i < 4; i++) {
    await db.doc(`letters/ui_l${i}`).set({ title: `Letter ${i + 1}: for the quiet moments`, content: "My dearest,\n\nThis is a letter with a few paragraphs.\n\nWith love.", isPublished: true, isFavorite: false, isRead: i > 0, authorId: RAAZIQ.uid, publishDate: new Date(Date.now() - i * 86400000), createdAt: new Date() });
  }
  await db.doc("memory_book/ui_b1").set({ id: "ui_b1", title: "The day we moved in", narrative: "Boxes everywhere and nothing to eat but toast.", dateStr: "2026-10-01", category: "milestone", tags: ["home"], author: "Raaziq", authorId: RAAZIQ.uid, isFavorite: false, syncStatus: "local_only", createdAt: new Date() });
}

const metrics = (page: Page) => page.evaluate(() => {
  const vw = window.innerWidth;
  const isScrollable = (el: Element | null): boolean => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const o = getComputedStyle(n).overflowX;
      if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") return true;
    }
    return false;
  };
  const name = (el: Element) => `${el.tagName.toLowerCase()}${el.getAttribute("aria-label") ? `[${el.getAttribute("aria-label")}]` : ""} "${(el.textContent ?? "").trim().slice(0, 28)}"`;
  const visible = (el: Element) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0"; };
  const over: string[] = [];
  for (const el of Array.from(document.querySelectorAll("body *"))) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if ((r.right > vw + 1 || r.left < -1) && !isScrollable(el.parentElement) && getComputedStyle(el).position !== "fixed") over.push(name(el));
  }
  const small: string[] = [];
  for (const el of Array.from(document.querySelectorAll("button, a[href], input:not([type=hidden]), select, textarea, label[for], [role=button]"))) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 40 || (r.width < 40 && (el as HTMLInputElement).type !== "checkbox")) small.push(`${Math.round(r.width)}x${Math.round(r.height)} ${name(el)}`);
  }
  // Text wider than its button means chips have collapsed or are overlapping.
  const clipped: string[] = [];
  for (const el of Array.from(document.querySelectorAll("button, a[href]"))) {
    if (!visible(el)) continue;
    const e = el as HTMLElement;
    if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflowX === "visible") clipped.push(name(e));
  }
  const tiny = new Set<string>();
  let zoomInputs = 0;
  for (const el of Array.from(document.querySelectorAll("body *"))) {
    if (!visible(el)) continue;
    const own = Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? "").trim());
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (own && fs < 11) tiny.add(`${fs}px "${(el.textContent ?? "").trim().slice(0, 24)}"`);
    if (el.matches("input:not([type=checkbox]):not([type=radio]), textarea, select") && fs < 16) zoomInputs++;
  }
  return { clipped: clipped.slice(0, 6), clippedCount: clipped.length, pageOverflow: document.documentElement.scrollWidth - vw, bodyScrollOverflow: document.body.scrollWidth - vw, over: over.slice(0, 8), overCount: over.length, small: small.slice(0, 40), smallCount: small.length, tiny: [...tiny].slice(0, 12), tinyCount: tiny.size, zoomInputs };
});

const SHORT: Record<string, string> = { "Memory Garden": "Garden", "Our Love": "Love", "Message Boxes": "Boxes", "Memory Book": "Book", "Her Wellbeing": "Wellbeing", "Our Future": "Future", "Little Things": "Little", Settings: "Settings", Home: "Home" };
type Report = Record<string, any>;
const report: Report = {};

async function shoot(page: Page, label: string) {
  await page.waitForTimeout(700);
  const m = await metrics(page);
  report[label] = m;
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const vh = page.viewportSize()!.height;
  const slices = Math.min(3, Math.ceil(height / vh));
  for (let i = 0; i < slices; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), i * vh * 0.92);
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(OUT, `${label}${slices > 1 ? `-${i + 1}` : ""}.png`) });
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  console.log(`${label.padEnd(30)} overflow=${m.pageOverflow} offenders=${m.overCount} clipped=${m.clippedCount} smallTargets=${m.smallCount} tinyText=${m.tinyCount} zoomInputs=${m.zoomInputs}`);
}

async function go(page: Page, label: string) {
  const bar = page.locator("[data-testid=bottom-nav] button", { hasText: new RegExp(`^${SHORT[label]}$`) }).first();
  if (await bar.count() && await bar.isVisible()) { await bar.click(); return; }
  await page.locator("[data-testid=menu-toggle]").click();
  await page.waitForTimeout(350);
  await page.locator("[data-testid=mobile-menu] button", { hasText: label }).first().click();
  await page.waitForTimeout(350);
}

async function signIn(ctx: BrowserContext, uid: string): Promise<Page> {
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("  PAGE ERROR:", e.message.slice(0, 160)));
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => (window as any).__cupidSignIn, null, { timeout: 60_000 });
  const token = await adminAuth().createCustomToken(uid);
  await page.evaluate((t) => (window as any).__cupidSignIn(t), token);
  await page.waitForSelector("[data-testid=menu-toggle]", { timeout: 45_000 });
  return page;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  await seed();
  const server = spawn("npx", ["tsx", "server.ts"], {
    env: { ...process.env, PORT: String(PORT), VITE_USE_EMULATORS: "1", CUPID_SESSION_SECRET: "ui-test-secret-0123456789abcdef0123456789", NODE_ENV: "development" },
    stdio: "ignore", shell: true,
  });
  const stop = () => { try { if (server.pid) spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore", shell: true }); } catch { /* */ } };
  let code = 0;
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${BASE}/api/health`)).ok) break; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 1000)); }
    const browser = await chromium.launch({ channel: "chrome", headless: true });
    for (const vp of VIEWPORTS) {
      if (ONLY && !ONLY.includes(vp.name)) continue;
      const lock = await browser.newContext({ viewport: vp, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true });
      await lock.addInitScript("globalThis.__name = (f) => f");
      const gate = await lock.newPage();
      await gate.goto(BASE, { waitUntil: "networkidle" }).catch(() => {});
      await shoot(gate, `${vp.name}-00-gate`);
      await gate.evaluate(() => localStorage.setItem("cupid_unlocked", "true"));
      await gate.reload({ waitUntil: "networkidle" }).catch(() => {});
      await shoot(gate, `${vp.name}-00-signin`);
      await lock.close();

      const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true });
      await ctx.addInitScript("globalThis.__name = (f) => f");
      await ctx.addInitScript(([a, b]) => {
        localStorage.setItem("cupid_unlocked", "true");
        localStorage.setItem(`cupid_onboarding_completed_${a}`, "true");
        localStorage.setItem(`cupid_onboarding_completed_${b}`, "true");
        localStorage.setItem("cupid_welcome_auto_enabled", "false");
      }, [RAAZIQ.uid, RAZIA.uid]);
      const page = await signIn(ctx, RAAZIQ.uid);
      await page.waitForTimeout(1500);
      // Any first-run dialog gets a picture, then is dismissed.
      await shoot(page, `${vp.name}-01-home`);
      for (const [label, slug] of [["Memory Garden", "garden"], ["Our Love", "love"], ["Message Boxes", "boxes"], ["Memory Book", "book"], ["Her Wellbeing", "wellbeing"], ["Our Future", "future"], ["Little Things", "little"], ["Settings", "settings"]] as const) {
        try { await go(page, label); await page.waitForTimeout(900); await shoot(page, `${vp.name}-02-${slug}`); }
        catch (e: any) { console.log(`  could not open ${label}: ${String(e.message).split("\n")[0]}`); }
      }
      try {
        await go(page, "Memory Garden"); await page.waitForTimeout(800);
        for (const tab of ["Our Story", "Inbox", "Collections", "Forgotten Treasures", "Bring memories in"]) {
          await page.getByRole("button", { name: tab }).first().click();
          await shoot(page, `${vp.name}-03-garden-${tab.split(" ")[0].toLowerCase()}`);
        }
        await page.getByRole("button", { name: "The Garden" }).first().click();
        await page.getByRole("button", { name: /Open memory/ }).first().click();
        await shoot(page, `${vp.name}-04-theatre`);
        await page.getByRole("button", { name: "Close" }).first().click();
        await page.waitForTimeout(300);
        await page.locator("[data-testid=save-fab]").click();
        await shoot(page, `${vp.name}-05-save`);
        await page.getByRole("button", { name: "Close" }).first().click();
      } catch (e: any) { console.log(`  garden flow: ${String(e.message).split("\n")[0]}`); }
      // The screens that open on top of others.
      const overlay = async (label: string, open: () => Promise<void>) => {
        try {
          await open();
          await shoot(page, `${vp.name}-09-${label}`);
          const covered = await page.evaluate(() => { const n = document.querySelector("[data-testid=bottom-nav]")?.getBoundingClientRect(); if (!n) return false; const hit = document.elementFromPoint(n.left + n.width / 2, n.top + n.height / 2); return !!hit?.closest("[data-testid=bottom-nav]"); });
          report[`${vp.name}-09-${label}`].bottomNavOnTop = covered;
          await page.keyboard.press("Escape");
        } catch (e: any) { console.log(`  overlay ${label}: ${String(e.message).split(String.fromCharCode(10))[0]}`); }
      };
      await go(page, "Our Love"); await page.waitForTimeout(700);
      await overlay("write-letter", async () => { await page.getByRole("button", { name: /Write a Love Letter/ }).first().click(); await page.waitForTimeout(400); });
      await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForSelector("[data-testid=menu-toggle]", { timeout: 45000 }); await page.waitForTimeout(1200);
      await go(page, "Our Love"); await page.waitForTimeout(700);
      await overlay("letter-reader", async () => { await page.getByText("Tap to read letter").first().click(); await page.waitForTimeout(1200); });
      await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForSelector("[data-testid=menu-toggle]", { timeout: 45000 }); await page.waitForTimeout(1200);
      await go(page, "Message Boxes"); await page.waitForTimeout(700);
      await overlay("drop-message", async () => { await page.getByRole("button", { name: /Drop a Message/ }).first().click(); await page.waitForTimeout(400); });
      await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForSelector("[data-testid=menu-toggle]", { timeout: 45000 }); await page.waitForTimeout(1200);
      await overlay("app-tour", async () => { await page.locator("[data-testid=menu-toggle]").click(); await page.waitForTimeout(350); await page.locator("[data-testid=mobile-menu] button", { hasText: "App Tour" }).click(); await page.waitForTimeout(500); });
      await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForSelector("[data-testid=menu-toggle]", { timeout: 45000 }); await page.waitForTimeout(1200);
      try {
        await page.locator("[data-testid=menu-toggle]").click();
        await shoot(page, `${vp.name}-06-menu`);
        await page.locator("[data-testid=menu-toggle]").click();
      } catch { /* */ }
      await ctx.close();

      // Her view: her own bar and her wellbeing sanctuary.
      const her = await browser.newContext({ viewport: vp, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true });
      await her.addInitScript("globalThis.__name = (f) => f");
      await her.addInitScript(([b]) => {
        localStorage.setItem("cupid_unlocked", "true");
        localStorage.setItem(`cupid_onboarding_completed_${b}`, "true");
        localStorage.setItem("cupid_welcome_auto_enabled", "false");
      }, [RAZIA.uid]);
      const hp = await signIn(her, RAZIA.uid);
      await hp.waitForTimeout(1200);
      await shoot(hp, `${vp.name}-07-her-home`);
      try { await go(hp, "Her Wellbeing"); await hp.waitForTimeout(900); await shoot(hp, `${vp.name}-07-her-wellbeing`); } catch (e: any) { console.log(`  her wellbeing: ${String(e.message).split("\n")[0]}`); }
      await her.close();

      // First-run dialogs, as someone arriving for the first time today.
      const first = await browser.newContext({ viewport: vp, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true });
      await first.addInitScript("globalThis.__name = (f) => f");
      await first.addInitScript(() => localStorage.setItem("cupid_unlocked", "true"));
      const fp = await signIn(first, RAAZIQ.uid);
      await fp.waitForTimeout(2500);
      await shoot(fp, `${vp.name}-08-first-run`);
      await first.close();
    }
    // Desktop must not have regressed.
    if (!ONLY || ONLY.includes("desktop")) {
      const dctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      await dctx.addInitScript("globalThis.__name = (f) => f");
      await dctx.addInitScript(([a]) => { localStorage.setItem("cupid_unlocked", "true"); localStorage.setItem(`cupid_onboarding_completed_${a}`, "true"); localStorage.setItem("cupid_welcome_auto_enabled", "false"); }, [RAAZIQ.uid]);
      const d = await dctx.newPage();
      await d.goto(BASE, { waitUntil: "domcontentloaded" });
      await d.waitForFunction(() => (window as any).__cupidSignIn, null, { timeout: 60_000 });
      const t = await adminAuth().createCustomToken(RAAZIQ.uid);
      await d.evaluate((tok) => (window as any).__cupidSignIn(tok), t);
      await d.waitForSelector("header nav button", { timeout: 45_000 });
      await d.waitForTimeout(1200);
      await shoot(d, "desktop-home");
      await d.locator("header nav button", { hasText: "Memory Garden" }).click();
      await d.waitForTimeout(900);
      await shoot(d, "desktop-garden");
      await dctx.close();
    }
    await browser.close();
    fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 1));
    const bad = Object.entries(report).filter(([, m]: any) => m.pageOverflow > 0 || m.overCount > 0 || m.clippedCount > 0);
    console.log(`\nPages with overflow or clipped controls: ${bad.length}`);
    for (const [k, m] of bad as any) console.log(`  ${k}: +${m.pageOverflow}px ${[...m.over.slice(0, 3), ...m.clipped].join(" | ")}`);
    if (bad.length) code = 1;
  } finally {
    stop();
  }
  process.exit(code);
}

main().catch((e) => { console.error(e); process.exit(1); });
