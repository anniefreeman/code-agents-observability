import type { Session } from '../types';

interface Props {
  session: Session;
}

function formatPrice(cents?: number): string {
  if (cents === undefined) return 'Free';
  return `$${(cents / 100).toFixed(2)}`;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function SessionCard({ session }: Props) {
  const full = session.isFull;
  return (
    <article className="card">
      <div className="card-head">
        <span className="tag">{session.type}</span>
        <span className="price">{formatPrice(session.priceCents)}</span>
      </div>
      <h3 className="card-title">{session.title}</h3>
      {session.description ? <p className="card-desc">{session.description}</p> : null}
      <dl className="card-meta">
        <div>
          <dt>When</dt>
          <dd>{formatWhen(session.startsAt)}</dd>
        </div>
        <div>
          <dt>Where</dt>
          <dd>{session.location.name}</dd>
        </div>
        <div>
          <dt>Host</dt>
          <dd>{session.hostName}</dd>
        </div>
      </dl>
      <div className="card-foot">
        <span className={full ? 'spots full' : 'spots'}>
          {full ? 'Fully booked' : `${session.availableSpots} spots left`}
        </span>
        <button className="btn btn-primary" disabled={full} type="button">
          {full ? 'Join waitlist' : 'Book'}
        </button>
      </div>
    </article>
  );
}
