/**
 * Single source of truth for how submission status and blocker severity are
 * presented. ui-ux-craft requires these to be identical on every surface
 * (dashboard, history, email), so screens must go through these helpers
 * instead of inlining their own ternaries.
 */

export type SubmissionStatus = 'submitted' | 'late' | 'not_yet' | 'missed';
export type BlockerSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface Presentation {
  label: string;
  variant: BadgeVariant;
}

const STATUS_PRESENTATION: Record<SubmissionStatus, Presentation> = {
  submitted: { label: 'Submitted', variant: 'success' },
  late: { label: 'Late', variant: 'warning' },
  missed: { label: 'Missed', variant: 'danger' },
  not_yet: { label: 'Not yet', variant: 'neutral' },
};

const SEVERITY_PRESENTATION: Record<BlockerSeverity, Presentation> = {
  LOW: { label: 'Low', variant: 'info' },
  MEDIUM: { label: 'Medium', variant: 'warning' },
  HIGH: { label: 'High', variant: 'danger' },
};

export function getStatusPresentation(status: SubmissionStatus): Presentation {
  return STATUS_PRESENTATION[status] ?? STATUS_PRESENTATION.not_yet;
}

export function getSeverityPresentation(severity: BlockerSeverity): Presentation {
  return SEVERITY_PRESENTATION[severity] ?? SEVERITY_PRESENTATION.LOW;
}

/** Both on-time and late entries count toward the submission rate. */
export function hasSubmitted(status: SubmissionStatus): boolean {
  return status === 'submitted' || status === 'late';
}
