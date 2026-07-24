import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppContext, DashboardItem, SearchResult, Command } from "./types";

// ---------------------------------------------------------------------
//  Korisničke (custom) aplikacije se učitavaju iz baze po domaćinstvu i
//  ponašaju se kao ugrađene: pojave se u navigaciji, na "Danas", u
//  pretrazi i paleti. Ne diramo globalni registar (izbjegava curenje
//  između domaćinstava) — sve je scope-ano po householdId.
// ---------------------------------------------------------------------

export interface CustomAppRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  item_noun: string;
  connect_task: boolean;
  connect_calendar: boolean;
  connect_reminder: boolean;
}

export async function loadCustomApps(db: SupabaseClient, householdId: string): Promise<CustomAppRow[]> {
  const { data } = await db
    .from("custom_apps")
    .select("id, slug, name, description, item_noun, connect_task, connect_calendar, connect_reminder")
    .eq("household_id", householdId)
    .order("created_at", { ascending: true });
  return (data ?? []) as CustomAppRow[];
}

// Nav-id koristi prefiks "x:" da se ne sudari s ugrađenim app-ovima.
export const customNavId = (slug: string) => `x:${slug}`;

export function customNavEntries(apps: CustomAppRow[]) {
  return apps.map((a) => ({ id: customNavId(a.slug), name: a.name, route: `/x/${a.slug}` }));
}

export function customCommands(apps: CustomAppRow[]): Command[] {
  return apps.map((a) => ({
    id: `x.${a.slug}.new`,
    label: `Novo: ${a.name}`,
    run: `/x/${a.slug}?new=1`,
  }));
}

export async function loadCustomDashboard(apps: CustomAppRow[], ctx: AppContext) {
  const sections: { appId: string; app: string; title: string; items: DashboardItem[] }[] = [];
  for (const a of apps) {
    try {
      const { data } = await ctx.db
        .from("custom_items")
        .select("id, title, due_at, done")
        .eq("household_id", ctx.householdId)
        .eq("app_id", a.id)
        .eq("done", false)
        .order("created_at", { ascending: false })
        .limit(5);
      const items: DashboardItem[] = (data ?? []).map((i) => ({
        id: i.id,
        label: i.title,
        meta: i.due_at ? new Date(i.due_at).toLocaleDateString("bs", { day: "2-digit", month: "2-digit" }) : undefined,
        href: `/x/${a.slug}`,
      }));
      if (items.length) sections.push({ appId: customNavId(a.slug), app: a.name, title: a.name, items });
    } catch (e) {
      console.error(`[custom-dashboard] ${a.slug} nije uspio:`, e);
    }
  }
  return sections;
}

export async function searchCustom(apps: CustomAppRow[], query: string, ctx: AppContext): Promise<SearchResult[]> {
  const out: SearchResult[] = [];
  for (const a of apps) {
    try {
      const { data } = await ctx.db
        .from("custom_items")
        .select("id, title")
        .eq("household_id", ctx.householdId)
        .eq("app_id", a.id)
        .ilike("title", `%${query}%`)
        .limit(5);
      for (const i of data ?? []) out.push({ id: i.id, type: a.name, label: i.title, href: `/x/${a.slug}` });
    } catch (e) {
      console.error(`[custom-search] ${a.slug} nije uspio:`, e);
    }
  }
  return out;
}
