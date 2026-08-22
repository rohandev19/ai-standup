import { StandupStatus, BlockerSeverity } from './enums';

export interface StandupSubmittedEvent {
  workspaceId: string;
  userId: string;
  userName: string;
  standupDate: Date;
  status: StandupStatus;
  hasBlocker: boolean;
}

export interface BlockerFlagCreatedEvent {
  workspaceId: string;
  standupEntryId: string;
  severity: BlockerSeverity;
  reason: string;
  userName: string;
}

export interface MemberRemovedEvent {
  workspaceId: string;
  userId: string;
  removedById: string;
}

export interface SummaryGeneratedEvent {
  workspaceId: string;
  summaryId: string;
  summaryDate: Date;
}

export interface WeeklyDigestGeneratedEvent {
  workspaceId: string;
  digestId: string;
  weekStartDate: Date;
}

export interface InviteAcceptedEvent {
  workspaceId: string;
  userId: string;
  userName: string;
  invitedById: string;
}

// WebSocket Event Payloads
export interface WsPresenceUpdatePayload {
  userId: string;
  userName: string;
  status: 'submitted' | 'late';
  submittedAt: Date;
}

export interface WsBlockerAlertPayload {
  standupEntryId: string;
  severity: BlockerSeverity;
  reason: string;
  userName: string;
  blockerText: string;
}

export interface WsSummaryReadyPayload {
  summaryDate: Date;
  summaryId: string;
  entryCount: number;
  blockerCount: number;
}

export interface WsDigestReadyPayload {
  weekStartDate: Date;
  digestId: string;
}
