import type { ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------
//  Zajednicki "objekat" u sistemu. Sve app-ove stvari (task, bill, ...)
//  dijele ova osnovna polja — to je ono sto cini "connected web" mogucim.
// ---------------------------------------------------------------------
export type Visibility = "private" | "household" | "shared";

export interface PlatformObject {
  id: string;
  household_id: string;
  owner_id: string;
  visibility: Visibility;
  shared_with: string[];
  created_at: string;
}

// ---------------------------------------------------------------------
//  Event bus — "apps cooperate without knowing about each other".
//  App objavi dogadjaj; drugi app-ovi se pretplate, bez direktne veze.
// ---------------------------------------------------------------------
export interface PlatformEvent<T = Record<string, unknown>> {
  type: string;          // npr. "bill.created", "task.completed"
  household_id: string;
  actor_id?: string | null;
  payload: T;
}

export type EventHandler = (
  event: PlatformEvent,
  ctx: { db: SupabaseClient }
) => Promise<void> | void;

// ---------------------------------------------------------------------
//  Sto app doprinosi zajednickim povrsinama (dashboard, pretraga, paleta).
//  Platforma ovo cita — nigdje nema hardkodirane liste app-ova.
// ---------------------------------------------------------------------
export interface DashboardCard {
  title: string;
  // Vraca kratke stavke za "Today" ekran (dospjelo danas, itd.)
  load: (ctx: AppContext) => Promise<DashboardItem[]>;
}

export interface DashboardItem {
  id: string;
  label: string;
  meta?: string;
  href?: string;
}

export interface Command {
  id: string;            // "tasks.new"
  label: string;         // "Novi zadatak"
  run?: string;          // ruta na koju vodi
}

export interface SearchResult {
  id: string;
  type: string;
  label: string;
  href?: string;
}

export interface AppContext {
  db: SupabaseClient;
  householdId: string;
  userId: string;
}

// ---------------------------------------------------------------------
//  MANIFEST — jedini "ugovor" izmedju app-a i platforme.
//  Novi app se instalira tako sto preda ovakav objekat registru.
//  Nista drugo u sistemu ne treba mijenjati.
// ---------------------------------------------------------------------
export interface AppManifest {
  id: string;                 // "tasks", "finance", "meal-planner"
  name: string;               // ljudsko ime za navigaciju
  icon?: ReactNode;
  route: string;              // gdje app zivi u navigaciji

  // Doprinos zajednickim povrsinama:
  dashboardCards?: DashboardCard[];
  commands?: Command[];
  search?: (query: string, ctx: AppContext) => Promise<SearchResult[]>;

  // Ucesce u connected web-u:
  publishes?: string[];       // dogadjaji koje app moze objaviti
  subscribes?: Record<string, EventHandler>; // dogadjaji na koje reaguje

  // Koje dozvole app treba (dokumentacija ugovora za korisnika/agenta):
  requiredAccess?: string[];  // npr. ["read:tasks", "create:tasks"]
}
