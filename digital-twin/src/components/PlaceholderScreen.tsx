export function PlaceholderScreen({ title, description }: { title: string; description: string }) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
      <div className="hud-grid-bg absolute inset-0 opacity-40" />
      <div className="relative z-10 max-w-md text-center">
        <h2 className="text-lg font-semibold tracking-wide text-hud-text">{title}</h2>
        <p className="mt-2 text-sm text-hud-muted">{description}</p>
        <p className="mt-4 text-[11px] uppercase tracking-widest text-hud-muted/60">
          Module scaffold — outside this build&rsquo;s scope
        </p>
      </div>
    </div>
  );
}
