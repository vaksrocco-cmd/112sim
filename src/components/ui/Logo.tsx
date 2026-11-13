/** 112Sim logo: telefonitoru ja punane „kõne käib“ täpp. SVG, värvid tokenitest. */
export function Logo({ size = 32, withName = true }: { size?: number; withName?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label="112Sim" className="flex-none">
        <rect width="64" height="64" rx="15" className="fill-fg" />
        <path
          className="fill-bg"
          d="M24.6 30.4a25.2 25.2 0 0 0 11 11l3.7-3.7a1.7 1.7 0 0 1 1.7-.4c1.8.6 3.8.95 6 .95a1.7 1.7 0 0 1 1.7 1.7V46a1.7 1.7 0 0 1-1.7 1.7A28.3 28.3 0 0 1 18.6 19.3 1.7 1.7 0 0 1 20.3 17.6h5.9a1.7 1.7 0 0 1 1.7 1.7c0 2.1.33 4.1.95 6a1.7 1.7 0 0 1-.42 1.7z"
        />
        <circle cx="45" cy="19" r="5.5" className="fill-end" />
      </svg>
      {withName ? <span className="text-xl font-semibold tracking-[-0.03em] text-fg">112Sim</span> : null}
    </span>
  );
}
