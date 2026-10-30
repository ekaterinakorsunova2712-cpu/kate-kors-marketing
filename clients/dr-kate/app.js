(function () {
  const nf = (n) => d3.format(',')(Math.round(n)).replace(/,/g, ' ');
  const MS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const dshort = (s) => { const p = s.split('-').map(Number); return p[2] + ' ' + MS[p[1] - 1]; };
  const utc = (s) => { const p = s.split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2])); };
  const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const add = (p, ...c) => { c.forEach((x) => { if (x) p.appendChild(x); }); return p; };
  const rowsOf = (id) => { const g = dash.data(id); return g.status === 'ok' ? g.data : null; };
  const NS = 'http://www.w3.org/2000/svg';
  const widthOf = (el, min) => Math.max(min || 280, Math.floor(el.clientWidth || 600));
  const mkSvg = (el, W, H) => d3.select(el).append('svg').attr('width', '100%').attr('viewBox', '0 0 ' + W + ' ' + H);
  const mkTip = (el) => {
    const t = h('div', 'kk-tip'); t.style.display = 'none'; el.appendChild(t);
    return {
      show(ev, lines) {
        t.replaceChildren(...lines.map((l) => h('div', null, l)));
        t.style.display = 'block';
        const r = el.getBoundingClientRect();
        let x = ev.clientX - r.left + 12; const y = ev.clientY - r.top + 12;
        x = Math.min(x, r.width - t.offsetWidth - 4);
        t.style.left = Math.max(4, x) + 'px'; t.style.top = y + 'px';
      },
      hide() { t.style.display = 'none'; },
    };
  };
  const MUTE = 'rgba(242,238,233,.62)', LINE = 'rgba(242,238,233,.14)', PINK = '#F4C6D2', BLUE = '#9db7cc', SAND = '#cdb99a';

  const GREY_SVC = ['xerf', 'ff'];

  // ---- calcs
  dash.calc('plan_calc', {
    inputs: ['plan'], title: 'Бюджет по кампаниям',
    description: 'Дни показа умножены на бюджет в день для каждой кампании.',
    fn: (plan) => plan.map((r) => ({ id: r.id, total_aed: Number(r.days) * Number(r.budget_day) })),
  });
  dash.calc('plan_totals', {
    inputs: ['plan'], title: 'Итоги плана',
    description: 'Общий бюджет, число кампаний, дата первого запуска и дневной бюджет первой фазы.',
    fn: (plan) => {
      const MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
      const END = Date.UTC(2026, 11, 1);
      const novDays = (r) => { const q = r.start.split('-').map(Number); const s0 = Date.UTC(q[0], q[1] - 1, q[2]); return Math.max(0, Math.min(Number(r.days), Math.round((END - s0) / 86400000))); };
      const total = plan.reduce((s, r) => s + novDays(r) * Number(r.budget_day), 0);
      const first = plan.map((r) => r.start).sort()[0];
      const p = first.split('-').map(Number);
      const phase1 = plan.filter((r) => r.start === first).reduce((s, r) => s + Number(r.budget_day), 0);
      return [{ total_aed: total, campaigns: plan.filter((r) => novDays(r) > 0 && Number(r.budget_day) > 0).length, phase1_daily: phase1, first_start: p[2] + ' ' + MON[p[1] - 1] }];
    },
  });
  dash.calc('payback', {
    inputs: ['plan', 'services'], title: 'Окупаемость кампаний',
    description: 'Бюджет кампании и выручка с одной пациентки на популярной процедуре. Это выручка, не прибыль.',
    fn: (plan, services) => {
      const map = { K1: 'lips', K2: 'body', K3: 'xerf', K4: 'salmon', F1: 'ff' };
      return plan.filter((r) => map[r.id]).map((r) => {
        const s = services.find((x) => x.id === map[r.id]);
        const budget = Number(r.days) * Number(r.budget_day);
        return { id: r.id, name: r.name, budget_aed: budget, check_aed: Number(s.popular), times: Math.round((Number(s.popular) / budget) * 10) / 10 };
      });
    },
  });

  // ---- KPIs
  const kpi = (name, field, fmt) => dash.draw(name, (el) => {
    const g = dash.data('plan_totals');
    if (g.status !== 'ok' || !g.data[0]) { el.textContent = '—'; return; }
    const v = g.data[0][field];
    el.textContent = fmt ? fmt(v) : v;
  });
  kpi('kpi-budget', 'total_aed', nf); kpi('kpi-count', 'campaigns'); kpi('kpi-phase1', 'phase1_daily', nf); kpi('kpi-start', 'first_start');

  // ---- 01 portraits
  const dots = (n) => { const d = h('div', 'kk-dots'); for (let i = 1; i <= 5; i++) d.appendChild(h('i', i <= n ? 'on' : '')); return d; };
  dash.draw('portraits', (el) => {
    const seg = rowsOf('segments'); if (!seg) { el.textContent = '—'; return; }
    el.replaceChildren(...seg.map((s) => {
      const top = add(h('div', 'kk-pt-top'), h('div', 'kk-av', s.name[0]), add(h('div'), h('h3', null, s.name), h('div', 'meta', s.age + ' лет · ' + s.lang)));
      const dl = h('dl');
      [['Кто она', s.tagline], ['Хочет', s.goal], ['Что беспокоит', s.pain], ['Боится', s.fear], ['Где я её нахожу', s.sees], ['Покупает', s.buys]].forEach(([k, v]) => add(dl, h('dt', null, k), h('dd', null, v)));
      const m = h('div', 'kk-meters');
      [['Готовность купить', s.readiness], ['Потенциал чека', s.check], ['Чувствительность к цене', s.price_sens]].forEach(([k, v]) => add(m, add(h('div', 'kk-meter'), h('span', null, k), dots(v))));
      return add(h('div', 'kk-pt' + (s.id === 'ru' ? ' hold' : '')), top, add(h('div', 'kk-hook'), document.createTextNode('Что ей говорю: ' + s.hook)), dl, m);
    }));
  });

  dash.draw('scatter', (el) => {
    const seg = rowsOf('segments'); el.replaceChildren(); if (!seg) { el.textContent = '—'; return; }
    const W = widthOf(el), H = Math.round(Math.max(280, W * 0.62)), m = { l: 44, r: 16, t: 14, b: 44 };
    const x = d3.scaleLinear([0.5, 5.5], [m.l, W - m.r]), y = d3.scaleLinear([0.5, 5.5], [H - m.b, m.t]);
    const svg = mkSvg(el, W, H), tip = mkTip(el);
    svg.append('rect').attr('x', x(3.5)).attr('y', y(5.5)).attr('width', x(5.5) - x(3.5)).attr('height', y(3.5) - y(5.5)).attr('fill', PINK).attr('opacity', 0.1);
    svg.append('text').attr('class', 'm').attr('x', x(5.5) - 4).attr('y', y(5.5) + 14).attr('text-anchor', 'end').attr('font-size', 11).text('сначала сюда');
    [1, 2, 3, 4, 5].forEach((t) => {
      svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', LINE);
      svg.append('line').attr('y1', m.t).attr('y2', H - m.b).attr('x1', x(t)).attr('x2', x(t)).attr('stroke', LINE);
      svg.append('text').attr('class', 'm').attr('x', x(t)).attr('y', H - m.b + 16).attr('text-anchor', 'middle').attr('font-size', 11).text(t);
      svg.append('text').attr('class', 'm').attr('x', m.l - 8).attr('y', y(t) + 4).attr('text-anchor', 'end').attr('font-size', 11).text(t);
    });
    svg.append('text').attr('class', 'm').attr('x', (m.l + W - m.r) / 2).attr('y', H - 6).attr('text-anchor', 'middle').attr('font-size', 12).text('готовность купить →');
    svg.append('text').attr('class', 'm').attr('transform', 'rotate(-90)').attr('x', -(H - m.b + m.t) / 2).attr('y', 12).attr('text-anchor', 'middle').attr('font-size', 12).text('потенциал чека →');
    seg.forEach((s) => {
      const cx = x(s.readiness), cy = y(s.check), left = s.id === 'body' || s.readiness >= 4.5;
      svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 7).attr('fill', s.id === 'ru' ? '#6b676c' : PINK)
        .on('mousemove', (ev) => tip.show(ev, [s.name + ', ' + s.age, 'Готовность: ' + s.readiness + ' из 5', 'Потенциал чека: ' + s.check + ' из 5'])).on('mouseleave', () => tip.hide());
      svg.append('text').attr('x', left ? cx - 12 : cx + 12).attr('y', cy + 4).attr('text-anchor', left ? 'end' : 'start').attr('font-size', 12).attr('fill', s.id === 'ru' ? '#6b676c' : null).text(s.id === 'ru' ? 'Русскоязычная (пока нет)' : s.name.split(' ')[0]);
    });
  });

  dash.draw('fit-map', (el) => {
    const f = rowsOf('fit'); if (!f) { el.textContent = '—'; return; }
    const svcs = [...new Set(f.map((r) => r.service))], segs = [...new Set(f.map((r) => r.segment))];
    const word = ['', 'можно', 'подходит', 'основная'];
    const head = add(h('div', 'r'), h('div', 'c h n', ''), ...svcs.map((s) => h('div', 'c h', s)));
    const body = segs.map((sg) => add(h('div', 'r' + (/Русск/.test(sg) ? ' hold' : '')), h('div', 'c n', /Русск/.test(sg) ? sg + ' (пока нет)' : sg), ...svcs.map((sv) => {
      const v = f.find((r) => r.segment === sg && r.service === sv); const sc = v ? Number(v.score) : 0;
      return h('div', 'c s' + sc, word[sc] || '—');
    })));
    el.replaceChildren(head, ...body, h('div', 'legend', 'Основная — главная услуга для этой женщины. Подходит и можно — вторая и третья очередь.'));
  });

  // ---- 02 competitors
  dash.draw('radar', (el) => {
    const d = rowsOf('comp_scores'); el.replaceChildren(); if (!d) { el.textContent = '—'; return; }
    const W = widthOf(el), H = Math.round(Math.min(480, Math.max(340, W * 0.85))), cx = W / 2, cy = H / 2 - 14, R = Math.min(W / 2 - 78, H / 2 - 70);
    const n = d.length, ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n, pt = (i, v) => [cx + Math.cos(ang(i)) * R * (v / 5), cy + Math.sin(ang(i)) * R * (v / 5)];
    const svg = mkSvg(el, W, H), tip = mkTip(el);
    [1, 2, 3, 4, 5].forEach((r) => svg.append('polygon').attr('points', d.map((_, i) => pt(i, r).join(',')).join(' ')).attr('fill', 'none').attr('stroke', LINE));
    d.forEach((r, i) => {
      const p = pt(i, 5), q = [cx + Math.cos(ang(i)) * (R + 12), cy + Math.sin(ang(i)) * (R + 12)];
      svg.append('line').attr('x1', cx).attr('y1', cy).attr('x2', p[0]).attr('y2', p[1]).attr('stroke', LINE);
      const words = r.param.split(' '), mid = Math.ceil(words.length / 2), lines = words.length > 1 && W < 520 ? [words.slice(0, mid).join(' '), words.slice(mid).join(' ')] : [r.param];
      const anchor = Math.abs(q[0] - cx) < 8 ? 'middle' : q[0] > cx ? 'start' : 'end';
      const t = svg.append('text').attr('font-size', 12).attr('text-anchor', anchor).attr('x', q[0]).attr('y', q[1] + (q[1] < cy - 4 ? -2 : 12) - (lines.length - 1) * (q[1] < cy ? 12 : 0));
      lines.forEach((l, k) => t.append('tspan').attr('x', q[0]).attr('dy', k === 0 ? 0 : 13).text(l));
    });
    const series = [['you', 'Доктор', PINK, 0.2], ['a', 'Конкурент A: русскоязычный центр', BLUE, 0.05], ['b', 'Конкурент B: клиника со скидками', SAND, 0.05]];
    series.slice().reverse().forEach(([k, name, col, op]) => {
      svg.append('polygon').attr('points', d.map((r, i) => pt(i, r[k]).join(',')).join(' ')).attr('fill', col).attr('fill-opacity', op).attr('stroke', col).attr('stroke-width', k === 'you' ? 2.5 : 1.5).attr('stroke-linejoin', 'round');
    });
    series.forEach(([k, name, col]) => d.forEach((r, i) => {
      const p = pt(i, r[k]);
      svg.append('circle').attr('cx', p[0]).attr('cy', p[1]).attr('r', 4).attr('fill', col)
        .on('mousemove', (ev) => tip.show(ev, [r.param, name + ': ' + r[k] + ' из 5', r.note])).on('mouseleave', () => tip.hide());
    }));
    series.forEach(([k, name, col], i) => {
      const y = H - 8 - (series.length - 1 - i) * 16;
      svg.append('rect').attr('x', 4).attr('y', y - 9).attr('width', 10).attr('height', 10).attr('rx', 2).attr('fill', col);
      svg.append('text').attr('x', 20).attr('y', y).attr('font-size', 12).text(name);
    });
  });

  dash.draw('comp-price', (el) => {
    const d = rowsOf('comp_prices'); el.replaceChildren(); if (!d) { el.textContent = '—'; return; }
    const W = widthOf(el), rowH = 58, H = d.length * rowH + 34, m = { l: 8, r: 8 };
    const mx = 4000, x = d3.scaleLinear([0, mx], [m.l, W - m.r - 4]);
    const svg = mkSvg(el, W, H), tip = mkTip(el);
    [0, 1000, 2000, 3000, 4000].forEach((t) => {
      svg.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', 0).attr('y2', H - 26).attr('stroke', LINE);
      svg.append('text').attr('class', 'm').attr('x', x(t)).attr('y', H - 8).attr('font-size', 11).attr('text-anchor', t === 0 ? 'start' : t === mx ? 'end' : 'middle').text(nf(t));
    });
    d.forEach((r, i) => {
      const y0 = i * rowH + 4, col = r.id === 'you' ? PINK : r.id === 'mkt' ? 'rgba(242,238,233,.45)' : r.id === 'a' ? BLUE : SAND;
      svg.append('text').attr('x', m.l).attr('y', y0 + 12).attr('font-size', 12).text(r.who);
      svg.append('rect').attr('x', x(r.lo)).attr('y', y0 + 20).attr('width', Math.max(6, x(r.hi) - x(r.lo))).attr('height', 14).attr('rx', 4).attr('fill', col)
        .on('mousemove', (ev) => tip.show(ev, [r.who, nf(r.lo) + '–' + nf(r.hi) + ' AED', r.note])).on('mouseleave', () => tip.hide());
      const lbl = nf(r.lo) + '–' + nf(r.hi), right = x(r.hi) + 8 + 70 < W;
      svg.append('text').attr('class', 'm').attr('x', right ? x(r.hi) + 8 : x(r.lo) - 8).attr('y', y0 + 32).attr('font-size', 11).attr('text-anchor', right ? 'start' : 'end').text(lbl);
    });
  });

  // ---- 03 services
  const svcOrder = (a, b) => (a.prio || 99) - (b.prio || 99);
  dash.draw('svc-cards', (el) => {
    const s = rowsOf('services'); if (!s) { el.textContent = '—'; return; }
    el.replaceChildren(...s.slice().sort(svcOrder).map((r) => {
      const c = h('div', 'kk-sv' + (r.prio ? ' first' : '') + (GREY_SVC.includes(r.id) ? ' hold' : ''));
      add(c, h('span', 'kk-tag', r.prio ? '( ' + r.prio + ' ) первая очередь' : 'позже, не первая очередь'), h('h3', null, r.name));
      const pr = h('div', 'pr', nf(r.popular)); add(pr, h('small', null, ' AED популярный вариант'));
      add(c, pr, h('div', 'row', r.price_note), h('div', 'row', 'Держится: ' + r.lasts), h('div', 'row', r.repeat), h('div', 'lbl', r.role), h('p', null, r.why), h('div', 'row', r.ready));
      return c;
    }));
  });

  dash.draw('svc-price', (el) => {
    const s = rowsOf('services'); el.replaceChildren(); if (!s) { el.textContent = '—'; return; }
    const d = s.slice().sort(svcOrder), W = widthOf(el), rowH = 50, H = d.length * rowH + 30;
    const mx = d3.max(d, (r) => r.max), x = d3.scaleLinear([0, mx], [4, W - 70]);
    const svg = mkSvg(el, W, H), tip = mkTip(el);
    d.forEach((r, i) => {
      const y0 = i * rowH + 4;
      svg.append('text').attr('x', 4).attr('y', y0 + 12).attr('font-size', 12).text(r.name);
      svg.append('line').attr('x1', x(r.from)).attr('x2', x(r.max)).attr('y1', y0 + 31).attr('y2', y0 + 31).attr('stroke', MUTE).attr('stroke-width', 1);
      svg.append('rect').attr('x', 4).attr('y', y0 + 20).attr('width', Math.max(4, x(r.popular) - 4)).attr('height', 22).attr('rx', 4).attr('fill', GREY_SVC.includes(r.id) ? '#6b676c' : (r.prio ? PINK : 'rgba(244,198,210,.4)'))
        .on('mousemove', (ev) => tip.show(ev, [r.name, 'Популярный вариант: ' + nf(r.popular) + ' AED', 'От ' + nf(r.from) + ' до ' + nf(r.max) + ' AED'])).on('mouseleave', () => tip.hide());
      const lx = Math.max(x(r.popular), x(r.max)) + 8;
      svg.append('text').attr('x', lx).attr('y', y0 + 36).attr('font-size', 12).text(nf(r.popular));
    });
  });

  // ---- 04 funnels
  dash.draw('funnel', (el) => {
    const f = rowsOf('funnels'); if (!f) { el.textContent = '—'; return; }
    const steps = f.filter((r) => r.funnel === el.dataset.funnel).sort((a, b) => a.step_no - b.step_no);
    if (!steps.length) { el.textContent = '—'; return; }
    const first = steps[0].count;
    let big = -1, bigLoss = 0;
    steps.forEach((s, i) => { if (i) { const l = (steps[i - 1].count - s.count) / steps[i - 1].count; if (l > bigLoss) { bigLoss = l; big = i; } } });
    el.replaceChildren(...steps.map((s, i) => {
      const w = Math.max(12, (s.count / first) * 100);
      const bar = h('div', 'kk-bar2' + (i === big ? '' : ''), String(s.count)); bar.style.width = w + '%';
      const left = add(h('div', 'kk-bw'), bar);
      if (i) {
        const loss = Math.round(((steps[i - 1].count - s.count) / steps[i - 1].count) * 100);
        left.appendChild(h('div', 'kk-drop' + (i === big ? ' big' : ''), 'теряю ' + loss + '% людей' + (i === big ? ' (самая большая потеря)' : '')));
      } else left.appendChild(h('div', 'kk-drop', 'беру за 100'));
      const right = add(h('div'), h('div', 'st', (i + 1) + '. ' + s.step), h('div', 'tx', s.why));
      const fx = h('div', 'fx'); add(fx, add(h('i'), document.createTextNode('Что делаем: ')), document.createTextNode(s.fix)); right.appendChild(fx);
      return add(h('div', 'kk-fs'), left, right);
    }));
  });

  // ---- 05 plan
  const planRows = () => rowsOf('plan');
  dash.draw('prio-cards', (el) => {
    const p = planRows(); if (!p) { el.textContent = '—'; return; }
    el.replaceChildren(...p.filter((r) => r.prio > 0).sort((a, b) => a.prio - b.prio).map((r) => {
      const c = h('div', 'kk-pc' + (r.hold ? ' hold' : ''));
      add(c, h('div', 'no', '( ' + r.prio + ' )'), h('h3', null, r.name), h('div', 'sm', r.service + ' · ' + r.segment), h('p', 'why', r.why_first));
      add(c, h('div', 'sm', 'Кому показываю: ' + r.audience));
      add(c, h('div', 'sm', 'Куда ведём: ' + r.destination + '. ' + r.dest_why), r.kpi ? h('div', 'sm', 'Цель: ' + r.kpi) : null);
      if (r.hold) add(c, h('div', 'holdtag', 'На паузе. ' + r.hold_note));
      return c;
    }));
  });

  dash.draw('plan-rows', (el) => {
    const p0 = planRows(); if (!p0) { el.replaceChildren(); return; }
    const p = p0.filter((r) => r.start < '2026-12-01');
    const t = rowsOf('plan_calc') || [];
    el.replaceChildren(...p.map((r) => {
      const tr = h('tr', (r.prio > 0 ? 'p' : '') + (r.hold ? ' hold' : '')); tr.dataset.key = r.id;
      const tot = t.find((x) => x.id === r.id);
      add(tr, h('td', 'id', r.id), h('td', null, r.name + ' · ' + r.service + (r.hold ? ' (на паузе)' : '')), h('td', null, r.segment), h('td', null, r.destination));
      return tr;
    }));
  });

  dash.draw('gantt', (el) => {
    const p = planRows(); el.replaceChildren(); if (!p) { el.textContent = '—'; return; }
    const W = widthOf(el, 300), narrow = W < 520, lw = narrow ? 34 : Math.min(230, W * 0.34), rowH = 34, H = p.length * rowH + 40;
    const a = d3.min(p, (r) => utc(r.start)), b = d3.max(p, (r) => d3.utcDay.offset(utc(r.start), r.days));
    const x = d3.scaleUtc([d3.utcDay.offset(a, -1), d3.utcDay.offset(b, 1)], [lw, W - 6]);
    const svg = mkSvg(el, W, H), tip = mkTip(el);
    const ticks = []; for (let t = a; t <= b; t = d3.utcDay.offset(t, 7)) ticks.push(t);
    ticks.forEach((t) => {
      svg.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', 16).attr('y2', H - 4).attr('stroke', LINE);
      svg.append('text').attr('class', 'm').attr('x', x(t)).attr('y', 11).attr('font-size', 11).attr('text-anchor', 'middle').text(dshort(t.toISOString().slice(0, 10)));
    });
    p.forEach((r, i) => {
      const y0 = 24 + i * rowH, s = utc(r.start), e = d3.utcDay.offset(s, r.days), col = r.hold ? '#6b676c' : (r.prio > 0 ? PINK : BLUE);
      const nm = r.name.length > 26 ? r.name.slice(0, 25) + '…' : r.name;
      svg.append('text').attr('x', 0).attr('y', y0 + 17).attr('font-size', 12).text(narrow ? r.id : r.id + ' · ' + nm);
      const total = r.days * r.budget_day;
      svg.append('rect').attr('x', x(s)).attr('y', y0 + 4).attr('width', Math.max(4, x(e) - x(s))).attr('height', 20).attr('rx', 4).attr('fill', col)
        .on('mousemove', (ev) => tip.show(ev, [r.id + ' · ' + r.name, dshort(r.start) + ', ' + r.days + ' дн.', (r.budget_day > 0 ? r.budget_day + ' AED в день, всего ' + nf(total) + ' AED' : 'Бюджет уточняю'), 'Куда ведём: ' + r.destination])).on('mouseleave', () => tip.hide());
      if (total > 0 && x(e) - x(s) > 38) svg.append('text').attr('x', (x(s) + x(e)) / 2).attr('y', y0 + 18).attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', '#0B0A0C').style('fill', '#0B0A0C').attr('pointer-events', 'none').text(nf(total));
    });
  });

  dash.draw('payback', (el) => {
    const d = rowsOf('payback'); el.replaceChildren(); if (!d) { el.textContent = '—'; return; }
    const W = widthOf(el), rowH = 64, H = d.length * rowH + 30, mx = d3.max(d, (r) => r.check_aed), x = d3.scaleLinear([0, mx], [4, W - 70]);
    const svg = mkSvg(el, W, H), tip = mkTip(el);
    d.forEach((r, i) => {
      const y0 = i * rowH + 4;
      svg.append('text').attr('x', 4).attr('y', y0 + 12).attr('font-size', 12).text(r.id + ' · ' + r.name);
      svg.append('rect').attr('x', 4).attr('y', y0 + 20).attr('width', Math.max(3, x(r.budget_aed) - 4)).attr('height', 12).attr('rx', 3).attr('fill', BLUE);
      svg.append('rect').attr('x', 4).attr('y', y0 + 36).attr('width', Math.max(3, x(r.check_aed) - 4)).attr('height', 12).attr('rx', 3).attr('fill', PINK);
      svg.append('text').attr('class', 'm').attr('x', x(r.budget_aed) + 6).attr('y', y0 + 30).attr('font-size', 11).text('бюджет ' + nf(r.budget_aed));
      svg.append('text').attr('x', x(r.check_aed) + 6).attr('y', y0 + 46).attr('font-size', 11).text('1 пациентка ' + nf(r.check_aed) + ' (×' + String(r.times).replace('.', ',') + ')');
      svg.append('rect').attr('x', 0).attr('y', y0).attr('width', W).attr('height', rowH - 8).attr('fill', 'transparent')
        .on('mousemove', (ev) => tip.show(ev, [r.name, 'Бюджет: ' + nf(r.budget_aed) + ' AED', 'Одна пациентка: ' + nf(r.check_aed) + ' AED', 'Покрывает бюджет в ' + String(r.times).replace('.', ',') + ' раза'])).on('mouseleave', () => tip.hide());
    });
  });

  dash.draw('aida', (el) => {
    const all = planRows(); if (!all) { el.textContent = '—'; return; }
    const p = all.filter((r) => r.start < '2026-12-01');
    const cr = rowsOf('creatives') || [];
    const cur = p.some((r) => r.id === el.dataset.camp) ? el.dataset.camp : p[0].id;
    const bar = h('div', 'kk-subtabs'); bar.setAttribute('role', 'tablist');
    const panels = [], btns = [];
    const sel = (id) => {
      el.dataset.camp = id;
      panels.forEach((x) => x.classList.toggle('on', x.dataset.id === id));
      btns.forEach((x) => { const on = x.dataset.id === id; x.classList.toggle('on', on); x.setAttribute('aria-selected', on ? 'true' : 'false'); });
    };
    p.forEach((r) => {
      const b = h('button', 'kk-sub' + (r.hold ? ' hold' : ''), r.id + ' · ' + r.service + (r.hold ? ' · пауза' : '') + (r.start >= '2026-12-01' ? ' · декабрь' : ''));
      b.type = 'button'; b.dataset.id = r.id; b.setAttribute('role', 'tab');
      b.addEventListener('click', () => sel(r.id));
      btns.push(b); bar.appendChild(b);
      const panel = h('div', 'kk-subpanel' + (r.hold ? ' hold' : '')); panel.dataset.id = r.id;
      add(panel, h('h3', 'kk-camp-t', r.id + ' · ' + r.name));
      if (r.hold) add(panel, h('div', 'holdtag', 'На паузе. ' + r.hold_note));
      const meta = h('div', 'meta');
      [['Для кого', r.audience], ['Куда ведём', r.destination + '. ' + r.dest_why], ['Что проверяю', r.test], ['Цель', r.kpi]].filter(([k, v]) => v).forEach(([k, v]) => add(meta, add(h('div'), h('b', null, k), document.createTextNode(v))));
      add(panel, meta);
      const list = cr.filter((c) => c.camp === r.id);
      list.forEach((c, n) => {
        const card = h('article', 'kk-cc');
        add(card, add(h('div', 'kk-cc-h'), h('span', 'no', 'Креатив ' + (n + 1) + ' из ' + list.length), h('h4', null, c.title), h('span', 'len', c.length)));
        const aida = h('div', 'kk-cc-a');
        [['A', 'Attention · хук', c.hook], ['I', 'Interest · интерес', c.interest], ['D', 'Desire · желание', c.desire], ['A', 'Action · призыв', c.cta]].forEach(([l, t, v]) => add(aida, add(h('div', 'kk-ai'), h('div', 'l', l), add(h('div'), h('div', 't', t), h('div', null, v)))));
        const body = h('div', 'kk-cc-b' + (c.script ? '' : ' one'));
        if (c.script) add(body, add(h('div', 'kk-script'), h('div', 't', 'Готовый текст'), h('div', 'tx', c.script)));
        add(body, aida); add(card, body);
        const more = h('details', 'kk-cc-m'); add(more, h('summary', null, 'Материал, оформление и отстройка от конкурентов'));
        const info = h('div', 'meta');
        [['Материал', c.shoot], ['Как оформляем', c.frame], ['Отстройка от конкурентов', c.diff]].forEach(([k, v]) => add(info, add(h('div'), h('b', null, k), document.createTextNode(v))));
        add(more, info); add(card, more);
        add(panel, card);
      });
      panels.push(panel);
    });
    el.replaceChildren(bar, ...panels);
    sel(cur);
  });

  dash.draw('targeting', (el) => {
    const rows = rowsOf('targeting'); if (!rows) { el.textContent = '—'; return; }
    const cur = rows.some((r) => r.id === el.dataset.seg) ? el.dataset.seg : rows[0].id;
    const bar = h('div', 'kk-subtabs'); bar.setAttribute('role', 'tablist');
    const panels = [], btns = [];
    const sel = (id) => {
      el.dataset.seg = id;
      panels.forEach((x) => x.classList.toggle('on', x.dataset.id === id));
      btns.forEach((x) => { const on = x.dataset.id === id; x.classList.toggle('on', on); x.setAttribute('aria-selected', on ? 'true' : 'false'); });
    };
    const L = (v) => (Array.isArray(v) ? v : String(v || '').split(' | ').filter(Boolean));
    const chips = (list) => { const w = h('div', 'kk-chips'); L(list).forEach((x) => w.appendChild(h('span', 'kk-chip', x))); return w; };
    const dl = (pairs) => { const w = h('dl', 'kk-dl'); pairs.forEach(([k, v]) => { if (v) add(w, h('dt', null, k), h('dd', null, v)); }); return w; };
    const block = (title, ...c) => add(h('div', 'kk-card kk-tb'), h('h4', null, title), ...c);
    rows.forEach((r) => {
      const b = h('button', 'kk-sub' + (/пауз/.test(r.status) ? ' hold' : ''), r.segment + ' · ' + r.campaigns);
      b.type = 'button'; b.dataset.id = r.id; b.setAttribute('role', 'tab'); b.addEventListener('click', () => sel(r.id));
      btns.push(b); bar.appendChild(b);
      const p = h('div', 'kk-subpanel' + (/пауз/.test(r.status) ? ' hold' : '')); p.dataset.id = r.id;
      add(p, h('h3', 'kk-camp-t', r.segment + ' · ' + r.campaigns + ' · ' + r.service), r.status ? h('div', 'holdtag', r.status) : null);
      const grid = h('div', 'kk-tgrid');
      add(grid,
        block('Кампания и оптимизация', dl([['Objective', r.objective], ['Где конверсия', r.conv], ['Цель оптимизации', r.goal], [r.objective === 'Leads' ? 'Форма' : 'Предзаполненное сообщение', r.message]])),
        block('Кто', dl([['Пол', r.gender], ['Возраст', r.age], ['Relationship', r.demo], ['Языки', r.languages], ['Тип локации', r.geo_type]]), chips(r.geo)),
        block('Интересы (Detailed targeting)', chips(r.interests)),
        block('Поведение и должности', h('div', 'kk-sm', 'Поведение (Behaviors)'), chips(r.behaviors), L(r.jobs).length ? add(h('div'), h('div', 'kk-sm', 'Должности (Job titles)'), chips(r.jobs)) : null),
        block('Свои аудитории и lookalike', add(h('ul', 'kk-tasks'), ...L(r.custom).map((x) => h('li', null, x)))),
        block('Показ', dl([['Плейсменты', r.placements], ['Устройства', r.devices], ['Расписание', r.schedule], ['Расширение аудитории', r.expansion]])));
      add(p, grid); panels.push(p);
    });
    el.replaceChildren(bar, ...panels); sel(cur);
  });

  dash.draw('content-rows', (el) => {
    const s = rowsOf('content'); if (!s) { el.replaceChildren(); return; }
    el.replaceChildren(...s.map((r) => {
      const tr = h('tr'); tr.dataset.key = encodeURIComponent(r.id);
      add(tr, h('td', null, r.offer), h('td', null, r.topic), h('td', null, r.format), h('td', null, r.hook), h('td', null, r.shoot), h('td', null, r.frame), h('td', null, r.goal), h('td', null, r.cta));
      return tr;
    }));
  });

  // ---- 06 shoots
  dash.draw('shoot-rows', (el) => {
    const s = rowsOf('shoots'); if (!s) { el.replaceChildren(); return; }
    el.replaceChildren(...s.map((r) => {
      const tr = h('tr'); tr.dataset.key = encodeURIComponent(r.date) + ',' + encodeURIComponent(r.slot);
      add(tr, h('td', null, dshort(r.date)), h('td', null, r.day), h('td', null, r.slot), h('td', null, r.what), h('td', null, r.who), h('td', null, r.for), h('td', null, r.note));
      return tr;
    }));
  });

    // ---- refs (competitor creatives)
  const monthsSince = (s) => { const a = s.split('-').map(Number), n = new Date(); return (n.getUTCFullYear() - a[0]) * 12 + (n.getUTCMonth() + 1 - a[1]); };
  dash.draw('ref-count', (el) => { const r = rowsOf('refs'); el.textContent = r ? String(r.length) : '—'; });
  dash.draw('ref-old', (el) => { const r = rowsOf('refs'); el.textContent = r ? String(r.filter((x) => monthsSince(x.started) >= 12).length) : '—'; });
  dash.draw('ref-ads', (el) => {
    const r = rowsOf('refs'); if (!r) { el.textContent = '—'; return; }
    el.replaceChildren(...r.map((x) => {
      const m = monthsSince(x.started), age = m >= 12 ? 'идёт ' + m + ' мес.' : 'запущено ' + dshort(x.started);
      const c = h('div', 'kk-ref');
      const im = h('img'); im.src = x.img; im.alt = 'Кадры из объявления ' + x.id; im.loading = 'lazy';
      const t = add(h('div', 'kk-ref-t'), add(h('div', 'kk-ref-h'), h('span', 'id', x.id), h('span', null, x.service), h('span', 'ag' + (m >= 12 ? ' old' : ''), age + ' · ' + x.dur)));
      [['Формат', x.format], ['Текст на экране', x.screen], ['Подпись', x.caption], ['Кнопка', x.cta]].forEach(([k, v]) => add(t, add(h('div', 'kk-ref-r'), h('b', null, k), document.createTextNode(v))));
      return add(c, im, t);
    }));
  });

  // ---- tabs: one section per screen
  const kk = document.querySelector('.kk');
  const secs = Array.from(document.querySelectorAll('.kk-sec'));
  const tabs = Array.from(document.querySelectorAll('.kk-tabs [data-go]'));
  const show = (id, scroll) => {
    if (!secs.some((x) => x.id === id)) id = secs[0].id;
    secs.forEach((x) => x.classList.toggle('on', x.id === id));
    tabs.forEach((a) => { const on = a.dataset.go === id; a.classList.toggle('on', on); a.setAttribute('aria-selected', on ? 'true' : 'false'); });
    if (scroll) { const n = document.querySelector('.kk-tabs'); if (n) n.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  };
  kk.classList.add('js');
  show(secs[0].id, false);
  tabs.forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault(); show(a.dataset.go, true); dash.setLink(a.dataset.go);
  }));
  document.querySelectorAll('.kk-foot [data-go="top"]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault(); kk.scrollIntoView({ behavior: 'smooth' });
  }));
})();
