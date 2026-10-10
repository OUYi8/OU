/* 记账：流水 + 分类预算 + 超支预警 */
(function (w) {
  'use strict';
  var UI = w.UI, Store = w.Store, esc = UI.esc, money = UI.money;

  var filterCat = '__all__';
  var filterMonth = '__all__';

  function render() {
    var S = Store._s;
    var spent = Store.spentTotal();
    var budget = S.meta.budgetTotal || 0;
    var cats = Store.cats();
    var byCat = Store.ledgerByCat();
    var byMonth = Store.spentByMonth();
    var mKeys = Object.keys(byMonth).sort().reverse();

    var h = '';

    /* 汇总 */
    h += '<div class="mgrid">';
    h += '<div class="mcell"><div class="mcell-k">总支出</div><div class="mcell-v">' + money(spent, { wan: true }) + '</div>' +
      '<div class="mcell-s">' + S.ledger.length + ' 笔记录</div></div>';
    var extras = S.ledger.filter(function (l) { return Store.isExtra(l); })
      .reduce(function (a, b) { return a + b.amount; }, 0);
    h += '<div class="mcell"><div class="mcell-k">增项合计</div>' +
      '<div class="mcell-v ' + (extras ? 'danger' : '') + '">' + money(extras) + '</div>' +
      '<div class="mcell-s">' + (extras ? '⚠️ 超出合同部分' : '暂无增项') + '</div></div>';
    h += '</div>';

    /* 分类预算条 */
    h += '<div class="card"><div class="card-hd"><h2>分类预算</h2>' +
      '<span class="more" data-edit="1">改预算 ›</span></div>';
    byCat.forEach(function (c) {
      var b = c.budget;
      var pct = b ? Math.round(c.spent / b * 100) : 0;
      var cls = !b ? '' : (pct > 100 ? 'danger' : (pct >= 90 ? 'warn' : ''));
      h += '<div style="padding:9px 0;border-bottom:1px solid #f1efeb">' +
        '<div style="display:flex;justify-content:space-between;font-size:13px">' +
        '<span><b>' + esc(c.name) + '</b>' +
        (b ? '<span style="color:var(--ink-3);font-size:11.5px"> / ' + money(b) + '</span>' : '') +
        (pct > 100 ? '<span class="tag danger">超 ' + money(c.spent - b) + '</span>' : '') + '</span>' +
        '<b style="font-variant-numeric:tabular-nums">' + money(c.spent) + (b ? ' · ' + pct + '%' : '') + '</b></div>' +
        (b ? UI.bar(pct, cls) : '') + '</div>';
    });
    var noBudget = byCat.filter(function (c) { return !c.budget; });
    if (noBudget.length) {
      h += '<p class="hint" style="margin-top:10px">未设预算的分类：' +
        noBudget.map(function (c) { return esc(c.name); }).join('、') +
        '（点右上角"改预算"补上）</p>';
    }
    h += '</div>';

    /* 月度 */
    if (mKeys.length > 1) {
      h += '<div class="card"><div class="card-hd"><h2>按月支出</h2></div>' +
        '<div style="display:flex;gap:6px;align-items:flex-end;height:76px;padding:0 2px">';
      var maxM = Math.max.apply(null, mKeys.map(function (k) { return byMonth[k]; }));
      mKeys.slice(0, 8).reverse().forEach(function (k) {
        var v = byMonth[k], hh = Math.max(6, Math.round(v / maxM * 62));
        h += '<div style="flex:1;text-align:center">' +
          '<div style="font-size:9.5px;color:var(--ink-3);margin-bottom:3px">' + (v / 10000).toFixed(1) + '万</div>' +
          '<div style="height:' + hh + 'px;background:var(--brand);border-radius:4px 4px 0 0"></div>' +
          '<div style="font-size:9px;color:var(--ink-3);margin-top:3px">' + k.slice(5) + '</div></div>';
      });
      h += '</div></div>';
    }

    /* 筛选 */
    h += '<div class="filters"><button class="fchip' + (filterCat === '__all__' ? ' is-on' : '') + '" data-fc="__all__">全部</button>';
    cats.forEach(function (c) {
      h += '<button class="fchip' + (filterCat === c ? ' is-on' : '') + '" data-fc="' + esc(c) + '">' + esc(c) + '</button>';
    });
    h += '</div>';

    if (mKeys.length > 1) {
      h += '<div class="filters"><button class="fchip' + (filterMonth === '__all__' ? ' is-on' : '') + '" data-fm="__all__">全部月份</button>';
      mKeys.forEach(function (k) {
        h += '<button class="fchip' + (filterMonth === k ? ' is-on' : '') + '" data-fm="' + k + '">' + k.replace('-', '/') + '</button>';
      });
      h += '</div>';
    }

    /* 流水 */
    var list = S.ledger.filter(function (l) {
      if (filterCat !== '__all__' && l.cat !== filterCat) return false;
      if (filterMonth !== '__all__' && (l.date || '').slice(0, 7) !== filterMonth) return false;
      return true;
    });

    if (!list.length) {
      h += '<div class="card">' + UI.empty('这个筛选下还没有记录') + '</div>';
    } else {
      /* 按日期分组 */
      var groups = {};
      list.forEach(function (l) {
        var k = l.date || '无日期';
        (groups[k] = groups[k] || []).push(l);
      });
      Object.keys(groups).sort().reverse().forEach(function (k) {
        var sub = groups[k].reduce(function (a, b) { return a + b.amount; }, 0);
        h += '<div class="card"><div class="card-hd"><h2>' + UI.dateCn(k) === k ? k : (k === '无日期' ? k : UI.dateCn(k)) +
          '</h2><span class="more">−' + money(sub) + '</span></div>';
        groups[k].forEach(function (l) {
          var ex = Store.isExtra(l);
          h += '<div class="row" data-del="' + esc(l.id) + '">' +
            '<div class="row-ic" style="background:' + (ex ? 'var(--danger-soft)' : 'var(--brand-soft)') +
            ';color:' + (ex ? 'var(--danger)' : 'var(--brand)') + '">' +
            ((w.SEED.BUDGET.filter(function (b) { return b.name === l.cat; })[0] || {}).icon || '¥') + '</div>' +
            '<div class="row-main"><div class="row-t">' + esc(l.item) +
            (ex ? '<span class="tag danger">增项</span>' : '') + '</div>' +
            '<div class="row-s">' + esc(l.cat) + (l.payee ? ' · ' + esc(l.payee) : '') +
            (l.note ? ' · ' + esc(l.note) : '') +
            (l.photos ? ' · 📷' + l.photos : '') + '</div></div>' +
            '<div class="row-v">−' + money(l.amount) + '</div></div>';
        });
        h += '</div>';
      });
    }

    w.__renderLedger = h;
    return h;
  }

  function mount(root) {
    root.innerHTML = render();
    root.querySelectorAll('[data-fc]').forEach(function (b) {
      b.onclick = function () { filterCat = b.getAttribute('data-fc'); mount(root); };
    });
    root.querySelectorAll('[data-fm]').forEach(function (b) {
      b.onclick = function () { filterMonth = b.getAttribute('data-fm'); mount(root); };
    });
    root.querySelectorAll('[data-del]').forEach(function (el) {
      el.onclick = function () {
        var id = el.getAttribute('data-del');
        var l = Store._s.ledger.filter(function (x) { return x.id === id; })[0];
        UI.confirm('删除这笔账？', (l.item + ' · ' + money(l.amount) + ' 元'), function () {
          Store.delLedger(id).then(function () { UI.toast('已删除'); });
        });
      };
    });
    var ed = root.querySelector('[data-edit]');
    if (ed) ed.onclick = openBudgetEditor;
  }

  function openBudgetEditor() {
    var cats = Store.cats();
    var h = '<div class="field"><label class="field-l">总预算（元）</label>' +
      '<input class="input" type="number" id="bt" value="' + (Store._s.meta.budgetTotal || 0) + '"></div>';
    cats.forEach(function (c) {
      h += '<div class="field"><label class="field-l">' + esc(c) + '</label>' +
        '<input class="input" type="number" data-bc="' + esc(c) + '" value="' + Store.catBudget(c) + '"></div>';
    });
    h += '<button class="btn" id="bs">保存</button>';
    UI.sheet('预算设置', h, function (bd) {
      $('#bs', bd).onclick = function () {
        var total = Number($('#bt', bd).value) || 0;
        var jobs = [Store.editMeta({ budgetTotal: total })];
        bd.querySelectorAll('[data-bc]').forEach(function (i) {
          jobs.push(Store.setBudget(i.getAttribute('data-bc'), i.value));
        });
        Promise.all(jobs).then(function () { UI.closeSheet(); UI.toast('已保存'); });
      };
    });
  }

  /* FAB 记一笔 */
  function addForm() {
    var cats = Store.cats();
    var h = '<div class="field"><label class="field-l">金额</label>' +
      '<div class="money-input"><input class="input" type="number" inputmode="decimal" id="la" placeholder="0"></div></div>' +
      '<div class="field"><label class="field-l">分类</label><select class="select" id="lc">' +
      UI.options(cats, cats[0]) + '</select></div>' +
      '<div class="field"><label class="field-l">项目说明</label>' +
      '<input class="input" id="li" placeholder="例：瓷砖胶 C2 + 背胶"></div>' +
      '<div class="field-row">' +
      '<div class="field"><label class="field-l">日期</label><input class="input" type="date" id="ld" value="' + Store.today() + '"></div>' +
      '<div class="field"><label class="field-l">付给谁</label><input class="input" id="lp" placeholder="施工队/商家"></div>' +
      '</div>' +
      '<div class="field"><label class="field-l">备注（写"增项/补差"会被标红）</label>' +
      '<textarea class="textarea" id="ln" placeholder="增项项目请注明原因，方便对账"></textarea></div>' +
      '<div class="field"><label class="field-l">票据照片</label><div class="photo-grid" id="lp2"></div>' +
      '<div style="font-size:12px;color:var(--ink-3);margin-top:7px">' +
      '<button class="btn-mini" id="lpad">' + UI.ICON.cam + ' 拍票据</button></div></div>' +
      '<button class="btn" id="lsb">保存这一笔</button>';

    UI.sheet('记一笔', h, function (bd) {
      var photos = [];
      var g = $('#lp2', bd);
      function drawPhotos() {
        g.innerHTML = photos.map(function (p, i) {
          return '<div class="photo-cell"><img src="' + p + '" data-i="' + i + '">' +
            '<button class="rm" data-r="' + i + '">✕</button></div>';
        }).join('') + '<div class="photo-add" id="padd"><div style="text-align:center">' +
          UI.ICON.cam + '<span>票据</span></div></div>';
        $('#padd', g).onclick = function () {
          w.Photo.save().then(function (p) { photos.unshift(p.url); drawPhotos(); });
        };
        g.querySelectorAll('img').forEach(function (im) {
          im.onclick = function () { UI.lightbox(im.src); };
        });
        g.querySelectorAll('[data-r]').forEach(function (b) {
          b.onclick = function () { photos.splice(Number(b.getAttribute('data-r')), 1); drawPhotos(); };
        });
      }
      drawPhotos();

      $('#lsb', bd).onclick = function () {
        var amt = Number($('#la', bd).value) || 0;
        if (amt <= 0) { UI.toast('金额要大于 0'); return; }
        var item = $('#li', bd).value.trim();
        if (!item) { UI.toast('写一下买了什么'); return; }
        Store.addLedger({
          amount: amt, cat: $('#lc', bd).value, item: item,
          date: $('#ld', bd).value || Store.today(),
          payee: $('#lp', bd).value.trim(), note: $('#ln', bd).value.trim(),
          photos: photos.length
        }).then(function () {
          photos.forEach(function (u, i) {
            if (!u.startsWith('ph_')) return;
          });
          UI.closeSheet();
          UI.toast('已记 ' + money(amt) + ' 元');
        });
      };
    });
  }

  w.PageLedger = { mount: mount, addForm: addForm, render: render };
})(window);
