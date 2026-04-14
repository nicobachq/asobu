export type EventType = 'match' | 'training' | 'tournament' | 'tryout' | 'meeting' | 'community';
export type EventStatus = 'scheduled' | 'completed' | 'canceled';
export type EventVisibility = 'public' | 'private';

export const EVENT_TYPE_OPTIONS: { value: EventType; label: string; description: string }[] = [
  {
    value: 'match',
    label: 'Match',
    description: 'A scheduled or completed match between two sides.',
  },
  {
    value: 'training',
    label: 'Training',
    description: 'A training session for a team, club, or community.',
  },
  {
    value: 'tournament',
    label: 'Tournament',
    description: 'A competition day, tournament, league round, or cup event.',
  },
  {
    value: 'tryout',
    label: 'Tryout',
    description: 'An open evaluation, trial, or player selection session.',
  },
  {
    value: 'meeting',
    label: 'Meeting',
    description: 'A non-competitive planning, coaching, or organization meeting.',
  },
  {
    value: 'community',
    label: 'Community event',
    description: 'An informal event organized by a community or group.',
  },
];

export const EVENT_STATUS_OPTIONS: { value: EventStatus; label: string }[] = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'canceled', label: 'Canceled' },
];

export const EVENT_VISIBILITY_OPTIONS: { value: EventVisibility; label: string; description: string }[] = [
  { value: 'public', label: 'Public', description: 'Visible to everyone in Asobu and ready for public-facing organization/event layers later.' },
  { value: 'private', label: 'Private', description: 'Visible only inside your own Asobu access.' },
];

export function getEventTypeLabel(value: string | null | undefined) {
  return EVENT_TYPE_OPTIONS.find((option) => option.value === value)?.label || 'Event';
}

export function getEventStatusLabel(value: string | null | undefined) {
  return EVENT_STATUS_OPTIONS.find((option) => option.value === value)?.label || 'Scheduled';
}

export function formatEventDateRange(startsAt: string, endsAt?: string | null) {
  const start = new Date(startsAt);
  const end = endsAt ? new Date(endsAt) : null;

  const sameDay =
    end &&
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  const startDate = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(start);

  if (!end) return startDate;

  if (sameDay) {
    const endTime = new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(end);

    return `${startDate} → ${endTime}`;
  }

  const endDate = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(end);

  return `${startDate} → ${endDate}`;
}

export function formatEventDateBadge(startsAt: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
  }).format(new Date(startsAt));
}

export function toDatetimeLocalInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function createDefaultStartValue() {
  const date = new Date();
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15);
  date.setSeconds(0, 0);
  return toDatetimeLocalInputValue(date);
}

export function createDefaultEndValue() {
  const date = new Date();
  date.setHours(date.getHours() + 1);
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15);
  date.setSeconds(0, 0);
  return toDatetimeLocalInputValue(date);
}

export function getEventStatusClasses(status: string | null | undefined) {
  if (status === 'completed') {
    return 'bg-emerald-100 text-emerald-700';
  }

  if (status === 'canceled') {
    return 'bg-rose-100 text-rose-700';
  }

  return 'bg-blue-100 text-blue-700';
}

export function getEventTypeClasses(type: string | null | undefined) {
  if (type === 'match') {
    return 'bg-amber-100 text-amber-700';
  }

  if (type === 'tournament') {
    return 'bg-violet-100 text-violet-700';
  }

  if (type === 'training') {
    return 'bg-cyan-100 text-cyan-700';
  }

  return 'bg-slate-100 text-slate-700';
}
