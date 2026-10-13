# Redesign Audit — fitnessplan-ai (2026-10-13)

**Competitors studied:** Strava (dark #242428 night UI, orange #FC4C02 action accent, activity cards with big-number stat strips, bold activity titles, crisp 8–12px cards), Nike Training Club (workout library filtered by duration/type/muscle group/equipment, multi-week programs, collections, activity tab), TrainingPeaks (TSS/zone charts).

## Visual gaps
1. **Theme is generic light, not athletic.** Strava/NTC feel fast and data-dense. Ours looks like a settings page. → dark athletic UI with one orange action accent.
2. **"Today" section is small.** Strava frames every activity as an accomplishment: bold title + headline stats. Our today panel is a small card.
3. **Stat band is plain.** Strava's big-number strips with caps labels are the category signature; ours is close but needs the athletic type treatment.
4. **Exercise library lacks type chips.** NTC filters by workout type; ours has search + equipment + sort only.

## Functional / flow gaps
1. **Library type filter.** → add Strength / Cardio / Mobility / etc. filter chips (data already has `type`).
2. **Week strip is small.** → bigger day cards, today highlighted in orange.

## Decisions
- Keep: plan generation, rest timer (with beeps), session shuffle/swap, log-done, backdate logging, streaks, adherence, volume chart, CSV export — all preserved.
- Identity: "training ground" — dark athletic UI (near-black surfaces, orange action accent like Strava), big-number stat strips, bold condensed-feel headings, sharp corners.
- Tabs become a dark masthead nav; plan/setup as cards; library grid with type chips.
