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

  if (today.type === "workout") {
    html += '<div class="card rest-timer"><h3>Rest timer</h3>' +
      '<div class="rt-display" id="restTime">' + FP.formatRest(today.workout.restSec) + '</div>' +
      '<div class="rt-controls">' +
      '<button class="btn ghost small" id="restMinus">−10s</button>' +
      '<button class="btn small" id="restStart">Start</button>' +
      '<button class="btn ghost small" id="restPause" disabled>Pause</button>' +
      '<button class="btn ghost small" id="restReset">Reset</button>' +
      '<button class="btn ghost small" id="restPlus">+10s</button></div>' +
      '<p class="hint">Preset to your plan\u2019s ' + today.workout.restSec + 's rest. Tap ±10s to adjust.</p></div>';
  }

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
    d.workout.exercises.forEach((e, ei) => {
      html += '<li><span>' + esc(e.name) + '</span><span class="m">' + esc(e.muscles) + '</span>' +
        '<button class="link swap-link" data-swap="' + i + ':' + ei + '" title="Swap for a similar exercise">swap</button></li>';
    });
    html += '</ul><div class="rx-row"><span class="pill">' + d.workout.sets + ' sets</span>' +
      '<span class="pill">' + esc(d.workout.reps) + (d.workout.exercises[0] && d.workout.exercises[0].timed ? ' each' : ' reps') + '</span>' +
      '<span class="pill">' + d.workout.restSec + 's rest</span></div>';
    html += '<div style="margin-top:14px"><button class="btn ghost small" data-done="' + i + '">Log done</button> ' +
      '<button class="btn ghost small" data-shuffle="' + i + '" title="Re-roll this session with different exercises">Shuffle</button></div></div>';
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
  document.querySelectorAll("[data-shuffle]").forEach(b => {
    b.onclick = () => {
      FP.shuffleSession(plan, parseInt(b.getAttribute("data-shuffle"), 10));
      store.set("plan", plan);
      el("plan-out").innerHTML = renderPlan(plan);
      wirePlanButtons(plan);
    };
  });
  document.querySelectorAll("[data-swap]").forEach(b => {
    b.onclick = () => {
      const parts = b.getAttribute("data-swap").split(":");
      FP.swapExercise(plan, parseInt(parts[0], 10), parseInt(parts[1], 10));
      store.set("plan", plan);
      el("plan-out").innerHTML = renderPlan(plan);
      wirePlanButtons(plan);
    };
  });
  wireRestTimer(plan);
}

// ---------- rest timer ----------
const restTimer = { total: 0, left: 0, handle: null, running: false };

function restDone() {
  // three soft beeps + haptic, guarded for browsers without audio/vibration
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      const ctx = new AC();
      [0, 0.25, 0.5].forEach(off => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = 880; o.type = "sine";
        const t0 = ctx.currentTime + off;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.4, t0 + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
        o.start(t0); o.stop(t0 + 0.22);
      });
    }
  } catch (e) {}
  try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) {}
}

function wireRestTimer(plan) {
  const display = el("restTime");
  if (!display) return;
  if (restTimer.handle) { clearInterval(restTimer.handle); restTimer.handle = null; }
  const today = plan.days[todayIdx()];
  restTimer.total = restTimer.left = (today.type === "workout" && today.workout.restSec) || 60;
  restTimer.running = false;
  const draw = () => {
    display.textContent = display.dataset.rung ? "Go!" : FP.formatRest(restTimer.left);
    display.classList.toggle("done", !!display.dataset.rung);
  };
  const syncBtns = () => { el("restStart").disabled = restTimer.running; el("restPause").disabled = !restTimer.running; };
  const stop = () => { if (restTimer.handle) clearInterval(restTimer.handle); restTimer.handle = null; restTimer.running = false; syncBtns(); };
  el("restStart").onclick = () => {
    if (restTimer.running) return;
    if (restTimer.left <= 0) { restTimer.left = restTimer.total; display.dataset.rung = ""; }
    restTimer.running = true;
    restTimer.handle = setInterval(() => {
      restTimer.left -= 1;
      if (restTimer.left <= 0) {
        restTimer.left = 0; stop();
        display.dataset.rung = "1"; draw();
        restDone();
        return;
      }
      draw();
    }, 1000);
    syncBtns();
  };
  el("restPause").onclick = () => { stop(); };
  el("restReset").onclick = () => { stop(); restTimer.left = restTimer.total; display.dataset.rung = ""; draw(); };
  el("restMinus").onclick = () => {
    restTimer.total = Math.max(10, restTimer.total - 10);
    if (!restTimer.running) restTimer.left = restTimer.total;
    display.dataset.rung = ""; draw();
  };
  el("restPlus").onclick = () => {
    restTimer.total = Math.min(600, restTimer.total + 10);
    if (!restTimer.running) restTimer.left = restTimer.total;
    display.dataset.rung = ""; draw();
  };
  display.dataset.rung = "";
  draw(); syncBtns();
}

