import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlatformEvent, EventHandler } from "./types";
import { installedApps } from "./registry";

// ---------------------------------------------------------------------
//  Event bus.
//
//  publish() radi dvije stvari:
//    1. upise dogadjaj u tabelu platform_events (trajni log + izvor za
//       automatizacije i digest),
//    2. sinhrono pozove sve handlere koje su app-ovi prijavili kroz
//       manifest.subscribes.
//
//  Ovo je namjerno jednostavno (in-process) jer je Vercel serverless —
//  nema stalnog reda poslova. Za studentski projekat je sasvim dovoljno i
//  jasno pokazuje princip "apps cooperate without knowing about each other".
// ---------------------------------------------------------------------

// Skupi sve pretplate iz svih instaliranih app-ova: type -> [handleri]
function subscribersFor(type: string): EventHandler[] {
  const handlers: EventHandler[] = [];
  for (const app of installedApps()) {
    const h = app.subscribes?.[type];
    if (h) handlers.push(h);
  }
  return handlers;
}

export async function publish(db: SupabaseClient, event: PlatformEvent) {
  // 1) trajni log
  const { error } = await db.from("platform_events").insert({
    household_id: event.household_id,
    type: event.type,
    actor_id: event.actor_id ?? null,
    payload: event.payload,
  });
  if (error) console.error("[events] upis nije uspio:", error.message);

  // 2) pozovi pretplacene handlere
  for (const handler of subscribersFor(event.type)) {
    try {
      await handler(event, { db });
    } catch (e) {
      console.error(`[events] handler za ${event.type} pao:`, e);
    }
  }
}

// Pomocnik za linkanje dva objekta (connected web).
export async function linkObjects(
  db: SupabaseClient,
  householdId: string,
  from: { type: string; id: string },
  to: { type: string; id: string },
  relation?: string
) {
  await db.from("links").insert({
    household_id: householdId,
    from_type: from.type,
    from_id: from.id,
    to_type: to.type,
    to_id: to.id,
    relation,
  });
}
