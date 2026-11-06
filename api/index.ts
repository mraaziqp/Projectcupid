/**
 * The single Vercel function. vercel.json rewrites every /api/* request here;
 * lib/server/router.ts does the routing.
 */
import { handle } from "../lib/server/router.js";

export const config = { maxDuration: 60 };

export default async function handler(req: any, res: any) {
  await handle(req, res);
}
