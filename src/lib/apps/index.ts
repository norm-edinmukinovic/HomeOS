import { registerApp } from "@/lib/platform/registry";
import { tasksApp } from "./tasks/manifest";
import { kanbanApp } from "./kanban/manifest";
import { calendarApp } from "./calendar/manifest";
import { remindersApp } from "./reminders/manifest";
import { notesApp } from "./notes/manifest";
import { financeApp } from "./finance/manifest";
import { lifeAdminApp } from "./life-admin/manifest";
import { membersApp } from "./members/manifest";

// =====================================================================
// Ovdje se app-ovi "instaliraju" na platformu — samo dodavanjem u listu.
// Redoslijed registracije = redoslijed u navigaciji (poslije "Danas",
// prije "Postavke") i odgovara redoslijedu iz zadatka.
// =====================================================================
let installed = false;

export function installApps() {
  if (installed) return;
  registerApp(tasksApp);
  registerApp(kanbanApp);
  registerApp(calendarApp);
  registerApp(remindersApp);
  registerApp(notesApp);
  registerApp(financeApp);
  registerApp(lifeAdminApp);
  registerApp(membersApp);
  installed = true;
}
