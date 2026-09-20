import { supabase } from '../supabase';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin } from 'lucide-react';
import { useTenant } from '../hooks/useTenant';
import { localToday, isUpcomingEvent } from '../utils/eventDates';

/**
 * Home-page "Events" section.
 *
 * Mirrors FeaturedProjects on purpose so the two sections read as a matched
 * pair: same horizontal snap carousel, same card dimensions
 * (w-[85vw] sm:w-[400px] md:w-[450px] aspect-[3/4]), same cover-image +
 * gradient-overlay treatment and the same type / status pills.
 *
 * Shows every event the admin has published (isPublic = true), both
 * upcoming and completed. Events have no status column, so the tag is derived
 * from the date - the same rule the public /events page uses.
 */

function formatEventDate(date: string): string {
  if (!date) return '';
  const d = new Date(date + 'T00:00:00');
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function FeaturedEvents({ title = 'Events.' }: { title?: string }) {
  const { tenant } = useTenant();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isLight = tenant.brand.primaryColor === '#FFFFFF';

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // isPublic filter is REQUIRED here: RLS on `events` also has an
        // anon_read (true) policy, so the DB alone will not hide drafts.
        const { data: snap } = await supabase
          .from('events')
          .select('*')
          .eq('tenant_id', tenant.id)
          .eq('isPublic', true)
          .order('date', { ascending: true });

        const today = localToday();
        const all = snap || [];

        // Upcoming first (soonest -> latest), then completed (newest -> oldest)
        // so an imminent event is never buried behind old ones.
        const upcoming = all.filter((e: any) => isUpcomingEvent(e.date, today));
        const completed = all
          .filter((e: any) => !isUpcomingEvent(e.date, today))
          .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));

        setEvents([...upcoming, ...completed]);
      } catch (err) {
        console.error('Error fetching events', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [tenant.id]);

  if (loading || events.length === 0) return null;

  const today = localToday();

  // Same theming strategy as FeaturedProjects so both sections stay in step.
  const sectionBg = isLight ? 'var(--color-accent)' : 'var(--color-primary)';
  const headingColor = isLight
    ? 'var(--color-page-bg)'
    : 'var(--color-text-on-primary, #ffffff)';
  const subColor = isLight ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.55)';
  const cardPlaceholderBg = isLight
    ? 'linear-gradient(135deg, #e8eaf0 0%, #d0d4e8 50%, #bcc3db 100%)'
    : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';
  const overlayGradient = isLight
    ? 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.35) 55%, transparent 100%)'
    : 'linear-gradient(to top, var(--color-primary) 0%, rgba(0,0,0,0.45) 55%, transparent 100%)';

  return (
    <section className="py-24" style={{ background: sectionBg }}>
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 mb-12 flex justify-between items-end">
        <div>
          <h2
            className="text-4xl md:text-5xl font-heading font-bold mb-4"
            style={{ color: headingColor }}
          >
            {title}
          </h2>
          <p className="text-lg" style={{ color: subColor }}>
            Upcoming and past events from our club.
          </p>
        </div>
        <Link
          to="/events"
          className="hidden md:inline-flex font-bold hover:opacity-80 transition-opacity"
          style={{ color: 'var(--color-accent)' }}
        >
          View All Events &rarr;
        </Link>
      </div>

      {/* Horizontal carousel - identical card size to FeaturedProjects */}
      <div
        className="w-full overflow-x-auto pb-8 cursor-grab active:cursor-grabbing snap-x snap-mandatory px-6 md:px-12"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex gap-6 w-max">
          {events.map((event) => {
            const isUpcoming = isUpcomingEvent(event.date, today);
            const statusLabel = isUpcoming ? 'Upcoming' : 'Completed';

            return (
              <Link
                to={`/events/${event.id}`}
                key={event.id}
                className="w-[85vw] sm:w-[400px] md:w-[450px] aspect-[3/4] relative rounded-2xl overflow-hidden group snap-center shadow-xl block"
                style={{
                  background: event.coverImage ? '#111' : cardPlaceholderBg,
                  textDecoration: 'none',
                }}
              >
                {/* Cover image */}
                {event.coverImage && (
                  <img
                    src={event.coverImage}
                    alt={event.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0" style={{ background: overlayGradient }} />

                {/* Card content */}
                <div className="absolute bottom-0 left-0 w-full p-8 flex flex-col justify-end">
                  <div className="flex gap-3 mb-4 flex-wrap">
                    {/* Type badge */}
                    {event.type && (
                      <span
                        className="text-xs font-bold px-3 py-1 rounded-full"
                        style={{ background: 'var(--color-accent)', color: '#ffffff' }}
                      >
                        {event.type}
                      </span>
                    )}
                    {/* Status badge - Upcoming / Completed (same glass pill as projects) */}
                    <span
                      className="text-xs font-bold px-3 py-1 rounded-full text-white"
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

                  <h3 className="text-2xl md:text-3xl font-heading font-bold text-white mb-2 leading-tight">
                    {event.title}
                  </h3>

                  <div className="flex flex-col gap-1 text-white/70 text-sm mb-2">
                    {event.date && (
                      <span className="inline-flex items-center gap-2">
                        <Calendar size={14} className="shrink-0" />
                        {formatEventDate(event.date)}
                      </span>
                    )}
                    {event.venue && (
                      <span className="inline-flex items-center gap-2">
                        <MapPin size={14} className="shrink-0" />
                        <span className="line-clamp-1">{event.venue}</span>
                      </span>
                    )}
                  </div>

                  <span
                    className="font-medium mt-4 inline-flex items-center gap-2 md:opacity-0 md:-translate-y-2 md:group-hover:opacity-100 md:group-hover:translate-y-0 transition-all duration-300 underline underline-offset-2 md:no-underline"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    View Details &rarr;
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Mobile "view all" link */}
      <div className="mt-8 px-6 md:hidden">
        <Link
          to="/events"
          className="font-bold text-sm"
          style={{ color: 'var(--color-accent)' }}
        >
          View All Events &rarr;
        </Link>
      </div>
    </section>
  );
}
