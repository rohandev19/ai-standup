---
name: feature-delivery-workflow
description: Use whenever implementing any task from tasks.md — governs commit granularity, test-before-commit discipline, and push/CI verification for the AI Standup project. Trigger on any code-writing task.
---

# Feature Delivery Workflow — AI Standup

## The Cycle (per sub-task, not per phase)

```
Read task → Implement smallest unit → Test it (incl. cross-tenant rejection test where relevant) →
Lint/typecheck → Self-review → Commit → Push → Verify CI → Check off in tasks.md
```

## Commit Message Format

```
<type>(<scope>): <description> (task <task-number>)
```

- `type`: `feat`, `fix`, `test`, `refactor`, `chore`, `security`
- `scope`: the module — `auth`, `workspace`, `invite`, `standup`, `realtime`, `ai`, `notification`, `infra`

Examples:
```
feat(workspace): implement WorkspaceMembershipGuard (task 2.3)
feat(realtime): add join_workspace handler with membership check (task 5.2)
security(ai): sanitize blocker-detection AI response before persisting (task 6.3)
test(standup): add cross-workspace isolation test for standup entries (task 4.5)
```

## Test-Before-Commit Rule

Never commit code for a task where:
- The test hasn't been written/run (for `*` tasks, the manual "does it actually work" check is still not optional)
- `npm run lint` or `tsc --noEmit` reports errors
- The happy path hasn't been manually exercised at least once
- **For any endpoint or WebSocket handler touching Workspace-scoped data**: you haven't manually verified that a user NOT in that Workspace is rejected — this project's core risk is cross-tenant data leakage, so this check applies more broadly here than a generic IDOR check would in a single-tenant app

## Push and CI Verification

Same as MK Printing project: confirm CI starts, wait for pass, fix before moving on, use the rollback script from Phase 0 if needed rather than improvising under pressure.

## Phase Checkpoints

At each phase's Checkpoint task, in addition to a manual smoke test of the phase's feature:
- **Phase 5 (Real-time) checkpoint specifically requires testing with two separate browser sessions from two different Workspaces simultaneously** — a single-browser smoke test cannot catch a tenant-isolation bug in WebSocket rooms.
- **Phase 6 (AI) checkpoint requires checking actual API call count** in logs/Anthropic console against the "max 2 calls/Workspace/day" budget from `design.md` 6.5 — don't just check that summaries look correct, verify the call count discipline held.

## Anti-Patterns to Refuse

- Committing multiple tasks together "to save time"
- Skipping the cross-tenant rejection test because "the guard is already tested once elsewhere" — each new endpoint needs its own verification, guards can be misapplied per-route
- Adding a WebSocket event handler without going through the membership check first, even "temporarily for testing"
