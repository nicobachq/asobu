import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import EventCard from '../components/EventCard';
import {
  CALENDAR_VIEW_OPTIONS,
  EVENT_STATUS_OPTIONS,
  EVENT_TYPE_OPTIONS,
  EVENT_VISIBILITY_OPTIONS,
  combineLocalDateAndTime,
  createDefaultEndValue,
  createDefaultStartValue,
  createTimeOptions,
  extractDateParts,
  getCalendarDateKey,
  getMonthGridDates,
  getMonthLabel,
  isSameCalendarDay,
  type CalendarView,
} from '../lib/events';
import { formatOrganizationTypeLabel } from '../lib/identity';
import { SPORT_REGISTRATION_OPTIONS } from '../lib/sports';
import { supabase } from '../lib/supabase';

type LinkedOrganization = {
  id: number;
  name: string;
  organization_type: string | null;
};

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
  opponent_organization_id: number | null;
  competition_name: string | null;
  opponent_name: string | null;
  score_for: number | null;
  score_against: number | null;
  created_by: string;
  related_organization?: LinkedOrganization | null;
  opponent_organization?: LinkedOrganization | null;
};

type OrganizationOption = LinkedOrganization;

type RawEventRow = Omit<EventRow, 'related_organization' | 'opponent_organization'> & {
  related_organization?: EventRow['related_organization'] | EventRow['related_organization'][] | null;
  opponent_organization?: EventRow['opponent_organization'] | EventRow['opponent_organization'][] | null;
};

function normalizeLinkedOrganization(value: RawEventRow['related_organization'] | RawEventRow['opponent_organization']) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function normalizeEventRow(event: RawEventRow): EventRow {
  return {
    ...event,
    related_organization: normalizeLinkedOrganization(event.related_organization),
    opponent_organization: normalizeLinkedOrganization(event.opponent_organization),
  };
}

type EventFormState = {
  title: string;
  eventType: string;
  status: string;
  sport: string;
  startDate: string;
  startTime: string;
  hasEnd: boolean;
  endDate: string;
  endTime: string;
  location: string;
  visibility: string;
  relatedOrganizationId: string;
  description: string;
  opponentOrganizationId: string;
  opponentQuery: string;
  opponentName: string;
  competitionName: string;
  scoreFor: string;
  scoreAgainst: string;
};

function createInitialFormState(): EventFormState {
  const startParts = extractDateParts(createDefaultStartValue());
  const endParts = extractDateParts(createDefaultEndValue());

  return {
    title: '',
    eventType: 'training',
    status: 'scheduled',
    sport: '',
    startDate: startParts.date,
    startTime: startParts.time,
    hasEnd: false,
    endDate: endParts.date,
    endTime: endParts.time,
    location: '',
    visibility: 'public',
    relatedOrganizationId: '',
    description: '',
    opponentOrganizationId: '',
    opponentQuery: '',
    opponentName: '',
    competitionName: '',
    scoreFor: '',
    scoreAgainst: '',
  };
}

const TIME_OPTIONS = createTimeOptions(15);

function CalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [allOrganizations, setAllOrganizations] = useState<OrganizationOption[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<EventFormState>(() => createInitialFormState());
  const [view, setView] = useState<CalendarView>((searchParams.get('view') as CalendarView) || 'calendar');
  const [scopeFilter, setScopeFilter] = useState(searchParams.get('scope') || 'all');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || 'all');
  const [organizationFilter, setOrganizationFilter] = useState(searchParams.get('organization') || 'all');
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState(() => getCalendarDateKey(new Date()));

  useEffect(() => {
    void loadCalendar();
  }, []);

  useEffect(() => {
    const next = new URLSearchParams();

    if (view !== 'calendar') next.set('view', view);
    if (scopeFilter !== 'all') next.set('scope', scopeFilter);
    if (typeFilter !== 'all') next.set('type', typeFilter);
    if (organizationFilter !== 'all') next.set('organization', organizationFilter);

    setSearchParams(next, { replace: true });
  }, [view, scopeFilter, typeFilter, organizationFilter, setSearchParams]);

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

    const eventSelect =
      'id, title, event_type, status, sport, starts_at, ends_at, location, visibility, description, related_organization_id, opponent_organization_id, competition_name, opponent_name, score_for, score_against, created_by, related_organization:organizations!events_related_organization_id_fkey(id, name, organization_type), opponent_organization:organizations!events_opponent_organization_id_fkey(id, name, organization_type)';

    const publicEventsPromise = supabase
      .from('events')
      .select(eventSelect)
      .eq('visibility', 'public')
      .order('starts_at', { ascending: true })
      .limit(200);

    const privateEventsPromise = userId
      ? supabase
          .from('events')
          .select(eventSelect)
          .eq('created_by', userId)
          .eq('visibility', 'private')
          .order('starts_at', { ascending: true })
          .limit(80)
      : Promise.resolve({ data: [], error: null });

    const organizationOptionsPromise = userId
      ? supabase
          .from('organization_members')
          .select('organization_id, organizations(id, name, organization_type)')
          .eq('user_id', userId)
      : Promise.resolve({ data: [], error: null });

    const allOrganizationsPromise = supabase
      .from('organizations')
      .select('id, name, organization_type')
      .order('name', { ascending: true })
      .limit(500);

    const [publicEventsResponse, privateEventsResponse, organizationOptionsResponse, allOrganizationsResponse] = await Promise.all([
      publicEventsPromise,
      privateEventsPromise,
      organizationOptionsPromise,
      allOrganizationsPromise,
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

    if (allOrganizationsResponse.error) {
      setError(allOrganizationsResponse.error.message);
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

    const availableOrganizations = (((allOrganizationsResponse.data as never[]) || []) as OrganizationOption[]).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    setOrganizations(uniqueOrganizations);
    setAllOrganizations(availableOrganizations);
    setLoading(false);
  }

  const selectedRelatedOrganization = useMemo(
    () => organizations.find((organization) => String(organization.id) === form.relatedOrganizationId) || null,
    [form.relatedOrganizationId, organizations]
  );

  const filteredOpponentOrganizations = useMemo(() => {
    const query = form.opponentQuery.trim().toLowerCase();

    return allOrganizations
      .filter((organization) => String(organization.id) !== form.relatedOrganizationId)
      .filter((organization) => {
        if (!query) return true;
        return organization.name.toLowerCase().includes(query);
      })
      .slice(0, 6);
  }, [allOrganizations, form.opponentQuery, form.relatedOrganizationId]);

  const selectedOpponentOrganization = useMemo(
    () => allOrganizations.find((organization) => String(organization.id) === form.opponentOrganizationId) || null,
    [allOrganizations, form.opponentOrganizationId]
  );

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

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventRow[]>();

    for (const event of filteredEvents) {
      const key = getCalendarDateKey(event.starts_at);
      const existing = map.get(key) || [];
      existing.push(event);
      existing.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
      map.set(key, existing);
    }

    return map;
  }, [filteredEvents]);

  const calendarDates = useMemo(() => getMonthGridDates(visibleMonth), [visibleMonth]);
  const selectedDayEvents = eventsByDate.get(selectedDateKey) || [];

  const now = Date.now();
  const upcomingEvents = filteredEvents.filter(
    (event) => event.status !== 'completed' && event.status !== 'canceled' && new Date(event.starts_at).getTime() >= now - 1000 * 60 * 60 * 6
  );
  const pastEvents = filteredEvents.filter((event) => !upcomingEvents.some((candidate) => candidate.id === event.id));

  const selectedDateLabel = useMemo(() => {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${selectedDateKey}T12:00:00`));
  }, [selectedDateKey]);

  function setFormValue<Key extends keyof EventFormState>(key: Key, value: EventFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function selectOpponentOrganization(organization: OrganizationOption) {
    setForm((current) => ({
      ...current,
      opponentOrganizationId: String(organization.id),
      opponentQuery: organization.name,
      opponentName: '',
    }));
  }

  function clearOpponentOrganization() {
    setForm((current) => ({
      ...current,
      opponentOrganizationId: '',
      opponentQuery: '',
    }));
  }

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

    const startsAtIso = combineLocalDateAndTime(form.startDate, form.startTime);

    if (!startsAtIso) {
      setError('Please set a valid start date and time.');
      return;
    }

    let endsAtIso: string | null = null;

    if (form.hasEnd) {
      endsAtIso = combineLocalDateAndTime(form.endDate, form.endTime);

      if (!endsAtIso) {
        setError('Please set a valid end date and time or remove the end time.');
        return;
      }

      if (new Date(endsAtIso).getTime() < new Date(startsAtIso).getTime()) {
        setError('The end time should be after the start time.');
        return;
      }
    }

    const opponentName = selectedOpponentOrganization?.name || form.opponentName.trim() || null;
    const generatedTitle =
      form.eventType === 'match'
        ? `${selectedRelatedOrganization?.name || 'Your side'} vs ${opponentName || 'Opponent TBD'}`
        : selectedRelatedOrganization
          ? `${selectedRelatedOrganization.name} ${EVENT_TYPE_OPTIONS.find((option) => option.value === form.eventType)?.label.toLowerCase()}`
          : EVENT_TYPE_OPTIONS.find((option) => option.value === form.eventType)?.label || 'Event';

    const title = form.title.trim() || generatedTitle;

    if (!title) {
      setError('Please add a title for the event.');
      return;
    }

    if (form.eventType === 'match' && !opponentName) {
      setError('For a match, select an opponent organization or type the opponent manually.');
      return;
    }

    if (
      form.eventType === 'match' &&
      form.relatedOrganizationId &&
      form.opponentOrganizationId &&
      form.relatedOrganizationId === form.opponentOrganizationId
    ) {
      setError('Your side and the opponent cannot be the same organization.');
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
      title,
      event_type: form.eventType,
      status: form.status,
      sport: form.sport || null,
      starts_at: startsAtIso,
      ends_at: endsAtIso,
      location: form.location.trim() || null,
      visibility: form.visibility,
      description: form.description.trim() || null,
      related_organization_id: form.relatedOrganizationId ? Number(form.relatedOrganizationId) : null,
      opponent_organization_id: form.eventType === 'match' && form.opponentOrganizationId ? Number(form.opponentOrganizationId) : null,
      competition_name: form.eventType === 'match' ? form.competitionName.trim() || null : null,
      opponent_name: form.eventType === 'match' ? opponentName : null,
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
    setSelectedDateKey(getCalendarDateKey(startsAtIso));
    setVisibleMonth(new Date(new Date(startsAtIso).getFullYear(), new Date(startsAtIso).getMonth(), 1));
    setSaving(false);
    setMessage('Event created. It now appears in both the calendar grid and the list view.');
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
      <section className="overflow-hidden rounded-[28px] bg-slate-900 text-white shadow-sm sm:rounded-[36px]">
        <div className="grid gap-8 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.9fr)] lg:px-10">
          <div className="space-y-4">
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-200">
              Calendar UX revision v1
            </span>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                See your month, not just a manual event list.
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                Asobu now supports a real calendar view, a cleaner list view, and a more sports-native creation flow for
                matches, trainings, tournaments, tryouts, meetings, and community events.
              </p>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/8 p-5 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">What changed in this pass</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
              <li>• Month view with dots on event days, plus the existing list view.</li>
              <li>• Match creation now searches existing organizations first and still allows a manual fallback.</li>
              <li>• End time is optional, and location now supports a venue name or address in a single field.</li>
            </ul>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,430px)_minmax(0,1fr)]">
        <section className="rounded-[28px] bg-white p-4 shadow-sm sm:rounded-[32px] sm:p-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-slate-900">Create an event</h2>
            <p className="text-sm leading-6 text-slate-600">
              The form now adapts better to real sports activity. Matches can search opponent organizations inside Asobu,
              while independent amateur cases still work with a manual fallback.
            </p>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleCreateEvent}>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Event type</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {EVENT_TYPE_OPTIONS.map((option) => {
                  const active = form.eventType === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, eventType: option.value }))}
                      className={`rounded-2xl border px-3 py-3 text-left text-sm transition ${
                        active
                          ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="block font-semibold">{option.label}</span>
                      <span className={`mt-1 block text-xs leading-5 ${active ? 'text-slate-200' : 'text-slate-500'}`}>
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Title</label>
              <input
                value={form.title}
                onChange={(e) => setFormValue('title', e.target.value)}
                placeholder={form.eventType === 'match' ? 'Optional. It can be generated from the selected teams.' : 'Optional but recommended.'}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Leave this blank and Asobu will generate a sensible title from the event type and organizations.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Sport</label>
                <select
                  value={form.sport}
                  onChange={(e) => setFormValue('sport', e.target.value)}
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
                  onChange={(e) => setFormValue('visibility', e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                >
                  {EVENT_VISIBILITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {EVENT_VISIBILITY_OPTIONS.find((option) => option.value === form.visibility)?.description}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Start date</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setFormValue('startDate', e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Start time</label>
                <select
                  value={form.startTime}
                  onChange={(e) => setFormValue('startTime', e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                >
                  {TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">End time</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Optional. Useful for trainings, meetings, and sessions where the finish time is already known.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
                  <input
                    type="checkbox"
                    checked={form.hasEnd}
                    onChange={(e) => setForm((current) => ({ ...current, hasEnd: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  Add end time
                </label>
              </div>

              {form.hasEnd ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">End date</label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setFormValue('endDate', e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">End time</label>
                    <select
                      value={form.endTime}
                      onChange={(e) => setFormValue('endTime', e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    >
                      {TIME_OPTIONS.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Location</label>
              <input
                value={form.location}
                onChange={(e) => setFormValue('location', e.target.value)}
                placeholder="Type a venue name or address"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
              <p className="mt-2 text-xs leading-5 text-slate-500">
                This field is ready for venue names or addresses now. Smarter place suggestions can plug in later.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {form.eventType === 'match' ? 'Your side' : 'Related organization'}
                </label>
                <select
                  value={form.relatedOrganizationId}
                  onChange={(e) => setFormValue('relatedOrganizationId', e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                >
                  <option value="">No organization link</option>
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name} · {formatOrganizationTypeLabel(organization.organization_type)}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Keep this optional so independent teams and informal communities still work.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setFormValue('status', e.target.value)}
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

            {form.eventType === 'match' ? (
              <div className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Match details</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Search existing organizations first. If the opponent is not on Asobu yet, you can still type the name manually.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Opponent organization</label>
                  <input
                    value={form.opponentQuery}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        opponentQuery: e.target.value,
                        opponentOrganizationId: '',
                      }))
                    }
                    placeholder="Search teams, clubs, federations, entities, or communities"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  />

                  {selectedOpponentOrganization ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                        {selectedOpponentOrganization.name} · {formatOrganizationTypeLabel(selectedOpponentOrganization.organization_type)}
                      </span>
                      <button
                        type="button"
                        onClick={clearOpponentOrganization}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        Clear
                      </button>
                    </div>
                  ) : filteredOpponentOrganizations.length > 0 && form.opponentQuery.trim() ? (
                    <div className="mt-3 space-y-2">
                      {filteredOpponentOrganizations.map((organization) => (
                        <button
                          key={organization.id}
                          type="button"
                          onClick={() => selectOpponentOrganization(organization)}
                          className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          <span className="font-medium text-slate-900">{organization.name}</span>
                          <span className="text-xs text-slate-500">{formatOrganizationTypeLabel(organization.organization_type)}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                {!selectedOpponentOrganization ? (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Manual opponent name</label>
                    <input
                      value={form.opponentName}
                      onChange={(e) => setFormValue('opponentName', e.target.value)}
                      placeholder="Use this only if the opponent is not on Asobu yet"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Competition / tournament</label>
                    <input
                      value={form.competitionName}
                      onChange={(e) => setFormValue('competitionName', e.target.value)}
                      placeholder="Optional"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </div>
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                    {selectedRelatedOrganization ? (
                      <>
                        <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Your side</span>
                        <span className="mt-1 block font-medium text-slate-900">{selectedRelatedOrganization.name}</span>
                      </>
                    ) : (
                      'Tip: select your team or club above so the match card shows both sides clearly.'
                    )}
                  </div>
                </div>

                {form.status === 'completed' ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Score for</label>
                      <input
                        type="number"
                        min="0"
                        value={form.scoreFor}
                        onChange={(e) => setFormValue('scoreFor', e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Score against</label>
                      <input
                        type="number"
                        min="0"
                        value={form.scoreAgainst}
                        onChange={(e) => setFormValue('scoreAgainst', e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Description</label>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => setFormValue('description', e.target.value)}
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
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Calendar</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Use the month grid for rhythm and the list for detail. Both are reading the same event data underneath.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 rounded-full bg-slate-100 p-1">
                {CALENDAR_VIEW_OPTIONS.map((option) => {
                  const active = view === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setView(option.value)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
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

          {view === 'calendar' ? (
            <div className="space-y-5">
              <div className="rounded-[28px] bg-white p-4 shadow-sm sm:rounded-[32px] sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">{getMonthLabel(visibleMonth)}</h3>
                    <p className="mt-1 text-sm text-slate-600">Tap a date to see the events planned for that day.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                        setSelectedDateKey(getCalendarDateKey(today));
                      }}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Next
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
                    <div key={label} className="px-1 py-2">
                      {label}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {calendarDates.map((date) => {
                    const dateKey = getCalendarDateKey(date);
                    const dayEvents = eventsByDate.get(dateKey) || [];
                    const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
                    const isSelected = dateKey === selectedDateKey;
                    const isToday = isSameCalendarDay(date, new Date());

                    return (
                      <button
                        key={dateKey}
                        type="button"
                        onClick={() => setSelectedDateKey(dateKey)}
                        className={`min-h-[92px] rounded-2xl border p-2 text-left transition sm:min-h-[104px] ${
                          isSelected
                            ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                            : isCurrentMonth
                              ? 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50'
                              : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                              isSelected
                                ? 'bg-white/15 text-white'
                                : isToday
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {date.getDate()}
                          </span>
                          {dayEvents.length > 0 ? (
                            <span className={`text-[11px] font-medium ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}>
                              {dayEvents.length}
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-1">
                          {dayEvents.slice(0, 3).map((dayEvent) => (
                            <span
                              key={dayEvent.id}
                              className={`h-2.5 w-2.5 rounded-full ${
                                dayEvent.event_type === 'match'
                                  ? isSelected
                                    ? 'bg-amber-300'
                                    : 'bg-amber-500'
                                  : dayEvent.event_type === 'training'
                                    ? isSelected
                                      ? 'bg-cyan-300'
                                      : 'bg-cyan-500'
                                    : isSelected
                                      ? 'bg-violet-300'
                                      : 'bg-violet-500'
                              }`}
                            />
                          ))}
                          {dayEvents.length > 3 ? (
                            <span className={`text-[11px] ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}>
                              +{dayEvents.length - 3}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[28px] bg-white p-4 shadow-sm sm:rounded-[32px] sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">{selectedDateLabel}</h3>
                    <p className="mt-1 text-sm text-slate-600">Events planned on the selected date.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">{selectedDayEvents.length}</span>
                </div>

                <div className="mt-5 space-y-4">
                  {loading ? (
                    <p className="text-sm text-slate-500">Loading calendar…</p>
                  ) : selectedDayEvents.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
                      No events match the current filters on this date yet.
                    </p>
                  ) : (
                    selectedDayEvents.map((eventItem) => (
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
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-[28px] bg-white p-4 shadow-sm sm:rounded-[32px] sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Upcoming</h3>
                    <p className="mt-1 text-sm text-slate-600">The next events that are currently visible with your filters.</p>
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
                    <p className="mt-1 text-sm text-slate-600">
                      Completed, canceled, or older events. This is the first bridge toward match history.
                    </p>
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
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default CalendarPage;
