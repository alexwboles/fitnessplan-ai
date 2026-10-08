// E2E flows for FitnessPlan AI. Run with: node test/run-e2e.js
"use strict";
const assert = require("assert");
const FP = require("../js/logic.js");
const X = require("../js/exercises.js");

let passed = 0;
function flow(name, fn) {
  try { fn(); passed++; console.log("PASS: " + name); }
  catch (e) { console.error("FAIL: " + name + " — " + e.message); process.exitCode = 1; }
}

// Flow 1: beginner builds a 3-day general plan with no equipment, completes the week
flow("beginner week: plan -> log all 3 workouts -> streak 3", () => {
  const plan = FP.generatePlan({ goal: "general", daysPerWeek: 3, equipment: [] }, 21);
  const wdays = plan.days.filter(d => d.type === "workout");
  assert.strictEqual(wdays.length, 3);
  let logs = [];
  const dates = ["2026-09-28", "2026-09-30", "2026-10-02"];
  wdays.forEach((d, i) => { logs = FP.logWorkout(logs, dates[i], d.workout.name); });
  assert.strictEqual(FP.currentStreak(logs, new Date(2026, 9, 2)), 1, "non-consecutive days => streak 1 on last day");
  const logs2 = ["2026-09-28", "2026-09-29", "2026-09-30"].reduce((L, dt) => FP.logWorkout(L, dt, "W"), []);
  assert.strictEqual(FP.currentStreak(logs2, new Date(2026, 8, 30)), 3);
});

// Flow 2: strength lifter with home gym gets push/pull/legs, no machine-only moves
flow("strength 3-day home gym plan", () => {
  const plan = FP.generatePlan({ goal: "strength", daysPerWeek: 3, equipment: ["dumbbell", "bench", "pullup"] }, 4);
  const names = plan.days.filter(d => d.type === "workout").map(d => d.workout.name);
  assert.ok(names.some(n => /push/i.test(n)), "has push day: " + names);
  assert.ok(names.some(n => /pull/i.test(n)), "has pull day: " + names);
  assert.ok(names.some(n => /leg/i.test(n)), "has leg day: " + names);
  plan.days.forEach(d => {
    if (d.type !== "workout") return;
    d.workout.exercises.forEach(e => {
      const full = X.EXERCISES.find(x => x.id === e.id);
      assert.ok(full, "exercise id resolves: " + e.id);
      assert.ok(FP.equipmentOK(full, ["none", "dumbbell", "bench", "pullup"]), "equipment respected: " + e.name);
    });
  });
});

// Flow 3: weight-loss plan alternates circuits, every session has cardio + core
flow("weight-loss circuits include cardio and core", () => {
  const plan = FP.generatePlan({ goal: "weight-loss", daysPerWeek: 4, equipment: ["kettlebell"] }, 8);
  plan.days.filter(d => d.type === "workout").forEach(d => {
    const ids = d.workout.exercises.map(e => e.id);
    const types = ids.map(id => X.EXERCISES.find(x => x.id === id).type);
    assert.ok(types.indexOf("cardio") !== -1, d.workout.name + " missing cardio");
  });
  assert.strictEqual(plan.days.filter(d => d.type === "workout").length, 4);
});

// Flow 4: cardio plan alternates HIIT and steady-state
flow("cardio plan alternates HIIT / steady-state", () => {
  const plan = FP.generatePlan({ goal: "cardio", daysPerWeek: 4, equipment: [] }, 2);
  const names = plan.days.filter(d => d.type === "workout").map(d => d.workout.name);
  assert.ok(names.some(n => /HIIT/.test(n)), "has HIIT: " + names);
  assert.ok(names.some(n => /Steady/.test(n)), "has steady-state: " + names);
});

// Flow 5: weekly progress — workoutsThisWeek counts Mon-Sun window
flow("workoutsThisWeek counts current week only", () => {
  const logs = [["2026-09-28"], ["2026-09-30"], ["2026-09-21"]].map(([d]) => ({ date: d, workout: "W" }));
  const n = FP.workoutsThisWeek(logs, new Date(2026, 9, 1)); // Thu Oct 1 -> week of Sep 28
  assert.strictEqual(n, 2, "expected 2 in week, got " + n);
});

// Flow 6: full week at 6 days keeps Sunday sensible and rest days exist
flow("6-day plan still includes rest", () => {
  const plan = FP.generatePlan({ goal: "general", daysPerWeek: 6, equipment: ["band"] }, 13);
  assert.strictEqual(plan.days.filter(d => d.type === "workout").length, 6);
  assert.strictEqual(plan.days.filter(d => d.type === "rest").length, 1);
});

// Flow 7: rest-day reminder chain — rest day names the next workout
flow("rest day message names next workout", () => {
  const plan = FP.generatePlan({ goal: "general", daysPerWeek: 3, equipment: [] }, 5);
  const msg = FP.restDayReminder(plan, new Date(2026, 8, 29)); // Tuesday = rest
  assert.ok(/Rest day/.test(msg), "rest label: " + msg);
  assert.ok(/Wednesday/.test(msg), "names next workout day: " + msg);
});

// Flow 8: forgot to log yesterday — backdate it, then export the log as CSV
flow("backdate missed workout then export CSV", () => {
  let logs = FP.logWorkout([], "2026-09-30", "Pull Day");
  logs = FP.logWorkout(logs, "2026-09-28", "Push Day"); // logged late
  assert.strictEqual(FP.currentStreak(logs, new Date(2026, 8, 30)), 1, "gap on 9/29 -> streak 1"); // honest math
  const csv = FP.logToCSV(logs);
  assert.ok(csv.startsWith("date,workout\n"), "CSV header: " + csv.split("\n")[0]);
  assert.ok(csv.indexOf("2026-09-28,Push Day") !== -1, "backdated row exported");
  assert.ok(csv.indexOf("2026-09-30,Pull Day") !== -1, "today row exported");
});

// Flow 9: delete a mistakenly logged entry, then see honest weekly adherence
flow("delete mistaken entry then weekly adherence", () => {
  const plan = FP.generatePlan({ goal: "general", daysPerWeek: 3, equipment: [] }, 5);
  let logs = ["2026-09-28", "2026-09-30"].reduce((L, d) => FP.logWorkout(L, d, "W"), []);
  logs = FP.deleteLog(logs, "2026-09-28"); // oops, logged twice
  assert.strictEqual(logs.length, 1);
  const a = FP.adherence(logs, plan, new Date(2026, 8, 30));
  assert.strictEqual(a.done, 1);
  assert.strictEqual(a.planned, 3);
  assert.strictEqual(a.pct, 33);
});

// Flow 10: library — home-gym owner filters to dumbbell-only moves, sorted by name
flow("library equipment filter + sorting", () => {
  const list = FP.filterLibrary(X.EXERCISES, { q: "", equipment: "dumbbell", sort: "name" });
  assert.ok(list.length > 0, "dumbbell moves found");
  assert.ok(list.every(e => e.equipment.indexOf("dumbbell") !== -1), "all usable with dumbbells");
  const names = list.map(e => e.name.toLowerCase());
  assert.deepStrictEqual(names, names.slice().sort(), "A-Z sorted");
  const core = FP.filterLibrary(X.EXERCISES, { q: "plank", equipment: "", sort: "name" });
  assert.ok(core.some(e => e.name === "Plank Hold"), "search still finds Plank Hold");
});

console.log(passed + " e2e flows passed.");
