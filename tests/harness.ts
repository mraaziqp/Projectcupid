/** A very small test runner: no framework, explicit output, non-zero exit on failure. */
export const results: Array<{ name: string; ok: boolean; error?: string }> = [];
let group = "";

export function section(name: string) {
  group = name;
  console.log(`\n── ${name}`);
}

export async function test(name: string, fn: () => Promise<unknown> | unknown) {
  const full = group ? `${group} › ${name}` : name;
  try {
    await fn();
    results.push({ name: full, ok: true });
    console.log(`  ✓ ${name}`);
  } catch (e: any) {
    results.push({ name: full, ok: false, error: e?.message ?? String(e) });
    console.log(`  ✗ ${name}\n      ${String(e?.message ?? e).split("\n")[0]}`);
  }
}

export function assert(cond: unknown, msg = "assertion failed"): asserts cond {
  if (!cond) throw new Error(msg);
}
export function eq<T>(actual: T, expected: T, msg = "") {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${msg} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

export async function allowed(p: Promise<unknown>, what = "operation") {
  try { await p; } catch (e: any) { throw new Error(`${what} should be allowed but was refused: ${e?.code ?? e?.message}`); }
}
export async function denied(p: Promise<unknown>, what = "operation") {
  try { await p; } catch (e: any) {
    if (/permission[-_ ]denied|PERMISSION_DENIED|false for/i.test(`${e?.code} ${e?.message}`)) return;
    throw new Error(`${what} failed for a reason other than the rules: ${e?.code ?? e?.message}`);
  }
  throw new Error(`${what} should be denied but was allowed`);
}

export function summary(title: string): number {
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${"=".repeat(70)}\n${title}: ${results.length - failed.length} passed, ${failed.length} failed\n${"=".repeat(70)}`);
  for (const f of failed) console.log(`  ✗ ${f.name}: ${f.error}`);
  return failed.length ? 1 : 0;
}
