// Prikazuje se automatski dok se stranica učitava (App Router).
// Daje trenutni odziv na klik u navigaciji umjesto prazne pauze.
export default function Loading() {
  return (
    <div className="animate-fade-up">
      <div className="h-8 w-40 rounded-lg bg-line/70 animate-pulse mb-6" />
      <div className="h-24 rounded-2xl bg-line/50 animate-pulse mb-6" />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 rounded-2xl bg-line/40 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
        ))}
      </div>
    </div>
  );
}
