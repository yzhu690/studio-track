/* Studio Track — data store
   Everything lives in localStorage. No server, no accounts, no tracking. */
(function () {
  'use strict';

  var KEY = 'studiotrack.v1';
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function defaultSettings() {
    return {
      ai: { enabled: false, baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', key: '' },
      tone: 'coach'
    };
  }

  function emptyState() {
    var seed = clone(window.STUDIO_SEED);
    seed.settings = defaultSettings();
    seed.log = [];
    return seed;
  }

  var state = null;

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.students) {
          if (!parsed.settings) parsed.settings = defaultSettings();
          if (!parsed.log) parsed.log = [];
          state = parsed;
          return state;
        }
      }
    } catch (e) { /* corrupted -> fall through to seed */ }
    state = emptyState();
    save();
    return state;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { console.warn('save failed', e); }
  }

  function data() { return state || load(); }

  /* ------------------------------------------------------------ helpers */
  function monthLabel(m) {
    if (!m) return '—';
    var p = String(m).split('-');
    return (MONTHS[parseInt(p[1], 10) - 1] || '?') + ' ' + p[0];
  }
  function months() { return data().meta.months.slice().sort(); }
  function currentMonth() { return data().meta.currentMonth; }
  function setMonth(m) { data().meta.currentMonth = m; save(); }
  function prevMonth(m) {
    var p = String(m).split('-');
    var y = parseInt(p[0], 10), mo = parseInt(p[1], 10) - 1;
    if (mo === 0) { mo = 12; y -= 1; }
    return y + '-' + String(mo).padStart(2, '0');
  }
  function advisor(id) {
    return (data().advisors || []).filter(function (a) { return a.id === id; })[0] || { id: id, name: id };
  }
  function student(id) {
    return data().students.filter(function (s) { return s.id === id; })[0] || null;
  }

  /* snapshots ------------------------------------------------------- */
  function snap(project, month) { return project.monthly[month] || null; }

  function lastSnapshot(project, month) {
    var ms = Object.keys(project.monthly).filter(function (m) { return m <= month; }).sort();
    if (!ms.length) return null;
    return { month: ms[ms.length - 1], data: project.monthly[ms[ms.length - 1]] };
  }

  function projectProgress(project, month) {
    var s = lastSnapshot(project, month);
    return s && typeof s.data.progress === 'number' ? s.data.progress : null;
  }

  function projectCum(project, month) {
    var ms = Object.keys(project.monthly).filter(function (m) { return m <= month; }).sort();
    for (var i = ms.length - 1; i >= 0; i--) {
      var c = project.monthly[ms[i]].cumHours;
      if (typeof c === 'number') return c;
    }
    return null;
  }

  /* Business rule: overall application progress = lowest project progress
     in the most recent month that has any data. Never an average. */
  function overall(student, month) {
    month = month || currentMonth();
    var vals = student.projects.map(function (p) { return projectProgress(p, month); })
      .filter(function (v) { return typeof v === 'number'; });
    if (!vals.length) return null;
    return Math.min.apply(null, vals);
  }

  function overallPrev(student, month) {
    return overall(student, prevMonth(month || currentMonth()));
  }

  function monthHours(student, month) {
    var h = 0;
    student.projects.forEach(function (p) {
      var s = p.monthly[month];
      if (s && typeof s.hours === 'number') h += s.hours;
    });
    return h;
  }

  function cumHours(student, month) {
    var total = 0, any = false;
    student.projects.forEach(function (p) {
      var c = projectCum(p, month);
      if (typeof c === 'number') { total += c; any = true; }
    });
    return any ? total : null;
  }

  function activeProjects(student, month) {
    return student.projects.filter(function (p) {
      var v = projectProgress(p, month);
      return v !== null && v < 100;
    });
  }

  function submittedCount(student, month) {
    return student.projects.filter(function (p) {
      var s = p.monthly[month];
      var prev = lastSnapshot(p, prevMonth(month));
      var now = s ? s.progress : projectProgress(p, month);
      var before = prev ? prev.data.progress : null;
      return typeof now === 'number' && now >= 100 && (before === null || before < 100);
    }).length;
  }

  function updatedThisMonth(student, month) {
    return student.projects.some(function (p) {
      var s = p.monthly[month];
      return s && (typeof s.progress === 'number' || s.hours > 0);
    });
  }

  function delta(student, month) {
    var a = overall(student, month), b = overallPrev(student, month);
    if (a === null || b === null) return null;
    return Math.round((a - b) * 10) / 10;
  }

  function stalledMonths(student, month) {
    var ms = months().filter(function (m) { return m <= month; });
    var count = 0;
    for (var i = ms.length - 1; i > 0; i--) {
      var d1 = delta(student, ms[i]);
      if (d1 === null || d1 > 0) break;
      count++;
    }
    return count;
  }

  /* ---------------------------------------------------------- statistics */
  function stats(month) {
    month = month || currentMonth();
    var ss = data().students;
    var hours = 0, active = 0, submitted = 0, updated = 0, progs = [], projectsInFlight = 0;

    ss.forEach(function (s) {
      hours += monthHours(s, month);
      if (activeProjects(s, month).length) active++;
      if (updatedThisMonth(s, month)) updated++;
      submitted += submittedCount(s, month);
      projectsInFlight += activeProjects(s, month).length;
      var o = overall(s, month);
      if (o !== null) progs.push(o);
    });

    var avg = progs.length ? progs.reduce(function (a, b) { return a + b; }, 0) / progs.length : 0;
    var prevH = 0;
    ss.forEach(function (s) { prevH += monthHours(s, prevMonth(month)); });

    return {
      month: month,
      learners: ss.length,
      active: active,
      updated: updated,
      notUpdated: ss.length - updated,
      hours: hours,
      prevHours: prevH,
      hoursDelta: hours - prevH,
      submitted: submitted,
      projectsInFlight: projectsInFlight,
      avgProgress: Math.round(avg * 10) / 10,
      projects: ss.reduce(function (n, s) { return n + s.projects.length; }, 0)
    };
  }

  function hoursSeries() {
    return months().map(function (m) {
      var h = 0;
      data().students.forEach(function (s) { h += monthHours(s, m); });
      return { month: m, label: monthLabel(m), value: h };
    });
  }

  function distribution(month) {
    var bands = [
      { label: '0–25%', min: 0, max: 25, n: 0 },
      { label: '25–50%', min: 25, max: 50, n: 0 },
      { label: '50–75%', min: 50, max: 75, n: 0 },
      { label: '75–99%', min: 75, max: 100, n: 0 },
      { label: 'Submitted', min: 100, max: 101, n: 0 }
    ];
    data().students.forEach(function (s) {
      var o = overall(s, month);
      if (o === null) return;
      for (var i = 0; i < bands.length; i++) {
        if (o >= bands[i].min && o < bands[i].max) { bands[i].n++; break; }
      }
    });
    return bands;
  }

  function advisorLoad(month) {
    var map = {};
    (data().advisors || []).forEach(function (a) { map[a.id] = { id: a.id, name: a.name, n: 0, hours: 0 }; });
    data().students.forEach(function (s) {
      if (!map[s.advisor]) map[s.advisor] = { id: s.advisor, name: s.advisor, n: 0, hours: 0 };
      map[s.advisor].n++;
      map[s.advisor].hours += monthHours(s, month);
    });
    return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return b.n - a.n; });
  }

  /* Who needs a nudge — deterministic, explainable flags. */
  function attention(month) {
    month = month || currentMonth();
    var out = [];
    data().students.forEach(function (s) {
      var o = overall(s, month);
      var reasons = [];
      var score = 0;

      if (!updatedThisMonth(s, month) && s.lastActive !== month) {
        reasons.push('No update logged this month');
        score += 55;
      }
      var stall = stalledMonths(s, month);
      if (stall >= 1 && o !== null && o < 100) {
        reasons.push('Progress flat for ' + (stall + 1) + ' months');
        score += 30 + stall * 6;
      }
      if (o !== null && o < 40) {
        reasons.push('Early stage — ' + Math.round(o) + '% overall');
        score += 22;
      }
      if (o !== null && o >= 90 && o < 100) {
        reasons.push('Close to submission but not finished');
        score += 18;
      }
      var h = monthHours(s, month);
      var ph = monthHours(s, prevMonth(month));
      if (ph >= 3 && h <= ph * 0.4) {
        reasons.push('Sessions dropped to ' + h + 'h from ' + ph + 'h');
        score += 16;
      }
      if (h === 0 && s.lastActive === month) {
        reasons.push('0 hours this month');
        score += 14;
      }
      if (reasons.length) out.push({ student: s, reasons: reasons, score: score, progress: o, hours: h });
    });
    return out.sort(function (a, b) { return b.score - a.score; });
  }

  /* ------------------------------------------------------------ mutations */
  function ensureMonth(month) {
    if (data().meta.months.indexOf(month) === -1) {
      data().meta.months.push(month);
      data().meta.months.sort();
    }
  }

  function logUpdate(payload) {
    var s = student(payload.studentId);
    if (!s) return { ok: false, msg: 'Learner not found' };
    var p = s.projects.filter(function (x) { return x.key === payload.projectKey; })[0];
    if (!p) return { ok: false, msg: 'Project not found' };
    var month = payload.month;
    ensureMonth(month);

    var prev = lastSnapshot(p, month);
    var existing = p.monthly[month] || {};
    var prevCum = prev && prev.month !== month ? (prev.data.cumHours || 0) : (existing.cumHours || 0);
    var hours = Number(payload.hours) || 0;

    p.monthly[month] = {
      progress: payload.progress === '' || payload.progress === null ? null : Math.max(0, Math.min(100, Number(payload.progress))),
      hours: hours,
      cumHours: typeof payload.cumHours === 'number' ? payload.cumHours : (prevCum + hours),
      stage: payload.stage || existing.stage || '',
      state: existing.state || '',
      note: payload.note || ''
    };
    s.lastActive = month;

    data().log.unshift({
      id: 'l' + Date.now(),
      at: new Date().toISOString(),
      month: month,
      studentId: s.id,
      projectKey: p.key,
      progress: p.monthly[month].progress,
      hours: hours
    });
    data().log = data().log.slice(0, 300);
    save();
    return { ok: true, overall: overall(s, month) };
  }

  function addProject(studentId, name, type) {
    var s = student(studentId);
    if (!s) return false;
    var key = String(Date.now()).slice(-4);
    s.projects.push({ key: key, name: name || 'New project', type: type || 'Portfolio project', monthly: {}, review: { domestic: '', intl: '' } });
    save();
    return key;
  }

  function addStudent(payload) {
    var id = 's' + String(Date.now()).slice(-6);
    data().students.push({
      id: id,
      name: payload.name || 'New learner',
      cohort: payload.cohort || '27F',
      package: payload.package || 'Standard',
      degree: payload.degree || 'MA',
      countries: payload.countries || ['UK'],
      major: payload.major || 'Interaction Design',
      advisor: payload.advisor || 'A',
      qualitative: { strengths: '', attitude: '', nextFocus: '' },
      projects: [],
      lastActive: currentMonth()
    });
    save();
    return id;
  }

  function setQualitative(studentId, field, value) {
    var s = student(studentId);
    if (!s) return;
    s.qualitative[field] = value;
    save();
  }

  function replaceAll(json) {
    if (!json || !json.students) throw new Error('Invalid dataset');
    var next = clone(json);
    if (!next.settings) next.settings = defaultSettings();
    if (!next.log) next.log = [];
    state = next;
    save();
  }

  function resetDemo() { state = emptyState(); save(); }

  function settings() { return data().settings; }
  function saveSettings(patch) {
    data().settings = Object.assign({}, data().settings, patch);
    save();
  }

  window.Store = {
    load: load, save: save, data: data,
    monthLabel: monthLabel, months: months, currentMonth: currentMonth, setMonth: setMonth,
    prevMonth: prevMonth, advisor: advisor, student: student,
    projectProgress: projectProgress, projectCum: projectCum, lastSnapshot: lastSnapshot,
    overall: overall, overallPrev: overallPrev, monthHours: monthHours, cumHours: cumHours,
    activeProjects: activeProjects, submittedCount: submittedCount,
    updatedThisMonth: updatedThisMonth, delta: delta, stalledMonths: stalledMonths,
    stats: stats, hoursSeries: hoursSeries, distribution: distribution, advisorLoad: advisorLoad,
    attention: attention, logUpdate: logUpdate, addProject: addProject, addStudent: addStudent,
    setQualitative: setQualitative, replaceAll: replaceAll, resetDemo: resetDemo,
    settings: settings, saveSettings: saveSettings
  };
})();
