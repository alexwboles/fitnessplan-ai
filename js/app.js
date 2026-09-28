// FitnessPlan AI — UI wiring. Depends on js/exercises.js + js/logic.js.
(function () {
"use strict";
const FP = window.FitnessPlan;
const EX = window.FPExercises.EXERCISES;
const store = FP.store;

const EQUIP_LABELS = { none: "Bodyweight", dumbbell: "Dumbbells", barbell: "Barbell", kettlebell: "Kettlebell", band: "Resistance band", pullup: "Pull-up bar", rope: "Jump rope", bench: "Bench / chair" };

function el(id) { return document.getElementById(id); }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }

function switchTab(name) {
  document.querySelectorAll("nav.tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".tabpage").forEach(p => p.style.display = p.id === "tab-" + name ? "" : "none");
  if (name === "log") renderLog();
  if (name === "library") renderLibrary();
}

// ---------- plan tab ----------
function renderSetup() {
  const saved = store.get("plan", null);
  let html = '<div class="card"><h2>Build your week</h2>';
  html += '<label>Goal</label><select id="f-goal">' + FP.GOALS.map(g =>
    '<option value="' + g + '"' + (saved && saved.goal === g ? " selected" : "") + '>' + g.replace("-", " ") + '</option>').join("") + '</select>';
  html += '<label>Workout days per week</label><select id="f-days">' + [1,2,3,4,5,6].map(n =>
    '<option value="' + n + '"' + (saved && saved.daysPerWeek === n ? " selected" : "") + '>' + n + '</option>').join("") + '</select>';
  html += '<label>Equipment you have</label><div class="checks">';
  Object.keys(EQUIP_LABELS).forEach(k => {
    if (k === "none") return;
    const on = saved && saved.equipment.indexOf(k) !== -1;
    html += '<label><input type="checkbox" value="' + k + '"' + (on ? " checked" : "") + '> ' + EQUIP_LABELS[k] + '</label>';
  });
  html += '</div><button class="btn" id="f-generate">Generate my plan</button></div>';
  html += '<div id="plan-out">' + (saved ? renderPlan(saved) : '<div class="card hint">No plan yet — pick a goal and generate your week.</div>') + '</div>';
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
  let html = '<div class="card"><h2>Your week — ' + esc(plan.goal.replace("-", " ")) + '</h2>';
  html += '<p class="hint">' + esc(FP.restDayReminder(plan)) + '</p><div class="week">';
  plan.days.forEach((d, i) => {
    html += '<div class="day' + (d.type === "workout" ? " workout" : "") + '"><h3>' + d.day + '</h3>';
    if (d.type === "workout") {
      html += '<div class="wname">' + esc(d.workout.name) + '</div><ul>';
      d.workout.exercises.forEach(e => { html += '<li>' + esc(e.name) + ' <span class="m">(' + esc(e.muscles) + ')</span></li>'; });
      html += '</ul><div class="rx">' + d.workout.sets + ' sets × ' + esc(d.workout.reps) + (d.workout.exercises[0] && d.workout.exercises[0].timed ? ' each' : ' reps') +
        ' · rest ' + d.workout.restSec + 's</div>';
      html += '<button class="btn ghost" data-done="' + i + '" style="margin-top:8px;padding:6px 12px;font-size:12px;">Log done</button>';
    } else {
      html += '<div class="hint">Rest — stretch, walk, sleep.</div>';
    }
    html += '</div>';
  });
  html += '</div><p class="hint" style="margin-top:10px;">' + esc(plan.workout ? "" : "") + 'Coach note: ' + esc(plan.days.find(d => d.type === "workout").workout.coachNote) + '</p></div>';
  return html;
}

function wirePlanButtons(plan) {
  document.querySelectorAll("[data-done]").forEach(b => {
    b.onclick = () => {
      const d = plan.days[parseInt(b.getAttribute("data-done"), 10)];
      const logs = FP.logWorkout(store.get("logs", []), FP.todayISO(), d.workout.name);
      store.set("logs", logs);
      b.textContent = "Logged ✓"; b.disabled = true;
    };
  });
}

// ---------- library tab ----------
let libFilter = "";
function renderLibrary() {
  const q = libFilter.toLowerCase();
  const list = EX.filter(e => !q || e.name.toLowerCase().indexOf(q) !== -1 || e.muscles.toLowerCase().indexOf(q) !== -1);
  let html = '<div class="card"><h2>Exercise library (' + list.length + ')</h2>';
  html += '<input type="text" id="lib-q" placeholder="Search exercises or muscles…" value="' + esc(libFilter) + '"><div class="exgrid" style="margin-top:12px;">';
  list.forEach(e => {
    html += '<div class="ex"><b>' + esc(e.name) + '</b><span class="m">' + esc(e.muscles) + ' · ' + e.type + '</span><br>' +
      e.equipment.map(k => '<span class="eq">' + EQUIP_LABELS[k] + '</span>').join(" ") + '</div>';
  });
  html += '</div></div>';
  el("tab-library").innerHTML = html;
  el("lib-q").oninput = ev => { libFilter = ev.target.value; renderLibrary(); const q2 = el("lib-q"); q2.focus(); q2.setSelectionRange(q2.value.length, q2.value.length); };
}

// ---------- log tab ----------
function renderLog() {
  const logs = store.get("logs", []);
  const streak = FP.currentStreak(logs);
  const week = FP.workoutsThisWeek(logs);
  const plan = store.get("plan", null);
  let html = '<div class="card"><h2>Progress</h2><div class="streak"><div><div class="num">' + streak + '</div><div class="hint">day streak</div></div>' +
    '<div><div class="num">' + week + '</div><div class="hint">workouts this week' + (plan ? ' (goal: ' + plan.daysPerWeek + ')' : '') + '</div></div></div></div>';
  html += '<div class="card"><h2>Workout log</h2>';
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
