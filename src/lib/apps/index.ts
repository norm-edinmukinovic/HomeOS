import { registerApp } from "@/lib/platform/registry";
import { tasksApp } from "./tasks/manifest";
import { financeApp } from "./finance/manifest";
import { calendarApp } from "./calendar/manifest";
import { remindersApp } from "./reminders/manifest";
import { mealPlannerApp } from "./meal-planner/manifest";

// =====================================================================
//  Ovdje se app-ovi "instaliraju" na platformu — samo dodavanjem u ovu
//  listu. Da bi se dodao novi app, napravi njegov manifest i ubaci ga
//  ovdje. Nista drugo u sistemu ne treba dirati.
//
//  Prvih osam iz zadatka: Dashboard i "Life admin" nisu zasebni app-ovi
//  ovdje jer su Dashboard sama zajednicka povrsina, a Life admin/Notes
//  se lako dodaju istim obrascem (ostavljeno kao vjezba — vidi README).
// =====================================================================
let installed = false;

export function installApps() {
  if (installed) return;
  registerApp(tasksApp);
  registerApp(financeApp);
  registerApp(calendarApp);
  registerApp(remindersApp);
  registerApp(mealPlannerApp); // <-- deveti app; dokaz prosirivosti
  installed = true;
}
