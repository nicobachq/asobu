import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import EventCard from '../components/EventCard';
import {
  EVENT_STATUS_OPTIONS,
  EVENT_TYPE_OPTIONS,
  EVENT_VISIBILITY_OPTIONS,
  createDefaultEndValue,
  createDefaultStartValue,
} from '../lib/events';
import { formatOrganizationTypeLabel } from '../lib/identity';
import { SPORT_REGISTRATION_OPTIONS } from '../lib/sports';
import { supabase } from '../lib/supabase';

type EventRow = {
  id: number;
  title: string;
  event_type: string;
  status: string;
  sport: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  visibility: string;
  description: string | null;
  related_organization_id: number | null;
  competition_name: string | null;
  opponent_name: string | null;
  score_for: number | null;
  score_against: number | null;
  created_by: string;
  related_organization?: {
    id: number;
    name: string;
    organization_type: string | null;
  } | null;
};

type OrganizationOption = {
  id: number;
  name: string;
  organization_type: string | null;
};

type RawEventRow = Omit<EventRow, 'related_organization'> & {
  related_organization?: EventRow['related_organization'] | EventRow['related_organization'][] | null;
};

function normalizeEventRow(event: RawEventRow): EventRow {
  return {
    ...event,
    related_organization: Array.isArray(event.related_organization)
      ? event.related_organization[0] || null
      : event.related_organization || null,
  };
}

type EventFormState = {
  title: string;
  eventType: string;
  status: string;
  sport: string;
  startsAt: string;
  endsAt: string;
  location: string;
  visibility: string;
  relatedOrganizationId: string;
  description: string;
  opponentName: string;
  competitionName: string;
  scoreFor: string;
  scoreAgainst: string;
};

function createInitialFormState(): EventFormState {
  return {
    title: '',
    eventType: 'training',
    status: 'scheduled',
    sport: '',
    startsAt: createDefaultStartValue(),
    endsAt: createDefaultEndValue(),
    location: '',
    visibility: 'public',
    relatedOrganizationId: '',
    description: '',
    opponentName: '',
    competitionName: '',
    scoreFor: '',
    scoreAgainst: '',
  };
}

function CalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<EventFormState>(() => createInitialFormState());
  const [scopeFilter, setScopeFilter] = useState(searchParams.get('scope') || 'all');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || 'all');
  const [organizationFilter, setOrganizationFilter] = useState(searchParams.get('organization') || 'all');

  useEffect(() => {
    void loadCalendar();
  }, []);

  useEffect(() => {
    const next = new URLSearchParams();

    if (scopeFilter !== 'all') next.set('scope', scopeFilter);
    if (typeFilter !== 'all') next.set('type', typeFilter);
    if (organizationFilter !== 'all') next.set('organization', organizationFilter);

    setSearchParams(next, { replace: true });
  }, [scopeFilter, typeFilter, organizationFilter, setSearchParams]);

  async function loadCalendar() {
    setLoading(true);
    setError(null);

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      setError(sessionError.message);
      setLoading(false);
      return;
    }

    const userId = sessionData.session?.user?.id || null;
    setCurrentUserId(userId);

    const publicEventsPromise = supabase
      .from('events')
      .select(
        'id, title, event_type, status, sport, starts_at, ends_at, location, visibility, description, related_organization_id, competition_name, opponent_name, score_for, score_against, created_by, related_organization:organizations!events_related_organization_id_fkey(id, name, organization_type)'
      )
      .eq('visibility', 'public')
      .order('starts_at', { ascending: true })
      .limit(80);

    const privateEventsPromise = userId
      ? supabase
          .from('events')
          .select(
            'id, title, event_type, status, sport, starts_at, ends_at, location, visibility, description, related_organization_id, competition_name, opponent_name, score_for, score_against, created_by, related_organization:organizations!events_related_organization_id_fkey(id, name, organization_type)'
          )
          .eq('created_by', userId)
          .eq('visibility', 'private')
          .order('starts_at', { ascending: true })
          .limit(40)
      : Promise.resolve({ data: [], error: null });

    const organizationOptionsPromise = userId
      ? supabase
          .from('organization_members')
          .select('organization_id, related_organization:organizations!events_related_organization_id_fkey(id, name, organization_type)')
          .eq('user_id', userId)
      : Promise.resolve({ data: [], error: null });

    const [publicEventsResponse, privateEventsResponse, organizationOptionsResponse] = await Promise.all([
      publicEventsPromise,
      privateEventsPromise,
      organizationOptionsPromise,
    ]);

    if (publicEventsResponse.error) {
      setError(publicEventsResponse.error.message);
      setLoading(false);
      return;
    }

    if (privateEventsResponse.error) {
      setError(privateEventsResponse.error.message);
      setLoading(false);
      return;
    }

    if (organizationOptionsResponse.error) {
      setError(organizationOptionsResponse.error.message);
      setLoading(false);
      return;
    }

    const mergedEvents = new Map<number, EventRow>();
    for (const event of [...((publicEventsResponse.data as RawEventRow[]) || []), ...((privateEventsResponse.data as RawEventRow[]) || [])]) {
      const normalizedEvent = normalizeEventRow(event);
      mergedEvents.set(normalizedEvent.id, normalizedEvent);
    }

    setEvents(
      Array.from(mergedEvents.values()).sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      )
    );

    const nextOrganizations = (((organizationOptionsResponse.data as never[]) || []) as Array<{
      organization_id: number;
      organizations: OrganizationOption | OrganizationOption[] | null;
    }>)
      .map((row) => (Array.isArray(row.organizations) ? row.organizations[0] : row.organizations))
      .filter(Boolean) as OrganizationOption[];

    const uniqueOrganizations = Array.from(
      new Map(nextOrganizations.map((organization) => [organization.id, organization])).values()
    ).sort((a, b) => a.name.localeCompare(b.name));

    setOrganizations(uniqueOrganizations);
    setLoading(false);
  }

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (scopeFilter === 'mine' && event.created_by !== currentUserId) {
        return false;
      }

      if (scopeFilter === 'public' && event.visibility !== 'public') {
        return false;
      }

      if (scopeFilter === 'private' && !(event.visibility === 'private' && event.created_by === currentUserId)) {
        return false;
      }

      if (typeFilter !== 'all' && event.event_type !== typeFilter) {
        return false;
      }

      if (organizationFilter !== 'all' && String(event.related_organization_id || '') !== organizationFilter) {
        return false;
      }

      return true;
    });
  }, [currentUserId, events, organizationFilter, scopeFilter, typeFilter]);

  const now = Date.now();
  const upcomingEvents = filteredEvents.filter(
    (event) => event.status !== 'completed' && event.status !== 'canceled' && new Date(event.starts_at).getTime() >= now - 1000 * 60 * 60 * 6
  );
  const pastEvents = filteredEvents.filter((event) => !upcomingEvents.some((candidate) => candidate.id === event.id));

  async function handleCreateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;

    if (!userId) {
      setError('Please log in again before creating an event.');
      return;
    }

    if (!form.title.trim()) {
      setError('Please add a title for the event.');
      return;
    }

    if (!form.startsAt) {
      setError('Please set a start date and time.');
      return;
    }

    if (form.eventType === 'match' && form.status === 'completed') {
      const hasBothScores = form.scoreFor !== '' && form.scoreAgainst !== '';
      if (!hasBothScores) {
        setError('Completed matches should include both scores.');
        return;
      }
    }

    setSaving(true);

    const payload = {
      title: form.title.trim(),
      event_type: form.eventType,
      status: form.status,
      sport: form.sport || null,
      starts_at: new Date(form.startsAt).toISOString(),
      ends_at: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      location: form.location.trim() || null,
      visibility: form.visibility,
      description: form.description.trim() || null,
      related_organization_id: form.relatedOrganizationId ? Number(form.relatedOrganizationId) : null,
      competition_name: form.competitionName.trim() || null,
      opponent_name: form.eventType === 'match' ? form.opponentName.trim() || null : null,
      score_for: form.scoreFor === '' ? null : Number(form.scoreFor),
      score_against: form.scoreAgainst === '' ? null : Number(form.scoreAgainst),
      created_by: userId,
    };

    const { error: insertError } = await supabase.from('events').insert(payload);

    if (insertError) {
      setSaving(false);
      setError(insertError.message);
      return;
    }

    setForm(createInitialFormState());
    setSaving(false);
    setMessage('Event created. It now appears in the calendar and is ready to connect into organization and competition flows as the next step.');
    await loadCalendar();
  }

  async function handleDeleteEvent(eventId: number) {
    if (!window.confirm('Delete this event?')) return;

    setDeletingId(eventId);
    setError(null);
    setMessage(null);

    const { error: deleteError } = await supabase.from('events').delete().eq('id', eventId);
    if (deleteError) {
      setDeletingId(null);
      setError(deleteError.message);
      return;
    }

    setDeletingId(null);
    setMessage('Event deleted.');
    await loadCalendar();
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
      <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Calendar</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900 sm:text-3xl">Calendar</h1>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <section className="rounded-[28px] bg-white p-4 shadow-sm sm:rounded-[32px] sm:p-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-slate-900">New event</h2>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleCreateEvent}>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                placeholder="Example: FC Lugano U21 training"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Event type</label>
                <select
                  value={form.eventType}
                  onChange={(e) => setForm((current) => ({ ...current, eventType: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                >
                  {EVENT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                >
                  {EVENT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Sport</label>
                <select
                  value={form.sport}
                  onChange={(e) => setForm((current) => ({ ...current, sport: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                >
                  <option value="">No sport selected</option>
                  {SPORT_REGISTRATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Visibility</label>
                <select
                  value={form.visibility}
                  onChange={(e) => setForm((current) => ({ ...current, visibility: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                >
                  {EVENT_VISIBILITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Start</label>
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm((current) => ({ ...current, startsAt: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">End</label>
                <input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm((current) => ({ ...current, endsAt: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Location</label>
                <input
                  value={form.location}
                  onChange={(e) => setForm((current) => ({ ...current, location: e.target.value }))}
                  placeholder="Optional"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Related organization</label>
                <select
                  value={form.relatedOrganizationId}
                  onChange={(e) => setForm((current) => ({ ...current, relatedOrganizationId: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                >
                  <option value="">No organization link</option>
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name} · {formatOrganizationTypeLabel(organization.organization_type)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {form.eventType === 'match' ? (
              <div className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Match details</h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Opponent name</label>
                    <input
                      value={form.opponentName}
                      onChange={(e) => setForm((current) => ({ ...current, opponentName: e.target.value }))}
                      placeholder="Optional"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Competition / tournament</label>
                    <input
                      value={form.competitionName}
                      onChange={(e) => setForm((current) => ({ ...current, competitionName: e.target.value }))}
                      placeholder="Optional"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Score for</label>
                    <input
                      type="number"
                      min="0"
                      value={form.scoreFor}
                      onChange={(e) => setForm((current) => ({ ...current, scoreFor: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Score against</label>
                    <input
                      type="number"
                      min="0"
                      value={form.scoreAgainst}
                      onChange={(e) => setForm((current) => ({ ...current, scoreAgainst: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Description</label>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
                placeholder="Optional context, attendance note, format, or logistical details."
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </div>

            {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
            {message ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Create event'}
            </button>
          </form>
        </section>

        <section className="space-y-5">
          <div className="rounded-[28px] bg-white p-4 shadow-sm sm:rounded-[32px] sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Calendar</h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block text-sm font-medium text-slate-700">
                  <span className="mb-2 block">Scope</span>
                  <select
                    value={scopeFilter}
                    onChange={(e) => setScopeFilter(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  >
                    <option value="all">All visible events</option>
                    <option value="mine">Created by me</option>
                    <option value="public">Public only</option>
                    <option value="private">Private only</option>
                  </select>
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  <span className="mb-2 block">Type</span>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  >
                    <option value="all">All types</option>
                    {EVENT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  <span className="mb-2 block">Organization</span>
                  <select
                    value={organizationFilter}
                    onChange={(e) => setOrganizationFilter(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  >
                    <option value="all">All organizations</option>
                    {organizations.map((organization) => (
                      <option key={organization.id} value={organization.id}>
                        {organization.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] bg-white p-4 shadow-sm sm:rounded-[32px] sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Upcoming</h3>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">{upcomingEvents.length}</span>
            </div>

            <div className="mt-5 space-y-4">
              {loading ? (
                <p className="text-sm text-slate-500">Loading calendar…</p>
              ) : upcomingEvents.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
                  No upcoming events match the current filters yet.
                </p>
              ) : (
                upcomingEvents.map((eventItem) => (
                  <EventCard
                    key={eventItem.id}
                    event={eventItem}
                    currentUserId={currentUserId}
                    onDelete={deletingId ? undefined : handleDeleteEvent}
                  />
                ))
              )}
            </div>
          </div>

          <div className="rounded-[28px] bg-white p-4 shadow-sm sm:rounded-[32px] sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Past and results</h3>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">{pastEvents.length}</span>
            </div>

            <div className="mt-5 space-y-4">
              {loading ? (
                <p className="text-sm text-slate-500">Loading event history…</p>
              ) : pastEvents.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
                  No completed or past events match the current filters yet.
                </p>
              ) : (
                pastEvents.map((eventItem) => (
                  <EventCard
                    key={eventItem.id}
                    event={eventItem}
                    currentUserId={currentUserId}
                    onDelete={deletingId ? undefined : handleDeleteEvent}
                  />
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default CalendarPage;
