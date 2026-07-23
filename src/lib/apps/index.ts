import { registerApp } from "@/lib/platform/registry";
import { tasksApp } from "./tasks/manifest";
import { financeApp } from "./finance/manifest";
import { calendarApp } from "./calendar/manifest";
import { remindersApp } from "./reminders/manifest";
import { mealPlannerApp } from "./meal-planner/manifest";
import { membersApp } from "./members/manifest";

// =====================================================================
// Ovdje se app-ovi "instaliraju" na platformu — samo dodavanjem u listu.
// =====================================================================
let installed = false;

export function installApps() {
  if (installed) return;
  registerApp(tasksApp);
  registerApp(financeApp);
  registerApp(calendarApp);
  registerApp(remindersApp);
  registerApp(mealPlannerApp);
  registerApp(membersApp);
  installed = true;
}
