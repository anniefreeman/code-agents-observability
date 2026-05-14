import { Link } from 'react-router-dom';
import SessionCard from '../components/SessionCard';
import { stubSessions } from '../stubs';

export default function Landing() {
  const featured = stubSessions.slice(0, 3);

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <h1 className="hero-title">
            Try something new. <span className="muted">One class at a time.</span>
          </h1>
          <p className="hero-sub">
            Hobby Trial helps you discover and book single-session classes — tennis, pilates,
            pottery, hiking, climbing, dance, and more. Or host a class of your own.
          </p>
          <div className="hero-cta">
            <Link to="/explore" className="btn btn-primary btn-lg">
              Find a class
            </Link>
            <Link to="/host" className="btn btn-ghost btn-lg">
              Host a class
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Featured this week</h2>
            <Link to="/explore" className="link">Browse all →</Link>
          </div>
          <div className="grid">
            {featured.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container two-col">
          <div>
            <h2>For the curious</h2>
            <p className="muted">
              Browse one-off sessions across activities. No subscriptions, no long commitments —
              just show up, try something, and decide later if it's for you.
            </p>
            <Link to="/explore" className="link">Find a class →</Link>
          </div>
          <div>
            <h2>For hosts</h2>
            <p className="muted">
              Already teaching? List a session in minutes. Set your capacity, your price, your
              cancellation policy. We handle discovery and bookings.
            </p>
            <Link to="/host" className="link">Host a class →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
