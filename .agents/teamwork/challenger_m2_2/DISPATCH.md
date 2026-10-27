# Dispatch for Challenger M2-2 (RBAC Security & Concurrency Stress)

## Mission
Empirically stress-test Milestone 2 (Slice 4: Customers & Membership Management) implementation with RBAC security matrix and concurrent operations.

## Context & Inputs
- Project Root: `/Users/yuma/Workspace/lab/titipin`
- ORIGINAL_REQUEST: `/Users/yuma/Workspace/lab/titipin/.agents/teamwork/ORIGINAL_REQUEST.md`
- PROJECT Blueprint: `/Users/yuma/Workspace/lab/titipin/.agents/teamwork/orchestrator_1/PROJECT.md`
- Skill Reference: `/Users/yuma/.gemini/config/skills/titipin-dev/SKILL.md`
- Worker M2 Handoff: `/Users/yuma/Workspace/lab/titipin/.agents/teamwork/worker_m2/handoff.md`

## Adversarial Challenges
1. RBAC Matrix Enforcement:
   - Cashier JWT token attempting `PUT /api/customers/:id` -> Must strictly return 403 Forbidden.
   - Cashier JWT token attempting `DELETE /api/customers/:id` -> Must strictly return 403 Forbidden.
   - Unauthenticated request attempting any customer endpoint -> Must strictly return 401 Unauthorized.
   - Admin JWT token attempting all endpoints -> Must succeed with 200/201/204.
2. Concurrent Customer Creation:
   - Simultaneous requests attempting to register customers.
   - Pagination stability under active insertions.
3. Record findings and definitive verdict (`APPROVE` or `REQUEST_CHANGES`) in `handoff.md`.

## 2026-10-27T21:40:36Z
You are Challenger M2-2 (RBAC Security & Concurrency Stress).
Your working directory is: /Users/yuma/Workspace/lab/titipin/.agents/teamwork/challenger_m2_2
Read instructions in: /Users/yuma/Workspace/lab/titipin/.agents/teamwork/challenger_m2_2/DISPATCH.md
Also read:
- /Users/yuma/Workspace/lab/titipin/.agents/teamwork/ORIGINAL_REQUEST.md
- /Users/yuma/Workspace/lab/titipin/.agents/teamwork/worker_m2/handoff.md
- /Users/yuma/.gemini/config/skills/titipin-dev/SKILL.md
Empirically stress test RBAC 403 enforcement and concurrent customer operations. Write your report with APPROVE or REQUEST_CHANGES in /Users/yuma/Workspace/lab/titipin/.agents/teamwork/challenger_m2_2/handoff.md and report back.
