/* Studio Track — insight engine
   1) Deterministic, explainable findings computed from your own data.
   2) Optional LLM polish via any OpenAI-compatible endpoint (key stays in this browser). */
(function () {
  'use strict';

  var S = window.Store;

  function r1(n) { return Math.round(n * 10) / 10; }
  function pct(n) { return n === null ? '—' : Math.round(n) + '%'; }

  /* ---------------------------------------------------------- findings */
  function findings(month) {
    month = month || S.currentMonth();
    var out = [];
    var att = S.attention(month);

    att.slice(0, 4).forEach(function (a) {
      out.push({
        level: a.score >= 45 ? 'risk' : 'watch',
        title: a.student.name + ' · ' + (a.progress === null ? 'no progress data' : pct(a.progress)),
        body: a.reasons.join(' · ') + '. <b>' + a.student.qualitative.nextFocus + '</b>'
      });
    });

    /* slowest project is what caps the application progress */
    S.data().students.forEach(function (s) {
      var vals = s.projects.map(function (p) {
        return { p: p, v: S.projectProgress(p, month) };
      }).filter(function (x) { return x.v !== null && x.v < 100; });
      if (vals.length < 2) return;
      vals.sort(function (a, b) { return a.v - b.v; });
      var gap = vals[vals.length - 1].v - vals[0].v;
      if (gap >= 30) {
        out.push({
          level: 'watch',
          title: s.name + ' · ' + vals[0].p.name + ' is the bottleneck',
          body: 'Overall sits at <b>' + pct(S.overall(s, month)) + '</b> because ' + vals[0].p.name +
            ' is at ' + pct(vals[0].v) + ' while ' + vals[vals.length - 1].p.name + ' is already at ' +
            pct(vals[vals.length - 1].v) + '. Closing this gap moves the whole application, not just one project.'
        });
      }
    });

    /* ready to submit */
    var ready = [];
    S.data().students.forEach(function (s) {
      s.projects.forEach(function (p) {
        var v = S.projectProgress(p, month);
        if (v !== null && v >= 95 && v < 100) ready.push(s.name + ' · ' + p.name + ' (' + pct(v) + ')');
      });
    });
    if (ready.length) {
      out.push({
        level: 'good',
        title: ready.length + ' project' + (ready.length > 1 ? 's' : '') + ' within touching distance of submission',
        body: ready.join(' · ') + '. A single final-shoot or layout session usually clears these.'
      });
    }

    /* momentum */
    var movers = S.data().students.map(function (s) {
      return { s: s, d: S.delta(s, month) };
    }).filter(function (x) { return x.d !== null && x.d > 0; })
      .sort(function (a, b) { return b.d - a.d; }).slice(0, 3);
    if (movers.length) {
      out.push({
        level: 'good',
        title: 'Strongest momentum',
        body: movers.map(function (m) { return '<b>' + m.s.name + '</b> +' + r1(m.d) + ' pts'; }).join(' · ') +
          '. Worth naming in the next team sync.'
      });
    }

    /* zero-session */
    var zero = S.data().students.filter(function (s) {
      return S.monthHours(s, month) === 0 && S.updatedThisMonth(s, month);
    }).map(function (s) { return s.name; });
    if (zero.length) {
      out.push({
        level: 'watch',
        title: 'Logged but not taught',
        body: zero.join(' · ') + ' have a progress update but no hours in ' + S.monthLabel(month) +
          '. Either sessions were missed or the hours were not recorded.'
      });
    }

    return out;
  }

  /* ------------------------------------------------------------ brief */
  function brief(month) {
    month = month || S.currentMonth();
    var st = S.stats(month);
    var att = S.attention(month);
    var subs = [];
    S.data().students.forEach(function (s) {
      s.projects.forEach(function (p) {
        var now = p.monthly[month] ? p.monthly[month].progress : null;
        var prev = S.lastSnapshot(p, S.prevMonth(month));
        var before = prev ? prev.data.progress : null;
        if (typeof now === 'number' && now >= 100 && (before === null || before < 100)) {
          subs.push(s.name + ' / ' + p.name);
        }
      });
    });

    var p1 = 'In <b>' + S.monthLabel(month) + '</b>, ' + st.learners + ' learners are on the books and ' +
      st.active + ' have live projects. ' + st.updated + ' were updated this month' +
      (st.notUpdated ? ', <b>' + st.notUpdated + '</b> ' + (st.notUpdated === 1 ? 'was' : 'were') + ' not' : ', everyone was updated') + '. ' +
      'Teaching load was <b>' + st.hours + ' hours</b>' +
      (st.hoursDelta === 0 ? ', flat month on month' :
        (st.hoursDelta > 0 ? ', up ' + st.hoursDelta + 'h on last month' : ', down ' + Math.abs(st.hoursDelta) + 'h on last month')) +
      ', spread across ' + st.projectsInFlight + ' active projects.';

    var p2 = 'Average application progress is <b>' + st.avgProgress + '%</b>. ' +
      (subs.length ? subs.length + ' project' + (subs.length > 1 ? 's were' : ' was') + ' newly submitted (' + subs.join(', ') + '). '
        : 'No new submissions this month. ') +
      (att.length ? att.length + ' learners need a decision from you — the top three are listed below.' :
        'Nothing is currently flagged.');

    var actions = [];
    if (att[0]) actions.push('Book a session with <b>' + att[0].student.name + '</b> — ' + att[0].reasons[0].toLowerCase() + '.');
    var ready = [];
    S.data().students.forEach(function (s) {
      s.projects.forEach(function (p) {
        var v = S.projectProgress(p, month);
        if (v !== null && v >= 95 && v < 100) ready.push(s.name + ' / ' + p.name);
      });
    });
    if (ready.length) actions.push('Schedule the final shoot for ' + ready.slice(0, 3).join(', ') + '.');
    if (st.notUpdated) actions.push('Chase the ' + st.notUpdated + ' missing updates before the monthly report locks.');
    if (!actions.length) actions.push('Keep the current cadence; no interventions needed.');

    return {
      month: month,
      paragraphs: [p1, p2],
      actions: actions,
      stats: st
    };
  }

  /* ------------------------------------------------------- learner note */
  function draftNote(studentId, month) {
    month = month || S.currentMonth();
    var s = S.student(studentId);
    if (!s) return '';
    var o = S.overall(s, month);
    var h = S.monthHours(s, month);
    var cum = S.cumHours(s, month);
    var d = S.delta(s, month);
    var live = s.projects.filter(function (p) { return S.projectProgress(p, month) !== null; });

    var lines = [];
    lines.push(s.name + ' — ' + S.monthLabel(month));
    lines.push('');
    live.forEach(function (p) {
      var v = S.projectProgress(p, month);
      var snap = S.lastSnapshot(p, month);
      lines.push('· ' + p.name + ' (' + p.type + '): ' + pct(v) + (snap && snap.data.stage ? ' — ' + snap.data.stage : ''));
    });
    lines.push('');
    lines.push('Sessions this month: ' + h + 'h' + (typeof cum === 'number' ? ' · cumulative ' + cum + 'h' : '') +
      (d === null ? '' : ' · overall ' + (d >= 0 ? '+' : '') + r1(d) + ' pts'));
    if (s.qualitative.strengths) lines.push('Strength: ' + s.qualitative.strengths);
    if (s.qualitative.attitude) lines.push('Attitude: ' + s.qualitative.attitude);
    if (o !== null && o < 50) lines.push('Risk: still in the early half of the project — needs a tighter weekly cadence.');
    lines.push('Next: ' + (s.qualitative.nextFocus || 'agree the next milestone together'));
    return lines.join('\n');
  }

  /* --------------------------------------------------------------- LLM */
  function aiSettings() { return (S.settings() && S.settings().ai) || {}; }

  function digest(month) {
    var rows = S.data().students.map(function (s) {
      var ps = s.projects.map(function (p) {
        var v = S.projectProgress(p, month);
        return p.name + ' ' + pct(v) + ' (' + (p.monthly[month] ? p.monthly[month].hours : 0) + 'h)';
      }).join('; ');
      return s.name + ' | ' + s.cohort + ' | ' + s.package + ' | overall ' + pct(S.overall(s, month)) + ' | ' + ps +
        ' | next: ' + s.qualitative.nextFocus;
    });
    return 'Month: ' + month + '\n' + rows.join('\n');
  }

  function llm(prompt, system) {
    var cfg = aiSettings();
    if (!cfg.enabled || !cfg.key) {
      return Promise.reject(new Error('AI is off. Turn it on and add an API key under Data & AI.'));
    }
    var url = String(cfg.baseUrl || '').replace(/\/+$/, '') + '/chat/completions';
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.key },
      body: JSON.stringify({
        model: cfg.model || 'gpt-4o-mini',
        temperature: 0.4,
        messages: [
          { role: 'system', content: system || 'You are a concise academic mentoring lead. Write in English, no fluff, no emoji.' },
          { role: 'user', content: prompt }
        ]
      })
    }).then(function (r) {
      if (!r.ok) {
        return r.text().then(function (t) {
          throw new Error('API ' + r.status + ': ' + t.slice(0, 180));
        });
      }
      return r.json();
    }).then(function (j) {
      var msg = j && j.choices && j.choices[0] && j.choices[0].message;
      return (msg && msg.content || '').trim();
    });
  }

  function briefPrompt(month) {
    return 'Here is the studio data for ' + S.monthLabel(month) + ':\n\n' + digest(month) +
      '\n\nWrite a 150-word studio briefing for the programme lead: what moved, what stalled, and the three decisions they should make this week. Plain prose, no headings, no bullet points.';
  }

  function notePrompt(studentId, month) {
    var s = S.student(studentId);
    var local = draftNote(studentId, month);
    return 'Rewrite this monthly learner note so it is clear, specific and kind. Keep every number. Max 130 words. Learner: ' +
      s.name + ', ' + s.cohort + ', ' + s.degree + ', ' + s.major + '.\n\n' + local;
  }

  window.AI = { findings: findings, brief: brief, draftNote: draftNote, llm: llm, briefPrompt: briefPrompt, notePrompt: notePrompt };
})();
