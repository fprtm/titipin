# Titipin POS Development & Codebase Mastery Skill (Local Copy)

Source: /Users/yuma/.gemini/config/skills/titipin-dev/SKILL.md

Key Constraints:
1. NO HARDCODED ICONS (STRICTLY FORBIDDEN):
   - Never render inline SVG elements (`<svg ...>...</svg>`), raw SVG strings, or unicode emoji icons in any component.
   - Always import and use icons exclusively from `lucide-react`.
2. STANDARD BRANCHING BEST PRACTICES:
   - Always branch off `develop` using `feature/<feature-name>`.
   - Merge back into `develop` with non-fast-forward: `git merge --no-ff feature/...`.
   - Delete the local feature branch immediately after successful merge.
3. ZERO HALLUCINATION & STRICT DATA ALIGNMENT:
   - Genuine Drizzle ORM queries, real use cases, real models.
