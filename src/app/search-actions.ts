"use server";
import { getContext } from "@/lib/session";
import { installApps } from "@/lib/apps";
import { searchEverything } from "@/lib/platform/registry";
import { loadCustomApps, searchCustom } from "@/lib/platform/custom";
import type { SearchResult } from "@/lib/platform/types";

// Pretraga preko SVEGA na jednom mjestu (Dashboard zahtjev iz zadatka).
// Pita svaki instalirani app + sve korisničke app-ove da pretraže svoje.
export async function searchAll(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  installApps();
  const { db, user, householdId } = await getContext();
  if (!user || !householdId) return [];

  const ctx = { db, householdId, userId: user.id };
  const [builtin, customApps] = await Promise.all([
    searchEverything(q, ctx),
    loadCustomApps(db, householdId),
  ]);
  const custom = await searchCustom(customApps, q, ctx);
  return [...builtin, ...custom];
}
