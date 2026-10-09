/** Soft blue gradient wash behind auth pages (sky + navy, no teal). */
export function AuthBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_10%,rgba(75,163,227,0.32),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_90%_85%,rgba(27,58,107,0.12),transparent_50%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(165deg,#eef6fc_0%,#e8f1fa_50%,#e4eef8_100%)]" />
    </div>
  );
}
