import { Link } from 'react-router-dom';
import { formatOrganizationTypeLabel } from '../lib/identity';
import { buildGoogleMapsSearchUrl } from '../lib/googlePlaces';
import {
  formatEventDateBadge,
  formatEventDateRange,
  getEventStatusClasses,
  getEventStatusLabel,
  getEventTypeClasses,
  getEventTypeLabel,
} from '../lib/events';

type LinkedOrganization = {
  id: number;
  name: string;
  organization_type: string | null;
};

type EventCardProps = {
  event: {
    id: number;
    title: string;
    event_type: string;
    status: string;
    visibility: string;
    sport: string | null;
    starts_at: string;
    ends_at: string | null;
    location: string | null;
    description: string | null;
    competition_name: string | null;
    opponent_name: string | null;
    score_for: number | null;
    score_against: number | null;
    created_by: string;
    related_organization?: LinkedOrganization | null;
    opponent_organization?: LinkedOrganization | null;
  };
  currentUserId?: string | null;
  onDelete?: (eventId: number) => void;
  onEdit?: (eventId: number) => void;
  perspectiveOrganizationId?: number | null;
};

function EventCard({ event, currentUserId, onDelete, onEdit, perspectiveOrganizationId = null }: EventCardProps) {
  const isOwner = !!currentUserId && currentUserId === event.created_by;
  const isMatch = event.event_type === 'match';
  const hasScore =
    typeof event.score_for === 'number' && !Number.isNaN(event.score_for) &&
    typeof event.score_against === 'number' && !Number.isNaN(event.score_against);

  const primaryOrganization = perspectiveOrganizationId && event.opponent_organization?.id === perspectiveOrganizationId
    ? event.opponent_organization
    : event.related_organization || null;
  const secondaryOrganization = perspectiveOrganizationId && event.opponent_organization?.id === perspectiveOrganizationId
    ? event.related_organization || null
    : event.opponent_organization || null;

  const yourSideLabel = primaryOrganization?.name || (perspectiveOrganizationId && event.related_organization?.id !== perspectiveOrganizationId ? 'This organization' : 'Your side');
  const opponentLabel = secondaryOrganization?.name || (primaryOrganization?.id === event.opponent_organization?.id ? (event.related_organization?.name || 'Opponent TBD') : event.opponent_name || 'Opponent TBD');
  const mapsUrl = event.location ? buildGoogleMapsSearchUrl(event.location) : null;

  return (
    <article className="app-card rounded-[28px] p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-center text-[var(--asobu-foreground)]">
            <span className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Date</span>
            <span className="text-sm font-semibold">{formatEventDateBadge(event.starts_at)}</span>
          </div>

          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getEventTypeClasses(event.event_type)}`}>
                {getEventTypeLabel(event.event_type)}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getEventStatusClasses(event.status)}`}>
                {getEventStatusLabel(event.status)}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {event.visibility === 'private' ? 'Private' : 'Public'}
              </span>
              {event.sport ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {event.sport}
                </span>
              ) : null}
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 sm:text-xl">{event.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{formatEventDateRange(event.starts_at, event.ends_at)}</p>
            </div>

            {isMatch ? (
              <div className="app-card-subtle rounded-2xl px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Match details</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-700">
                  {primaryOrganization ? (
                    <Link
                      to={`/organizations/${primaryOrganization.id}`}
                      className="font-medium text-slate-900 transition hover:text-[var(--asobu-primary-dark)]"
                    >
                      {yourSideLabel}
                    </Link>
                  ) : (
                    <span className="font-medium text-slate-900">{yourSideLabel}</span>
                  )}
                  <span className="text-slate-400">vs</span>
                  {secondaryOrganization ? (
                    <Link
                      to={`/organizations/${secondaryOrganization.id}`}
                      className="font-medium text-slate-900 transition hover:text-[var(--asobu-primary-dark)]"
                    >
                      {opponentLabel}
                    </Link>
                  ) : (
                    <span className="font-medium text-slate-900">{opponentLabel}</span>
                  )}
                  {hasScore ? (
                    <span className="rounded-full bg-[linear-gradient(135deg,color-mix(in_oklab,var(--asobu-primary)_18%,white_82%),color-mix(in_oklab,var(--asobu-warm)_16%,white_84%))] px-3 py-1 text-sm font-semibold text-[var(--asobu-foreground)]">
                      {event.score_for} - {event.score_against}
                    </span>
                  ) : null}
                </div>
                {event.competition_name ? (
                  <p className="mt-2 text-sm text-slate-500">Competition: {event.competition_name}</p>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
              {event.location ? <span>Location: {event.location}</span> : null}
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-[var(--asobu-primary-dark)] transition hover:text-[var(--asobu-primary)]"
                >
                  Open in Maps
                </a>
              ) : null}
              {event.related_organization ? (
                <Link
                  to={`/organizations/${event.related_organization.id}`}
                  className="text-slate-700 transition hover:text-slate-900"
                >
                  Related organization: {event.related_organization.name} · {formatOrganizationTypeLabel(event.related_organization.organization_type)}
                </Link>
              ) : null}
            </div>

            {event.description ? <p className="text-sm leading-6 text-slate-600">{event.description}</p> : null}
          </div>
        </div>

        {isOwner ? (
          <div className="flex shrink-0 gap-2 self-start">
            {onEdit ? (
              <button
                type="button"
                onClick={() => onEdit(event.id)}
                className="app-button-secondary rounded-full px-4 py-2 text-sm font-medium transition"
              >
                Edit
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(event.id)}
                className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-100"
              >
                Delete
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default EventCard;
