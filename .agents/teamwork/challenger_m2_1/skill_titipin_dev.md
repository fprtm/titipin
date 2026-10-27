# Titipin POS Development & Codebase Mastery Skill (Local Copy)

Source: /Users/yuma/.gemini/config/skills/titipin-dev/SKILL.md

Key Rules:
- NO HARDCODED ICONS: Only import from lucide-react. Zero raw svg, zero emoji.
- STANDARD BRANCHING: feature/* -> develop with --no-ff.
- MOBILE-FIRST RESPONSIVE GLASSMORPHISM: .glass-panel, .glass-card, .glass-button.
- ZERO HALLUCINATION & STRICT DATA ALIGNMENT: match DATA-MODEL.md and openapi.yaml. Use @titipin/shared.
- Monorepo: NestJS backend (apps/backend), Next.js frontend (apps/frontend), shared package (packages/shared).
