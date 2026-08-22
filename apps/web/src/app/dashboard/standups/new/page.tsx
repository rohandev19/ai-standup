'use client';
import { useState } from 'react';
import { Card } from '@/components/Card/Card';
import { Button } from '@/components/Button/Button';
import styles from './standupForm.module.css';

export default function NewStandupPage() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      window.location.href = '/dashboard';
    }, 1500);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Submit Daily Standup</h2>
        <p>Keep your team updated. AI will summarize this for the manager.</p>
      </div>

      <Card className={styles.formCard} glow>
        <form onSubmit={handleSubmit} className={styles.form}>
          
          <div className={styles.formGroup}>
            <label className={styles.label}>What did you do yesterday?</label>
            <textarea 
              className={styles.textarea}
              placeholder="e.g., I finished the UI mockups and started the API integration."
              rows={3}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>What will you do today?</label>
            <textarea 
              className={styles.textarea}
              placeholder="e.g., I will complete the Button and Card components."
              rows={3}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Any blockers in your way?</label>
            <textarea 
              className={styles.textarea}
              placeholder="e.g., I'm waiting for the AWS credentials from DevOps."
              rows={2}
            />
            <span className={styles.helperText}>Leave blank if everything is smooth! AI will automatically flag this if you type a blocker.</span>
          </div>

          <div className={styles.actions}>
            <Button type="button" variant="ghost" onClick={() => window.history.back()}>
              Cancel
            </Button>
            <Button type="submit" isLoading={loading}>
              Submit Standup
            </Button>
          </div>

        </form>
      </Card>
    </div>
  );
}
