---
name: security-first
description: Use as a standing checklist during self-review for ANY endpoint, WebSocket handler, or AI-integration code in the AI Standup project. This project's dominant risk is different from a single-tenant app — tenant isolation (Requirement 12) matters more here than anything else. Consult proactively, not just when a task explicitly mentions security.
---

# Security-First — AI Standup (Multi-Tenant + Real-Time + AI)

This project's risk profile is different from a single-tenant app like MK Printing. The single most important property of this system is: **Workspace A can never, under any circumstance, see Workspace B's data.** Everything below is organized around that plus the two other genuinely new risk surfaces here — WebSocket and AI integration.

## 1. Tenant Isolation (the most important section in this entire skill)

Every query touching Workspace-owned data needs `workspaceId` in the `where` clause. This is stricter than ordinary IDOR:

```
ORDINARY IDOR (single-tenant, e.g. MK Printing):
WHERE id = ? AND owner_id = ?

TENANT ISOLATION (this project — one more layer):
WHERE id = ? AND workspace_id = ?  (resource-level)
PLUS: verify requesting user is a member of that workspace_id at all (membership-level, via WorkspaceMembershipGuard)
```

Two independent checks, not one:
1. Is the resource itself scoped to the right Workspace in the query?
2. Is the requesting user actually a member of that Workspace? (a user could theoretically guess a valid `workspaceId` + valid `entryId` combination that happens to belong together, but they still must not be able to touch it if they aren't a member)

**Guard order matters**: `JwtAuthGuard` → `WorkspaceMembershipGuard` → `RolesGuard`. Checking role before membership can let a user's role in Workspace A get mistakenly applied to an action in Workspace B if the membership check is skipped or ordered wrong.

**On every new endpoint you write**, ask: does this touch a Workspace-owned model? If yes, `WorkspaceMembershipGuard` is not optional, regardless of whether the specific task in `tasks.md` spelled it out.

## 2. WebSocket Authorization

REST guards do not automatically protect WebSocket. Every `join_workspace` (or any future room-join event) must independently verify membership before calling `client.join()`:

```typescript
// WRONG — trusts client-supplied workspaceId
client.join(`workspace:${payload.workspaceId}`);

// RIGHT — verify membership first
const membership = await this.prisma.workspaceMember.findUnique({
  where: { workspaceId_userId: { workspaceId: payload.workspaceId, userId } },
});
if (!membership) { client.emit('error', ...); return; }
client.join(`workspace:${payload.workspaceId}`);
```

When a member is removed from a Workspace, their existing socket connection must be force-disconnected from that room immediately — a REST-level permission revocation that doesn't also revoke the live socket leaves a window where the removed user keeps receiving real-time data they should no longer see.

## 3. AI Integration Safety

- **Prompt injection awareness**: standup text is user-submitted and gets placed into a prompt sent to Claude API. Keep user content clearly delimited within the prompt structure (as designed in `design.md` 6.2) rather than concatenated in a way that could be mistaken for instructions. This isn't about preventing sophisticated attacks on a low-stakes summarization feature — it's about not building sloppy prompt-construction habits that would matter more in a higher-stakes AI feature later.
- **Validate AI output before trusting it**: the blocker-detection call is expected to return JSON. Parse defensively — malformed output should degrade gracefully (raw text shown without severity badge), not crash the request or get silently written to the database in a broken shape.
- **Never let AI availability gate core functionality**: standup submission must succeed even if the Claude API is down, slow, or rate-limited. The AI pipeline is a downstream consumer of submission data, not a dependency of it.
- **API key handling**: `ANTHROPIC_API_KEY` in `.env`, never logged, never sent to the frontend under any circumstance (all AI calls happen server-side in NestJS, never client-side from Next.js).

## 4. Standard Checklist (same baseline as MK Printing project)

- Refresh token → httpOnly cookie; access token → memory, never `localStorage`
- Rate limiting: login (IP + email), registration (IP), AI manual-trigger endpoint (1/min/Workspace — see below), WebSocket connection attempts
- Generic error messages that never reveal account/workspace existence
- `.env` in `.gitignore` from the first commit, `gitleaks` pre-commit hook
- Input validation (DTO + class-validator) on every REST endpoint AND every WebSocket message payload

## 5. Rate Limiting Specific to This Project

The AI manual-trigger endpoint (`POST .../ai-summaries/generate`) needs tighter rate limiting than a typical endpoint — not primarily for security in the traditional sense, but because each call costs real money via the Claude API. Treat "cost-bearing endpoint" as its own category deserving explicit rate limits, separate from the standard auth-endpoint rate limiting.

## 6. Legal/Compliance

Same as MK Printing: explicit consent at registration, privacy policy, account-deletion mechanism (manual acceptable for V1). Since this product could plausibly have users outside Indonesia (it's a generic SaaS tool, not an Indonesia-specific business), keep the privacy policy language general enough to reference applicable regulation per user jurisdiction rather than assuming UU PDP is the only relevant law.

## When This Skill Applies Even Without an Explicit Task Note

Any new endpoint or WebSocket event added later that isn't yet covered by an explicit `**Security:**` bullet in `tasks.md` (e.g. a feature added after the original plan) still needs Section 1 (tenant isolation) and Section 2 (WebSocket auth, if relevant) applied by default. These two patterns are the foundation of this entire system's trustworthiness — they don't get to be optional just because a specific task didn't spell them out.
