import type { ResearchKind, ResearchResponse } from '../../types';
import { timeAgo } from './format';

interface ResearchListProps {
  kind: ResearchKind;
  data: ResearchResponse | null;
  loading: boolean;
  /** Show which community each study is about (useful when mixing several). */
  showCommunity?: boolean;
}

const NOTE: Record<ResearchKind, string> = {
  research: 'Recent studies from PubMed. Early findings are not proven treatments — please talk to your care team before acting on anything you read.',
  tests: 'Recent studies about tests and screening. A study appearing here does not mean a test is approved or available to you.',
};

/** Studies from PubMed. Titles are plain text and links go only to pubmed.ncbi.nlm.nih.gov. */
export function ResearchList({ kind, data, loading, showCommunity = true }: ResearchListProps) {
  if (loading) return <p className="text-sm text-hud-muted">Finding the latest studies…</p>;

  return (
    <div>
      {data && !data.personalized && (
        <p className="mb-2 text-xs text-hud-muted">Showing general topics. Join a community to see studies about your own health.</p>
      )}
      {!data || data.items.length === 0 ? (
        <p className="text-sm text-hud-muted">
          {data?.refreshing ? 'We are gathering the latest studies — check back in a moment.' : 'Nothing new to show right now. Check back soon.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.items.map((item) => (
            <li key={item.pmid}>
              <a href={item.url} target="_blank" rel="noreferrer noopener" className="text-sm font-medium leading-snug text-hud-text hover:text-hud-cyan hover:underline">
                {item.title}
              </a>
              <p className="mt-0.5 text-xs text-hud-muted">
                {[item.journal, item.published].filter(Boolean).join(' · ')}
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {showCommunity && <span className="rounded-full bg-hud-cyan/10 px-2 py-0.5 text-[11px] font-medium text-hud-cyan">{item.group.name}</span>}
                {item.types.map((t) => (
                  <span key={t} className="rounded-full bg-hud-panel2 px-2 py-0.5 text-[11px] text-hud-muted ring-1 ring-hud-border">
                    {t}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-hud-muted">
        {NOTE[kind]}
        {data?.updatedAt && ` Updated ${timeAgo(data.updatedAt)}.`}
      </p>
    </div>
  );
}
