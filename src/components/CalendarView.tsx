"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Clock,
  MapPin,
  ListChecks,
  CalendarDays,
  Check,
  Trash2,
} from "lucide-react";
import { addEvent, deleteEvent, type AddEventInput } from "@/app/calendar/actions";

// ---- Tipovi podataka iz baze (serijalizirani u server komponenti) --------
interface EventRow {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  owner_id: string;
  visibility: string;
}
interface TaskRow {
  id: string;
  title: string;
  due_at: string | null;
  status: string;
  priority: string;
  assignee_id: string | null;
}

// ---- Jedinstveni model stavke na kalendaru --------------------------------
interface CalItem {
  key: string;
  kind: "event" | "task";
  title: string;
  start: Date;
  end: Date | null;
  location: string | null;
  status: string | null;
  overdue: boolean;
  href: string | null;
  eventId: string | null;
}

type View = "month" | "week" | "day";

// ---- Datumski helperi -----------------------------------------------------
const DAY = 86400000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// Ponedjeljak kao prvi dan sedmice.
function startOfWeek(d: Date) {
  const s = startOfDay(d);
  const dow = (s.getDay() + 6) % 7; // pon=0 … ned=6
  return addDays(s, -dow);
}

const WEEKDAYS = ["Pon", "Uto", "Sri", "Čet", "Pet", "Sub", "Ned"];

