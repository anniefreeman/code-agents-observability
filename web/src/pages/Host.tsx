import { useState, type FormEvent } from 'react';
import { activityTypes } from '../stubs';
import type { SessionType } from '../types';

interface FormState {
  type: SessionType;
  title: string;
  description: string;
  startsAt: string;
  durationMinutes: string;
  capacity: string;
  locationName: string;
  hostName: string;
  price: string;
}

const initial: FormState = {
  type: 'tennis',
  title: '',
  description: '',
  startsAt: '',
  durationMinutes: '60',
  capacity: '8',
  locationName: '',
  hostName: '',
  price: '',
};

export default function Host() {
  const [form, setForm] = useState<FormState>(initial);
  const [submitted, setSubmitted] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <>
      <section className="hero hero-sm">
        <div className="container hero-inner">
          <h1 className="hero-title">Host a class</h1>
          <p className="hero-sub">
            List a single session, set your capacity and price, and we'll handle discovery and
            bookings. No subscriptions, no listing fees.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container two-col">
          <aside className="aside">
            <h3>Why host with us</h3>
            <ul className="bullets">
              <li>Single-session listings — no long commitments to manage.</li>
              <li>Set your own capacity and price.</li>
              <li>We promote your class to people in your area looking to try something new.</li>
              <li>Cancel any time before the start.</li>
            </ul>
          </aside>

          <div>
            <h3>Create a session</h3>
            {submitted ? (
              <div className="notice">
                Thanks — this is just a stub for now. Your draft is saved locally and will post
                once we wire this up to the API.
              </div>
            ) : null}
            <form className="form" onSubmit={handleSubmit}>
              <div className="row">
                <label>
                  <span>Activity</span>
                  <select
                    value={form.type}
                    onChange={(e) => update('type', e.target.value as SessionType)}
                  >
                    {activityTypes.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Title</span>
                  <input
                    value={form.title}
                    onChange={(e) => update('title', e.target.value)}
                    placeholder="e.g. Beginner doubles drills"
                    required
                  />
                </label>
              </div>

              <label>
                <span>Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  rows={3}
                  placeholder="What should attendees expect? What should they bring?"
                />
              </label>

              <div className="row">
                <label>
                  <span>Starts at</span>
                  <input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => update('startsAt', e.target.value)}
                    required
                  />
                </label>
                <label>
                  <span>Duration (mins)</span>
                  <input
                    type="number"
                    min={15}
                    value={form.durationMinutes}
                    onChange={(e) => update('durationMinutes', e.target.value)}
                    required
                  />
                </label>
              </div>

              <div className="row">
                <label>
                  <span>Capacity</span>
                  <input
                    type="number"
                    min={1}
                    value={form.capacity}
                    onChange={(e) => update('capacity', e.target.value)}
                    required
                  />
                </label>
                <label>
                  <span>Price (USD)</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.price}
                    onChange={(e) => update('price', e.target.value)}
                    placeholder="Leave blank for free"
                  />
                </label>
              </div>

              <div className="row">
                <label>
                  <span>Location name</span>
                  <input
                    value={form.locationName}
                    onChange={(e) => update('locationName', e.target.value)}
                    placeholder="e.g. Riverside Tennis Club"
                    required
                  />
                </label>
                <label>
                  <span>Host name</span>
                  <input
                    value={form.hostName}
                    onChange={(e) => update('hostName', e.target.value)}
                    placeholder="How you'll appear to attendees"
                    required
                  />
                </label>
              </div>

              <div className="form-foot">
                <button type="submit" className="btn btn-primary btn-lg">
                  Publish session
                </button>
                <span className="muted small">Stubbed — no API call yet.</span>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
