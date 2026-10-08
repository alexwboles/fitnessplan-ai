# FitnessPlan AI 🏋️

Your goal, your schedule, your equipment → a full week of workouts. Pick a goal (strength, cardio, weight loss, general fitness), how many days you can train, and what gear you own — FitnessPlan AI builds a balanced weekly plan with sets, reps, rest times, and coach notes. Log each workout to build a streak, browse the 40-exercise library, and get rest-day reminders.

**100% local.** No account, no API keys, no network calls. Your plan and log live in your browser's localStorage.

## Run it

Just open `index.html` in any browser. Or serve it:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

## Features

- **Goal-based plan generator** — strength (push/pull/legs splits), cardio (HIIT ↔ steady-state), weight-loss circuits, and full-body general plans
- **Equipment-aware** — only suggests exercises you can actually do with the gear you own (bodyweight, dumbbells, barbell, kettlebell, band, pull-up bar, jump rope, bench)
- **Smart week layout** — workouts spread across the week so muscles recover between sessions
- **40-exercise library** — searchable by name or muscle group, filterable by equipment, sortable by name/muscle/type, with equipment tags
- **Workout log + streaks** — log completed sessions, backdate missed workouts, delete mistaken entries, track your current day-streak, weekly adherence % vs your plan, and export the full log as CSV
- **Rest-day reminders** — tells you whether today is training or recovery, and names your next session

## Tests

```bash
bash test/smoke.sh   # fast sanity checks
bash test/e2e.sh     # realistic user flows
```

## Optional AI upgrade

Set `OPENAI_API_KEY` and a future version could generate fully custom programs from free-text goals ("train for a 10k", "bad knee, avoid lunges"). The built-in template engine works great without it — the key is never required.

## License

MIT