function fmtTime(d: Date) {
  return d.toLocaleTimeString("bs", { hour: "2-digit", minute: "2-digit", hour12: false });
}
function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---- Komponenta -----------------------------------------------------------
export default function CalendarView({
  currentUserId,
  events,
  tasks,
}: {
  currentUserId: string;
  events: EventRow[];
  tasks: TaskRow[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState<Date>(() => startOfDay(new Date()));
  const [selected, setSelected] = useState<CalItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<Date | null>(null);

  // Otvori formu ako je došlo iz komandne palete (/calendar?new=1)
  useEffect(() => {
    if (searchParams.get("new") === "1") setModalOpen(true);
  }, [searchParams]);

  const now = new Date();

  // Spoji događaje i zadatke s rokom u jednu listu.
  const items = useMemo<CalItem[]>(() => {
    const out: CalItem[] = [];
    for (const e of events) {
      out.push({
        key: `e_${e.id}`,
        kind: "event",
        title: e.title,
        start: new Date(e.starts_at),
        end: e.ends_at ? new Date(e.ends_at) : null,
        location: e.location,
        status: null,
        overdue: false,
        href: null,
        eventId: e.id,
      });
    }
    for (const t of tasks) {
      if (!t.due_at) continue;
      const due = new Date(t.due_at);
      out.push({
        key: `t_${t.id}`,
        kind: "task",
        title: t.title,
        start: due,
        end: null,
        location: null,
        status: t.status,
        overdue: t.status !== "done" && due.getTime() < now.getTime(),
        href: "/tasks",
        eventId: null,
      });
    }
    out.sort((a, b) => a.start.getTime() - b.start.getTime());
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, tasks]);

  const itemsOn = (day: Date) => items.filter((it) => sameDay(it.start, day));

  // ---- Naslov perioda -----------------------------------------------------
  const label = useMemo(() => {
    if (view === "month") return cap(cursor.toLocaleDateString("bs", { month: "long", year: "numeric" }));
    if (view === "day")
      return cap(cursor.toLocaleDateString("bs", { weekday: "long", day: "numeric", month: "long" }));
    const ws = startOfWeek(cursor);
    const we = addDays(ws, 6);
    const sameMonth = ws.getMonth() === we.getMonth();
    const left = ws.toLocaleDateString("bs", { day: "numeric", ...(sameMonth ? {} : { month: "short" }) });
    const right = we.toLocaleDateString("bs", { day: "numeric", month: "short", year: "numeric" });
    return `${left} – ${right}`;
  }, [view, cursor]);

  // ---- Navigacija ---------------------------------------------------------
  const shift = (dir: -1 | 1) => {
    if (view === "month") setCursor((c) => addMonths(c, dir));
    else if (view === "week") setCursor((c) => addDays(c, dir * 7));
    else setCursor((c) => addDays(c, dir));
  };
  const goToday = () => setCursor(startOfDay(new Date()));
  const openDay = (day: Date) => {
    setCursor(startOfDay(day));
    setView("day");
  };
  const openNew = (day?: Date) => {
    setModalDate(day ? new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9, 0) : new Date());
    setModalOpen(true);
  };

  const onDelete = (id: string) => {
    startTransition(async () => {
      await deleteEvent(id);
      setSelected(null);
      router.refresh();
    });
  };

  return (
    <div>
      {/* Zaglavlje */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-lav-soft text-lav">
              <CalendarDays size={18} />
            </span>
            Kalendar
          </h1>
          <p className="text-muted text-sm mt-1">
            Događaji domaćinstva i zadaci s rokom — sve dijeljeno na jednom mjestu.
          </p>
        </div>
        <button
          onClick={() => openNew()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-lav text-white text-sm px-3.5 py-2 shadow-soft hover:brightness-105"
        >
          <Plus size={16} /> Novi događaj
        </button>
      </div>

      {/* Alatna traka */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => shift(-1)}
            aria-label="Prethodno"
            className="h-9 w-9 grid place-items-center rounded-lg border border-line bg-white hover:bg-lav-soft"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={goToday}
            className="rounded-lg border border-line bg-white text-sm px-3 h-9 hover:bg-lav-soft"
          >
            Danas
          </button>
          <button
            onClick={() => shift(1)}
            aria-label="Sljedeće"
            className="h-9 w-9 grid place-items-center rounded-lg border border-line bg-white hover:bg-lav-soft"
          >
            <ChevronRight size={18} />
          </button>
          <span className="ml-1 text-lg font-medium">{label}</span>
        </div>

        <div className="inline-flex rounded-lg border border-line bg-white p-0.5 text-sm">
          {(["month", "week", "day"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 h-8 rounded-md transition ${
                view === v ? "bg-lav text-white" : "text-muted hover:bg-lav-soft"
              }`}
            >
              {v === "month" ? "Mjesec" : v === "week" ? "Sedmica" : "Dan"}
            </button>
          ))}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 mb-3 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-lav" /> Događaj
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-sky" /> Zadatak (rok)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose" /> Zakašnjelo
        </span>
      </div>

      {view === "month" && (
        <MonthView cursor={cursor} today={now} itemsOn={itemsOn} onOpenDay={openDay} onSelect={setSelected} onNew={openNew} />
      )}
      {view === "week" && (
        <WeekView cursor={cursor} today={now} itemsOn={itemsOn} onOpenDay={openDay} onSelect={setSelected} />
      )}
      {view === "day" && <DayView cursor={cursor} today={now} items={itemsOn(cursor)} onSelect={setSelected} onNew={() => openNew(cursor)} />}

      {/* Detalj događaja / zadatka */}
      {selected && (
        <DetailPopover
          item={selected}
          canDelete={selected.kind === "event"}
          pending={pending}
          onClose={() => setSelected(null)}
          onDelete={onDelete}
          onGoTask={() => {
            setSelected(null);
            router.push("/tasks");
          }}
        />
      )}

      {/* Forma za novi događaj */}
      {modalOpen && (
        <NewEventModal
          initialDate={modalDate ?? new Date()}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

// ---- Chip (jedna stavka) --------------------------------------------------
function itemClasses(it: CalItem) {
  if (it.kind === "event") return "bg-lav-soft text-lav";
  if (it.status === "done") return "bg-line text-muted line-through";
  if (it.overdue) return "bg-rose-soft text-rose";
  return "bg-sky-soft text-sky";
}

function Chip({ it, onClick, showTime = true }: { it: CalItem; onClick: () => void; showTime?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={it.title}
      className={`w-full truncate text-left rounded-md px-1.5 py-0.5 text-xs leading-tight ${itemClasses(it)} hover:brightness-95`}
    >
      {showTime && <span className="tabular-nums opacity-70 mr-1">{fmtTime(it.start)}</span>}
      {it.kind === "task" && <ListChecks size={11} className="inline mb-0.5 mr-0.5" />}
      {it.title}
    </button>
  );
}

// ---- Mjesečni pregled -----------------------------------------------------
function MonthView({
  cursor,
  today,
  itemsOn,
  onOpenDay,
  onSelect,
  onNew,
}: {
  cursor: Date;
  today: Date;
  itemsOn: (d: Date) => CalItem[];
  onOpenDay: (d: Date) => void;
  onSelect: (it: CalItem) => void;
  onNew: (d: Date) => void;
}) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  return (
    <div className="rounded-xl border border-line bg-white overflow-hidden shadow-soft">
      <div className="grid grid-cols-7 border-b border-line bg-paper">
        {WEEKDAYS.map((w) => (
          <div key={w} className="px-2 py-2 text-xs font-medium text-muted text-center">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const inMonth = day.getMonth() === cursor.getMonth();
          const isToday = sameDay(day, today);
          const dayItems = itemsOn(day);
          const shown = dayItems.slice(0, 3);
          const extra = dayItems.length - shown.length;
          return (
            <div
              key={i}
              className={`group min-h-[104px] border-b border-r border-line p-1.5 last:border-r-0 ${
                inMonth ? "bg-white" : "bg-paper/60"
              } ${i % 7 === 6 ? "border-r-0" : ""}`}
            >
              <div className="flex items-center justify-between mb-1">
                <button
                  onClick={() => onOpenDay(day)}
                  className={`h-6 w-6 grid place-items-center rounded-full text-xs ${
                    isToday ? "bg-lav text-white font-semibold" : inMonth ? "text-ink hover:bg-lav-soft" : "text-muted"
                  }`}
                >
                  {day.getDate()}
                </button>
                <button
                  onClick={() => onNew(day)}
                  className="opacity-0 group-hover:opacity-100 transition text-muted hover:text-lav"
                  aria-label="Dodaj događaj"
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="space-y-1">
                {shown.map((it) => (
                  <Chip key={it.key} it={it} onClick={() => onSelect(it)} />
                ))}
                {extra > 0 && (
                  <button onClick={() => onOpenDay(day)} className="text-[11px] text-muted hover:text-lav pl-1">
                    +{extra} više
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Sedmični pregled -----------------------------------------------------
function WeekView({
  cursor,
  today,
  itemsOn,
  onOpenDay,
  onSelect,
}: {
  cursor: Date;
  today: Date;
  itemsOn: (d: Date) => CalItem[];
  onOpenDay: (d: Date) => void;
  onSelect: (it: CalItem) => void;
}) {
  const ws = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
      {days.map((day, i) => {
        const isToday = sameDay(day, today);
        const dayItems = itemsOn(day);
        return (
          <div
            key={i}
            className={`rounded-xl border bg-white p-2 shadow-soft min-h-[160px] ${
              isToday ? "border-lav ring-1 ring-lav/30" : "border-line"
            }`}
          >
            <button
              onClick={() => onOpenDay(day)}
              className="w-full flex items-baseline justify-between mb-2 group"
            >
              <span className="text-xs font-medium text-muted">{WEEKDAYS[i]}</span>
              <span
                className={`text-sm h-6 w-6 grid place-items-center rounded-full ${
                  isToday ? "bg-lav text-white font-semibold" : "text-ink group-hover:bg-lav-soft"
                }`}
              >
                {day.getDate()}
              </span>
            </button>
            <div className="space-y-1">
              {dayItems.length === 0 && <p className="text-[11px] text-muted/70 py-2">—</p>}
              {dayItems.map((it) => (
                <Chip key={it.key} it={it} onClick={() => onSelect(it)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Dnevni pregled (satnica) ---------------------------------------------
function DayView({
  cursor,
  today,
  items,
  onSelect,
  onNew,
}: {
  cursor: Date;
  today: Date;
  items: CalItem[];
  onSelect: (it: CalItem) => void;
  onNew: () => void;
}) {
  const isToday = sameDay(cursor, today);
  const hours = Array.from({ length: 24 }, (_, h) => h);
  const byHour = (h: number) => items.filter((it) => it.start.getHours() === h);

  return (
    <div className="rounded-xl border border-line bg-white shadow-soft overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-paper">
        <span className="text-sm font-medium">
          {items.length} {items.length === 1 ? "stavka" : "stavki"}
        </span>
        <button
          onClick={onNew}
          className="inline-flex items-center gap-1 text-sm text-lav hover:brightness-110"
        >
          <Plus size={15} /> Dodaj
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto divide-y divide-line">
        {hours.map((h) => {
          const hourItems = byHour(h);
          const nowHour = isToday && new Date().getHours() === h;
          return (
            <div key={h} className={`flex gap-3 px-3 py-1.5 ${nowHour ? "bg-lav-soft/40" : ""}`}>
              <div className="w-12 shrink-0 pt-1 text-right text-xs tabular-nums text-muted">
                {String(h).padStart(2, "0")}:00
              </div>
              <div className="flex-1 min-h-[34px] space-y-1 py-0.5">
                {hourItems.map((it) => (
                  <button
                    key={it.key}
                    onClick={() => onSelect(it)}
                    className={`w-full text-left rounded-lg px-3 py-1.5 text-sm ${itemClasses(it)} hover:brightness-95`}
                  >
                    <span className="font-medium">{it.title}</span>
                    <span className="ml-2 text-xs opacity-70">
                      {fmtTime(it.start)}
                      {it.end ? `–${fmtTime(it.end)}` : ""}
                      {it.kind === "task" ? " · rok" : ""}
                      {it.location ? ` · ${it.location}` : ""}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Detalj (popover) -----------------------------------------------------
function DetailPopover({
  item,
  canDelete,
  pending,
  onClose,
  onDelete,
  onGoTask,
}: {
  item: CalItem;
  canDelete: boolean;
  pending: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  onGoTask: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/20 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white shadow-lift border border-line p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
              item.kind === "event" ? "bg-lav-soft text-lav" : item.overdue ? "bg-rose-soft text-rose" : "bg-sky-soft text-sky"
            }`}
          >
            {item.kind === "event" ? <CalendarDays size={12} /> : <ListChecks size={12} />}
            {item.kind === "event" ? "Događaj" : "Zadatak"}
          </span>
          <button onClick={onClose} className="text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <h3 className="text-lg font-semibold mt-2 mb-3">{item.title}</h3>

        <div className="space-y-1.5 text-sm text-muted">
          <p className="flex items-center gap-2">
            <Clock size={14} />
            {item.start.toLocaleDateString("bs", { weekday: "long", day: "numeric", month: "long" })} ·{" "}
            {fmtTime(item.start)}
            {item.end ? `–${fmtTime(item.end)}` : ""}
          </p>
          {item.location && (
            <p className="flex items-center gap-2">
              <MapPin size={14} /> {item.location}
            </p>
          )}
          {item.kind === "task" && item.status === "done" && (
            <p className="flex items-center gap-2 text-accent">
              <Check size={14} /> Završeno
            </p>
          )}
          {item.overdue && <p className="text-rose">Rok je prošao.</p>}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          {item.kind === "task" && (
            <button
              onClick={onGoTask}
              className="rounded-lg bg-sky text-white text-sm px-3.5 py-2 hover:brightness-105"
            >
              Otvori u Zadacima
            </button>
          )}
          {canDelete && item.eventId && (
            <button
              disabled={pending}
              onClick={() => onDelete(item.eventId!)}
              className="inline-flex items-center gap-1 rounded-lg border border-line text-sm px-3 py-2 text-rose hover:bg-rose-soft disabled:opacity-50"
            >
              <Trash2 size={15} /> Obriši
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Modal: novi događaj --------------------------------------------------
function NewEventModal({
  initialDate,
  onClose,
  onSaved,
}: {
  initialDate: Date;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [start, setStart] = useState(toLocalInput(initialDate));
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("");
  const [visibility, setVisibility] = useState<"household" | "private">("household");
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  const submit = () => {
    setError(null);
    const payload: AddEventInput = { title, start, end: end || undefined, location: location || undefined, visibility };
    startSave(async () => {
      const res = await addEvent(payload);
      if (res.error) setError(res.error);
      else onSaved();
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/20 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-lift border border-line p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Novi događaj</h3>
          <button onClick={onClose} className="text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Naziv događaja"
            className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-lav"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs text-muted">
              Početak
              <input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-lav"
              />
            </label>
            <label className="text-xs text-muted">
              Kraj (opcionalno)
              <input
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-lav"
              />
            </label>
          </div>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Mjesto (opcionalno)"
            className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-lav"
          />
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted text-xs">Vidljivost:</span>
            {(["household", "private"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVisibility(v)}
                className={`rounded-lg px-3 py-1.5 text-xs border transition ${
                  visibility === v ? "border-lav bg-lav-soft text-lav" : "border-line text-muted hover:bg-paper"
                }`}
              >
                {v === "household" ? "Cijelo domaćinstvo" : "Samo ja"}
              </button>
            ))}
          </div>

          {error && <p className="text-sm text-rose">{error}</p>}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-line text-sm px-4 py-2 hover:bg-paper">
            Odustani
          </button>
          <button
            disabled={saving}
            onClick={submit}
            className="rounded-lg bg-lav text-white text-sm px-4 py-2 shadow-soft hover:brightness-105 disabled:opacity-50"
          >
            {saving ? "Spremam…" : "Spremi"}
          </button>
        </div>
      </div>
    </div>
  );
}
