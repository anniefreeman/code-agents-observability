import { useMemo, useState } from 'react';
import SessionCard from '../components/SessionCard';
import { activityTypes, stubSessions } from '../stubs';
import type { SessionType } from '../types';

export default function Explore() {
  const [activeFilter, setActiveFilter] = useState<SessionType | 'all'>('all');
  const [hideFull, setHideFull] = useState(false);

  const sessions = useMemo(() => {
    return stubSessions.filter((s) => {
      if (activeFilter !== 'all' && s.type !== activeFilter) return false;
      if (hideFull && s.isFull) return false;
      return true;
    });
  }, [activeFilter, hideFull]);

  return (
    <section className="section">
      <div className="container">
        <header className="page-head">
          <h1>Find a class</h1>
          <p className="muted">Single sessions you can book one at a time. No subscriptions.</p>
        </header>

        <div className="filters">
          <div className="chips">
            <button
              type="button"
              className={`chip ${activeFilter === 'all' ? 'chip-active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              All
            </button>
            {activityTypes.map((t) => (
              <button
                type="button"
                key={t.key}
                className={`chip ${activeFilter === t.key ? 'chip-active' : ''}`}
                onClick={() => setActiveFilter(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={hideFull}
              onChange={(e) => setHideFull(e.target.checked)}
            />
            Hide fully booked
          </label>
        </div>

        {sessions.length === 0 ? (
          <p className="empty">No sessions match those filters yet.</p>
        ) : (
          <div className="grid">
            {sessions.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
