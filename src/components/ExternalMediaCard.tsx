import { getExternalMediaPreview } from '../lib/externalMedia';

type ExternalMediaCardProps = {
  content: string;
  className?: string;
  previewLabel?: string;
};

function ExternalMediaCard({ content, className = '', previewLabel = 'External media link' }: ExternalMediaCardProps) {
  const preview = getExternalMediaPreview(content);

  if (!preview) return null;

  return (
    <div className={`overflow-hidden rounded-[24px] border border-slate-200 bg-white ${className}`.trim()}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{previewLabel}</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{preview.platformLabel}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
          {preview.hostname}
        </span>
      </div>

      {preview.embedUrl ? (
        <div className="aspect-video w-full bg-slate-950">
          <iframe
            src={preview.embedUrl}
            title={`${preview.platformLabel} preview`}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : (
        <a
          href={preview.normalizedUrl}
          target="_blank"
          rel="noreferrer"
          className="block bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 px-4 py-5 text-white transition hover:opacity-95"
        >
          <p className="text-sm font-semibold">Open {preview.platformLabel}</p>
          <p className="mt-2 break-all text-sm text-white/75">{preview.displayUrl}</p>
        </a>
      )}
    </div>
  );
}

export default ExternalMediaCard;