// ---------- library tab ----------
let libFilter = "";
let libEquipment = "";
let libSort = "name";
function renderLibrary() {
  const list = FP.filterLibrary(EX, { q: libFilter, equipment: libEquipment, sort: libSort });
  let html = '<p class="kicker">Movement index</p><h2 class="title">Exercise library</h2>' +
    '<p class="lede">' + list.length + ' movements, filtered to the equipment you own when you generate a plan.</p>';
  html += '<div class="lib-head"><div class="search">' +
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="#8b948f" stroke-width="1.6"/><path d="M11 11l3 3" stroke="#8b948f" stroke-width="1.6" stroke-linecap="round"/></svg>' +
    '<input type="text" id="lib-q" placeholder="Search exercises or muscles…" value="' + esc(libFilter) + '"></div>' +
    '<select id="lib-eq" aria-label="Filter by equipment"><option value="">All equipment</option>' +
    Object.keys(EQUIP_LABELS).map(k =>
      '<option value="' + k + '"' + (libEquipment === k ? " selected" : "") + '>' + EQUIP_LABELS[k] + '</option>').join("") +
    '</select><select id="lib-sort" aria-label="Sort exercises">' +
    [["name", "Sort: A–Z"], ["muscles", "Sort: muscle"], ["type", "Sort: type"]].map(o =>
      '<option value="' + o[0] + '"' + (libSort === o[0] ? " selected" : "") + '>' + o[1] + '</option>').join("") +
    '</select></div>';
  html += '<div class="exgrid">';
  list.forEach(e => {
    html += '<div class="ex"><div class="ex-name">' + esc(e.name) + '</div><div class="ex-muscles">' + esc(e.muscles) + '</div>' +
      '<div class="eq-row">' + e.equipment.map(k => '<span class="eq">' + EQUIP_LABELS[k] + '</span>').join("") + '</div>' +
      '<span class="ex-type">' + esc(e.type) + '</span></div>';
  });
  html += '</div>';
  el("tab-library").innerHTML = html;
  el("lib-q").oninput = ev => { libFilter = ev.target.value; renderLibrary(); const q2 = el("lib-q"); q2.focus(); q2.setSelectionRange(q2.value.length, q2.value.length); };
  el("lib-eq").onchange = ev => { libEquipment = ev.target.value; renderLibrary(); };
  el("lib-sort").onchange = ev => { libSort = ev.target.value; renderLibrary(); };
}

// ---------- log tab ----------
function validISODate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00");
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function effortLabel(rpe) {
  if (!rpe) return "—";
  const words = { 1: "easy", 2: "easy", 3: "easy", 4: "moderate", 5: "moderate", 6: "moderate", 7: "hard", 8: "hard", 9: "max", 10: "max" };
  return rpe + "/10 " + (words[rpe] || "");
}

function volumeChart(logs) {
  const mv = FP.monthlyVolume(logs);
  const maxS = Math.max(1, ...mv.map(m => m.sessions));
  const W = 560, H = 170, padB = 30, padT = 14;
  const bw = Math.min(64, (W / mv.length) * 0.55);
  let s = '<svg viewBox="0 0 ' + W + " " + H + '" class="volchart" role="img" aria-label="Sessions per month, last 6 months">';
  mv.forEach((m, i) => {
    const cx = (i + 0.5) * (W / mv.length);
    const h = Math.max(m.sessions > 0 ? 6 : 0, ((H - padB - padT) * m.sessions) / maxS);
    const y = H - padB - h;
    s += '<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" class="volbar"/>';
    s += '<text x="' + cx.toFixed(1) + '" y="' + (H - padB + 16) + '" class="volx" text-anchor="middle">' + m.label + "</text>";
    if (m.sessions > 0) {
      s += '<text x="' + cx.toFixed(1) + '" y="' + (y - 6).toFixed(1) + '" class="voln" text-anchor="middle">' + m.sessions +
        (m.minutes > 0 ? " · " + m.minutes + "m" : "") + "</text>";
    }
    s += "<title>" + m.label + ": " + m.sessions + " sessions" + (m.minutes > 0 ? ", " + m.minutes + " minutes" : "") + "</title>";
  });
  return s + "</svg>";
}

