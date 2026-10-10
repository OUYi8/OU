/* 业务层：读写 + 派生统计 + 导出备份 */
(function (w) {
  'use strict';

  var S = { meta: null, phases: [], ledger: [], payments: [], buys: [], checks: [] };
  var listeners = [];
  var CATS = null;

  function uid(p) {
    return (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function today() { return new Date().toISOString().slice(0, 10); }
  function now() { return new Date().toISOString(); }

  var Store = {
    cats: function () {
      if (CATS) return CATS;
      var seen = {}, out = [];
      S.ledger.forEach(function (l) {
        if (l.cat && !seen[l.cat]) { seen[l.cat] = 1; out.push(l.cat); }
      });
      var M = w.SEED.BUDGET.map(function (b) { return b.name; });
      M.forEach(function (n) { if (!seen[n]) { seen[n] = 1; out.push(n); } });
      out.push('增项');
      return out;
    },

    catBudget: function (name) {
      var b = w.SEED.BUDGET.filter(function (x) { return x.name === name; })[0];
      return b ? b.budget : 0;
    },

    /* ---------- 生命周期 ---------- */
    init: function () {
      return w.DB.get('meta', 'project').then(function (m) {
        if (m) { S.meta = m; return loadAll(); }
        return seedAll();
      });
    },
    reset: function () { return seedAll().then(function () { Store.load(); }); },

    load: function () { return loadAll().then(function () { emit(); }); },

    sub: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; },

    /* ---------- 进度 ---------- */
    phaseStat: function (p) {
      var t = p.tasks || [];
      var done = t.filter(function (x) { return x.done; }).length;
      var total = t.length;
      var pct = total ? Math.round(done / total * 100) : 0;
      var state = pct === 100 ? 'done' : (done > 0 ? 'doing' : 'todo');
      return { done: done, total: total, pct: pct, state: state };
    },
    toggleTask: function (phaseId, taskId) {
      var p = S.phases.filter(function (x) { return x.id === phaseId; })[0];
      if (!p) return Promise.resolve();
      var t = (p.tasks || []).filter(function (x) { return x.id === taskId; })[0];
      if (!t) return Promise.resolve();
      t.done = !t.done;
      t.date = t.done ? today() : '';
      p._dirty = true;
      return savePhase(p).then(function () { emit(); });
    },
    addTask: function (phaseId, name) {
      var p = S.phases.filter(function (x) { return x.id === phaseId; })[0];
      if (!p || !name.trim()) return Promise.resolve();
      p.tasks = p.tasks || [];
      p.tasks.push({ id: uid('t'), name: name.trim(), done: false, date: '', photos: [] });
      p._dirty = true;
      return savePhase(p).then(function () { emit(); });
    },
    delTask: function (phaseId, taskId) {
      var p = S.phases.filter(function (x) { return x.id === phaseId; })[0];
      if (!p) return Promise.resolve();
      p.tasks = (p.tasks || []).filter(function (x) { return x.id !== taskId; });
      p._dirty = true;
      return savePhase(p).then(function () { emit(); });
    },
    overall: function () {
      var d = 0, t = 0;
      S.phases.forEach(function (p) {
        var s = Store.phaseStat(p);
        d += s.done; t += s.total;
      });
      return { done: d, total: t, pct: t ? Math.round(d / t * 100) : 0 };
    },

    /* ---------- 记账 ---------- */
    addLedger: function (o) {
      o.id = uid('l'); o.date = o.date || today(); o.createdAt = now();
      o.amount = Number(o.amount) || 0;
      S.ledger.unshift(o);
      return w.DB.put('ledger', o).then(function () { emit(); return o; });
    },
    delLedger: function (id) {
      S.ledger = S.ledger.filter(function (x) { return x.id !== id; });
      return w.DB.del('ledger', id).then(function () { emit(); });
    },
    ledgerByCat: function () {
      var m = {};
      S.ledger.forEach(function (l) {
        m[l.cat] = (m[l.cat] || 0) + l.amount;
      });
      return Object.keys(m).map(function (k) {
        return { name: k, spent: m[k], budget: Store.catBudget(k) };
      }).sort(function (a, b) { return b.spent - a.spent; });
    },
    spentTotal: function () {
      return S.ledger.reduce(function (a, b) { return a + b.amount; }, 0);
    },
    spentByCat: function (cat) {
      return S.ledger.filter(function (l) { return l.cat === cat; })
        .reduce(function (a, b) { return a + b.amount; }, 0);
    },
    spentByMonth: function () {
      var m = {};
      S.ledger.forEach(function (l) {
        var k = (l.date || '').slice(0, 7);
        if (k) m[k] = (m[k] || 0) + l.amount;
      });
      return m;
    },
    isExtra: function (l) { return /增项|加钱|补差|超预算/.test((l.item || '') + (l.note || '')); },

    /* ---------- 付款节点 ---------- */
    payTotal: function () { return S.payments.reduce(function (a, b) { return a + b.amount; }, 0); },
    payDone: function () {
      return S.payments.filter(function (p) { return p.paid; })
        .reduce(function (a, b) { return a + b.amount; }, 0);
    },
    togglePay: function (id) {
      var p = S.payments.filter(function (x) { return x.id === id; })[0];
      if (!p) return Promise.resolve();
      p.paid = !p.paid;
      p.paidDate = p.paid ? today() : '';
      return w.DB.put('payments', p).then(function () {
        /* 已付 → 自动生成一笔支出，避免重复记账 */
        if (p.paid) {
          var dup = S.ledger.filter(function (l) { return l.note === '自动:' + p.name; })[0];
          if (!dup) {
            return Store.addLedger({
              date: p.paidDate, cat: '半包施工费', item: p.name,
              amount: p.amount, payee: S.meta.contractor || '施工方',
              note: '自动:' + p.name, photos: 0
            });
          }
        } else {
          var t = S.ledger.filter(function (l) { return l.note === '自动:' + p.name; })[0];
          if (t) return Store.delLedger(t.id);
        }
      }).then(emit);
    },
    editPay: function (id, patch) {
      var p = S.payments.filter(function (x) { return x.id === id; })[0];
      if (!p) return Promise.resolve();
      Object.keys(patch).forEach(function (k) { p[k] = patch[k]; });
      return w.DB.put('payments', p).then(function () { emit(); });
    },

    /* ---------- 采购 ---------- */
    buyTotal: function () { return S.buys.reduce(function (a, b) { return a + b.budget; }, 0); },
    buyBoughtAmount: function () {
      return S.buys.reduce(function (a, b) { return a + (b.bought ? (b.actualPrice || b.budget) : 0); }, 0);
    },
    toggleBuy: function (id) {
      var b = S.buys.filter(function (x) { return x.id === id; })[0];
      if (!b) return Promise.resolve();
      b.bought = !b.bought;
      if (b.bought && !b.actualPrice) b.actualPrice = b.budget;
      return w.DB.put('buys', b).then(function () { emit(); });
    },
    editBuy: function (id, patch) {
      var b = S.buys.filter(function (x) { return x.id === id; })[0];
      if (!b) return Promise.resolve();
      Object.keys(patch).forEach(function (k) { b[k] = patch[k]; });
      return w.DB.put('buys', b).then(function () { emit(); });
    },
    dueBuys: function () {
      var t = today();
      return S.buys.filter(function (b) {
        return !b.bought && b.planDate && b.planDate <= t;
      });
    },
    soonBuys: function () {
      var t = new Date(); t.setDate(t.getDate() + 14);
      var lim = t.toISOString().slice(0, 10);
      var now_ = today();
      return S.buys.filter(function (b) {
        return !b.bought && b.planDate && b.planDate >= now_ && b.planDate <= lim;
      });
    },

    /* ---------- 验收 ---------- */
    checkStat: function () {
      var done = S.checks.filter(function (c) { return c.done; }).length;
      return { done: done, total: S.checks.length, pct: S.checks.length ? Math.round(done / S.checks.length * 100) : 0 };
    },
    toggleCheck: function (id) {
      var c = S.checks.filter(function (x) { return x.id === id; })[0];
      if (!c) return Promise.resolve();
      c.done = !c.done;
      c.date = c.done ? today() : '';
      return w.DB.put('checks', c).then(function () { emit(); });
    },

    /* ---------- 预算 / 设置 ---------- */
    editMeta: function (patch) {
      Object.keys(patch).forEach(function (k) { S.meta[k] = patch[k]; });
      return w.DB.put('meta', S.meta).then(function () { emit(); });
    },
    setBudget: function (cat, v) {
      var b = w.SEED.BUDGET.filter(function (x) { return x.name === cat; })[0];
      if (b) { b.budget = Number(v) || 0; S.meta._rev = Date.now(); }
      return w.DB.put('meta', S.meta).then(function () { emit(); });
    },

    /* ---------- 备份 ---------- */
    exportJSON: function (withPhotos) {
      return w.DB.dump(withPhotos).then(function (rows) {
        var m = S.meta, p = S.phases, l = S.ledger;
        return JSON.stringify({
          app: '装修管家', ver: 1, exportedAt: now(),
          meta: m, phases: p, ledger: l,
          payments: S.payments, buys: S.buys, checks: S.checks,
          budgets: w.SEED.BUDGET, rows: rows
        }, null, 2);
      });
    },
    importJSON: function (text) {
      var o;
      try { o = JSON.parse(text); } catch (e) { return Promise.reject(new Error('文件格式不对')); }
      if (!o || o.app !== '装修管家') return Promise.reject(new Error('不是本 App 的备份文件'));
      var jobs = [];
      if (o.meta) { S.meta = o.meta; jobs.push(w.DB.put('meta', o.meta)); }
      ['phases', 'ledger', 'payments', 'buys', 'checks'].forEach(function (k) {
        if (Array.isArray(o[k]) && o[k].length) {
          S[k] = o[k];
          jobs.push(w.DB.putMany(k, o[k]));
        }
      });
      if (Array.isArray(o.budgets) && o.budgets.length) w.SEED.BUDGET = o.budgets;
      return Promise.all(jobs).then(function () {
        if (Array.isArray(o.rows) && o.rows.length) {
          return w.DB.restore(o.rows.filter(function (r) { return r.__store === 'photos'; }));
        }
      }).then(function () { emit(); });
    },
    clearLedger: function () {
      return w.DB.clear('ledger').then(function () { S.ledger = []; emit(); });
    },

    _s: S
  };

  /* ---------- 内部 ---------- */
  function emit() { listeners.forEach(function (f) { try { f(S); } catch (e) { console.error(e); } }); }
  function savePhase(p) {
    var d = Object.assign({}, p); delete d._dirty;
    return w.DB.put('phases', d);
  }
  function loadAll() {
    return Promise.all([
      w.DB.all('phases'), w.DB.all('ledger'), w.DB.all('payments'),
      w.DB.all('buys'), w.DB.all('checks')
    ]).then(function (r) {
      S.phases = r[0] || []; S.ledger = r[1] || []; S.payments = r[2] || [];
      S.buys = r[3] || []; S.checks = r[4] || [];
      return S;
    });
  }
  function seedAll() {
    var sd = w.SEED;
    return w.DB.put('meta', sd.META)
      .then(function () { return w.DB.putMany('phases', sd.PHASES); })
      .then(function () { return w.DB.putMany('ledger', sd.LEDGER); })
      .then(function () { return w.DB.putMany('payments', sd.PAYMENTS); })
      .then(function () { return w.DB.putMany('buys', sd.BUYS); })
      .then(function () { return w.DB.putMany('checks', sd.CHECKS); })
      .then(function () { S.meta = JSON.parse(JSON.stringify(sd.META)); return loadAll(); });
  }

  Store.uid = uid;
  Store.today = today;
  w.Store = Store;
})(window);
