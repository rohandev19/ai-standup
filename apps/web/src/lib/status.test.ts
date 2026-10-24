import { getSeverityPresentation, getStatusPresentation, hasSubmitted } from './status';

describe('status presentation', () => {
  it('renders late as amber "Late", not green "Not yet"', () => {
    expect(getStatusPresentation('late')).toEqual({ label: 'Late', variant: 'warning' });
  });

  it('keeps the four submission states visually distinct', () => {
    const variants = (['submitted', 'late', 'missed', 'not_yet'] as const).map(
      (s) => getStatusPresentation(s).variant,
    );
    expect(new Set(variants).size).toBe(4);
  });

  it('maps blocker severity to its own label instead of a hardcoded "high"', () => {
    expect(getSeverityPresentation('LOW')).toEqual({ label: 'Low', variant: 'info' });
    expect(getSeverityPresentation('MEDIUM')).toEqual({ label: 'Medium', variant: 'warning' });
    expect(getSeverityPresentation('HIGH')).toEqual({ label: 'High', variant: 'danger' });
  });

  it('counts late entries as submitted for the submission rate', () => {
    expect(hasSubmitted('late')).toBe(true);
    expect(hasSubmitted('submitted')).toBe(true);
    expect(hasSubmitted('not_yet')).toBe(false);
    expect(hasSubmitted('missed')).toBe(false);
  });
});
