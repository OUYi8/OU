/* 首页：进度环 + 钱 + 今日该做什么 */
(function (w) {
  'use strict';
  var UI = w.UI, Store = w.Store, esc = UI.esc, money = UI.money;

  function calc() {
    var S = Store._s, ov = Store.overall(), spent = Store.spentTotal();
    var budget = S.meta.budgetTotal || 0;
    var payDue = Store.payTotal() - Store.payDone();
    var ck = Store.checkStat();
    return { S: S, ov: ov, spent: spent, budget: budget, payDue: payDue, ck: ck };
  }

  function render() {
    var d = calc();
    var S = d.S;
    var usedPct = d.budget ? Math.round(d.spent / d.budget * 100) : 0;
    var remain = d.budget - d.spent;

    /* 当前阶段 = 第一个未完成 */
    var cur = null;
    S.phases.forEach(function (p) {
      if (!cur && Store.phaseStat(p).state !== 'done') cur = p;
    });

    var h = '';

    /* Hero */
    h += '<div class="hero"><div class="hero-top">';
    h += '<div class="hero-ring">' + UI.ring(d.ov.pct, 78, 7, '#fff') +
      '<div style="position:absolute;inset:0;display:grid;place-items:center">' +
      '<span style="font-size:17px;font-weight:700">' + d.ov.pct + '%</span></div></div>';
    h += '<div class="hero-info">' +
      '<div class="hero-label">装修总进度 · ' + d.ov.done + '/' + d.ov.total + ' 项</div>' +
      '<div class="hero-num" style="font-size:19px;font-weight:600;margin-top:6px">' +
      (cur ? esc(cur.icon + ' ' + cur.name) : '🎉 全部完工') + '</div>' +
      '<div class="hero-meta">' +
      '<span class="chip">' + esc(S.meta.addr || '') + '</span>' +
      '<span class="chip">' + (S.meta.areaBuild || '—') + '㎡ · ' + esc(S.meta.layout || '') + '</span>' +
      '<span class="chip">目标 ' + UI.dateCn(S.meta.targetDate) + ' 入住</span>' +
      '</div></div></div></div>';

    /* 钱 */
    h += '<div class="mgrid">';
    h += '<div class="mcell"><div class="mcell-k">已支出</div>' +
      '<div class="mcell-v ' + (usedPct > 100 ? 'danger' : '') + '">' + money(d.spent, { wan: true }) + '</div>' +
      '<div class="mcell-s">预算 ' + money(d.budget, { wan: true }) + '</div></div>';
    h += '<div class="mcell"><div class="mcell-k">' + (remain >= 0 ? '剩余预算' : '已超支') + '</div>' +
      '<div class="mcell-v ' + (remain >= 0 ? 'ok' : 'danger') + '">' + money(Math.abs(remain), { wan: true }) + '</div>' +
      '<div class="mcell-s">已用 ' + usedPct + '%</div></div>';
    h += '</div>';
    h += '<div class="card"><div class="stat-line"><span>总预算执行</span>' +
      '<b>' + usedPct + '%</b></div>' + UI.bar(usedPct, UI.pctCls(usedPct, 90, 100)) + '</div>';

    /* 待办提醒 */
    var due = Store.dueBuys();
    var soon = Store.soonBuys();
    var duePay = S.payments.filter(function (p) { return !p.paid && UI.daysFrom(p.dueDate) !== null && UI.daysFrom(p.dueDate) <= 3; });

    if (duePay.length || due.length) {
      h += '<div class="card"><div class="card-hd"><h2>⚠️ 需要马上处理</h2></div>';
      duePay.forEach(function (p) {
        h += '<div class="row" data-pay="' + esc(p.id) + '">' +
          '<div class="row-ic" style="background:var(--danger-soft);color:var(--danger)">¥</div>' +
          '<div class="row-main"><div class="row-t">' + esc(p.name) + UI.dueLabel(p.dueDate) + '</div>' +
          '<div class="row-s">应付 ' + money(p.amount) + ' 元 · ' + esc(p.note || '') + '</div></div>' +
          '<div class="row-v" style="color:var(--danger)">去付</div></div>';
      });
      due.forEach(function (b) {
        h += '<div class="row"><div class="row-ic" style="background:var(--warn-soft);color:var(--warn)">' +
          (b.name.indexOf('砖') >= 0 ? '🧱' : '📦') + '</div>' +
          '<div class="row-main"><div class="row-t">' + esc(b.name) + UI.dueLabel(b.planDate) + '</div>' +
          '<div class="row-s">计划 ' + UI.dateCn(b.planDate) + ' · 预算 ' + money(b.budget) + ' 元</div></div>' +
          '<div class="row-v">去买</div></div>';
      });
      h += '</div>';
    }

    /* 付款进度 */
    h += '<div class="card"><div class="card-hd"><h2>半包付款进度</h2>' +
      '<span class="more" data-go="contract">明细 ›</span></div>';
    h += '<div class="stat-line"><span>已付 / 合同总额</span><b>' +
      money(Store.payDone(), { wan: true }) + ' / ' + money(Store.payTotal(), { wan: true }) + '</b></div>' +
      UI.bar(Store.payTotal() ? Math.round(Store.payDone() / Store.payTotal() * 100) : 0, 'info');
    S.payments.slice().sort(function (a, b) { return a.dueDate < b.dueDate ? -1 : 1; }).forEach(function (p) {
      h += '<div class="row" data-pay="' + esc(p.id) + '">' +
        '<div class="row-ic" style="background:' + (p.paid ? 'var(--ok-soft)' : 'var(--warn-soft)') +
        ';color:' + (p.paid ? 'var(--ok)' : 'var(--warn)') + '">' + (p.paid ? '✓' : '¥') + '</div>' +
        '<div class="row-main"><div class="row-t">' + esc(p.name) + '</div>' +
        '<div class="row-s">' + (p.paid ? '已付 ' + UI.dateCn(p.paidDate) : '应付 ' + UI.dateCn(p.dueDate)) + '</div></div>' +
        '<div class="row-v">' + money(p.amount) + '<small>' + p.ratio + '%</small></div></div>';
    });
    h += '</div>';

    /* 最近记账 */
    h += '<div class="card"><div class="card-hd"><h2>最近记账</h2>' +
      '<span class="more" data-go="ledger">全部 ›</span></div>';
    if (!S.ledger.length) {
      h += '<p class="hint">还没有记账，点下方按钮记第一笔。</p>';
    } else {
      S.ledger.slice(0, 5).forEach(function (l) {
        var ex = Store.isExtra(l);
        h += '<div class="row">' +
          '<div class="row-ic" style="background:' + (ex ? 'var(--danger-soft)' : 'var(--brand-soft)') +
          ';color:' + (ex ? 'var(--danger)' : 'var(--brand)') + '">' +
          (Store.catBudget(l.cat) ? (w.SEED.BUDGET.filter(function (b) { return b.name === l.cat; })[0] || {}).icon || '¥' : '＋') + '</div>' +
          '<div class="row-main"><div class="row-t">' + esc(l.item) + (ex ? '<span class="tag danger">增项</span>' : '') + '</div>' +
          '<div class="row-s">' + UI.dateCn(l.date) + ' · ' + esc(l.cat) + (l.payee ? ' · ' + esc(l.payee) : '') + '</div></div>' +
          '<div class="row-v">−' + money(l.amount) + '</div></div>';
      });
    }
    h += '</div>';

    /* 近期采购 */
    if (soon.length) {
      h += '<div class="card"><div class="card-hd"><h2>14 天内要买</h2>' +
        '<span class="more" data-go="purchase">全部 ›</span></div>';
      soon.slice(0, 4).forEach(function (b) {
        h += '<div class="row"><div class="row-ic" style="background:var(--info-soft);color:var(--info)">📦</div>' +
          '<div class="row-main"><div class="row-t">' + esc(b.name) + UI.dueLabel(b.planDate) + '</div>' +
          '<div class="row-s">' + esc(b.spec || '') + '</div></div>' +
          '<div class="row-v">' + money(b.budget) + '</div></div>';
      });
      h += '</div>';
    }

    w.__renderHome = h;
    return h;
  }

  function mount(root) {
    root.innerHTML = render();
    root.querySelectorAll('[data-go]').forEach(function (el) {
      el.onclick = function () { w.App.go(el.getAttribute('data-go')); };
    });
    root.querySelectorAll('[data-pay]').forEach(function (el) {
      el.onclick = function () { w.App.go('contract'); };
    });
  }

  w.PageHome = { mount: mount };
})(window);
