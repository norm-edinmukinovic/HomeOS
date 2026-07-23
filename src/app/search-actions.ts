"use server";
import { getContext } from "@/lib/session";
import { installApps } from "@/lib/apps";
import { searchEverything } from "@/lib/platform/registry";
import type { SearchResult } from "@/lib/platform/types";

// Pretraga preko SVEGA na jednom mjestu (Dashboard zahtjev iz zadatka).
// Pita svaki instalirani app da pretrazi svoje — dashboard ne zna za
// konkretne app-ove, samo skuplja rezultate iz registra.
export async function searchAll(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  installApps();
  const { db, user, householdId } = await getContext();
  if (!user || !householdId) return [];

  return searchEverything(q, { db, householdId, userId: user.id });
}
