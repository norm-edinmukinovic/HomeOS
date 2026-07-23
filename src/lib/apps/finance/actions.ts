import type { SupabaseClient } from "@supabase/supabase-js";
import { publish } from "@/lib/platform/events";

export async function createBill(
  db: SupabaseClient,
  input: {
    householdId: string;
    ownerId: string;
    title: string;
    amount: number;
    dueAt?: string | null;
    recurring?: string | null;
    category?: string | null;
  }
) {
  const { data, error } = await db
    .from("bills")
    .insert({
      household_id: input.householdId,
      owner_id: input.ownerId,
      title: input.title,
      amount: input.amount,
      due_at: input.dueAt ?? null,
      recurring: input.recurring ?? null,
      category: input.category ?? null,
    })
    .select("id, title, amount, due_at")
    .single();
  if (error) throw error;

  // Objavi dogadjaj — druge app-ove (npr. automatsko kreiranje zadatka)
  // ne pozivamo direktno; samo objavimo sta se desilo.
  await publish(db, {
    type: "bill.created",
    household_id: input.householdId,
    actor_id: input.ownerId,
    payload: {
      billId: data.id, title: data.title, amount: data.amount, dueAt: data.due_at,
    },
  });

  return data;
}
