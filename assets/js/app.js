/* Studio Track — views & interaction */
(function () {
  'use strict';

  var S = window.Store;
  var AI = window.AI;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var ui = {
    route: 'overview',
    id: null,
    q: '',
    advisor: '',
    cohort: '',
    pkg: '',
    band: '',
    sortKey: 'name',
    sortDir: 1,
    monthly: null
  };

  /* ---------------------------------------------------------- utilities */
  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pct(v) { return v === null || v === undefined ? '—' : (Math.round(v * 10) / 10) + '%'; }
  function initials(name) {
    return String(name || '?').trim().split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
  }
  function barClass(v) {
    if (v === null || v === undefined) return '';
    if (v >= 100) return 'done';
    if (v < 25) return 'low';
    if (v < 50) return 'mid';
    return '';
  }
  function progressBar(v, cls) {
    var w = v === null || v === undefined ? 0 : Math.max(0, Math.min(100, v));
    return '<span class="bar ' + (cls || '') + '"><i class="' + barClass(v) + '" style="width:' + w + '%"></i></span>';
  }
  function deltaChip(d) {
    if (d === null || d === undefined) return '<span class="delta flat">—</span>';
    if (d > 0) return '<span class="delta up">▲ ' + (Math.round(d * 10) / 10) + '</span>';
    if (d < 0) return '<span class="delta down">▼ ' + Math.abs(Math.round(d * 10) / 10) + '</span>';
    return '<span class="delta flat">0</span>';
  }
  function statusChip(s, month) {
    var o = S.overall(s, month);
    if (o === null) return '<span class="chip">No data</span>';
    if (o >= 100) return '<span class="chip ok dot">Submitted</span>';
    if (o >= 90) return '<span class="chip lime dot">Finalising</span>';
    if (o >= 50) return '<span class="chip info dot">In production</span>';
    return '<span class="chip warn dot">Early stage</span>';
  }
  function toast(msg, kind) {
    var wrap = $('#toastWrap');
    var el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .25s'; el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 260);
    }, 2600);
  }
  function modal(html) {
    var root = $('#modalRoot');
    root.innerHTML = '<div class="modal-bg" data-action="close-modal"></div><div class="modal">' + html + '</div>';
    root.classList.add('open');
  }
  function closeModal() {
    $('#modalRoot').classList.remove('open');
    $('#modalRoot').innerHTML = '';
  }

  /* -------------------------------------------------------------- shell */
  function monthOptions() {
    return S.months().map(function (m) {
      return '<option value="' + m + '"' + (m === S.currentMonth() ? ' selected' : '') + '>' + S.monthLabel(m) + '</option>';
    }).join('');
  }

  function currentMonth() {
    var m = ui.monthly || S.currentMonth();
    return m;
  }

  /* ----------------------------------------------------------- overview */
  function viewOverview() {
    var month = S.currentMonth();
    var st = S.stats(month);
    var series = S.hoursSeries();
    var att = S.attention(month).slice(0, 5);
    var dist = S.distribution(month);
    var load = S.advisorLoad(month);
    var sparks = series.map(function (x) { return x.value; });

    var hoursDelta = st.hoursDelta;
    var deltaHtml = hoursDelta === 0 ? '<span class="delta flat">flat</span>' :
      (hoursDelta > 0 ? '<span class="delta up">▲ ' + hoursDelta + 'h</span>' :
        '<span class="delta down">▼ ' + Math.abs(hoursDelta) + 'h</span>');

    return ''
      + '<div class="page-head">'
      + '  <div><div class="kicker">' + S.monthLabel(month) + ' · studio pulse</div>'
      + '  <h1>Momentum at a glance</h1>'
      + '  <p class="sub">Every learner, project and teaching hour in one place. Overall application progress is always the slowest project — never an average.</p></div>'
      + '  <div class="chips"><span class="chip lime">' + st.learners + ' learners</span><span class="chip">' + st.projects + ' projects</span><span class="chip">' + S.months().length + ' months of history</span></div>'
      + '</div>'

      + '<div class="grid g5">'
      + '  <div class="kpi"><div class="k-label">Active learners</div><div class="k-val">' + st.active + '<small>/ ' + st.learners + '</small></div>'
      + '    <div class="k-meta"><span class="chip lime dot">' + st.projectsInFlight + ' live projects</span></div></div>'
      + '  <div class="kpi"><div class="k-label">Teaching hours</div>'
      + '    <div class="k-val">' + st.hours + '<small>h</small></div>'
      + '    <div class="k-meta">' + deltaHtml + '<span>vs ' + S.monthLabel(S.prevMonth(month)) + '</span></div></div>'
      + '  <div class="kpi"><div class="k-label">Avg application progress</div><div class="k-val">' + st.avgProgress + '<small>%</small></div>'
      + '    <div class="k-meta">' + (st.avgProgress >= 60 ? '<span class="delta up">healthy</span>' : '<span class="delta flat">building</span>') + '<span>across active learners</span></div></div>'
      + '  <div class="kpi"><div class="k-label">New submissions</div><div class="k-val">' + st.submitted + '</div>'
      + '    <div class="k-meta"><span>projects sent for review</span></div></div>'
      + '  <div class="kpi"><div class="k-label">Updates logged</div><div class="k-val">' + st.updated + '<small>/ ' + st.learners + '</small></div>'
      + '    <div class="k-meta" style="display:block">' + progressBar(st.learners ? st.updated / st.learners * 100 : 0, '') + '</div></div>'
      + '</div>'

      + '<div class="grid g23 mt">'
      + '  <section class="card">'
      + '    <div class="card-head"><h2>Needs a decision</h2><a class="link" href="#/insights">All insights →</a></div>'
      + (att.length ? '<div class="attn">' + att.map(function (a) {
        return '<div class="attn-row" data-action="open-learner" data-id="' + a.student.id + '">'
          + '<div class="avatar">' + initials(a.student.name) + '</div>'
          + '<div class="who" style="flex:1"><b>' + esc(a.student.name) + '</b>'
          + '<span class="why">' + esc(a.reasons[0]) + (a.reasons[1] ? ' · ' + esc(a.reasons[1]) : '') + '</span></div>'
          + '<div class="val">' + pct(a.progress) + '</div>'
          + '<div style="width:74px">' + progressBar(a.progress) + '</div>'
          + '</div>';
      }).join('') + '</div>' : '<div class="empty"><b>Nothing flagged</b>Every learner has been updated this month.</div>')
      + '  </section>'

      + '  <section class="card">'
      + '    <div class="card-head"><h2>Teaching hours</h2><span class="hint">last ' + series.length + ' months</span></div>'
      + window.Charts.bars(series.map(function (x) { return { label: x.label, short: x.label.split(' ')[0], value: x.value }; }), { height: 196 })
      + '    <div class="legend"><span><i style="background:' + '#E3E7D6' + '"></i>previous months</span><span><i style="background:#A9D31C"></i>current month</span></div>'
      + '  </section>'
      + '</div>'

      + '<div class="grid g3 mt">'
      + '  <section class="card"><div class="card-head"><h2>Progress spread</h2><span class="hint">' + S.monthLabel(month) + '</span></div>'
      + window.Charts.stacked(dist)
      + '  </section>'
      + '  <section class="card"><div class="card-head"><h2>Advisor load</h2><span class="hint">learners · hours</span></div>'
      + window.Charts.hbars(load.map(function (a) { return { label: a.name, value: a.n, suffix: '', note: a.hours + 'h' }; }), { labelWidth: 80 })
      + '  </section>'
      + '  <section class="card"><div class="card-head"><h2>Submission pipeline</h2><span class="hint">projects at 95%+</span></div>'
      + pipelineHtml(month)
      + '  </section>'
      + '</div>'

      + '<p class="footnote">Snapshot for ' + S.monthLabel(month) + ' · generated from your local workspace. '
      + 'Learner names in this build are placeholders.</p>';
  }

  function pipelineHtml(month) {
    var rows = [];
    S.data().students.forEach(function (s) {
      s.projects.forEach(function (p) {
        var v = S.projectProgress(p, month);
        if (v !== null && v >= 90) rows.push({ s: s, p: p, v: v });
      });
    });
    rows.sort(function (a, b) { return b.v - a.v; });
    if (!rows.length) return '<div class="empty"><b>No projects near submission</b>Nothing above 90% this month.</div>';
    return rows.slice(0, 6).map(function (r) {
      return '<div class="attn-row" data-action="open-learner" data-id="' + r.s.id + '">'
        + '<div class="who" style="flex:1"><b>' + esc(r.s.name) + '</b><span class="why">' + esc(r.p.name) + ' · ' + esc(r.p.type) + '</span></div>'
        + '<div class="val">' + pct(r.v) + '</div></div>';
    }).join('');
  }

  /* ----------------------------------------------------------- learners */
  function filteredStudents() {
    var month = S.currentMonth();
    return S.data().students.filter(function (s) {
      if (ui.q) {
        var hay = (s.name + ' ' + s.major + ' ' + s.cohort + ' ' + s.package + ' ' + s.projects.map(function (p) { return p.name + ' ' + p.type; }).join(' ')).toLowerCase();
        if (hay.indexOf(ui.q.toLowerCase()) === -1) return false;
      }
      if (ui.advisor && s.advisor !== ui.advisor) return false;
      if (ui.cohort && s.cohort !== ui.cohort) return false;
      if (ui.pkg && s.package !== ui.pkg) return false;
      if (ui.band) {
        var o = S.overall(s, month);
        if (o === null) return false;
        if (ui.band === 'low' && !(o < 50)) return false;
        if (ui.band === 'mid' && !(o >= 50 && o < 90)) return false;
        if (ui.band === 'high' && !(o >= 90 && o < 100)) return false;
        if (ui.band === 'done' && !(o >= 100)) return false;
      }
      return true;
    }).sort(function (a, b) {
      var k = ui.sortKey, d = ui.sortDir;
      if (k === 'name') return a.name.localeCompare(b.name) * d;
      if (k === 'progress') {
        var av = S.overall(a, month), bv = S.overall(b, month);
        return ((av === null ? -1 : av) - (bv === null ? -1 : bv)) * d;
      }
      if (k === 'hours') return (S.monthHours(a, month) - S.monthHours(b, month)) * d;
      if (k === 'advisor') return a.advisor.localeCompare(b.advisor) * d;
      return 0;
    });
  }

  function viewLearners() {
    var month = S.currentMonth();
    var list = filteredStudents();
    var advisors = S.data().advisors;
    var cohorts = Array.from(new Set(S.data().students.map(function (s) { return s.cohort; }))).sort();
    var pkgs = Array.from(new Set(S.data().students.map(function (s) { return s.package; })));

    var sortArrow = function (k) { return ui.sortKey === k ? '<span class="arrow">' + (ui.sortDir > 0 ? '↑' : '↓') + '</span>' : '<span class="arrow">↕</span>'; };

    return ''
      + '<div class="page-head"><div><div class="kicker">Roster</div><h1>Learners</h1>'
      + '<p class="sub">' + S.data().students.length + ' learners across ' + cohorts.length + ' cohorts. Click a row to open the full progress record.</p></div>'
      + '<div class="chips"><button class="btn dark" data-action="add-learner">+ Add learner</button></div></div>'

      + '<div class="toolbar">'
      + '  <label class="search"><svg viewBox="0 0 24 24"><path d="M10 2a8 8 0 1 0 4.9 14.3l5.4 5.4 1.4-1.4-5.4-5.4A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z"/></svg>'
      + '  <input id="q" placeholder="Search learner, project or major" value="' + esc(ui.q) + '"></label>'
      + '  <select class="select" id="fAdvisor"><option value="">All advisors</option>' + advisors.map(function (a) {
        return '<option value="' + a.id + '"' + (ui.advisor === a.id ? ' selected' : '') + '>' + esc(a.name) + '</option>';
      }).join('') + '</select>'
      + '  <select class="select" id="fCohort"><option value="">All cohorts</option>' + cohorts.map(function (c) {
        return '<option value="' + c + '"' + (ui.cohort === c ? ' selected' : '') + '>' + esc(c) + '</option>';
      }).join('') + '</select>'
      + '  <select class="select" id="fPkg"><option value="">All packages</option>' + pkgs.map(function (p) {
        return '<option value="' + p + '"' + (ui.pkg === p ? ' selected' : '') + '>' + esc(p) + '</option>';
      }).join('') + '</select>'
      + '  <select class="select" id="fBand"><option value="">Any progress</option>'
      + '    <option value="low"' + (ui.band === 'low' ? ' selected' : '') + '>Below 50%</option>'
      + '    <option value="mid"' + (ui.band === 'mid' ? ' selected' : '') + '>50–90%</option>'
      + '    <option value="high"' + (ui.band === 'high' ? ' selected' : '') + '>90–99%</option>'
      + '    <option value="done"' + (ui.band === 'done' ? ' selected' : '') + '>Submitted</option>'
      + '  </select>'
      + '  <span class="spacer"></span><span class="hint">' + list.length + ' shown</span>'
      + '</div>'

      + '<section class="card flush"><div class="table-wrap"><table>'
      + '<thead><tr>'
      + '<th class="sortable" data-sort="name">Learner' + sortArrow('name') + '</th>'
      + '<th class="sortable" data-sort="advisor">Advisor' + sortArrow('advisor') + '</th>'
      + '<th>Cohort · package</th>'
      + '<th>Projects</th>'
      + '<th class="sortable" data-sort="progress">Application progress' + sortArrow('progress') + '</th>'
      + '<th class="sortable num" data-sort="hours">Hours' + sortArrow('hours') + '</th>'
      + '<th class="num">Δ</th>'
      + '<th>Status</th>'
      + '<th></th>'
      + '</tr></thead><tbody>'
      + (list.length ? list.map(function (s) {
        var o = S.overall(s, month), d = S.delta(s, month), h = S.monthHours(s, month);
        var live = s.projects.filter(function (p) { return S.projectProgress(p, month) !== null; }).length;
        return '<tr class="clickable" data-action="open-learner" data-id="' + s.id + '">'
          + '<td><div class="who"><div class="avatar">' + initials(s.name) + '</div><div><b>' + esc(s.name) + '</b><span>' + esc(s.major) + ' · ' + esc(s.countries.join(' / ')) + '</span></div></div></td>'
          + '<td>' + esc(S.advisor(s.advisor).name) + '</td>'
          + '<td><span class="chip">' + esc(s.cohort) + '</span> <span class="chip">' + esc(s.package) + '</span></td>'
          + '<td class="num">' + live + '<span style="color:#A2A69A">/' + s.projects.length + '</span></td>'
          + '<td><div class="prog-cell">' + progressBar(o) + '<b>' + pct(o) + '</b></div></td>'
          + '<td class="num">' + h + 'h</td>'
          + '<td class="num">' + deltaChip(d) + '</td>'
          + '<td>' + statusChip(s, month) + '</td>'
          + '<td class="tight" style="color:#C0C4B6">›</td>'
          + '</tr>';
      }).join('') : '<tr><td colspan="9"><div class="empty"><b>No learners match</b>Try clearing a filter.</div></td></tr>')
      + '</tbody></table></div></section>'
      + '<p class="footnote">Hours are monthly session hours. Δ = change in overall application progress versus the previous month.</p>';
  }

  /* ------------------------------------------------------------ learner */
  function viewLearner(id) {
    var s = S.student(id);
    if (!s) return '<div class="empty"><b>Learner not found</b><a href="#/learners">Back to roster</a></div>';
    var month = S.currentMonth();
    var o = S.overall(s, month), d = S.delta(s, month);
    var h = S.monthHours(s, month), cum = S.cumHours(s, month);
    var logs = S.data().log.filter(function (l) { return l.studentId === s.id; }).slice(0, 8);

    return ''
      + '<div style="margin-bottom:14px"><a href="#/learners" class="chip">← All learners</a></div>'
      + '<div class="hero">'
      + '  <div class="avatar lg">' + initials(s.name) + '</div>'
      + '  <div class="hero-main"><h1>' + esc(s.name) + '</h1>'
      + '    <div class="meta">'
      + '      <span class="chip lime">' + esc(s.cohort) + '</span>'
      + '      <span class="chip">' + esc(s.degree) + '</span>'
      + '      <span class="chip">' + esc(s.package) + '</span>'
      + '      <span class="chip">' + esc(s.countries.join(' / ')) + '</span>'
      + '      <span class="chip">' + esc(s.major) + '</span>'
      + '      <span class="chip info">' + esc(S.advisor(s.advisor).name) + '</span>'
      + '    </div>'
      + '    <p class="sub" style="margin-top:12px">' + esc(s.qualitative.strengths || 'No qualitative note yet.') + '</p>'
      + '  </div>'
      + '  <div class="ring-wrap">'
      + '    <div style="position:relative">' + window.Charts.ring(o, { size: 84, stroke: 9 }) + '</div>'
      + '    <div><div class="ring-val">Application</div><div class="ring-num">' + pct(o) + '</div>'
      + '      <div style="margin-top:6px">' + deltaChip(d) + '</div></div>'
      + '  </div>'
      + '</div>'

      + '<div class="grid g23 mt">'
      + '  <div>'
      + '    <div class="sec-head"><h2>Projects</h2><button class="btn ghost sm" data-action="add-project" data-id="' + s.id + '">+ Project</button></div>'
      + (s.projects.length ? s.projects.map(function (p) { return projectCard(s, p, month); }).join('')
        : '<div class="card empty"><b>No projects yet</b>Add the first project to start tracking progress.</div>')
      + '  </div>'

      + '  <div>'
      + '    <section class="card">'
      + '      <div class="card-head"><h2>This month</h2><span class="hint">' + S.monthLabel(month) + '</span></div>'
      + '      <div class="dir"><b>Sessions</b><span>' + h + ' h</span></div>'
      + '      <div class="dir"><b>Cumulative hours</b><span>' + (cum === null ? '—' : cum + ' h') + '</span></div>'
      + '      <div class="dir"><b>Live projects</b><span>' + S.activeProjects(s, month).length + '</span></div>'
      + '      <div class="dir"><b>Projects submitted</b><span>' + s.projects.filter(function (p) { return (S.projectProgress(p, month) || 0) >= 100; }).length + '</span></div>'
      + '      <div class="dir"><b>Last update</b><span>' + esc(S.monthLabel(s.lastActive)) + '</span></div>'
      + '    </section>'

      + '    <section class="card mt">'
      + '      <div class="card-head"><h2>Qualitative record</h2><button class="btn ghost sm" data-action="edit-qual" data-id="' + s.id + '">Edit</button></div>'
      + '      <div class="note-box" style="margin-bottom:9px"><span>Strengths</span><p>' + esc(s.qualitative.strengths || '—') + '</p></div>'
      + '      <div class="note-box" style="margin-bottom:9px"><span>Attitude</span><p>' + esc(s.qualitative.attitude || '—') + '</p></div>'
      + '      <div class="note-box"><span>Next focus</span><p>' + esc(s.qualitative.nextFocus || '—') + '</p></div>'
      + '    </section>'

      + '    <section class="card mt">'
      + '      <div class="card-head"><h2>Monthly note</h2><button class="btn primary sm" data-action="draft-note" data-id="' + s.id + '">Draft</button></div>'
      + '      <p class="hint" id="noteOut" style="white-space:pre-wrap;line-height:1.65">Generate a ready-to-send summary from the data above.</p>'
      + '    </section>'

      + (logs.length ? '<section class="card mt"><div class="card-head"><h2>Change log</h2></div><div class="tl">'
        + logs.map(function (l) {
          return '<div class="tl-item on"><b>' + esc(l.month) + ' · ' + pct(l.progress) + ' · ' + l.hours + 'h</b>'
            + '<span>' + new Date(l.at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</span></div>';
        }).join('') + '</div></section>' : '')
      + '  </div>'
      + '</div>';
  }

  function projectCard(s, p, month) {
    var v = S.projectProgress(p, month);
    var snap = S.lastSnapshot(p, month);
    var cumH = S.projectCum(p, month);
    var hist = Object.keys(p.monthly).sort().map(function (m) {
      var x = p.monthly[m];
      return '<span class="hist-cell' + (snap && snap.month === m ? ' now' : '') + '">' + S.monthLabel(m).split(' ')[0] + ' ' + pct(x.progress) + '</span>';
    }).join('');
    var submitted = v !== null && v >= 100;

    return '<div class="proj">'
      + '<div class="proj-top"><div>'
      + '  <div class="proj-title"><b>' + esc(p.name) + '</b><span class="chip">' + esc(p.type) + '</span>'
      + (submitted ? '<span class="chip ok dot">Submitted</span>' : '') + '</div>'
      + '  <div class="chips" style="margin-top:8px">'
      + (snap && snap.data.stage ? '<span class="chip dot">' + esc(snap.data.stage) + '</span>' : '<span class="chip">No stage recorded</span>')
      + '  </div>'
      + '</div><div class="proj-pct">' + pct(v).replace('%', '<small>%</small>') + '</div></div>'
      + '<div style="margin-top:12px">' + progressBar(v, 'lg') + '</div>'
      + '<div class="proj-rows">'
      + '  <div class="kv"><span>This month</span><b>' + (snap && snap.month === month ? (p.monthly[month].hours || 0) : 0) + ' h</b></div>'
      + '  <div class="kv"><span>Cumulative</span><b>' + (typeof cumH === 'number' ? cumH + ' h' : '—') + '</b></div>'
      + '  <div class="kv"><span>Δ month</span><b>' + (function () {
        var prev = S.projectProgress(p, S.prevMonth(month));
        if (v === null || prev === null) return '—';
        var dd = Math.round((v - prev) * 10) / 10;
        return (dd > 0 ? '+' : '') + dd + ' pts';
      })() + '</b></div>'
      + '  <div class="kv"><span>Review</span><b>' + esc(p.review && p.review.domestic ? p.review.domestic : '—') + '</b></div>'
      + '</div>'
      + '<div class="hist">' + (hist || '<span class="hist-cell">No history</span>') + '</div>'
      + '<div style="margin-top:12px;display:flex;gap:7px;flex-wrap:wrap">'
      + '  <button class="btn ghost sm" data-action="log" data-id="' + s.id + '" data-project="' + p.key + '">Log update</button>'
      + '</div>'
      + '</div>';
  }

  /* ------------------------------------------------------------ monthly */
  function viewMonthly() {
    var month = currentMonth();
    var st = S.stats(month);
    var rows = [];
    S.data().students.forEach(function (s) {
      s.projects.forEach(function (p) {
        var v = S.projectProgress(p, month);
        if (v === null && !p.monthly[month]) return;
        var snap = p.monthly[month] || {};
        var prev = S.projectProgress(p, S.prevMonth(month));
        rows.push({ s: s, p: p, v: v, snap: snap, prev: prev });
      });
    });

    return ''
      + '<div class="page-head"><div><div class="kicker">Monthly board</div><h1>' + S.monthLabel(month) + '</h1>'
      + '<p class="sub">One row per project. Compare against ' + S.monthLabel(S.prevMonth(month)) + ' and spot who has not been touched this month.</p></div>'
      + '<div class="chips"><button class="btn ghost" data-action="export-csv">Export CSV</button></div></div>'

      + '<div class="grid g4">'
      + '  <div class="kpi"><div class="k-label">Hours taught</div><div class="k-val">' + st.hours + '<small>h</small></div>'
      + '    <div class="k-meta"><span>' + st.projectsInFlight + ' live projects</span></div></div>'
      + '  <div class="kpi"><div class="k-label">Projects updated</div><div class="k-val">' + rows.filter(function (r) { return r.p.monthly[month]; }).length + '</div>'
      + '    <div class="k-meta"><span>across ' + new Set(rows.filter(function (r) { return r.p.monthly[month]; }).map(function (r) { return r.s.id; })).size + ' learners</span></div></div>'
      + '  <div class="kpi"><div class="k-label">New submissions</div><div class="k-val">' + st.submitted + '</div>'
      + '    <div class="k-meta"><span>first time at 100%</span></div></div>'
      + '  <div class="kpi"><div class="k-label">Missing updates</div><div class="k-val">' + st.notUpdated + '</div>'
      + '    <div class="k-meta"><span>learners not touched</span></div></div>'
      + '</div>'

      + '<div class="toolbar mt"><div class="chips">' + S.months().map(function (m) {
        return '<button class="chip ' + (m === month ? 'lime' : '') + '" style="padding:6px 13px;font-size:11.5px" data-action="pick-month" data-month="' + m + '">' + S.monthLabel(m) + '</button>';
      }).join('') + '</div></div>'

      + '<section class="card flush"><div class="table-wrap"><table>'
      + '<thead><tr><th>Learner</th><th>Project</th><th>Stage</th><th>Progress</th><th class="num">Δ</th><th class="num">Hours</th><th class="num">Cumulative</th><th>Review</th></tr></thead><tbody>'
      + (rows.length ? rows.map(function (r) {
        var dd = (r.v === null || r.prev === null) ? null : Math.round((r.v - r.prev) * 10) / 10;
        var isNow = !!r.p.monthly[month];
        return '<tr class="clickable" data-action="open-learner" data-id="' + r.s.id + '"' + (isNow ? '' : ' style="opacity:.62"') + '>'
          + '<td><div class="who"><div class="avatar">' + initials(r.s.name) + '</div><div><b>' + esc(r.s.name) + '</b><span>' + esc(S.advisor(r.s.advisor).name) + '</span></div></div></td>'
          + '<td><b style="font-weight:650">' + esc(r.p.name) + '</b><br><span style="font-size:11px;color:#A2A69A">' + esc(r.p.type) + '</span></td>'
          + '<td>' + (isNow ? '<span class="chip">' + esc(r.snap.stage || '—') + '</span>' : '<span class="chip warn dot">No update</span>') + '</td>'
          + '<td><div class="prog-cell">' + progressBar(r.v) + '<b>' + pct(r.v) + '</b></div></td>'
          + '<td class="num">' + deltaChip(dd) + '</td>'
          + '<td class="num">' + (r.snap.hours || 0) + 'h</td>'
          + '<td class="num">' + (r.snap.cumHours === null || r.snap.cumHours === undefined ? '—' : r.snap.cumHours + 'h') + '</td>'
          + '<td>' + (r.p.review && r.p.review.domestic ? '<span class="chip info">' + esc(r.p.review.domestic) + '</span>' : '<span style="color:#C0C4B6">—</span>') + '</td>'
          + '</tr>';
      }).join('') : '<tr><td colspan="8"><div class="empty"><b>Nothing logged</b>No project has data for this month.</div></td></tr>')
      + '</tbody></table></div></section>'
      + '<p class="footnote">Δ compares with the same project in ' + S.monthLabel(S.prevMonth(month)) + '. Blank means the project had no data then.</p>';
  }

  /* ----------------------------------------------------------- insights */
  function viewInsights() {
    var month = S.currentMonth();
    var b = AI.brief(month);
    var fs = AI.findings(month);
    var cfg = (S.settings() && S.settings().ai) || {};

    return ''
      + '<div class="page-head"><div><div class="kicker">Insights</div><h1>Studio briefing</h1>'
      + '<p class="sub">Generated from your own records with a transparent rule engine — then optionally polished by a model of your choice.</p></div>'
      + '<div class="chips"><span class="chip ' + (cfg.enabled && cfg.key ? 'ok' : '') + ' dot">' + (cfg.enabled && cfg.key ? 'AI connected' : 'Local engine only') + '</span></div></div>'

      + '<div class="brief">'
      + '  <h3>Brief · ' + S.monthLabel(month) + '</h3>'
      + '  <div id="briefBody"><p>' + b.paragraphs.join('</p><p>') + '</p>'
      + '    <p><b>Suggested moves.</b> ' + b.actions.join(' ') + '</p></div>'
      + '  <div class="stat-row">'
      + '    <div class="stat"><b>' + b.stats.hours + 'h</b><span>taught</span></div>'
      + '    <div class="stat"><b>' + b.stats.avgProgress + '%</b><span>avg progress</span></div>'
      + '    <div class="stat"><b>' + b.stats.submitted + '</b><span>submissions</span></div>'
      + '    <div class="stat"><b>' + b.stats.updated + '/' + b.stats.learners + '</b><span>updated</span></div>'
      + '  </div>'
      + '  <div style="margin-top:18px;display:flex;gap:8px;flex-wrap:wrap">'
      + '    <button class="btn primary sm" data-action="ai-brief">Polish with AI</button>'
      + '    <button class="btn ghost sm" data-action="copy-brief" style="background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.16);color:#EDEEE7">Copy</button>'
      + '    <button class="btn ghost sm" data-action="export-brief" style="background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.16);color:#EDEEE7">Download .md</button>'
      + '  </div>'
      + '</div>'

      + '<div class="grid g2 mt">'
      + '  <section class="card"><div class="card-head"><h2>What the data says</h2><span class="hint">' + fs.length + ' findings</span></div>'
      + (fs.length ? fs.map(function (f) {
        return '<div class="insight ' + f.level + '"><h4>' + esc(f.title) + '</h4><p>' + f.body + '</p></div>';
      }).join('') : '<div class="empty"><b>Nothing to flag</b>All learners are on a healthy cadence.</div>')
      + '  </section>'

      + '  <section class="card"><div class="card-head"><h2>How this is computed</h2></div>'
      + '    <div class="dir"><b>Overall application progress</b><span>lowest project progress this month</span></div>'
      + '    <div class="dir"><b>Stalled</b><span>no movement for 2+ consecutive months</span></div>'
      + '    <div class="dir"><b>Behind</b><span>overall below 40%</span></div>'
      + '    <div class="dir"><b>Session drop</b><span>hours below 40% of last month</span></div>'
      + '    <div class="dir"><b>Ready</b><span>project between 95% and 99%</span></div>'
      + '    <p class="hint" style="margin-top:12px;line-height:1.6">Rules are deterministic: the same data always produces the same briefing. '
      + 'With an API key configured, the text can be rewritten by a model — the numbers never change.</p>'
      + '  </section>'
      + '</div>';
  }

  /* --------------------------------------------------------------- data */
  function viewData() {
    var d = S.data();
    var cfg = (d.settings && d.settings.ai) || {};
    var bytes = new Blob([JSON.stringify(d)]).size;
    var snaps = d.students.reduce(function (n, s) { return n + s.projects.reduce(function (m, p) { return m + Object.keys(p.monthly).length; }, 0); }, 0);

    return ''
      + '<div class="page-head"><div><div class="kicker">System</div><h1>Data &amp; AI</h1>'
      + '<p class="sub">This workspace is a static site. Your records live in this browser only — nothing is uploaded anywhere.</p></div></div>'

      + '<div class="banner" style="margin-bottom:16px"><div>'
      + '<b>Privacy by design.</b> The bundled demo contains fictional learner names and no contact details. '
      + 'If you load real student data, keep this repo private and export a backup before clearing your browser.'
      + '</div></div>'

      + '<div class="grid g2">'
      + '  <section class="card"><div class="card-head"><h2>Workspace</h2><span class="hint">' + (bytes / 1024).toFixed(0) + ' KB</span></div>'
      + '    <div class="dir"><b>Learners</b><span>' + d.students.length + '</span></div>'
      + '    <div class="dir"><b>Projects</b><span>' + d.students.reduce(function (n, s) { return n + s.projects.length; }, 0) + '</span></div>'
      + '    <div class="dir"><b>Monthly records</b><span>' + snaps + '</span></div>'
      + '    <div class="dir"><b>Months tracked</b><span>' + S.months().map(S.monthLabel).join(' · ') + '</span></div>'
      + '    <div class="dir"><b>Storage</b><span>localStorage · this browser</span></div>'
      + '    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">'
      + '      <button class="btn primary sm" data-action="export-json">Export JSON</button>'
      + '      <button class="btn ghost sm" data-action="import-json">Import JSON</button>'
      + '      <button class="btn ghost sm" data-action="reset-demo">Reset demo</button>'
      + '      <button class="btn ghost sm" data-action="wipe">Clear browser data</button>'
      + '    </div>'
      + '    <input type="file" id="fileInput" accept="application/json" style="display:none">'
      + '  </section>'

      + '  <section class="card"><div class="card-head"><h2>AI assistant</h2><span class="hint">optional</span></div>'
      + '    <form id="aiForm">'
      + '      <div class="field"><label class="switch">'
      + '        <input type="checkbox" id="aiEnabled"' + (cfg.enabled ? ' checked' : '') + '>'
      + '        <span style="font-size:12.5px;font-weight:600;text-transform:none;letter-spacing:0">Enable model rewrite</span></label>'
      + '        <div class="help">When off, every insight is produced locally by the rule engine.</div></div>'
      + '      <div class="field"><label for="aiBase">API base URL</label>'
      + '        <input id="aiBase" placeholder="https://api.openai.com/v1" value="' + esc(cfg.baseUrl || '') + '">'
      + '        <div class="help">Any OpenAI-compatible endpoint (OpenAI, DeepSeek, Moonshot, local Ollama…).</div></div>'
      + '      <div class="row2">'
      + '        <div class="field"><label for="aiModel">Model</label><input id="aiModel" value="' + esc(cfg.model || 'gpt-4o-mini') + '"></div>'
      + '        <div class="field"><label for="aiKey">API key</label><input id="aiKey" type="password" placeholder="sk-…" value="' + esc(cfg.key || '') + '"></div>'
      + '      </div>'
      + '      <div class="help" style="margin-bottom:12px">Stored in this browser only and sent directly to the endpoint you name. '
      + 'Never commit a key to the repository.</div>'
      + '      <div style="display:flex;gap:8px"><button class="btn primary sm" type="submit">Save</button>'
      + '        <button class="btn ghost sm" type="button" data-action="test-ai">Test connection</button></div>'
      + '    </form>'
      + '  </section>'
      + '</div>'

      + '<div class="grid g2 mt">'
      + '  <section class="card"><div class="card-head"><h2>Run it anywhere</h2></div>'
      + '    <div class="dir"><b>Local</b><span>open index.html, or <span class="mono">python3 -m http.server</span></span></div>'
      + '    <div class="dir"><b>GitHub Pages</b><span>Settings → Pages → deploy from branch</span></div>'
      + '    <div class="dir"><b>Netlify / Vercel</b><span>drag the folder in — no build step</span></div>'
      + '    <div class="dir"><b>Offline</b><span>installable PWA with a cached shell</span></div>'
      + '    <p class="hint" style="margin-top:12px;line-height:1.6">The whole app is four static files and a JSON dataset. No backend, no database, no login.</p>'
      + '  </section>'
      + '  <section class="card"><div class="card-head"><h2>Rolling it out</h2></div>'
      + '    <div class="dir"><b>1 · Replace the dataset</b><span>Export JSON, swap in real records, import</span></div>'
      + '    <div class="dir"><b>2 · Keep it private</b><span>private repo or password-protected host</span></div>'
      + '    <div class="dir"><b>3 · Agree the rule</b><span>overall = slowest project, not average</span></div>'
      + '    <div class="dir"><b>4 · Review monthly</b><span>log updates, then export the briefing</span></div>'
      + '  </section>'
      + '</div>';
  }

  /* ------------------------------------------------------------- modals */
  function logModal(studentId, projectKey) {
    var students = S.data().students;
    var s = studentId ? S.student(studentId) : students[0];
    var month = S.currentMonth();
    var projectOpts = function (st) {
      return st.projects.map(function (p) {
        return '<option value="' + p.key + '"' + (projectKey === p.key ? ' selected' : '') + '>' + esc(p.name) + ' — ' + esc(p.type) + '</option>';
      }).join('');
    };
    var p = s.projects.filter(function (x) { return x.key === projectKey; })[0] || s.projects[0];
    var snap = p && p.monthly[month];

    modal(''
      + '<div class="modal-head"><div><h3>Log a monthly update</h3><p>Writes to this browser only. Overall progress recalculates instantly.</p></div>'
      + '<button class="x" data-action="close-modal">✕</button></div>'
      + '<form id="logForm">'
      + '  <div class="field"><label>Learner</label><select id="lgStudent">'
      + students.map(function (x) { return '<option value="' + x.id + '"' + (x.id === s.id ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('')
      + '  </select></div>'
      + '  <div class="field"><label>Project</label><select id="lgProject">' + projectOpts(s) + '</select></div>'
      + '  <div class="row2">'
      + '    <div class="field"><label>Progress %</label><input id="lgProgress" type="number" min="0" max="100" step="0.5" value="' + (snap && snap.progress !== null ? snap.progress : '') + '" placeholder="e.g. 75"></div>'
      + '    <div class="field"><label>Hours this month</label><input id="lgHours" type="number" min="0" step="1" value="' + (snap ? snap.hours : 0) + '"></div>'
      + '  </div>'
      + '  <div class="field"><label>Stage</label><input id="lgStage" value="' + esc(snap ? snap.stage : '') + '" placeholder="e.g. Late production"></div>'
      + '  <div class="field"><label>Internal note</label><textarea id="lgNote" placeholder="Optional — what changed, what to watch"></textarea></div>'
      + '  <div class="modal-foot"><button type="button" class="btn ghost" data-action="close-modal">Cancel</button>'
      + '  <button type="submit" class="btn primary">Save update</button></div>'
      + '</form>');

    $('#lgStudent').addEventListener('change', function (e) {
      var st = S.student(e.target.value);
      $('#lgProject').innerHTML = projectOpts(st);
    });

    $('#logForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var res = S.logUpdate({
        studentId: $('#lgStudent').value,
        projectKey: $('#lgProject').value,
        month: S.currentMonth(),
        progress: $('#lgProgress').value,
        hours: $('#lgHours').value,
        stage: $('#lgStage').value,
        note: $('#lgNote').value
      });
      if (res.ok) {
        closeModal();
        toast('Update saved · overall ' + pct(res.overall), 'ok');
        render();
      } else {
        toast(res.msg, 'err');
      }
    });
  }

  function addLearnerModal() {
    modal(''
      + '<div class="modal-head"><div><h3>Add a learner</h3><p>You can fill in projects afterwards.</p></div>'
      + '<button class="x" data-action="close-modal">✕</button></div>'
      + '<form id="newLearner">'
      + '  <div class="field"><label>Name</label><input id="nlName" required placeholder="e.g. Robin"></div>'
      + '  <div class="row2">'
      + '    <div class="field"><label>Cohort</label><input id="nlCohort" value="27F"></div>'
      + '    <div class="field"><label>Advisor</label><select id="nlAdvisor">'
      + S.data().advisors.map(function (a) { return '<option value="' + a.id + '">' + esc(a.name) + '</option>'; }).join('')
      + '    </select></div>'
      + '  </div>'
      + '  <div class="row2">'
      + '    <div class="field"><label>Package</label><select id="nlPkg">'
      + ['Top 3', 'Top 5', 'Top 8', 'Top 10', 'Standard', 'Hourly'].map(function (x) { return '<option>' + x + '</option>'; }).join('')
      + '    </select></div>'
      + '    <div class="field"><label>Degree</label><select id="nlDegree"><option>MA</option><option>BA</option></select></div>'
      + '  </div>'
      + '  <div class="row2">'
      + '    <div class="field"><label>Major</label><input id="nlMajor" value="Interaction Design"></div>'
      + '    <div class="field"><label>Destination</label><input id="nlCountry" value="UK"></div>'
      + '  </div>'
      + '  <div class="modal-foot"><button type="button" class="btn ghost" data-action="close-modal">Cancel</button>'
      + '  <button type="submit" class="btn primary">Add learner</button></div>'
      + '</form>');

    $('#newLearner').addEventListener('submit', function (e) {
      e.preventDefault();
      S.addStudent({
        name: $('#nlName').value.trim(),
        cohort: $('#nlCohort').value.trim(),
        advisor: $('#nlAdvisor').value,
        package: $('#nlPkg').value,
        degree: $('#nlDegree').value,
        major: $('#nlMajor').value.trim(),
        countries: [$('#nlCountry').value.trim()]
      });
      closeModal();
      toast('Learner added', 'ok');
      render();
    });
  }

  function addProjectModal(studentId) {
    modal(''
      + '<div class="modal-head"><div><h3>Add a project</h3><p>Projects hold the progress record for one body of work.</p></div>'
      + '<button class="x" data-action="close-modal">✕</button></div>'
      + '<form id="newProject">'
      + '  <div class="field"><label>Project name</label><input id="npName" required placeholder="Project 3"></div>'
      + '  <div class="field"><label>Type</label><input id="npType" placeholder="e.g. Interactive installation"></div>'
      + '  <div class="modal-foot"><button type="button" class="btn ghost" data-action="close-modal">Cancel</button>'
      + '  <button type="submit" class="btn primary">Add project</button></div>'
      + '</form>');
    $('#newProject').addEventListener('submit', function (e) {
      e.preventDefault();
      S.addProject(studentId, $('#npName').value.trim(), $('#npType').value.trim());
      closeModal(); toast('Project added', 'ok'); render();
    });
  }

  function qualModal(studentId) {
    var s = S.student(studentId);
    modal(''
      + '<div class="modal-head"><div><h3>Qualitative record · ' + esc(s.name) + '</h3><p>Overwritten each month, in line with the reporting rule.</p></div>'
      + '<button class="x" data-action="close-modal">✕</button></div>'
      + '<form id="qualForm">'
      + '  <div class="field"><label>Strengths</label><textarea id="qS">' + esc(s.qualitative.strengths) + '</textarea></div>'
      + '  <div class="field"><label>Attitude</label><textarea id="qA">' + esc(s.qualitative.attitude) + '</textarea></div>'
      + '  <div class="field"><label>Next focus</label><textarea id="qN">' + esc(s.qualitative.nextFocus) + '</textarea></div>'
      + '  <div class="modal-foot"><button type="button" class="btn ghost" data-action="close-modal">Cancel</button>'
      + '  <button type="submit" class="btn primary">Save</button></div>'
      + '</form>');
    $('#qualForm').addEventListener('submit', function (e) {
      e.preventDefault();
      S.setQualitative(s.id, 'strengths', $('#qS').value.trim());
      S.setQualitative(s.id, 'attitude', $('#qA').value.trim());
      S.setQualitative(s.id, 'nextFocus', $('#qN').value.trim());
      closeModal(); toast('Saved', 'ok'); render();
    });
  }

  /* ------------------------------------------------------------ exports */
  function download(name, text, type) {
    var blob = new Blob([text], { type: type || 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
  }

  function exportCsv() {
    var month = currentMonth();
    var lines = [['Learner', 'Advisor', 'Cohort', 'Project', 'Type', 'Stage', 'Progress %', 'Hours', 'Cumulative'].join(',')];
    S.data().students.forEach(function (s) {
      s.projects.forEach(function (p) {
        var v = S.projectProgress(p, month);
        if (v === null) return;
        var snap = p.monthly[month] || S.lastSnapshot(p, month).data;
        lines.push([s.name, S.advisor(s.advisor).name, s.cohort, p.name, p.type,
          snap.stage || '', v, snap.hours || 0, snap.cumHours === null || snap.cumHours === undefined ? '' : snap.cumHours]
          .map(function (x) { return '"' + String(x).replace(/"/g, '""') + '"'; }).join(','));
      });
    });
    download('studio-track-' + month + '.csv', lines.join('\n'), 'text/csv;charset=utf-8');
    toast('CSV exported', 'ok');
  }

  function exportJson() {
    download('studio-track-data-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(S.data(), null, 2), 'application/json');
    toast('Backup exported', 'ok');
  }

  function plainBrief() {
    var b = AI.brief(S.currentMonth());
    return '# Studio briefing · ' + S.monthLabel(S.currentMonth()) + '\n\n' +
      b.paragraphs.join('\n\n').replace(/<\/?b>/g, '') + '\n\n**Suggested moves**\n\n' +
      b.actions.map(function (a) { return '- ' + a.replace(/<\/?b>/g, ''); }).join('\n') + '\n';
  }

  /* -------------------------------------------------------------- events */
  function bindGlobal() {
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-action]');
      if (!t) return;
      var a = t.getAttribute('data-action');
      var id = t.getAttribute('data-id');

      if (a === 'close-modal') { closeModal(); return; }
      if (a === 'open-learner') { location.hash = '#/learner/' + id; return; }
      if (a === 'add-learner') { addLearnerModal(); return; }
      if (a === 'add-project') { addProjectModal(id); return; }
      if (a === 'edit-qual') { qualModal(id); return; }
      if (a === 'log') { logModal(id, t.getAttribute('data-project')); return; }
      if (a === 'pick-month') { ui.monthly = t.getAttribute('data-month'); S.setMonth(ui.monthly); $('#monthSelect').value = ui.monthly; render(); return; }
      if (a === 'export-csv') { exportCsv(); return; }
      if (a === 'export-json') { exportJson(); return; }
      if (a === 'export-brief') { download('briefing-' + S.currentMonth() + '.md', plainBrief(), 'text/markdown'); toast('Briefing downloaded', 'ok'); return; }
      if (a === 'copy-brief') { navigator.clipboard.writeText(plainBrief()).then(function () { toast('Copied to clipboard', 'ok'); }); return; }
      if (a === 'reset-demo') {
        if (confirm('Reset to the bundled demo dataset? Local edits in this browser will be lost.')) {
          S.resetDemo(); toast('Demo restored', 'ok'); render();
        }
        return;
      }
      if (a === 'wipe') {
        if (confirm('Clear all workspace data from this browser? Export a backup first.')) {
          localStorage.removeItem('studiotrack.v1');
          location.reload();
        }
        return;
      }
      if (a === 'import-json') { $('#fileInput').click(); return; }
      if (a === 'draft-note') {
        var s = S.student(id);
        var out = $('#noteOut');
        out.style.color = '#3C3F35';
        out.textContent = AI.draftNote(id, S.currentMonth());
        return;
      }
      if (a === 'ai-brief') {
        var cfg = (S.settings() && S.settings().ai) || {};
        if (!cfg.enabled || !cfg.key) {
          toast('Turn on AI and add a key under Data & AI', 'err');
          return;
        }
        t.disabled = true; t.textContent = 'Thinking…';
        AI.llm(AI.briefPrompt(S.currentMonth()))
          .then(function (txt) {
            $('#briefBody').innerHTML = '<p>' + esc(txt).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>') + '</p>';
            toast('Briefing rewritten', 'ok');
          })
          .catch(function (err) { toast(err.message.slice(0, 140), 'err'); })
          .then(function () { t.disabled = false; t.textContent = 'Polish with AI'; });
        return;
      }
      if (a === 'test-ai') {
        t.disabled = true; t.textContent = 'Testing…';
        AI.llm('Reply with the single word: ready')
          .then(function (txt) { toast('Connected · ' + txt.slice(0, 40), 'ok'); })
          .catch(function (err) { toast(err.message.slice(0, 150), 'err'); })
          .then(function () { t.disabled = false; t.textContent = 'Test connection'; });
        return;
      }
    });

    document.addEventListener('change', function (e) {
      if (e.target.id === 'monthSelect') {
        ui.monthly = e.target.value;
        S.setMonth(e.target.value);
        render();
      }
      if (e.target.id === 'fAdvisor') { ui.advisor = e.target.value; render(); }
      if (e.target.id === 'fCohort') { ui.cohort = e.target.value; render(); }
      if (e.target.id === 'fPkg') { ui.pkg = e.target.value; render(); }
      if (e.target.id === 'fBand') { ui.band = e.target.value; render(); }
      if (e.target.id === 'fileInput' && e.target.files[0]) {
        var reader = new FileReader();
        reader.onload = function () {
          try {
            S.replaceAll(JSON.parse(reader.result));
            toast('Dataset imported', 'ok');
            render();
          } catch (err) { toast('Import failed: ' + err.message, 'err'); }
        };
        reader.readAsText(e.target.files[0]);
      }
    });

    document.addEventListener('input', function (e) {
      if (e.target.id === 'q') {
        ui.q = e.target.value;
        render();
        var box = $('#q');
        if (box) { box.focus(); box.setSelectionRange(box.value.length, box.value.length); }
      }
    });

    document.addEventListener('submit', function (e) {
      if (e.target.id === 'aiForm') {
        e.preventDefault();
        S.saveSettings({
          ai: {
            enabled: $('#aiEnabled').checked,
            baseUrl: $('#aiBase').value.trim() || 'https://api.openai.com/v1',
            model: $('#aiModel').value.trim() || 'gpt-4o-mini',
            key: $('#aiKey').value.trim()
          }
        });
        toast('AI settings saved locally', 'ok');
        render();
      }
    });

    $('#quickLogBtn').addEventListener('click', function () { logModal(null, null); });
    $('#exportBtn').addEventListener('click', exportJson);
    $('#menuBtn').addEventListener('click', function () { $('#side').classList.toggle('open'); });
    $('#nav').addEventListener('click', function () { $('#side').classList.remove('open'); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
    });

    window.addEventListener('hashchange', render);
  }

  /* --------------------------------------------------------------- render */
  function parseHash() {
    var h = (location.hash || '#/overview').replace(/^#\//, '');
    var parts = h.split('/');
    ui.route = parts[0] || 'overview';
    ui.id = parts[1] || null;
  }

  function render() {
    parseHash();
    var html = '';
    var crumb = 'Overview';

    if (ui.route === 'learners') { html = viewLearners(); crumb = 'Learners'; }
    else if (ui.route === 'learner') { html = viewLearner(ui.id); crumb = 'Learners / record'; }
    else if (ui.route === 'monthly') { html = viewMonthly(); crumb = 'Monthly board'; }
    else if (ui.route === 'insights') { html = viewInsights(); crumb = 'Insights'; }
    else if (ui.route === 'data') { html = viewData(); crumb = 'Data & AI'; }
    else { html = viewOverview(); crumb = 'Overview'; }

    $('#view').innerHTML = html;
    $('#crumb').textContent = crumb;
    $('#monthSelect').innerHTML = monthOptions();
    $('#monthSelect').value = S.currentMonth();

    var active = ui.route === 'learner' ? 'learners' : ui.route;
    $$('#nav a').forEach(function (a) {
      a.classList.toggle('on', a.getAttribute('data-route') === active);
    });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  /* ----------------------------------------------------------------- boot */
  S.load();
  bindGlobal();
  if (!location.hash) location.hash = '#/overview';
  render();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* offline is optional */ });
    });
  }
})();
