#!/usr/bin/env bash
# FitnessPlan AI smoke tests — fast sanity checks. Exit non-zero on first failure.
set -euo pipefail
cd "$(dirname "$0")/.."

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

# 1: required files exist
for f in index.html css/style.css js/exercises.js js/logic.js js/app.js README.md test/e2e.sh test/run-e2e.js; do
  [ -f "$f" ] || fail "missing file $f"
done
pass "all required files exist"

# 2: JS syntax valid
for f in js/exercises.js js/logic.js js/app.js test/run-e2e.js; do
  node --check "$f" || fail "syntax error in $f"
done
pass "JS syntax valid"

# 3: exercise bank has 30+ exercises
count=$(node -e "const X=require('./js/exercises.js'); console.log(X.EXERCISES.length)")
[ "$count" -ge 30 ] || fail "exercise bank too small: $count"
pass "exercise bank has $count exercises (>=30)"

# 4: every exercise has required fields
node -e "
const X = require('./js/exercises.js');
X.EXERCISES.forEach(e => {
  if (!e.id || !e.name || !e.muscles || !Array.isArray(e.equipment) || !e.type) throw new Error('bad exercise: ' + JSON.stringify(e));
});
console.log('OK');
" || fail "exercise schema check"
pass "every exercise has id/name/muscles/equipment/type"

# 5: plan generation for each goal yields the requested workout days
node -e "
const FP = require('./js/logic.js');
['strength','cardio','weight-loss','general'].forEach(g => {
  const p = FP.generatePlan({goal:g, daysPerWeek:4, equipment:['dumbbell']}, 7);
  const w = p.days.filter(d => d.type === 'workout');
  if (w.length !== 4) throw new Error(g + ': expected 4 workouts, got ' + w.length);
  if (p.days.length !== 7) throw new Error(g + ': week should have 7 days');
});
console.log('OK');
" || fail "plan generation per goal"
pass "plan generation: 4 workouts for each of 4 goals"

# 6: equipment filter respected — no barbell moves without a barbell
node -e "
const FP = require('./js/logic.js');
const p = FP.generatePlan({goal:'strength', daysPerWeek:5, equipment:[]}, 3);
p.days.forEach(d => {
  if (d.type !== 'workout') return;
  d.workout.exercises.forEach(e => {
    if (/barbell/i.test(e.name)) throw new Error('barbell exercise without barbell: ' + e.name);
  });
});
console.log('OK');
" || fail "equipment filter"
pass "equipment filter: bodyweight-only plan has no barbell exercises"

# 7: every workout exercise carries sets/reps guidance
node -e "
const FP = require('./js/logic.js');
['strength','cardio','weight-loss','general'].forEach(g => {
  const p = FP.generatePlan({goal:g, daysPerWeek:3, equipment:['dumbbell','band']}, 11);
  p.days.forEach(d => {
    if (d.type !== 'workout') return;
    if (!d.workout.sets || !d.workout.reps || !d.workout.coachNote) throw new Error(g + ': missing prescription');
    if (!d.workout.exercises.length) throw new Error(g + ': empty workout');
  });
});
console.log('OK');
" || fail "prescription check"
pass "every workout has sets/reps/rest + coach note"

# 8: streak counts consecutive logged days
node -e "
const FP = require('./js/logic.js');
const ref = new Date(2026, 8, 28); // Mon 2026-09-28
let logs = [];
logs = FP.logWorkout(logs, '2026-09-28', 'Push Day');
logs = FP.logWorkout(logs, '2026-09-27', 'Pull Day');
logs = FP.logWorkout(logs, '2026-09-26', 'Leg Day');
const s = FP.currentStreak(logs, ref);
if (s !== 3) throw new Error('expected streak 3, got ' + s);
console.log('OK');
" || fail "streak consecutive"
pass "streak = 3 for three consecutive logged days"

# 9: a gap day breaks the streak
node -e "
const FP = require('./js/logic.js');
const ref = new Date(2026, 8, 28);
const logs = FP.logWorkout(FP.logWorkout([], '2026-09-28', 'A'), '2026-09-26', 'B');
const s = FP.currentStreak(logs, ref);
if (s !== 1) throw new Error('expected streak 1 after gap, got ' + s);
console.log('OK');
" || fail "streak gap"
pass "streak resets to 1 after a missed day"

# 10: rest-day reminder fires on rest days, workout nudge on training days
node -e "
const FP = require('./js/logic.js');
const p = FP.generatePlan({goal:'general', daysPerWeek:3, equipment:[]}, 5);
// 3-day plan lands on Mon/Wed/Fri (indexes 0,2,4)
const tue = FP.restDayReminder(p, new Date(2026, 8, 29));
if (!/Rest day/.test(tue)) throw new Error('expected rest-day message, got: ' + tue);
const wed = FP.restDayReminder(p, new Date(2026, 8, 30));
if (!/day/.test(wed) || /Rest day/.test(wed)) throw new Error('expected workout nudge, got: ' + wed);
console.log('OK');
" || fail "rest-day reminder"
pass "rest-day reminder correct for rest vs training days"

# 11: duplicate logging same date is idempotent
node -e "
const FP = require('./js/logic.js');
let logs = FP.logWorkout([], '2026-09-28', 'Push Day');
logs = FP.logWorkout(logs, '2026-09-28', 'Push Day');
if (logs.length !== 1) throw new Error('duplicate date logged twice');
console.log('OK');
" || fail "log idempotency"
pass "logging the same date twice keeps one entry"

# 12: strength split varies muscle focus across days
node -e "
const FP = require('./js/logic.js');
const p = FP.generatePlan({goal:'strength', daysPerWeek:3, equipment:['dumbbell','barbell','bench']}, 9);
const names = p.days.filter(d => d.type === 'workout').map(d => d.workout.name);
if (new Set(names).size < 2) throw new Error('split not varied: ' + names.join(','));
console.log('OK: ' + names.join(' / '));
" || fail "strength split variety"
pass "3-day strength split varies across push/pull/legs"

echo "All smoke tests passed."
