// FitnessPlan AI — exercise library (browser + node compatible).
(function () {
"use strict";

// equipment keys: "none" (bodyweight), "dumbbell", "barbell", "kettlebell", "band", "pullup", "rope", "bench"
// type: strength | cardio | core | mobility
const EXERCISES = [
  // ---- bodyweight ----
  { id: "pushup", name: "Push-Up", muscles: "chest, shoulders, triceps", equipment: ["none"], type: "strength" },
  { id: "squat", name: "Bodyweight Squat", muscles: "quads, glutes", equipment: ["none"], type: "strength" },
  { id: "lunge", name: "Walking Lunge", muscles: "quads, glutes, hamstrings", equipment: ["none"], type: "strength" },
  { id: "plank", name: "Plank Hold", muscles: "core", equipment: ["none"], type: "core", timed: true },
  { id: "burpee", name: "Burpee", muscles: "full body", equipment: ["none"], type: "cardio" },
  { id: "mtclimber", name: "Mountain Climber", muscles: "core, legs", equipment: ["none"], type: "cardio" },
  { id: "glutebridge", name: "Glute Bridge", muscles: "glutes, hamstrings", equipment: ["none"], type: "strength" },
  { id: "superman", name: "Superman", muscles: "lower back", equipment: ["none"], type: "strength" },
  { id: "jumpingjack", name: "Jumping Jack", muscles: "full body", equipment: ["none"], type: "cardio", timed: true },
  { id: "highknees", name: "High Knees", muscles: "legs, core", equipment: ["none"], type: "cardio", timed: true },
  { id: "situp", name: "Sit-Up", muscles: "abs", equipment: ["none"], type: "core" },
  { id: "tricepdip", name: "Chair Tricep Dip", muscles: "triceps", equipment: ["bench"], type: "strength" },
  { id: "wallsit", name: "Wall Sit", muscles: "quads", equipment: ["none"], type: "strength", timed: true },
  { id: "birddog", name: "Bird Dog", muscles: "core, back", equipment: ["none"], type: "core" },
  { id: "deadbug", name: "Dead Bug", muscles: "core", equipment: ["none"], type: "core" },
  { id: "calfraise", name: "Calf Raise", muscles: "calves", equipment: ["none"], type: "strength" },
  // ---- dumbbell ----
  { id: "dbpress", name: "Dumbbell Chest Press", muscles: "chest, triceps", equipment: ["dumbbell", "bench"], type: "strength" },
  { id: "dbpress_floor", name: "Dumbbell Floor Press", muscles: "chest, triceps", equipment: ["dumbbell"], type: "strength" },
  { id: "dbrow", name: "Dumbbell Row", muscles: "back, biceps", equipment: ["dumbbell"], type: "strength" },
  { id: "gobletsquat", name: "Goblet Squat", muscles: "quads, glutes", equipment: ["dumbbell", "kettlebell"], type: "strength" },
  { id: "dbohpress", name: "Dumbbell Overhead Press", muscles: "shoulders", equipment: ["dumbbell"], type: "strength" },
  { id: "dbcurl", name: "Dumbbell Bicep Curl", muscles: "biceps", equipment: ["dumbbell"], type: "strength" },
  { id: "dbdeadlift", name: "Dumbbell Deadlift", muscles: "hamstrings, glutes, back", equipment: ["dumbbell"], type: "strength" },
  { id: "dblateral", name: "Lateral Raise", muscles: "shoulders", equipment: ["dumbbell"], type: "strength" },
  // ---- barbell ----
  { id: "bbsquat", name: "Barbell Squat", muscles: "quads, glutes", equipment: ["barbell"], type: "strength" },
  { id: "bbbench", name: "Barbell Bench Press", muscles: "chest, triceps", equipment: ["barbell", "bench"], type: "strength" },
  { id: "bbdeadlift", name: "Barbell Deadlift", muscles: "hamstrings, glutes, back", equipment: ["barbell"], type: "strength" },
  { id: "bbohpress", name: "Barbell Overhead Press", muscles: "shoulders", equipment: ["barbell"], type: "strength" },
  { id: "bbrow", name: "Barbell Row", muscles: "back, biceps", equipment: ["barbell"], type: "strength" },
  // ---- kettlebell ----
  { id: "kbswing", name: "Kettlebell Swing", muscles: "glutes, hamstrings, back", equipment: ["kettlebell"], type: "strength" },
  { id: "kbdeadlift", name: "Kettlebell Deadlift", muscles: "hamstrings, glutes", equipment: ["kettlebell"], type: "strength" },
  // ---- band ----
  { id: "bandpull", name: "Band Pull-Apart", muscles: "upper back, shoulders", equipment: ["band"], type: "strength" },
  { id: "bandrow", name: "Band Row", muscles: "back, biceps", equipment: ["band"], type: "strength" },
  { id: "bandsquat", name: "Band Squat", muscles: "quads, glutes", equipment: ["band"], type: "strength" },
  // ---- pull-up bar ----
  { id: "pullup", name: "Pull-Up", muscles: "back, biceps", equipment: ["pullup"], type: "strength" },
  { id: "chinup", name: "Chin-Up", muscles: "biceps, back", equipment: ["pullup"], type: "strength" },
  { id: "hangknee", name: "Hanging Knee Raise", muscles: "abs", equipment: ["pullup"], type: "core" },
  // ---- cardio gear ----
  { id: "jumprope", name: "Jump Rope", muscles: "full body", equipment: ["rope"], type: "cardio", timed: true },
  { id: "shadowbox", name: "Shadow Boxing", muscles: "shoulders, core", equipment: ["none"], type: "cardio", timed: true }
];

const api = { EXERCISES };
if (typeof window !== "undefined") window.FPExercises = api;
if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
