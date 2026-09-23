import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DEFAULT_VISIBLE, loadAtlas, sideOf, type Atlas, type SystemId, type View } from '../atlas/anatomy';
import type { CameraRequest, PainMarker, PickResult, Vec3 } from '../atlas/AnatomyScene';
import { LayerPanel } from '../components/atlas/LayerPanel';
import { PainEntryCard } from '../components/atlas/PainEntryCard';
import { PainForm } from '../components/atlas/PainForm';
import { PainLog } from '../components/atlas/PainLog';
import { PartCard } from '../components/atlas/PartCard';
import { PartSearch } from '../components/atlas/PartSearch';
import { InsightsTeaser } from '../components/physiology/InsightsTeaser';
import { usePainEntries } from '../hooks/usePainEntries';
import { fetchRegionSummary } from '../data/remote/communityApi';
import type { PainInput, PainLocation, RegionSummary } from '../types';

// Three.js is ~1 MB; keep it out of the main bundle until the page is opened.
const AnatomyScene = lazy(() => import('../atlas/AnatomyScene'));

type Mode = 'browse' | 'picking' | 'form';

const VIEWS: { id: View; label: string }[] = [
  { id: 'front', label: 'Front' },
  { id: 'back', label: 'Back' },
  { id: 'side', label: 'Side' },
  { id: 'three-quarter', label: '3/4' },
];

const centerOf = (bounds: [number[], number[]]): Vec3 => [
  (bounds[0][0] + bounds[1][0]) / 2,
  (bounds[0][1] + bounds[1][1]) / 2,
  (bounds[0][2] + bounds[1][2]) / 2,
];

