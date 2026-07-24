"use server";
import { getContext } from "@/lib/session";

export interface NotifItem {
  id: string;
  title: string;
  fireAt: string;
}

// Dospjeli podsjetnici namijenjeni prijavljenom korisniku (ili cijelom domu).
// Ovo je izvor za in-app zvonce/toast — ne zavisi od crona ni e-maila.
export async function getDueNotifications(): Promise<NotifItem[]> {
  const { db, user, householdId } = await getContext();
  if (!user || !householdId) return [];

  const now = new Date().toISOString();
  const { data } = await db
    .from("reminders")
    .select("id, title, fire_at, target_id")
    .eq("household_id", householdId)
    .eq("fired", false)
    .lte("fire_at", now)
    .order("fire_at", { ascending: true })
    .limit(20);

  return (data ?? [])
    .filter((r) => !r.target_id || r.target_id === user.id)
    .map((r) => ({ id: r.id, title: r.title, fireAt: r.fire_at }));
}
