# Dispatch for Challenger M2-1 (Adversarial Data Integrity & Soft-Delete Stress)

## Mission
Empirically stress-test Milestone 2 (Slice 4: Customers & Membership Management) implementation with adversarial data integrity, soft-delete filtering, and edge cases.

## Context & Inputs
- Project Root: `/Users/yuma/Workspace/lab/titipin`
- ORIGINAL_REQUEST: `/Users/yuma/Workspace/lab/titipin/.agents/teamwork/ORIGINAL_REQUEST.md`
- PROJECT Blueprint: `/Users/yuma/Workspace/lab/titipin/.agents/teamwork/orchestrator_1/PROJECT.md`
- Skill Reference: `/Users/yuma/.gemini/config/skills/titipin-dev/SKILL.md`
- Worker M2 Handoff: `/Users/yuma/Workspace/lab/titipin/.agents/teamwork/worker_m2/handoff.md`

## Adversarial Challenges
1. Soft-Delete Isolation:
   - Create customer, delete customer (soft delete setting `deletedAt`).
   - Query `GET /api/customers` -> ensure soft-deleted customer does NOT appear in results.
   - Query `GET /api/customers/:id` -> ensure returns 404 Not Found.
   - Query with search term matching deleted customer -> ensure 0 results.
2. Boundary & Validation Stress:
   - Customer name boundary (1 char, 2 chars, 150 chars, 151 chars).
   - Address boundary (4 chars, 5 chars, 255 chars, 256 chars).
   - Invalid gender (e.g. "Other", "Unknown", empty).
   - Invalid birth_date format ("1990/01/01", "invalid-date", "2099-01-01").
   - Ensure all invalid inputs return 422 Unprocessable Entity with clear error messages.
3. Write test harness / run execution scripts to verify.
4. Record findings and definitive verdict (`APPROVE` or `REQUEST_CHANGES`) in `handoff.md`.

## 2026-10-27T21:40:36Z
You are Challenger M2-1 (Adversarial Data Integrity & Soft-Delete Stress).
Your working directory is: /Users/yuma/Workspace/lab/titipin/.agents/teamwork/challenger_m2_1
Read instructions in: /Users/yuma/Workspace/lab/titipin/.agents/teamwork/challenger_m2_1/DISPATCH.md
Also read:
- /Users/yuma/Workspace/lab/titipin/.agents/teamwork/ORIGINAL_REQUEST.md
- /Users/yuma/Workspace/lab/titipin/.agents/teamwork/worker_m2/handoff.md
- /Users/yuma/.gemini/config/skills/titipin-dev/SKILL.md
Empirically stress test soft-delete isolation and boundary inputs. Write your report with APPROVE or REQUEST_CHANGES in /Users/yuma/Workspace/lab/titipin/.agents/teamwork/challenger_m2_1/handoff.md and report back.
