interface SketchfabEmbedProps {
  /** The model's id — the hex string at the end of its sketchfab.com URL. */
  modelId: string;
  title: string;
}

/** A Sketchfab-hosted 3D model in an iframe. Sketchfab's own viewer shows the creator credit. */
export function SketchfabEmbed({ modelId, title }: SketchfabEmbedProps) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-hud-panel2">
      <iframe
        title={title}
        src={`https://sketchfab.com/models/${modelId}/embed?autospin=1&autostart=1&preload=1&transparent=1`}
        allow="autoplay; fullscreen; xr-spatial-tracking"
        loading="lazy"
        className="h-full w-full border-0"
      />
      {/* Covers the creator's profile photo in Sketchfab's top-left info bar (the embed can't turn it off on a free
          plan). The model title and "by <creator>" credit beside it are left visible. Pinned to Sketchfab's layout. */}
      <div aria-hidden="true" className="pointer-events-none absolute left-[6px] top-[6px] h-[40px] w-[40px] bg-hud-panel2" />
    </div>
  );
}
