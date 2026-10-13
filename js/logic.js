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
  return { goal, daysPerWeek: days, equipment: owned, days: week, seed, createdAt: new Date().toISOString().slice(0, 10) };
}

// Re-roll one day's workout with a fresh seed — same goal/schedule, new exercises.
// Mutates and returns the plan (also persisted by the caller).
function shuffleSession(plan, dayIdx) {
  if (!plan || !plan.days || !plan.days[dayIdx] || plan.days[dayIdx].type !== "workout") return plan;
  const base = (plan.seed == null ? 0 : plan.seed) + 1 + dayIdx * 7919 + Math.floor(Math.random() * 100000);
  const owned = (plan.equipment || []).filter(e => e !== "none");
  const fresh = generatePlan({ goal: plan.goal, daysPerWeek: plan.daysPerWeek, equipment: owned }, base);
  const nw = fresh.days[dayIdx];
  if (nw && nw.type === "workout") plan.days[dayIdx].workout = nw.workout;
  plan.seed = base;
  return plan;
}

// ---- workout log + streaks ----
function todayISO(d) {
  const t = d || new Date();
  return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
}

function logWorkout(logs, dateISO, workoutName, meta) {
  logs = logs || [];
  if (!logs.some(l => l.date === dateISO)) {
    const entry = { date: dateISO, workout: workoutName || "" };
    if (meta) {
      const mins = parseInt(meta.minutes, 10);
      const rpe = parseInt(meta.effort, 10);
      if (mins > 0 && mins <= 600) entry.minutes = mins;
      if (rpe >= 1 && rpe <= 10) entry.effort = rpe;
    }
    logs.push(entry);
  }
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

// Swap one exercise for a different one hitting the same muscles.
// Candidates share a muscle word, match timed-ness, respect owned
// equipment, and aren't already in the session. Mutates + returns plan.
function swapExercise(plan, dayIdx, exIdx) {
  if (!plan || !plan.days || !plan.days[dayIdx] || plan.days[dayIdx].type !== "workout") return plan;
  const w = plan.days[dayIdx].workout;
  if (!w.exercises[exIdx]) return plan;
  const cur = w.exercises[exIdx];
  const owned = plan.equipment || ["none"];
  const inSession = new Set(w.exercises.map(e => e.id));
  const pool = E.EXERCISES.filter(e => equipmentOK(e, owned));
  const words = String(cur.muscles).split(/[\s,\/]+/).filter(Boolean);
  let cands = pool.filter(e =>
    e.id !== cur.id && !inSession.has(e.id) && !!e.timed === !!cur.timed &&
    words.some(m => e.muscles.indexOf(m) !== -1));
  if (!cands.length) {
    cands = pool.filter(e => e.id !== cur.id && !inSession.has(e.id) && !!e.timed === !!cur.timed);
  }
  if (!cands.length) return plan;
  const e = cands[Math.floor(Math.random() * cands.length)];
  w.exercises[exIdx] = { id: e.id, name: e.name, muscles: e.muscles, timed: !!e.timed };
  return plan;
}

// All-time longest run of consecutive logged days.
function longestStreak(logs) {
  if (!logs || !logs.length) return 0;
  const days = Array.from(new Set(logs.map(l => l.date))).sort();
  let best = 1, run = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1] + "T00:00:00").getTime();
    const cur = new Date(days[i] + "T00:00:00").getTime();
    if (cur - prev === 86400000) { run++; if (run > best) best = run; }
    else run = 1;
  }
  return best;
}

// mm:ss display for the rest timer.
function formatRest(sec) {
  sec = Math.max(0, Math.round(sec));
  return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
}

// ---- log management: delete + CSV export ----
function deleteLog(logs, dateISO) {
  return (logs || []).filter(l => l.date !== dateISO);
}

function csvEsc(v) {
  const s = String(v == null ? "" : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function logToCSV(logs) {
  // minutes/effort columns appear only when at least one entry carries them —
  // plain logs keep the original two-column export.
  const withMeta = (logs || []).some(l => l.minutes || l.effort);
  const rows = [withMeta ? ["date", "workout", "minutes", "effort"] : ["date", "workout"]];
  (logs || []).slice().sort((a, b) => a.date < b.date ? -1 : 1)
    .forEach(l => {
      const row = [csvEsc(l.date), csvEsc(l.workout || "")];
      if (withMeta) row.push(l.minutes || "", l.effort || "");
      rows.push(row);
    });
  return rows.map(r => r.join(",")).join("\n");
}

// Sessions + minutes trained per month for the last 6 calendar months.
function monthlyVolume(logs) {
  const out = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    out.push({ month: key, label: d.toLocaleDateString("en-US", { month: "short" }), sessions: 0, minutes: 0 });
  }
  const map = {};
  out.forEach(o => { map[o.month] = o; });
  (logs || []).forEach(l => {
    const k = String(l.date || "").slice(0, 7);
    if (map[k]) {
      map[k].sessions++;
      map[k].minutes += Math.max(0, parseInt(l.minutes, 10) || 0);
    }
  });
  return out;
}

// ---- library: filter by query + equipment, sort by name/muscles/type ----
function filterLibrary(exercises, opts) {
  opts = opts || {};
  const q = String(opts.q || "").toLowerCase();
  const eq = opts.equipment || ""; // equipment key; "" = any
  const type = opts.type || ""; // workout type; "" = any
  const sort = opts.sort || "name";
  let list = exercises.filter(e =>
    (!q || e.name.toLowerCase().indexOf(q) !== -1 || e.muscles.toLowerCase().indexOf(q) !== -1) &&
    (!eq || e.equipment.indexOf(eq) !== -1) &&
    (!type || e.type === type));
  const key = sort === "muscles" ? (e => e.muscles) : sort === "type" ? (e => e.type) : (e => e.name);
  return list.slice().sort((a, b) => key(a).toLowerCase() < key(b).toLowerCase() ? -1 : 1);
}

// ---- weekly adherence: logged sessions vs planned ----
function adherence(logs, plan, refDate) {
  const planned = plan && plan.days ? plan.days.filter(d => d.type === "workout").length : 0;
  const done = workoutsThisWeek(logs, refDate);
  const pct = planned > 0 ? Math.round((done / planned) * 100) : 0;
  return { done, planned, pct: Math.min(pct, 100) };
}

const api = { store, GOALS, DAYS, PRESCRIPTIONS, generatePlan, shuffleSession, swapExercise, todayISO, logWorkout, deleteLog,
              logToCSV, filterLibrary, adherence, monthlyVolume,
              currentStreak, longestStreak, formatRest, workoutsThisWeek, restDayReminder, equipmentOK };

if (typeof window !== "undefined") window.FitnessPlan = api;
if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
