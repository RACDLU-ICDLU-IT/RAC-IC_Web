import { supabase } from '../supabase';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CalendarDays, Clock, MapPin } from 'lucide-react';
import { useTenant } from '../hooks/useTenant';
import SEOHead from '../components/SEOHead';
import { isUpcomingEvent } from '../utils/eventDates';

/**
 * Single-event page (/events/:id) - the target of the home-page event cards.
 * Layout mirrors ProjectDetail (full-width hero + content) so events and
 * projects feel like siblings.
 */
export default function EventDetail() {
  const { id } = useParams();
  const { tenant } = useTenant();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Land at the top of the page. The site has no global scroll reset, so a
  // card clicked halfway down the home page would otherwise open this page
  // scrolled halfway down too.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    let cancelled = false; // ignore a stale response if the id changes mid-flight
    setLoading(true);
    setEvent(null);

    supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      // REQUIRED: RLS on `events` has an anon_read (true) policy, so the
      // database will NOT hide unpublished events. Without this filter anyone
      // holding a private event's link could read it.
      .eq('isPublic', true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        // A malformed id (not a UUID) comes back as an error -> treat as not found.
        if (error) console.error('Error fetching event', error);
        setEvent(data || null);
        setLoading(false);
      }, (err) => {
        if (cancelled) return;
        console.error(err);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [id, tenant.id]);

  if (loading) {
    return (
      <div className="min-h-screen pt-32 pb-24 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen pt-32 pb-24 text-center px-6">
        <h1 className="text-4xl font-heading font-bold text-gray-900 mb-4">Event Not Found</h1>
        <p className="text-gray-500 mb-6">This event doesn't exist or is no longer available.</p>
        <Link to="/events" className="text-accent font-bold hover:underline">← Back to Events</Link>
      </div>
    );
  }

  const upcoming = isUpcomingEvent(event.date);
  const statusLabel = upcoming ? 'Upcoming' : 'Completed';

  const longDate = event.date
    ? new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : '';
  const shortDate = event.date
    ? new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    : 'TBD';

  const seoDescription = (event.description || '').replace(/\s+/g, ' ').trim().slice(0, 160)
    || `${event.title} - ${tenant.fullName}`;

  return (
    <div className="bg-white min-h-screen pt-24 pb-32">
      <SEOHead
        title={event.title}
        description={seoDescription}
        ogImage={event.coverImage || undefined}
        canonicalPath={`/events/${event.id}`}
      />

      <article>
        {/* Full-width hero image */}
        <div
          className="relative w-full h-[60vh] min-h-[400px]"
          // hero-start always contrasts with the white hero text, for both
          // tenants, when an event has no cover image.
          style={{ background: 'var(--color-hero-start, #1A2033)' }}
        >
          {event.coverImage && (
            <img
              src={event.coverImage}
              className="w-full h-full object-cover opacity-60"
              alt=""
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          <div className="absolute bottom-0 left-0 w-full p-8 md:p-16 max-w-5xl mx-auto inset-x-0">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              {event.type && (
                <span
                  className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
                  style={{ background: 'var(--color-accent)', color: '#ffffff' }}
                >
                  {event.type}
                </span>
              )}
              <span
                className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full text-white"
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.25)',
                }}
              >
                {statusLabel}
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-bold text-white leading-tight mb-4">
              {event.title}
            </h1>
            <div className="text-white/80 text-lg font-mono">
              Date: <strong>{shortDate}</strong>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-6 py-16">
          <div className="space-y-4 text-sm bg-gray-50 p-6 rounded-2xl text-gray-900">
            {longDate && (
              <p className="flex items-center gap-3">
                <CalendarDays size={18} className="text-accent shrink-0" />
                <span><strong>Date:</strong> {longDate}</span>
              </p>
            )}
            {event.time && (
              <p className="flex items-center gap-3">
                <Clock size={18} className="text-accent shrink-0" />
                <span><strong>Time:</strong> {event.time}</span>
              </p>
            )}
            {event.venue && (
              <p className="flex items-start gap-3">
                <MapPin size={18} className="text-accent shrink-0 mt-0.5" />
                <span><strong>Venue:</strong> {event.venue}</span>
              </p>
            )}
          </div>

          {event.description && (
            <div className="mt-12">
              <h2 className="font-bold text-gray-900 mb-4 font-heading text-2xl border-b pb-3">
                About this event
              </h2>
              {/* Plain text (admin enters it in a textarea) - React escapes it. */}
              <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}
        </div>

        <div className="max-w-3xl mx-auto px-6 pb-16">
          <Link
            to="/events"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-primary font-bold transition-colors"
          >
            ← Back to Events
          </Link>
        </div>
      </article>
    </div>
  );
}
