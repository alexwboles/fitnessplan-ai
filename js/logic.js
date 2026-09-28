// FitnessPlan AI — pure logic layer (browser + node compatible).
// All state lives in localStorage; no network calls.
(function () {
"use strict";

const E = (typeof require !== "undefined")
  ? require("./exercises.js")
  : window.FPExercises;

const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem("fitnessplan:" + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem("fitnessplan:" + key, JSON.stringify(value)); } catch (e) {}
  }
};

const GOALS = ["strength", "cardio", "weight-loss", "general"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Sets/reps guidance per goal. timed exercises use seconds instead of reps.
const PRESCRIPTIONS = {
  "strength":    { sets: 4, reps: "6–8",  restSec: 90, note: "Heavy, controlled reps. Add weight when all sets hit 8." },
  "cardio":      { sets: 4, reps: "40s on / 20s off", restSec: 60, note: "Intervals: push hard during work, easy during rest." },
  "weight-loss": { sets: 3, reps: "12–15", restSec: 45, note: "Circuit style: move exercise to exercise, short rests." },
  "general":     { sets: 3, reps: "10",   restSec: 60, note: "Steady effort — you should finish feeling worked, not wrecked." }
};

function equipmentOK(ex, owned) {
  return ex.equipment.every(eq => owned.indexOf(eq) !== -1);
}

function pick(pool, n, seed) {
  // deterministic-ish pick: rotate through pool by seed offset
  const out = [];
  for (let i = 0; i < n && pool.length; i++) out.push(pool[(seed + i) % pool.length]);
  return out;
}

function byType(pool, type) { return pool.filter(e => e.type === type); }
function byMuscle(pool, words) {
  return pool.filter(e => words.some(w => e.muscles.indexOf(w) !== -1));
}

function strengthSplit(pool, days, seed) {
  // Named splits so consecutive days hit different muscles.
  const upper = pool.filter(e => /chest|shoulder|tricep|bicep|back|abs|core/.test(e.muscles));
  const lower = byMuscle(pool, ["quad", "glute", "hamstring", "calv"]);
  const push  = byMuscle(pool, ["chest", "shoulder", "tricep"]);
  const pull  = byMuscle(pool, ["back", "bicep"]);
  const legs  = lower;
  const core  = byType(pool, "core");
  const fb    = pool.filter(e => e.type === "strength" || e.type === "core");
  function sess(name, list) {
    const exs = pick(list.length ? list : fb, 5, seed).concat(pick(core, 1, seed + 3));
    return { name, exercises: exs.slice(0, 6) };
  }
  if (days === 2) return [sess("Upper Body", upper), sess("Lower Body", lower)];
  if (days === 3) return [sess("Push Day", push), sess("Pull Day", pull), sess("Leg Day", legs)];
  if (days === 4) return [sess("Upper Body", upper), sess("Lower Body", lower), sess("Push Day", push), sess("Pull + Legs", pull.concat(legs))];
  const out = [];
  const names = ["Push Day", "Pull Day", "Leg Day", "Upper Body", "Lower Body", "Full Body"];
  const lists = [push, pull, legs, upper, lower, fb];
  for (let i = 0; i < days; i++) out.push(sess(names[i % names.length], lists[i % lists.length]));
  return out;
}

function cardioSplit(pool, days, seed) {
  const cardio = byType(pool, "cardio");
  const core = byType(pool, "core");
  const src = cardio.length ? cardio : pool;
  const out = [];
  for (let i = 0; i < days; i++) {
    const kind = i % 2 === 0 ? "HIIT Intervals" : "Steady-State Cardio";
    const exs = pick(src, 4, seed + i).concat(pick(core, 1, seed + i));
    out.push({ name: kind, exercises: exs.slice(0, 5) });
  }
  return out;
}

function weightLossSplit(pool, days, seed) {
  const str = pool.filter(e => e.type === "strength");
  const card = byType(pool, "cardio");
  const core = byType(pool, "core");
  const out = [];
  for (let i = 0; i < days; i++) {
    const exs = pick(str, 3, seed + i)
      .concat(pick(card, 2, seed + i + 5))
      .concat(pick(core, 1, seed + i + 9));
    out.push({ name: "Fat-Burn Circuit", exercises: exs.slice(0, 6) });
  }
  return out;
}

function generalSplit(pool, days, seed) {
  const str = pool.filter(e => e.type === "strength");
  const card = byType(pool, "cardio");
  const core = byType(pool, "core");
  const out = [];
  for (let i = 0; i < days; i++) {
    const exs = pick(str, 3, seed + i)
      .concat(pick(card, 1, seed + i + 4))
      .concat(pick(core, 1, seed + i + 8));
    out.push({ name: "Full-Body Mix", exercises: exs.slice(0, 5) });
  }
  return out;
}

function generatePlan(opts, seed) {
  seed = seed == null ? Date.now() % 100000 : seed;
  const goal = GOALS.indexOf(opts.goal) !== -1 ? opts.goal : "general";
  const days = Math.min(6, Math.max(1, opts.daysPerWeek | 0 || 3));
  const owned = ["none"].concat(opts.equipment || []);
  const pool = E.EXERCISES.filter(e => equipmentOK(e, owned));
  const usable = pool.length >= 4 ? pool : E.EXERCISES.filter(e => e.equipment.indexOf("none") !== -1);

  const builders = { strength: strengthSplit, cardio: cardioSplit, "weight-loss": weightLossSplit, general: generalSplit };
  const sessions = builders[goal](usable, days, seed);
  const rx = PRESCRIPTIONS[goal];

  // spread workouts across the week with rest days between
  const week = DAYS.map((day, i) => ({ day, type: "rest", workout: null }));
  const slots = [];
  if (days === 1) slots.push(1);
  else if (days === 2) slots.push(1, 4);
  else if (days === 3) slots.push(0, 2, 4);
  else if (days === 4) slots.push(0, 2, 4, 5);
  else if (days === 5) slots.push(0, 1, 3, 4, 5);
  else slots.push(0, 1, 2, 4, 5, 6);
  sessions.forEach((s, i) => {
    const idx = slots[i % slots.length];
    week[idx] = {
      day: week[idx].day,
      type: "workout",
      workout: {
        name: s.name,
        goal,
        sets: rx.sets,
        reps: rx.reps,
        restSec: rx.restSec,
        coachNote: rx.note,
        exercises: s.exercises.map(e => ({ id: e.id, name: e.name, muscles: e.muscles, timed: !!e.timed }))
      }
    };
  });
  return { goal, daysPerWeek: days, equipment: owned, days: week, createdAt: new Date().toISOString().slice(0, 10) };
}

// ---- workout log + streaks ----
function todayISO(d) {
  const t = d || new Date();
  return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
}

function logWorkout(logs, dateISO, workoutName) {
  logs = logs || [];
  if (!logs.some(l => l.date === dateISO)) logs.push({ date: dateISO, workout: workoutName || "" });
  return logs.sort((a, b) => a.date < b.date ? -1 : 1);
}

function currentStreak(logs, refDate) {
  // consecutive calendar days with a logged workout, counting back from refDate (default today)
  if (!logs || !logs.length) return 0;
  const set = {};
  logs.forEach(l => { set[l.date] = true; });
  const ref = refDate || new Date();
  let cursor = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  // allow today to be unlogged (streak alive if yesterday logged)
  if (!set[todayISO(cursor)]) cursor = new Date(cursor.getTime() - 86400000);
  let streak = 0;
  while (set[todayISO(cursor)]) { streak++; cursor = new Date(cursor.getTime() - 86400000); }
  return streak;
}

function workoutsThisWeek(logs, refDate) {
  const ref = refDate || new Date();
  const dow = (ref.getDay() + 6) % 7; // Monday=0
  const monday = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - dow);
  const set = {};
  (logs || []).forEach(l => { set[l.date] = true; });
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getTime() + i * 86400000);
    if (set[todayISO(d)]) n++;
  }
  return n;
}

function restDayReminder(plan, dateObj) {
  const d = dateObj || new Date();
  const idx = (d.getDay() + 6) % 7;
  const entry = plan.days[idx];
  if (entry.type === "rest") {
    return "Rest day (" + entry.day + "). Recovery is training too — stretch, hydrate, sleep well. Next workout: " +
      nextWorkoutDay(plan, idx) + ".";
  }
  return "Today is " + entry.workout.name + " day (" + entry.day + "). " +
    entry.workout.exercises.length + " exercises, " + entry.workout.sets + " sets each. You've got this.";
}

function nextWorkoutDay(plan, fromIdx) {
  for (let i = 1; i <= 7; i++) {
    const e = plan.days[(fromIdx + i) % 7];
    if (e.type === "workout") return e.day + " — " + e.workout.name;
  }
  return "none scheduled";
}

const api = { store, GOALS, DAYS, PRESCRIPTIONS, generatePlan, todayISO, logWorkout,
              currentStreak, workoutsThisWeek, restDayReminder, equipmentOK };

if (typeof window !== "undefined") window.FitnessPlan = api;
if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