function renderLog() {
  const logs = store.get("logs", []);
  const streak = FP.currentStreak(logs);
  const best = FP.longestStreak(logs);
  const week = FP.workoutsThisWeek(logs);
  const plan = store.get("plan", null);
  const adh = FP.adherence(logs, plan);
  let html = '<p class="kicker">Consistency</p><h2 class="title">Progress</h2><p class="lede">Show up, log it, watch the chain grow.</p>';
  html += '<div class="stat-band">' +
    '<div class="stat"><div class="num">' + streak + '</div><div class="lbl">day streak</div></div>' +
    '<div class="stat"><div class="num">' + best + '</div><div class="lbl">best streak</div></div>' +
    '<div class="stat"><div class="num">' + week + '</div><div class="lbl">this week' + (plan ? ' / goal ' + plan.daysPerWeek : '') + '</div></div>' +
    '<div class="stat"><div class="num">' + logs.length + '</div><div class="lbl">total sessions</div></div>' +
    (plan ? '<div class="stat"><div class="num">' + adh.pct + '%</div><div class="lbl">weekly adherence</div></div>' : '') + '</div>';
  html += '<div class="card"><h3>Log a past workout</h3><p class="hint">Forgot to log? Backdate it so your history stays honest.</p>' +
    '<div class="backdate-row"><input type="date" id="l-backdate" value="' + FP.todayISO() + '" aria-label="Date">' +
    '<input type="text" id="l-backname" placeholder="Workout name (e.g. Push Day)" aria-label="Workout name">' +
    '<input type="number" id="l-min" min="1" max="600" placeholder="Minutes" aria-label="Minutes trained" style="max-width:110px">' +
    '<select id="l-rpe" aria-label="Effort"><option value="">Effort…</option>' +
    [1,2,3,4,5,6,7,8,9,10].map(n => '<option value="' + n + '">' + n + '/10</option>').join("") + '</select>' +
    '<button class="btn small" id="l-addpast">Add entry</button></div>' +
    '<p class="form-error" id="l-error" style="display:none"></p>' +
    '<div class="toolbar-row"><button class="btn ghost small" id="l-export">Export log as CSV</button></div></div>';
  html += '<div class="card"><h3>Training volume</h3><p class="hint">Sessions and minutes per month, last 6 months.</p>' + volumeChart(logs) + '</div>';
  html += '<div class="card"><h3>Workout log</h3>';
  if (!logs.length) html += '<p class="hint">Nothing logged yet. Finish a workout on the Plan tab and hit "Log done".</p>';
  else {
    html += '<table class="log"><tr><th>Date</th><th>Workout</th><th>Min</th><th>Effort</th><th></th></tr>';
    logs.slice().reverse().slice(0, 30).forEach(l => {
      html += '<tr><td>' + esc(l.date) + '</td><td>' + esc(l.workout || "—") + '</td>' +
        '<td>' + (l.minutes ? esc(String(l.minutes)) : "—") + '</td>' +
        '<td>' + esc(effortLabel(l.effort)) + '</td>' +
        '<td class="act-cell"><button class="link danger-link" data-dellog="' + esc(l.date) + '">delete</button></td></tr>';
    });
    html += '</table>';
  }
  html += '</div>';
  el("tab-log").innerHTML = html;

  document.querySelectorAll("[data-dellog]").forEach(b => {
    b.onclick = () => {
      if (!confirm("Delete the log entry for " + b.getAttribute("data-dellog") + "?")) return;
      store.set("logs", FP.deleteLog(store.get("logs", []), b.getAttribute("data-dellog")));
      renderLog();
    };
  });
  el("l-addpast").onclick = () => {
    const d = el("l-backdate").value, name = el("l-backname").value.trim();
    const err = el("l-error");
    if (!validISODate(d)) { err.textContent = "Pick a valid date."; err.style.display = "block"; return; }
    if (d > FP.todayISO()) { err.textContent = "Can't log a future workout — backdate only."; err.style.display = "block"; return; }
    const mins = parseInt(el("l-min").value, 10), rpe = parseInt(el("l-rpe").value, 10);
    if (el("l-min").value && !(mins > 0 && mins <= 600)) { err.textContent = "Minutes must be between 1 and 600."; err.style.display = "block"; return; }
    err.style.display = "none";
    const meta = {};
    if (mins > 0) meta.minutes = mins;
    if (rpe >= 1 && rpe <= 10) meta.effort = rpe;
    store.set("logs", FP.logWorkout(store.get("logs", []), d, name, meta));
    renderLog();
  };
  el("l-export").onclick = () => {
    const csv = FP.logToCSV(store.get("logs", []));
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "fitnessplan-log.csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };
}

document.addEventListener("DOMContentLoaded", () => {
  renderSetup();
  document.querySelectorAll("nav.tabs button").forEach(b => { b.onclick = () => switchTab(b.dataset.tab); });
});
})();
