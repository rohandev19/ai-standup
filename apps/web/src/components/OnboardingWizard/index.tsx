'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import styles from './OnboardingWizard.module.css';

interface OnboardingWizardProps {
  workspace: {
    id: string;
    name?: string;
    timezone?: string;
    standupWindowStart?: string;
    standupWindowEnd?: string;
    workingDays?: number[];
  };
  onComplete: () => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function OnboardingWizard({ workspace, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState(workspace.name || '');
  const [timezone, setTimezone] = useState(workspace.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [standupWindowStart, setStandupWindowStart] = useState(workspace.standupWindowStart || '09:00');
  const [standupWindowEnd, setStandupWindowEnd] = useState(workspace.standupWindowEnd || '11:00');
  const [workingDays, setWorkingDays] = useState<number[]>(workspace.workingDays || [1, 2, 3, 4, 5]);
  const [inviteEmails, setInviteEmails] = useState('');

  const handleNext = () => setStep(s => Math.min(4, s + 1));
  const handlePrev = () => setStep(s => Math.max(1, s - 1));

  const toggleDay = (dayIndex: number) => {
    setWorkingDays(prev => 
      prev.includes(dayIndex) 
        ? prev.filter(d => d !== dayIndex) 
        : [...prev, dayIndex].sort()
    );
  };

  const handleComplete = async () => {
    setIsLoading(true);
    setError('');
    try {
      // 1. Update Workspace Settings & complete onboarding
      await api(`/workspaces/${workspace.id}/onboarding`, {
        method: 'PATCH',
        data: JSON.stringify({
          name,
          timezone,
          standupWindowStart,
          standupWindowEnd,
          workingDays,
        }),
      });

      // 2. Handle Bulk Invites if provided
      const emails = inviteEmails
        .split(/[\n,]+/)
        .map(e => e.trim())
        .filter(e => e.length > 0);

      if (emails.length > 0) {
        await api(`/workspaces/${workspace.id}/invite-bulk`, {
          method: 'POST',
          data: JSON.stringify({ emails }),
        });
      }

      onComplete();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to save settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        
        <div className={styles.header}>
          <h2>Welcome to AI Standup!</h2>
          <p>Let&apos;s configure your workspace in a few quick steps.</p>
        </div>

        <div className={styles.progress}>
          <div className={styles.progressLine} />
          {[1, 2, 3, 4].map(i => (
            <div 
              key={i} 
              className={`${styles.progressStep} ${step === i ? styles.active : ''} ${step > i ? styles.completed : ''}`}
            >
              {step > i ? '✓' : i}
            </div>
          ))}
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.stepContent}>
          {step === 1 && (
            <div>
              <div className={styles.formGroup}>
                <label>Workspace Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  className={styles.input}
                  placeholder="e.g. Acme Corp"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className={styles.formGroup}>
                <label>Timezone</label>
                <input 
                  type="text" 
                  value={timezone} 
                  onChange={e => setTimezone(e.target.value)}
                  className={styles.input}
                  placeholder="e.g. Asia/Jakarta"
                />
                <span className={styles.helpText}>We auto-detected this from your browser.</span>
              </div>
              
              <div className={styles.formGroup}>
                <label>Standup Window</label>
                <div className={styles.timeRow}>
                  <input 
                    type="time" 
                    value={standupWindowStart} 
                    onChange={e => setStandupWindowStart(e.target.value)}
                    className={styles.input}
                  />
                  <span>to</span>
                  <input 
                    type="time" 
                    value={standupWindowEnd} 
                    onChange={e => setStandupWindowEnd(e.target.value)}
                    className={styles.input}
                  />
                </div>
                <span className={styles.helpText}>Team members must submit their standups within this time window.</span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className={styles.formGroup}>
                <label>Working Days</label>
                <div className={styles.dayGrid}>
                  {DAYS.map((day, index) => (
                    <button
                      key={day}
                      onClick={() => toggleDay(index)}
                      className={`${styles.dayBtn} ${workingDays.includes(index) ? styles.selected : ''}`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                <span className={styles.helpText}>Standups will only be collected on these days.</span>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <div className={styles.formGroup}>
                <label>Invite Team Members</label>
                <textarea 
                  value={inviteEmails}
                  onChange={e => setInviteEmails(e.target.value)}
                  className={`${styles.input} ${styles.textarea}`}
                  placeholder="Enter email addresses separated by commas or new lines..."
                />
                <span className={styles.helpText}>You can always invite more people later.</span>
              </div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          {step > 1 ? (
            <button onClick={handlePrev} className={`${styles.btn} ${styles.btnSecondary}`}>
              Back
            </button>
          ) : <div />}
          
          {step < 4 ? (
            <button onClick={handleNext} className={`${styles.btn} ${styles.btnPrimary}`}>
              Next Step
            </button>
          ) : (
            <button 
              onClick={handleComplete} 
              disabled={isLoading}
              className={`${styles.btn} ${styles.btnPrimary}`}
            >
              {isLoading ? 'Saving...' : 'Finish Setup'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
