# Dispatch for Forensic Auditor M2 (Integrity Forensics)

## Mission
Perform comprehensive forensic integrity audit on Milestone 2 (Slice 4: Customers & Membership Management).

## Context & Inputs
- Project Root: `/Users/yuma/Workspace/lab/titipin`
- ORIGINAL_REQUEST: `/Users/yuma/Workspace/lab/titipin/.agents/teamwork/ORIGINAL_REQUEST.md`
- PROJECT Blueprint: `/Users/yuma/Workspace/lab/titipin/.agents/teamwork/orchestrator_1/PROJECT.md`
- Skill Reference: `/Users/yuma/.gemini/config/skills/titipin-dev/SKILL.md`
- Worker M2 Handoff: `/Users/yuma/Workspace/lab/titipin/.agents/teamwork/worker_m2/handoff.md`

## Forensic Audit Protocol
Execute every forensic integrity check:
1. **Static Anti-Cheating Analysis**:
   - Inspect all newly created files in `apps/backend/src/modules/customers/` and `apps/frontend/src/app/(dashboard)/customers/`.
   - Ensure NO mock objects, no fake hardcoded test returns, no dummy implementations.
   - Ensure genuine Drizzle ORM queries are executed via `CustomersRepository`.
   - Ensure use-cases encapsulate genuine business logic.
2. **Git Flow Integrity**:
   - Inspect git commit history: verify `feature/slice-4-customers` was merged `--no-ff` into `develop`.
   - Verify working tree is clean.
3. **Frontend Code Compliance**:
   - Verify 0 inline SVG elements (`<svg ...>`), 0 raw SVG strings, 0 emoji characters in `apps/frontend/src/app/(dashboard)/customers/`.
   - Verify all icons are imported from `lucide-react`.
4. **Binary Gate Verdict**:
   - Report strictly `CLEAN` or `INTEGRITY VIOLATION` with full supporting evidence in `handoff.md`.


## 2026-10-27T21:40:36Z
You are Forensic Auditor M2 (Integrity Forensics).
Your working directory is: /Users/yuma/Workspace/lab/titipin/.agents/teamwork/auditor_m2
Read instructions in: /Users/yuma/Workspace/lab/titipin/.agents/teamwork/auditor_m2/DISPATCH.md
Also read:
- /Users/yuma/Workspace/lab/titipin/.agents/teamwork/ORIGINAL_REQUEST.md
- /Users/yuma/Workspace/lab/titipin/.agents/teamwork/worker_m2/handoff.md
- /Users/yuma/.gemini/config/skills/titipin-dev/SKILL.md
Perform static anti-cheating analysis, verify no mocks/dummy implementations, verify Git Flow merge integrity, verify zero inline SVG and emoji. Report strictly CLEAN or INTEGRITY VIOLATION in /Users/yuma/Workspace/lab/titipin/.agents/teamwork/auditor_m2/handoff.md and report back.
