import type {
  AppManifest,
  AppContext,
  DashboardItem,
  SearchResult,
  Command,
} from "./types";

// ---------------------------------------------------------------------
//  Registar app-ova.
//  Dashboard, pretraga, komandna paleta i navigacija NE znaju za konkretne
//  app-ove — pitaju registar. Zato se deveti app pojavi svuda cim se
//  registruje, bez ijedne izmjene u postojecem kodu.
// ---------------------------------------------------------------------
const apps: AppManifest[] = [];

export function registerApp(manifest: AppManifest) {
  if (apps.find((a) => a.id === manifest.id)) return; // idempotentno
  apps.push(manifest);
}

export function installedApps(): AppManifest[] {
  return [...apps];
}

export function navItems() {
  return apps.map((a) => ({ id: a.id, name: a.name, route: a.route }));
}

// Skupi sve komande iz svih app-ova (za komandnu paletu).
export function allCommands(): Command[] {
  return apps.flatMap((a) => a.commands ?? []);
}

// Sabere "Today" kartice iz svih app-ova.
export async function loadDashboard(ctx: AppContext) {
  const sections: { appId: string; app: string; title: string; items: DashboardItem[] }[] = [];
  for (const app of apps) {
    for (const card of app.dashboardCards ?? []) {
      try {
        const items = await card.load(ctx);
        if (items.length) sections.push({ appId: app.id, app: app.name, title: card.title, items });
      } catch (e) {
        // Jedan app koji padne ne smije srusiti cijeli dashboard.
        console.error(`[dashboard] ${app.id} nije uspio:`, e);
      }
    }
  }
  return sections;
}

// Pretraga preko svega — pita svaki app da pretrazi svoje.
export async function searchEverything(query: string, ctx: AppContext) {
  const results: SearchResult[] = [];
  for (const app of apps) {
    if (!app.search) continue;
    try {
      results.push(...(await app.search(query, ctx)));
    } catch (e) {
      console.error(`[search] ${app.id} nije uspio:`, e);
    }
  }
  return results;
}