export function AnatomyPage() {
  const [atlas, setAtlas] = useState<Atlas | null>(null);
  const [atlasError, setAtlasError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [sceneError, setSceneError] = useState<string | null>(null);

  const [visible, setVisible] = useState<SystemId[]>(DEFAULT_VISIBLE);
  const [peel, setPeel] = useState(0);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [lastPick, setLastPick] = useState<PickResult | null>(null);
  const [cameraRequest, setCameraRequest] = useState<CameraRequest>({ nonce: 0 });

  const [mode, setMode] = useState<Mode>('browse');
  const [draft, setDraft] = useState<PickResult | null>(null);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const pain = usePainEntries();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<RegionSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadAtlas()
      .then((a) => !cancelled && setAtlas(a))
      .catch((e: unknown) => !cancelled && setAtlasError(e instanceof Error ? e.message : 'Could not load the anatomy.'));
    return () => {
      cancelled = true;
    };
  }, []);

  // Community context for whichever structure is selected (counts under 3 members are withheld server-side).
  useEffect(() => {
    if (!selectedPartId) {
      setSummary(null);
      return;
    }
    let cancelled = false;
    setSummary(null);
    fetchRegionSummary({ partId: selectedPartId })
      .then((res) => !cancelled && setSummary(res))
      .catch(() => !cancelled && setSummary(null));
    return () => {
      cancelled = true;
    };
  }, [selectedPartId]);

  const partsById = useMemo(() => new Map((atlas?.parts ?? []).map((p) => [p.id, p])), [atlas]);
  const selectedPart = selectedPartId ? partsById.get(selectedPartId) : undefined;
  const activeEntry = pain.entries.find((e) => e._id === activeEntryId) ?? null;
  const editingEntry = pain.entries.find((e) => e._id === editingId) ?? null;

  // Stable identities matter here: the 3D scene rebuilds its markers when these change.
  const markers = useMemo<PainMarker[]>(
    () => pain.entries.map((e) => ({ id: e._id, point: e.location.point, severity: e.severity, resolved: e.status === 'resolved' })),
    [pain.entries],
  );
  const draftPoint = mode === 'form' && !editingId && draft ? draft.point : null;

  const requestView = (view: View) => setCameraRequest((c) => ({ nonce: c.nonce + 1, view }));
  const requestFocus = (point: Vec3, distance: number) =>
    setCameraRequest((c) => ({ nonce: c.nonce + 1, focus: { point, distance } }));

  const backToBrowse = useCallback(() => {
    setMode('browse');
    setDraft(null);
    setEditingId(null);
  }, []);

  // Escape backs out of picking or an unsaved form.
  useEffect(() => {
    if (mode === 'browse') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') backToBrowse();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, backToBrowse]);

  const handlePick = useCallback(
    (result: PickResult) => {
      if (mode === 'picking' || (mode === 'form' && !editingId)) {
        setDraft(result);
        setSelectedPartId(result.partId);
        setMode('form');
      } else if (mode === 'browse') {
        setSelectedPartId(result.partId);
        setLastPick(result);
        setActiveEntryId(null);
      }
    },
    [mode, editingId],
  );

  const handleMarkerClick = useCallback(
    (id: string) => {
      if (mode === 'form') return;
      setMode('browse');
      setActiveEntryId(id);
    },
    [mode],
  );

  const startPicking = () => {
    setActiveEntryId(null);
    setEditingId(null);
    setDraft(null);
    setMode('picking');
  };

  const reportOnSelectedPart = () => {
    if (!selectedPart) return;
    const point = lastPick?.partId === selectedPart.id ? lastPick.point : centerOf(selectedPart.bounds);
    setDraft({ partId: selectedPart.id, point });
    setActiveEntryId(null);
    setMode('form');
  };

  const selectFromSearch = (partId: string) => {
    const part = partsById.get(partId);
    if (!part) return;
    setSelectedPartId(partId);
    setLastPick(null);
    setActiveEntryId(null);
    const size = Math.max(part.bounds[1][0] - part.bounds[0][0], part.bounds[1][1] - part.bounds[0][1], part.bounds[1][2] - part.bounds[0][2]);
    requestFocus(centerOf(part.bounds), size * 2.6 + 0.25);
  };

  const selectEntry = (id: string) => {
    const entry = pain.entries.find((e) => e._id === id);
    if (!entry) return;
    setActiveEntryId(id);
    setSelectedPartId(entry.location.partId);
    requestFocus(entry.location.point, 0.9);
  };

  const draftLocation: PainLocation | null = useMemo(() => {
    if (editingEntry) return editingEntry.location;
    if (!draft) return null;
    const part = partsById.get(draft.partId);
    if (!part) return null;
    return {
      partId: part.id,
      partName: part.name,
      system: part.system,
      side: sideOf(part.name, draft.point[0]),
      point: draft.point,
    };
  }, [draft, editingEntry, partsById]);

  const saveEntry = async (input: PainInput) => {
    if (editingEntry) {
      // The spot is fixed while editing, so only the description changes.
      const { location: _location, ...changes } = input;
      await pain.update(editingEntry._id, changes);
      setEditingId(null);
      setActiveEntryId(editingEntry._id);
    } else {
      const created = await pain.create(input);
      setActiveEntryId(created._id);
    }
    setDraft(null);
    setMode('browse');
  };

  const renderSidebar = () => {
    if (mode === 'form' && draftLocation) {
      return (
        <>
          <h2 className="mb-3 text-base font-semibold text-hud-text">{editingEntry ? 'Edit pain entry' : 'Describe your pain'}</h2>
          <PainForm
            key={editingId ?? 'new'}
            location={draftLocation}
            initial={editingEntry ?? undefined}
            onChangeSpot={editingEntry ? undefined : () => setMode('picking')}
            onSubmit={saveEntry}
            onCancel={backToBrowse}
          />
        </>
      );
    }
    if (mode === 'picking') {
      return (
        <div className="rounded-lg border border-hud-cyan/40 bg-hud-cyan/5 p-4 text-sm text-hud-text">
          <p className="font-semibold">Tap the spot where it hurts</p>
          <p className="mt-1 text-xs leading-relaxed text-hud-muted">
            Rotate the body to get the right angle. If the pain feels deeper than the muscles, hide layers on the left
            first, then tap.
          </p>
          <button type="button" onClick={backToBrowse} className="mt-3 rounded-md border border-hud-borderLight bg-hud-panel px-3 py-1.5 text-xs font-medium hover:bg-hud-panel2">
            Cancel
          </button>
        </div>
      );
    }
    if (activeEntry) {
      return (
        <PainEntryCard
          entry={activeEntry}
          onBack={() => setActiveEntryId(null)}
          onEdit={() => {
            setEditingId(activeEntry._id);
            setMode('form');
          }}
          onToggleResolved={async () => {
            await pain.update(activeEntry._id, { status: activeEntry.status === 'resolved' ? 'active' : 'resolved' });
          }}
          onToggleShare={async () => {
            await pain.update(activeEntry._id, { visibility: activeEntry.visibility === 'community' ? 'private' : 'community' });
          }}
          onFindMatches={() => navigate(`/community/matches?entry=${activeEntry._id}`)}
          onDelete={async () => {
            await pain.remove(activeEntry._id);
            setActiveEntryId(null);
          }}
        />
      );
    }
    return (
      <div className="flex flex-col gap-4">
        {selectedPart && (
          <PartCard
            part={selectedPart}
            pointX={lastPick?.partId === selectedPart.id ? lastPick.point[0] : undefined}
            summary={summary}
            onDiscuss={() => navigate(`/community?${new URLSearchParams({ partId: selectedPart.id, partName: selectedPart.name })}`)}
            onReportPain={reportOnSelectedPart}
            onZoom={() => {
              const size = Math.max(selectedPart.bounds[1][0] - selectedPart.bounds[0][0], selectedPart.bounds[1][1] - selectedPart.bounds[0][1]);
              requestFocus(centerOf(selectedPart.bounds), size * 2.6 + 0.25);
            }}
            onShowOnlySystem={() => setVisible([selectedPart.system])}
            onClear={() => setSelectedPartId(null)}
          />
        )}
        <PainLog entries={pain.entries} loading={pain.loading} loadError={pain.loadError} activeId={activeEntryId} onSelect={selectEntry} />
        {!pain.loading && pain.entries.length > 0 && <InsightsTeaser kind="pain" />}
      </div>
    );
  };

  const loading = !atlas || progress < 100;
  const fatal = atlasError ?? sceneError;

  return (
    <div className="flex h-full w-full">
      <aside className="hidden w-64 shrink-0 flex-col gap-5 overflow-y-auto border-r border-hud-border bg-hud-panel p-4 lg:flex">
        {atlas && <PartSearch atlas={atlas} onSelect={selectFromSearch} />}
        <LayerPanel visible={visible} onChange={setVisible} peel={peel} onPeelChange={setPeel} />
        <Link
          to="/urology"
          className="mt-auto rounded-lg border border-hud-borderLight bg-hud-panel2 px-3 py-2.5 text-xs leading-relaxed text-hud-text hover:border-hud-cyan"
        >
          This model is an adult-male-only reference — it has no female reproductive anatomy. See labelled diagrams for both →
        </Link>
        <p className="text-[10px] leading-relaxed text-hud-muted">
          Adult male reference anatomy. Educational only — not a diagnostic tool. Model: BodyParts3D © DBCLS, CC BY 4.0.{' '}
          <a href="/ATTRIBUTION.md" target="_blank" rel="noreferrer" className="underline">
            Credits
          </a>
        </p>
      </aside>

      <main className="relative min-w-0 flex-1 bg-[#f2f3f3]">
        {atlas && !fatal && (
          <Suspense fallback={null}>
            <AnatomyScene
              atlas={atlas}
              visible={visible}
              selectedPartId={selectedPartId}
              markers={markers}
              activeMarkerId={activeEntryId}
              draftPoint={draftPoint}
              picking={mode === 'picking' || (mode === 'form' && !editingId)}
              cameraRequest={cameraRequest}
              peel={peel}
              onPick={handlePick}
              onMarkerClick={handleMarkerClick}
              onProgress={setProgress}
              onError={setSceneError}
            />
          </Suspense>
        )}

        <div className="absolute left-3 top-3 flex gap-1 rounded-lg bg-hud-panel/90 p-1 shadow">
          {VIEWS.map((v) => (
            <button key={v.id} type="button" onClick={() => requestView(v.id)} className="rounded-md px-2.5 py-1 text-xs font-medium text-hud-text hover:bg-hud-panel2">
              {v.label}
            </button>
          ))}
        </div>

        {mode === 'picking' && (
          <div role="status" className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-hud-cyan px-4 py-2 text-sm font-medium text-white shadow-lg">
            Tap the spot where it hurts · Esc to cancel
          </div>
        )}

        {loading && !fatal && (
          <div role="status" className="absolute inset-x-0 bottom-6 mx-auto w-64 rounded-lg bg-hud-panel/95 p-3 text-center shadow">
            <p className="text-xs font-medium text-hud-text">Loading anatomy… {progress}%</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-hud-border">
              <div className="h-full bg-hud-cyan transition-[width]" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {fatal && (
          <div role="alert" className="absolute inset-0 flex items-center justify-center p-6">
            <p className="max-w-sm rounded-lg bg-hud-panel p-4 text-center text-sm text-hud-red shadow">{fatal}</p>
          </div>
        )}
      </main>

      <aside className="flex w-[22rem] shrink-0 flex-col overflow-hidden border-l border-hud-border bg-hud-panel">
        <div className="flex items-center justify-between gap-2 border-b border-hud-border px-4 py-3">
          <h1 className="text-sm font-semibold text-hud-text">My pain</h1>
          <button
            type="button"
            onClick={startPicking}
            disabled={mode !== 'browse' || loading}
            className="rounded-md bg-[#007bff] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0056b3] disabled:opacity-50"
          >
            ＋ Report pain
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{renderSidebar()}</div>
        <p className="border-t border-hud-border px-4 py-2 text-[10px] leading-relaxed text-hud-muted">
          This log helps you describe your pain to a clinician. It doesn’t diagnose anything or replace medical advice.
        </p>
      </aside>
    </div>
  );
}
