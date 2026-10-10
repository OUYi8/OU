/* 路由 + 启动 */
(function (w) {
  'use strict';
  var UI = w.UI, Store = w.Store;

  var TABS = {
    home: { page: w.PageHome, title: '总览', sub: function () { return Store._s.meta.name || ''; } },
    progress: { page: w.PageProgress, title: '装修进度', sub: function () { var o = Store.overall(); return '总进度 ' + o.pct + '% · ' + o.done + '/' + o.total + ' 项'; } },
    ledger: { page: w.PageLedger, title: '记账', sub: function () { return '已支出 ' + UI.money(Store.spentTotal(), { wan: true }) + ' 元'; } },
    purchase: { page: w.PagePurchase, title: '采购主材', sub: function () { return Store._s.buys.length + ' 项主材时间节点'; } },
    mine: { page: w.PageMine, title: '验收与台账', sub: function () { var c = Store.checkStat(); return '验收 ' + c.done + '/' + c.total + ' 项'; } }
  };

  var cur = 'home';
  var FAB = {
    ledger: { text: '记一笔', fn: function () { w.PageLedger.addForm(); } },
    progress: { text: '加任务', fn: function () { quickAddTask(); } },
    purchase: { text: '加采购', fn: function () { w.App.go('mine'); } }
  };

  function quickAddTask() {
    var ph = Store._s.phases.filter(function (p) { return Store.phaseStat(p).state !== 'done'; })[0];
    if (!ph) { UI.toast('全部阶段都完成了 🎉'); return; }
    UI.sheet('给「' + ph.name + '」加任务',
      '<div class="field"><input class="input" id="qt" placeholder="任务名称"></div>' +
      '<button class="btn" id="qok">添加</button>',
      function (bd) {
        setTimeout(function () { $('#qt', bd).focus(); }, 260);
        $('#qok', bd).onclick = function () {
          var v = $('#qt', bd).value.trim();
          if (!v) { UI.toast('写点什么吧'); return; }
          Store.addTask(ph.id, v).then(function () { UI.closeSheet(); UI.toast('已添加'); });
        };
      });
  }

  var App = {
    go: function (name) {
      if (!TABS[name]) name = 'home';
      cur = name;
      UI.closeSheet();
      location.hash = '#/' + name;
      render();
    },
    reload: function () { render(); }
  };

  function render() {
    var t = TABS[cur];
    $('#pageTitle').textContent = t.title;
    var sub = '';
    try { sub = t.sub(); } catch (e) { }
    $('#pageSub').textContent = sub;

    UI.$$('.tab').forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-tab') === cur);
    });

    var vp = $('#viewport');
    t.page.mount(vp);
    vp.scrollTop = 0;
    window.scrollTo(0, 0);

    /* FAB */
    UI.$$('.fab').forEach(function (f) { f.remove(); });
    var fab = FAB[cur];
    if (fab) {
      var b = document.createElement('button');
      b.className = 'fab';
      b.type = 'button';
      b.innerHTML = UI.ICON.plus + '<span>' + fab.text + '</span>';
      b.onclick = fab.fn;
      document.body.appendChild(b);
    }
  }

  function boot() {
    /* Capacitor 原生桥（可用就用，不可用自动降级到浏览器） */
    if (w.Capacitor && w.Capacitor.Plugins) {
      var SB = w.Capacitor.Plugins.StatusBar, C = w.Capacitor.Plugins.Camera, H = w.Capacitor.Plugins.Haptics;
      if (SB) SB.setStyle({ style: 'LIGHT' }).catch(function () { });
      if (SB) SB.setBackgroundColor({ color: '#1c1f23' }).catch(function () { });
      if (C) w.Camera = C;
      if (H) w.Haptic = H;
      var App_ = w.Capacitor.Plugins.App;
      if (App_) {
        App_.addListener('backButton', function () {
          if ($('#sheet').classList.contains('is-on')) { UI.closeSheet(); return; }
          if (cur !== 'home') { App.go('home'); return; }
          App_.exitApp();
        });
      }
    }

    Store.init().then(function () {
      Store.sub(function () { render(); });
      var h = (location.hash || '').replace('#/', '');
      cur = TABS[h] ? h : 'home';
      render();
      document.body.removeChild(document.getElementById('boot'));
    }).catch(function (e) {
      document.getElementById('viewport').innerHTML =
        '<div class="card"><h2>启动失败</h2><p class="hint">' + UI.esc(e.message || e) + '</p></div>';
    });

    UI.$$('.tab').forEach(function (b) {
      b.onclick = function () { UI.haptic(); App.go(b.getAttribute('data-tab')); };
    });

    window.addEventListener('hashchange', function () {
      var h = (location.hash || '').replace('#/', '');
      if (TABS[h] && h !== cur) { cur = h; render(); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  w.App = App;
})(window);
