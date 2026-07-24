import { getContext } from "@/lib/session";
import { installApps } from "@/lib/apps";
import { navItems } from "./registry";
import { loadCustomApps, customNavEntries } from "./custom";

export interface NavEntry {
  id: string;
  name: string;
  route: string;
}

// Skup app-ova koji NE trebaju biti vidljivi ovom korisniku:
//  - isključeni za cijelo domaćinstvo (admin), ili
//  - koje je korisnik sam sakrio.
export async function disabledAppIds(): Promise<Set<string>> {
  const disabled = new Set<string>();
  try {
    const { db, user, householdId } = await getContext();
    if (!user || !householdId) return disabled;
    const [{ data: avail }, { data: hidden }] = await Promise.all([
      db.from("app_availability").select("app_id, available").eq("household_id", householdId),
      db.from("app_hidden").select("app_id").eq("user_id", user.id),
    ]);
    for (const a of avail ?? []) if (a.available === false) disabled.add(a.app_id);
    for (const h of hidden ?? []) disabled.add(h.app_id);
  } catch {
    /* auth stranice / bez sesije */
  }
  return disabled;
}

// Navigacija koju korisnik zaista vidi: ugrađeni app-ovi + custom app-ovi,
// minus isključeni/sakriveni.
export async function getVisibleNav(): Promise<NavEntry[]> {
  installApps();
  const builtins: NavEntry[] = navItems().map((b) => ({ id: b.id, name: b.name, route: b.route }));

  let customEntries: NavEntry[] = [];
  const disabled = await disabledAppIds();
  try {
    const { db, user, householdId } = await getContext();
    if (user && householdId) {
      const apps = await loadCustomApps(db, householdId);
      customEntries = customNavEntries(apps);
    }
  } catch {
    /* bez sesije */
  }

  return [...builtins, ...customEntries].filter((e) => !disabled.has(e.id));
}
