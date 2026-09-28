// FitnessPlan AI — UI wiring. Depends on js/exercises.js + js/logic.js.
(function () {
"use strict";
const FP = window.FitnessPlan;
const EX = window.FPExercises.EXERCISES;
const store = FP.store;

const EQUIP_LABELS = { none: "Bodyweight", dumbbell: "Dumbbells", barbell: "Barbell", kettlebell: "Kettlebell", band: "Resistance band", pullup: "Pull-up bar", rope: "Jump rope", bench: "Bench / chair" };

function el(id) { return document.getElementById(id); }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
function todayIdx() { return (new Date().getDay() + 6) % 7; } // Monday=0

function switchTab(name) {
  document.querySelectorAll("nav.tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".tabpage").forEach(p => p.style.display = p.id === "tab-" + name ? "" : "none");
  if (name === "log") renderLog();
  if (name === "library") renderLibrary();
}

// ---------- plan tab ----------
function renderSetup() {
  const saved = store.get("plan", null);
  let html = '<p class="kicker">Training program</p><h2 class="title">My plan</h2>' +
    '<p class="lede">Your goal, your schedule, your equipment — a full week of workouts built around recovery.</p>';
  html += '<div class="card"><h3>Build your week</h3>' +
    '<div class="field"><span class="lbl">Goal</span><select id="f-goal">' + FP.GOALS.map(g =>
      '<option value="' + g + '"' + (saved && saved.goal === g ? " selected" : "") + '>' + esc(g.replace("-", " ")) + '</option>').join("") + '</select></div>';
  html += '<div class="field"><span class="lbl">Workout days per week</span><select id="f-days">' + [1,2,3,4,5,6].map(n =>
    '<option value="' + n + '"' + (saved && saved.daysPerWeek === n ? " selected" : "") + '>' + n + '</option>').join("") + '</select></div>';
  html += '<div class="field"><span class="lbl">Equipment you have</span><div class="chips">';
  Object.keys(EQUIP_LABELS).forEach(k => {
    if (k === "none") return;
    const on = saved && saved.equipment.indexOf(k) !== -1;
    html += '<label class="chip-check"><input type="checkbox" value="' + k + '"' + (on ? " checked" : "") + '><span>' + EQUIP_LABELS[k] + '</span></label>';
  });
  html += '</div></div><button class="btn" id="f-generate">Generate my plan</button></div>';
  html += '<div id="plan-out" style="margin-top:18px">' + (saved ? renderPlan(saved) : '<div class="empty">No plan yet — pick a goal and generate your week.</div>') + '</div>';
  el("tab-plan").innerHTML = html;
  el("f-generate").onclick = () => {
    const equipment = Array.prototype.slice.call(document.querySelectorAll('#tab-plan input[type=checkbox]:checked')).map(c => c.value);
    const plan = FP.generatePlan({ goal: el("f-goal").value, daysPerWeek: parseInt(el("f-days").value, 10), equipment });
    store.set("plan", plan);
    el("plan-out").innerHTML = renderPlan(plan);
    wirePlanButtons(plan);
  };
  if (saved) wirePlanButtons(saved);
}

function renderPlan(plan) {
  const ti = todayIdx();
  const today = plan.days[ti];
  let html = '<section class="today"><p class="kicker"><span class="dot"></span>Today · ' + esc(today.day) + '</p>';
  if (today.type === "workout") {
    html += '<h2>' + esc(today.workout.name) + '</h2><p>' + esc(FP.restDayReminder(plan)) + '</p>';
    html += '<div class="session-meta"><span class="pill">' + today.workout.exercises.length + ' exercises</span>' +
      '<span class="pill">' + today.workout.sets + ' sets × ' + esc(today.workout.reps) + (today.workout.exercises[0] && today.workout.exercises[0].timed ? ' each' : ' reps') + '</span>' +
      '<span class="pill">rest ' + today.workout.restSec + 's</span></div>';
  } else {
    html += '<h2>Recovery day</h2><p>' + esc(FP.restDayReminder(plan)) + '</p>' +
      '<div class="session-meta"><span class="pill dim">stretch</span><span class="pill dim">walk</span><span class="pill dim">sleep</span></div>';
  }
  html += '</section>';

  html += '<p class="kicker">The week</p><div class="week-strip">';
  plan.days.forEach((d, i) => {
    if (d.type === "workout") {
      html += '<div class="day workout' + (i === ti ? ' is-today' : '') + '"><span class="dow">' + d.day.slice(0, 3) + '</span>' +
        '<span class="wname">' + esc(d.workout.name) + '</span>' +
        '<span class="mini">' + d.workout.exercises.length + ' exercises</span></div>';
    } else {
      html += '<div class="day rest' + (i === ti ? ' is-today' : '') + '"><span class="dow">' + d.day.slice(0, 3) + '</span>' +
        '<span class="rest-tag">Rest</span><span class="mini">recover</span></div>';
    }
  });
  html += '</div>';

  html += '<p class="kicker">Sessions in detail</p>';
  plan.days.forEach((d, i) => {
    if (d.type !== "workout") return;
    html += '<div class="card session"><h3>' + esc(d.day) + ' — ' + esc(d.workout.name) + '</h3>';
    html += '<ul class="ex-list">';
    d.workout.exercises.forEach(e => { html += '<li><span>' + esc(e.name) + '</span><span class="m">' + esc(e.muscles) + '</span></li>'; });
    html += '</ul><div class="rx-row"><span class="pill">' + d.workout.sets + ' sets</span>' +
      '<span class="pill">' + esc(d.workout.reps) + (d.workout.exercises[0] && d.workout.exercises[0].timed ? ' each' : ' reps') + '</span>' +
      '<span class="pill">' + d.workout.restSec + 's rest</span></div>';
    html += '<div style="margin-top:14px"><button class="btn ghost small" data-done="' + i + '">Log done</button></div></div>';
  });
  const coach = plan.days.find(d => d.type === "workout");
  if (coach) html += '<p class="coach"><strong>Coach note:</strong> ' + esc(coach.workout.coachNote) + '</p>';
  return html;
}

function wirePlanButtons(plan) {
  document.querySelectorAll("[data-done]").forEach(b => {
    b.onclick = () => {
      const d = plan.days[parseInt(b.getAttribute("data-done"), 10)];
      const logs = FP.logWorkout(store.get("logs", []), FP.todayISO(), d.workout.name);
      store.set("logs", logs);
      b.textContent = "Logged"; b.disabled = true;
    };
  });
}

// ---------- library tab ----------
let libFilter = "";
function renderLibrary() {
  const q = libFilter.toLowerCase();
  const list = EX.filter(e => !q || e.name.toLowerCase().indexOf(q) !== -1 || e.muscles.toLowerCase().indexOf(q) !== -1);
  let html = '<p class="kicker">Movement index</p><h2 class="title">Exercise library</h2>' +
    '<p class="lede">' + list.length + ' movements, filtered to the equipment you own when you generate a plan.</p>';
  html += '<div class="lib-head"><div class="search">' +
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="#8b948f" stroke-width="1.6"/><path d="M11 11l3 3" stroke="#8b948f" stroke-width="1.6" stroke-linecap="round"/></svg>' +
    '<input type="text" id="lib-q" placeholder="Search exercises or muscles…" value="' + esc(libFilter) + '"></div></div>';
  html += '<div class="exgrid">';
  list.forEach(e => {
    html += '<div class="ex"><div class="ex-name">' + esc(e.name) + '</div><div class="ex-muscles">' + esc(e.muscles) + '</div>' +
      '<div class="eq-row">' + e.equipment.map(k => '<span class="eq">' + EQUIP_LABELS[k] + '</span>').join("") + '</div>' +
      '<span class="ex-type">' + esc(e.type) + '</span></div>';
  });
  html += '</div>';
  el("tab-library").innerHTML = html;
  el("lib-q").oninput = ev => { libFilter = ev.target.value; renderLibrary(); const q2 = el("lib-q"); q2.focus(); q2.setSelectionRange(q2.value.length, q2.value.length); };
}

// ---------- log tab ----------
function renderLog() {
  const logs = store.get("logs", []);
  const streak = FP.currentStreak(logs);
  const week = FP.workoutsThisWeek(logs);
  const plan = store.get("plan", null);
  let html = '<p class="kicker">Consistency</p><h2 class="title">Progress</h2><p class="lede">Show up, log it, watch the chain grow.</p>';
  html += '<div class="stat-band">' +
    '<div class="stat"><div class="num">' + streak + '</div><div class="lbl">day streak</div></div>' +
    '<div class="stat"><div class="num">' + week + '</div><div class="lbl">this week' + (plan ? ' / goal ' + plan.daysPerWeek : '') + '</div></div>' +
    '<div class="stat"><div class="num">' + logs.length + '</div><div class="lbl">total sessions</div></div></div>';
  html += '<div class="card"><h3>Workout log</h3>';
  if (!logs.length) html += '<p class="hint">Nothing logged yet. Finish a workout on the Plan tab and hit "Log done".</p>';
  else {
    html += '<table class="log"><tr><th>Date</th><th>Workout</th></tr>';
    logs.slice().reverse().slice(0, 30).forEach(l => { html += '<tr><td>' + esc(l.date) + '</td><td>' + esc(l.workout || "—") + '</td></tr>'; });
    html += '</table>';
  }
  html += '</div>';
  el("tab-log").innerHTML = html;
}

document.addEventListener("DOMContentLoaded", () => {
  renderSetup();
  document.querySelectorAll("nav.tabs button").forEach(b => { b.onclick = () => switchTab(b.dataset.tab); });
});
})();
