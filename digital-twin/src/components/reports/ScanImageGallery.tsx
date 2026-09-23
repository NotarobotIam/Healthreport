import { useEffect, useState } from 'react';
import type { ImagingScanImage } from '../../types';

/**
 * A small "your images" library for a report or anatomy structure: an inline thumbnail strip
 * (so the first image appears immediately — no extra click needed) that opens into a full-size,
 * click-through lightbox. Used both on the report detail page and from the anatomy views
 * (UrologyDiagram / UrologyViewer) when a structure with attached scan images is selected.
 */
interface Props {
  images: ImagingScanImage[];
  /** e.g. "Right kidney" — shown in the header so it's clear which structure these belong to. */
  context?: string;
}

export function ScanImageGallery({ images, context }: Props) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  // Selecting a different structure should reset back to its first image, not keep whatever
  // index was left over from the previous structure's gallery.
  useEffect(() => setIndex(0), [images]);

  if (images.length === 0) return null;
  const current = images[Math.min(index, images.length - 1)];
  const go = (d: number) => setIndex((i) => (i + d + images.length) % images.length);

  return (
    <div className="rounded-xl bg-hud-panel2 p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-hud-muted">
        Your images{context ? ` — ${context}` : ''}
        {images.length > 1 && ` (${index + 1}/${images.length})`}
      </h3>
      <button
        type="button"
        onClick={() => setLightbox(true)}
        className="block w-full overflow-hidden rounded-lg border border-hud-borderLight bg-black"
        aria-label={`Open ${current.label} full size`}
      >
        <img src={current.url} alt={`${current.label}${current.view ? ` — ${current.view} view` : ''}`} className="aspect-[4/3] w-full object-cover" />
      </button>
      <p className="mt-1.5 text-xs text-hud-text">
        {current.label}
        {current.view ? ` · ${current.view}` : ''}
      </p>
      {images.length > 1 && (
        <div className="mt-2 flex gap-1.5 overflow-x-auto" role="group" aria-label="More images">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setIndex(i)}
              aria-pressed={i === index}
              aria-label={img.label}
              className={`h-12 w-16 shrink-0 overflow-hidden rounded border-2 ${i === index ? 'border-hud-cyan' : 'border-transparent opacity-80 hover:opacity-100'}`}
            >
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {lightbox && <ScanImageLightbox images={images} index={index} onIndex={setIndex} onClose={() => setLightbox(false)} />}
    </div>
  );
}

function ScanImageLightbox({
  images,
  index,
  onIndex,
  onClose,
}: {
  images: ImagingScanImage[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const current = images[index];
  const go = (d: number) => onIndex((index + d + images.length) % images.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, images.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label={`${current.label} image library`} onClick={onClose}>
      <div className="relative flex max-h-full max-w-3xl flex-col items-center" onClick={(e) => e.stopPropagation()}>
        <img src={current.url} alt={`${current.label}${current.view ? ` — ${current.view} view` : ''}`} className="max-h-[75vh] max-w-full rounded-lg object-contain" />
        <div className="mt-3 flex items-center gap-4 text-white">
          {images.length > 1 && (
            <button type="button" onClick={() => go(-1)} aria-label="Previous image" className="rounded-full bg-white/10 px-3 py-1.5 text-lg hover:bg-white/20">
              ‹
            </button>
          )}
          <p className="text-sm">
            {current.label}
            {current.view ? ` · ${current.view}` : ''}
            {images.length > 1 && ` — ${index + 1} of ${images.length}`}
          </p>
          {images.length > 1 && (
            <button type="button" onClick={() => go(1)} aria-label="Next image" className="rounded-full bg-white/10 px-3 py-1.5 text-lg hover:bg-white/20">
              ›
            </button>
          )}
        </div>
        <button type="button" onClick={onClose} className="absolute -top-10 right-0 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">
          Close ✕
        </button>
      </div>
    </div>
  );
}
