/**
 * Shared event-date helpers.
 *
 * Events have no status column, so "Upcoming" vs "Completed" is derived from
 * the date. Keeping the rule in ONE place guarantees the home-page card and
 * the event detail page can never disagree about an event's tag.
 */

/** Today as YYYY-MM-DD in the visitor's LOCAL timezone.
 *  (toISOString() is UTC, which would flip "today" to yesterday for the first
 *  hours of every day in UTC+ timezones such as Bangladesh.) */
export function localToday(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** An event is "upcoming" from today onwards. Earlier or undated => completed. */
export function isUpcomingEvent(date?: string | null, today: string = localToday()): boolean {
  return !!date && date >= today;
}
