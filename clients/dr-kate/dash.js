/* Minimal stand-in for the dashboard runtime: serves bundled data, runs calcs and draws. */
(function () {
  var DATA = window.__DASH_DATA || {}, calcs = {}, cache = {}, draws = [], orig = new WeakMap();
  function ok(rows) { return { status: 'ok', data: rows, rows: rows, columns: rows && rows[0] ? Object.keys(rows[0]) : [], meta: [], refreshing: false }; }
  function data(id) {
    if (DATA[id]) return ok(DATA[id]);
    var c = calcs[id];
    if (c) {
      if (!(id in cache)) {
        try { cache[id] = c.fn.apply(null, c.inputs.map(function (i) { return data(i).data; })); }
        catch (e) { console.error('calc ' + id, e); return { status: 'error', data: [], message: String(e) }; }
      }
      return ok(cache[id]);
    }
    return { status: 'missing', data: [], rows: [], columns: [], meta: [] };
  }
  function run(name, fn) {
    document.querySelectorAll('[data-draw="' + name + '"]').forEach(function (el) {
      if (!orig.has(el)) orig.set(el, el.innerHTML); else el.innerHTML = orig.get(el);
      try { fn(el); } catch (e) { console.error('draw ' + name, e); }
    });
  }
  var listeners = [];
  window.dash = {
    data: data,
    calc: function (id, o) { calcs[id] = o; delete cache[id]; },
    loader: function () {},
    draw: function (name, fn) { draws.push([name, fn]); run(name, fn); },
    onData: function (fn) { listeners.push(fn); try { fn(); } catch (e) { console.error(e); } },
    setLink: function (name) { try { history.replaceState(null, '', '#' + name); } catch (e) {} },
    params: function () { return {}; }, setParams: function () {}, resetParams: function () {},
    refresh: function () {}, colors: ['#F4C6D2', '#9db7cc', '#cdb99a', '#9ccfb0', '#e58f8f', '#c9a7e8', '#f2d48f', '#8fd6d6']
  };
  var lastW = window.innerWidth, t;
  window.addEventListener('resize', function () {
    if (window.innerWidth === lastW) return; lastW = window.innerWidth;
    clearTimeout(t); t = setTimeout(function () {
      draws.forEach(function (d) { run(d[0], d[1]); });
      listeners.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } });
    }, 150);
  });
})();
