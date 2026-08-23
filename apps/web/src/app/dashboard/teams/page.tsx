'use client';
import { Card } from '@/components/Card/Card';
import { Button } from '@/components/Button/Button';

export default function TeamsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.5s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Teams</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your workspace members.</p>
        </div>
        <Button>+ Invite Member</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {[1, 2, 3, 4].map(i => (
          <Card key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--gradient-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              U{i}
            </div>
            <div>
              <h4 style={{ fontWeight: 600 }}>Team Member {i}</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Software Engineer</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
