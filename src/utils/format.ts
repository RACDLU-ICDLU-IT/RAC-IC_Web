export function formatDate(ts: any, opts?: Intl.DateTimeFormatOptions): string {
  if (!ts) return '';
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', opts || { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatRelative(ts: any): string {
  if (!ts) return '';
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * A news article's `body` (or a project's `description`) can either be a legacy
 * plain markdown string, or a JSON array of content blocks (text / image / collage)
 * produced by a Rich Content Builder in the admin dashboard. This strips either
 * form down to plain, readable excerpt text — never raw JSON — for use in cards,
 * list previews, and meta descriptions.
 */
export function getBodyExcerpt(body: string | null | undefined, maxLength?: number): string {
  const raw = body || '';
  let text = raw;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      text = parsed
        .filter((b: any) => b && b.type === 'text' && b.content)
        .map((b: any) => b.content)
        .join(' ');
    }
  } catch (e) {
    // Not JSON — treat as legacy plain markdown/text body
  }

  const stripped = text.replace(/[#*`_\[\]]/g, '').trim();
  return maxLength ? stripped.substring(0, maxLength) : stripped;
}
