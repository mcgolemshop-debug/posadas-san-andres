/**
 * Footer simple. Sin redes sociales todavía porque están pendientes
 * de que Orlando los confirme.
 */
export function Footer() {
  return (
    <footer className="mt-16 border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-[var(--muted)]">
        <p>
          © {new Date().getFullYear()} Posadas San Andrés · Chichiriviche, Falcón.
        </p>
        <p>Check-in 2:00 PM · Check-out 12:00 m</p>
      </div>
    </footer>
  );
}
