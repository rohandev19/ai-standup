---
name: code-quality-maximization
description: Use whenever writing or reviewing code for the AI Standup project — TypeScript/NestJS/Prisma standards, plus WebSocket event handling and AI API call patterns specific to this project. Apply proactively.
---

# Code Quality Maximization — AI Standup

## TypeScript Discipline (same baseline as MK Printing)

- No `any` — narrow `unknown` explicitly
- No magic strings — use the `WorkspaceRole`, `StandupStatus`, `BlockerSeverity` enums from Prisma-generated types, never raw string literals like `'OWNER'` scattered across files
- Share types between `apps/web` and `apps/api` via `packages/shared` — don't redefine the same shape twice and let them drift
- Explicit return types on exported functions/Use Cases

## Error Handling

- Typed exceptions, one global exception filter
- Sanitized client-facing errors, full detail logged server-side (Sentry)

## Input Validation

- DTO + class-validator on every REST endpoint
- **WebSocket payloads also need validation** — `@SubscribeMessage` handlers receive client-supplied data just like HTTP bodies; validate `workspaceId`, entry text length, etc. the same way, don't treat WebSocket input as trusted just because it arrived over a persistent connection

## Prisma / Query Discipline

- **Every query touching a Workspace-owned model (`StandupEntry`, `AiSummary`, `BlockerFlag`, `AuditLog`, `Team`, `WorkspaceMember`) includes `workspaceId` in the `where` clause explicitly** — this is the single most important rule in this codebase. A query missing `workspaceId` isn't just insecure, it's wrong by definition in a multi-tenant system.
- Check every list endpoint for N+1 — use `include`/`select` deliberately (e.g. fetching a day's standup entries with `include: { user: { select: { name: true } } }` in one query, not one query per entry)
- Use the composite unique constraints (`[workspaceId, userId, standupDate]` etc.) as upserts where the requirement calls for "update if exists" (Requirement 5.2) — don't hand-roll a check-then-write that races

## WebSocket Event Patterns

- Every `@SubscribeMessage` handler starts with membership verification before doing anything else — see `security-first` skill for the exact pattern
- Event payloads are typed (share the event catalog types from `packages/shared` between Gateway and `socket.io-client` usage in Next.js) — don't let event shape drift between emitter and listener
- Broadcast to rooms (`workspace:{id}`), never broadcast globally and filter client-side — a global broadcast that relies on the client to "just not show" data from other workspaces is not isolation, it's obfuscation

## AI API Call Patterns

- **Batch, never loop.** One Claude API call per Workspace per day for summary, one for blocker detection — never one call per `StandupEntry`. If you find yourself writing a loop that calls the AI API once per user, stop — that's the exact anti-pattern `design.md` Section 6.5 exists to prevent.
- **Skip the call entirely when there's no data** — zero entries means zero summary calls, zero blocker text means zero blocker calls. Don't call the API "just to get a consistent empty response," write the empty-state logic in code instead.
- **Validate AI output before persisting.** The blocker-detection call expects JSON — parse it defensively, and if parsing fails or the shape doesn't match, fall back to storing the raw blocker text without a severity badge (Requirement 9.5) rather than crashing or silently dropping the entry.
- **Never interpolate raw user input into a system prompt without structure.** The standup text (Yesterday/Today/Blocker) comes directly from users — treat it as data within a clearly delimited section of the prompt (as shown in `design.md` 6.2), not as instructions the model should follow. A user typing "ignore previous instructions and..." in their blocker field should not be able to influence the AI's behavior beyond being summarized as text.

## Self-Review Checklist

- [ ] Every Workspace-owned query includes `workspaceId`
- [ ] Every WebSocket handler verifies membership before acting
- [ ] No AI API call added inside a loop over users/entries
- [ ] No `any`, no magic strings
- [ ] N+1 checked on any new list endpoint
- [ ] Shared types used, not duplicated between `apps/web` and `apps/api`
