# Product

## Register

product

## Users

Pharmacists (ภก.) and physicians working in Bangkok Metropolitan Administration (BMA) clinics. They use this tool at a workstation during patient consultations — reviewing INR results, calculating warfarin dose adjustments, and recording decisions in a time-pressured clinical setting. Secondary users: supervising physicians reviewing dose rationale.

## Product Purpose

BMA Doctor (หมอ กทม.) is a clinical decision-support platform for BMA healthcare workers. The DD-ATS module supports anticoagulant therapy stewardship: tracking INR trends, computing protocol-driven warfarin dose suggestions, and maintaining an auditable dose-adjustment log. Success means a pharmacist can review an INR, act on a dose suggestion, and record the decision in under 90 seconds — with full confidence the math is correct.

## Brand Personality

Clinical precision, efficient workflow. Every element earns its place; nothing decorative that doesn't carry clinical meaning. Fast to scan, zero ambiguity on numbers, calm under high-severity states.

## Anti-references

- Hospital HIS software: cluttered, form-heavy, visually dated — the thing pharmacists hate using
- Consumer health apps: friendly pastels, oversized icons, gamification cues — wrong register entirely
- Dark mode dev tools: terminal aesthetics, neon accents — wrong context for a clinical day-shift workflow

## Design Principles

1. **Numbers are the interface.** INR values and dose figures must be immediately scannable — large, high-contrast, monospace. Supporting labels are subordinate.
2. **State drives layout.** The UI should look different at INR 1.4 vs INR 7.2. Severity states are not just color changes — they change the information hierarchy.
3. **One decision per screen zone.** Each section of the tool corresponds to one clinical decision. Don't mix input, computation, and record-keeping in the same visual block.
4. **Audit trail without friction.** Logging a dose adjustment must feel like the natural end of the workflow, not a separate bureaucratic step.
5. **Thai clinical context first.** Pill names in Thai, dates in Buddhist era where appropriate, rounding to 0.5 tablet because that's how Thai pharmacies dispense.

## Accessibility & Inclusion

- Minimum WCAG AA contrast on all text, especially INR value chips and status badges.
- No color-only encoding for clinical severity — always pair color with label/icon.
- Reduced motion: transitions under 200ms, no looping animations except EMERGENCY pulse (clinically necessary).
