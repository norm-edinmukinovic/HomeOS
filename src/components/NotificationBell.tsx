"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import { getDueNotifications, type NotifItem } from "@/app/notif-actions";

const POLL_MS = 30000;
const SEEN_KEY = "homeos_seen_notifs";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("bs", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

export function NotificationBell() {
  const [items, setItems] = useState<NotifItem[]>([]);
  const [unseen, setUnseen] = useState(0);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<NotifItem | null>(null);

  const seenRef = useRef<Set<string>>(new Set());
  const prevIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SEEN_KEY);
      if (raw) seenRef.current = new Set(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const persistSeen = () => {
    try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seenRef.current])); } catch { /* ignore */ }
  };

  const poll = useCallback(async () => {
    try {
      const data = await getDueNotifications();
      setItems(data);

      // Novi (tek dospjeli) od zadnjeg prolaza koji još nisu viđeni -> toast.
      if (!firstLoad.current) {
        const fresh = data.filter((d) => !prevIds.current.has(d.id) && !seenRef.current.has(d.id));
        if (fresh.length > 0) setToast(fresh[0]);
      }
      prevIds.current = new Set(data.map((d) => d.id));
      setUnseen(data.filter((d) => !seenRef.current.has(d.id)).length);
      firstLoad.current = false;
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    poll();
    const t = setInterval(poll, POLL_MS);
    return () => clearInterval(t);
  }, [poll]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 8000);
    return () => clearTimeout(t);
  }, [toast]);

  // Otvaranje zvona = "pročitano": očisti brojač.
  const toggle = () => {
    setOpen((o) => {
      const next = !o;
      if (next) {
        for (const it of items) seenRef.current.add(it.id);
        persistSeen();
        setUnseen(0);
      }
      return next;
    });
  };

  return (
    <>
      <div className="fixed top-3 right-14 md:top-4 md:right-6 z-40">
        <button
          onClick={toggle}
          aria-label="Obavijesti"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-ink shadow-soft hover:bg-sun-soft"
        >
          <Bell size={18} />
          {unseen > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose text-white text-[11px] font-medium grid place-items-center">
              {unseen > 9 ? "9+" : unseen}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-72 rounded-xl border border-line bg-white shadow-lift overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-line">
              <span className="text-sm font-medium">Obavijesti</span>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-ink" aria-label="Zatvori"><X size={15} /></button>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-line">
              {items.length === 0 && <p className="px-3 py-6 text-sm text-muted text-center">Nema novih obavijesti.</p>}
              {items.map((it) => (
                <Link key={it.id} href="/reminders" onClick={() => setOpen(false)} className="block px-3 py-2.5 hover:bg-sun-soft/50">
                  <p className="text-sm text-ink flex items-center gap-1.5"><Bell size={13} className="text-sun" /> {it.title}</p>
                  <p className="text-xs text-muted mt-0.5">Dospjelo · {fmt(it.fireAt)}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {toast && (
        <Link
          href="/reminders"
          onClick={() => setToast(null)}
          className="fixed bottom-4 right-4 z-50 w-72 rounded-xl border border-line bg-white shadow-lift px-4 py-3 animate-fade-up flex items-start gap-2.5 hover:shadow-soft"
        >
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sun-soft text-sun"><Bell size={15} /></span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-ink">Podsjetnik</span>
            <span className="block text-sm text-ink/80 truncate">{toast.title}</span>
          </span>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setToast(null); }}
            className="text-muted hover:text-ink shrink-0"
            aria-label="Zatvori"
          >
            <X size={15} />
          </button>
        </Link>
      )}
    </>
  );
}
