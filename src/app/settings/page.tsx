import { redirect } from "next/navigation";
import { getContext } from "@/lib/session";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

const CATEGORIES: { key: string; label: string; desc: string }[] = [
  { key: "reminder", label: "Podsjetnici", desc: "Kad se okine podsjetnik namijenjen tebi." },
  { key: "task_assigned", label: "Dodijeljeni zadaci", desc: "Kad ti neko dodijeli zadatak." },
  { key: "bill_due", label: "Dospjeli računi", desc: "Kad račun uskoro dospijeva." },
  { key: "digest", label: "Dnevni sažetak", desc: "Jutarnji pregled onoga što danas dolazi." },
];

export default async function SettingsPage() {
  const { db, user } = await getContext();
  if (!user) redirect("/login");

  const { data: optouts } = await db
    .from("notification_optouts")
    .select("category")
    .eq("user_id", user.id);
  const off = new Set((optouts ?? []).map((o) => o.category));

  async function toggle(formData: FormData) {
    "use server";
    const category = String(formData.get("category"));
    const currentlyOn = String(formData.get("currentlyOn")) === "true";
    const { db, user } = await getContext();
    if (!user) return;
    if (currentlyOn) {
      await db.from("notification_optouts").insert({ user_id: user.id, category });
    } else {
      await db.from("notification_optouts").delete()
        .eq("user_id", user.id).eq("category", category);
    }
    revalidatePath("/settings");
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Postavke</h1>
      <p className="text-muted text-sm mb-8">Odaberi koje obavijesti želiš primati e-mailom.</p>

      <div className="rounded-xl border border-line bg-white divide-y divide-line">
        {CATEGORIES.map((c) => {
          const isOn = !off.has(c.key);
          return (
            <form key={c.key} action={toggle} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{c.label}</p>
                <p className="text-xs text-muted">{c.desc}</p>
              </div>
              <input type="hidden" name="category" value={c.key} />
              <input type="hidden" name="currentlyOn" value={String(isOn)} />
              <button
                type="submit"
                className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${
                  isOn
                    ? "bg-accentSoft border-accent text-accent"
                    : "bg-white border-line text-muted"
                }`}
              >
                {isOn ? "Uključeno" : "Isključeno"}
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
