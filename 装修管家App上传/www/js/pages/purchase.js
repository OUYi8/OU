/* 采购：11 项主材时间节点 + 计划价 vs 实付价 */
(function (w) {
  'use strict';
  var UI = w.UI, Store = w.Store, esc = UI.esc, money = UI.money;

  var showDone = false;

  function render() {
    var S = Store._s;
    var planT = Store.buyTotal();
    var realT = Store.buyBoughtAmount();
    var doneN = S.buys.filter(function (b) { return b.bought; }).length;
    var due = Store.dueBuys(), soon = Store.soonBuys();

    var h = '';

    h += '<div class="mgrid">';
    h += '<div class="mcell"><div class="mcell-k">已买 / ' + S.buys.length + ' 项</div>' +
      '<div class="mcell-v">' + doneN + '<small style="font-size:12px;color:var(--ink-3)"> / ' + S.buys.length + '</small></div>' +
      '<div class="mcell-s">' + (S.buys.length ? Math.round(doneN / S.buys.length * 100) : 0) + '% 完成</div></div>';
    h += '<div class="mcell"><div class="mcell-k">' + (realT > planT ? '超预算' : '还剩要买') + '</div>' +
      '<div class="mcell-v ' + (realT > planT ? 'danger' : 'ok') + '">' +
      money(Math.abs(planT - realT), { wan: true }) + '</div>' +
      '<div class="mcell-s">计划 ' + money(planT, { wan: true }) + '</div></div>';
    h += '</div>';

    h += '<div class="card"><div class="stat-line"><span>主材采购执行</span><b>' +
      (planT ? Math.round(realT / planT * 100) : 0) + '%</b></div>' +
      UI.bar(planT ? realT / planT * 100 : 0, realT > planT ? 'danger' : '') + '</div>';

    /* 提醒 */
    if (due.length) {
      h += '<div class="card"><div class="card-hd"><h2>⚠️ 已到计划采购日</h2></div>';
      due.forEach(function (b) {
        h += '<div class="row"><div class="row-ic" style="background:var(--danger-soft);color:var(--danger)">📦</div>' +
          '<div class="row-main"><div class="row-t">' + esc(b.name) + UI.dueLabel(b.planDate) + '</div>' +
          '<div class="row-s">' + esc(b.spec || '') + (b.note ? ' · ' + esc(b.note) : '') + '</div></div>' +
          '<div class="row-v">' + money(b.budget) + '</div></div>';
      });
      h += '</div>';
    }

    /* 分组 */
    var groups = [
      { k: 'early', t: '🚧 前期（封窗/瓷砖）', list: ['封窗阳台', '瓷砖'] },
      { k: 'mid', t: '🔧 中期（吊顶/门/洁具）', list: ['铝扣板', '卧室门', '浴室柜', '马桶'] },
      { k: 'late', t: '✨ 后期（智能/软装/收尾）', list: ['小米', 'AP', '窗帘', '踢脚线', '美缝'] }
    ];

    groups.forEach(function (g) {
      var list = S.buys.filter(function (b) {
        if (showDone && !b.bought) return false;
        return g.list.some(function (kw) { return b.name.indexOf(kw) >= 0; });
      });
      if (!list.length) return;
      list.sort(function (a, b) { return (a.planDate || '9') < (b.planDate || '9') ? -1 : 1; });

      h += '<div class="sec-t">' + g.t + '</div><div class="card">';
      list.forEach(function (b) {
        var real = b.bought ? (b.actualPrice || b.budget) : 0;
        var diff = b.bought ? real - b.budget : 0;
        h += '<div class="row" data-b="' + esc(b.id) + '">' +
          '<div class="task-box" data-tg="' + esc(b.id) + '" style="margin-top:7px' +
          (b.bought ? ';background:var(--ok);border-color:var(--ok)' : '') + '">' + UI.ICON.check + '</div>' +
          '<div class="row-main"><div class="row-t">' + esc(b.name) +
          (b.bought ? '<span class="tag ok">已买</span>' : UI.dueLabel(b.planDate)) + '</div>' +
          '<div class="row-s">' + esc(b.spec || '') + (b.planDate ? ' · 计划 ' + UI.dateCn(b.planDate) : '') +
          (b.vendor ? ' · ' + esc(b.vendor) : '') + '</div>' +
          (b.note ? '<div class="row-s" style="color:var(--warn)">' + esc(b.note) + '</div>' : '') +
          '</div>' +
          '<div class="row-v">' + (b.bought ? money(real) : money(b.budget)) +
          '<small>' + (b.bought ? (diff > 0 ? '超 ' + money(diff) : (diff < 0 ? '省 ' + money(-diff) : '按预算')) : '预算') + '</small></div></div>';
      });
      h += '</div>';
    });

    var undone = S.buys.filter(function (b) { return !b.bought; });
    if (undone.length && !showDone) {
      h += '<button class="btn ghost" id="showDone" style="margin-top:4px">显示已买的 ' +
        (S.buys.length - undone.length) + ' 项</button>';
    } else if (showDone) {
      h += '<button class="btn ghost" id="showDone" style="margin-top:4px">只看未买的</button>';
    }

    w.__renderPurchase = h;
    return h;
  }

  function mount(root) {
    root.innerHTML = render();

    root.querySelectorAll('[data-tg]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        UI.haptic();
        Store.toggleBuy(b.getAttribute('data-tg'));
      };
    });
    root.querySelectorAll('[data-b]').forEach(function (el) {
      el.onclick = function (e) {
        if (e.target.closest('[data-tg]')) return;
        edit(el.getAttribute('data-b'));
      };
    });
    var sd = root.querySelector('#showDone');
    if (sd) sd.onclick = function () { showDone = !showDone; mount(root); };
  }

  function edit(id) {
    var b = Store._s.buys.filter(function (x) { return x.id === id; })[0];
    if (!b) return;
    UI.sheet(b.name,
      '<div class="field"><label class="field-l">规格 / 说明</label>' +
      '<input class="input" id="bs" value="' + esc(b.spec || '') + '"></div>' +
      '<div class="field-row">' +
      '<div class="field"><label class="field-l">计划采购日</label>' +
      '<input class="input" type="date" id="bpd" value="' + esc(b.planDate || '') + '"></div>' +
      '<div class="field"><label class="field-l">商家</label>' +
      '<input class="input" id="bv" value="' + esc(b.vendor || '') + '"></div></div>' +
      '<div class="field-row">' +
      '<div class="field"><label class="field-l">计划价（元）</label>' +
      '<input class="input" type="number" id="bb" value="' + b.budget + '"></div>' +
      '<div class="field"><label class="field-l">实付（元）</label>' +
      '<input class="input" type="number" id="ba" value="' + (b.actualPrice || '') + '" placeholder="买完再填"></div></div>' +
      '<div class="field"><label class="field-l">备注</label>' +
      '<textarea class="textarea" id="bn">' + esc(b.note || '') + '</textarea></div>' +
      '<button class="btn" id="bok">保存</button>' +
      '<button class="btn ghost" id="bmark">' + (b.bought ? '标记为未买' : '标记为已买') + '</button>',
      function (bd) {
        $('#bok', bd).onclick = function () {
          Store.editBuy(id, {
            spec: $('#bs', bd).value.trim(),
            planDate: $('#bpd', bd).value,
            vendor: $('#bv', bd).value.trim(),
            budget: Number($('#bb', bd).value) || 0,
            actualPrice: Number($('#ba', bd).value) || 0,
            note: $('#bn', bd).value.trim()
          }).then(function () { UI.closeSheet(); UI.toast('已保存'); });
        };
        $('#bmark', bd).onclick = function () {
          Store.toggleBuy(id).then(function () { UI.closeSheet(); });
        };
      });
  }

  w.PagePurchase = { mount: mount };
})(window);
