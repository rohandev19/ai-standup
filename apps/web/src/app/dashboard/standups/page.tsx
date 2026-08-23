'use client';
import { Card } from '@/components/Card/Card';

export default function StandupsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.5s ease' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>My Standups</h2>
        <p style={{ color: 'var(--text-secondary)' }}>View your previous standup submissions.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {[1, 2, 3].map((i) => (
          <Card key={i} glow={i === 1}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontWeight: 600 }}>{i === 1 ? 'Today' : `${i} days ago`}</span>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>10:00 AM</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <h4 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>What did you do yesterday?</h4>
                <p>Worked on the API endpoints and wrote some unit tests.</p>
              </div>
              <div>
                <h4 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>What will you do today?</h4>
                <p>Will start integrating the frontend dashboard UI.</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
