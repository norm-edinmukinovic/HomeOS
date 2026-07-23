import { redirect } from "next/navigation";
import { getContext } from "@/lib/session";
import { InviteForm } from "@/components/InviteForm";
import { cancelInvite, removeMember } from "./actions";
import { Users, Crown, Clock, X } from "lucide-react";

export const dynamic = "force-dynamic";

function initials(name: string) { return name.slice(0, 2).toUpperCase(); }

export default async function MembersPage() {
  const { db, user, householdId } = await getContext();
  if (!user) redirect("/login");
  if (!householdId) return <p>Priprema…</p>;

  const [{ data: members }, { data: invites }, { data: me }] = await Promise.all([
    db.from("household_members").select("user_id, display_name, role, joined_at")
      .eq("household_id", householdId).order("joined_at", { ascending: true }),
    db.from("invites").select("id, email, created_at").eq("household_id", householdId)
      .order("created_at", { ascending: false }),
    db.from("household_members").select("role").eq("household_id", householdId).eq("user_id", user.id).maybeSingle(),
  ]);

  const isAdmin = me?.role === "admin";

  async function doCancel(formData: FormData) {
    "use server";
    await cancelInvite(String(formData.get("id")));
  }
  async function doRemove(formData: FormData) {
    "use server";
    await removeMember(String(formData.get("userId")));
  }

  return (
    <div className="animate-fade-up">
      <div className="flex items-center gap-2.5 mb-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-soft text-teal">
          <Users size={19} strokeWidth={2.2} />
        </span>
        <h1 className="text-2xl font-semibold">Članovi domaćinstva</h1>
      </div>

      <InviteForm />

      <h2 className="text-sm font-medium text-ink mb-2 flex items-center gap-2">
        Članovi
        <span className="text-xs px-2 py-0.5 rounded-full bg-teal-soft text-teal">{members?.length ?? 0}</span>
      </h2>
      <div className="rounded-2xl border border-line bg-white shadow-soft divide-y divide-line mb-6">
        {(members ?? []).map((m) => (
          <div key={m.user_id} className="flex items-center gap-3 px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-lav-soft text-lav text-xs font-medium">
              {initials(m.display_name ?? "?")}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-ink flex items-center gap-1.5">
                {m.display_name}
                {m.user_id === user.id && <span className="text-xs text-muted">(ti)</span>}
                {m.role === "admin" && <Crown size={13} className="text-sun" />}
              </p>
              <p className="text-xs text-muted">{m.role === "admin" ? "Administrator" : "Član"}</p>
            </div>
            {isAdmin && m.user_id !== user.id && (
              <form action={doRemove}>
                <input type="hidden" name="userId" value={m.user_id} />
                <button className="text-xs text-muted hover:text-rose border border-line rounded-lg px-2.5 py-1">
                  Ukloni
                </button>
              </form>
            )}
          </div>
        ))}
      </div>

      {(invites ?? []).length > 0 && (
        <>
          <h2 className="text-sm font-medium text-ink mb-2 flex items-center gap-2">
            <Clock size={14} className="text-muted" /> Poslani pozivi
          </h2>
          <div className="rounded-2xl border border-line bg-white/70 shadow-soft divide-y divide-line">
            {(invites ?? []).map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex-1 text-sm text-ink">{inv.email}</span>
                <span className="text-xs text-muted">čeka registraciju</span>
                <form action={doCancel}>
                  <input type="hidden" name="id" value={inv.id} />
                  <button className="text-muted hover:text-rose" aria-label="Otkaži poziv"><X size={16} /></button>
                </form>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
