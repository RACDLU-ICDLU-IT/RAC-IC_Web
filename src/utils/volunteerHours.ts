import { supabase } from '../supabase';

/**
 * Volunteer hours — one definition, one source of truth.
 *
 * A member's hours are DERIVED, never accumulated into a counter:
 *
 *     sum(attendance.volunteer_hours)   for that member
 *   + sum(projects."volunteerHours")    for every project that member
 *                                        is listed as a participant of
 *
 * The arithmetic lives in the database (member_volunteer_hours /
 * tenant_volunteer_hours, see
 * supabase/migrations/20260921000000_icdlu_gallery_and_volunteer_hours.sql)
 * so the member dashboard and the public homepage can never disagree,
 * and so re-saving or editing a project cannot double-count — the
 * answer is recomputed from current rows every time.
 *
 * This module is only a thin typed wrapper around those two functions,
 * plus the small pieces of the same rule the UI needs locally (which
 * project statuses count, how to print a figure).
 */

/**
 * Project statuses whose hours have actually been served and therefore
 * count toward a member's total. 'Upcoming' is excluded: those hours
 * start counting the moment the project moves to Ongoing or Completed.
 * Mirrors the `lower(status) in ('ongoing','completed')` filter in both
 * SQL functions — keep the two in step.
 */
export const HOUR_BEARING_PROJECT_STATUSES = ['ongoing', 'completed'] as const;

export function projectCountsTowardHours(status: string | null | undefined): boolean {
  return (HOUR_BEARING_PROJECT_STATUSES as readonly string[]).includes(
    (status || '').toLowerCase()
  );
}

/** "12" / "12.5" / "12.25" — no trailing zeros, no forced decimals. */
export function formatHours(n: number): string {
  return Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(2)));
}

/**
 * Total volunteer hours for one member. Returns null (not 0) when the
 * figure could not be read, so callers can fall back rather than
 * asserting a false zero.
 */
export async function fetchMemberVolunteerHours(
  tenantId: string,
  memberId: string
): Promise<number | null> {
  try {
    const { data, error } = await supabase.rpc('member_volunteer_hours', {
      p_tenant_id: tenantId,
      p_member_id: memberId,
    });
    if (error) throw error;
    const n = Number(data);
    return Number.isFinite(n) ? n : null;
  } catch (err) {
    console.warn('[volunteerHours] member_volunteer_hours failed:', err);
    return null;
  }
}

/**
 * Total volunteer hours across every member of a club. Readable
 * anonymously (the public homepage needs it), which is why it is a
 * database function rather than a client-side aggregate — `attendance`
 * is not anon-readable.
 */
export async function fetchClubVolunteerHours(tenantId: string): Promise<number | null> {
  try {
    const { data, error } = await supabase.rpc('tenant_volunteer_hours', {
      p_tenant_id: tenantId,
    });
    if (error) throw error;
    const n = Number(data);
    return Number.isFinite(n) ? n : null;
  } catch (err) {
    console.warn('[volunteerHours] tenant_volunteer_hours failed:', err);
    return null;
  }
}
