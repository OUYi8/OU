/* 进度：阶段卡片 + 任务勾选 + 照片留证 */
(function (w) {
  'use strict';
  var UI = w.UI, Store = w.Store, esc = UI.esc;

  function render() {
    var S = Store._s;
    var h = '<div class="sec-t">共 ' + S.phases.length + ' 个阶段 · 点击展开任务</div>';

    S.phases.forEach(function (p, i) {
      var st = Store.phaseStat(p);
      h += '<div class="phase is-' + st.state + '" data-p="' + esc(p.id) + '">';
      h += '<div class="phase-hd"><div class="phase-no">' + (st.state === 'done' ? '✓' : (i + 1)) + '</div>' +
        '<div class="phase-info"><div class="phase-t">' + p.icon + ' ' + esc(p.name) +
        (st.state === 'doing' ? '<span class="tag warn">进行中</span>' : '') +
        (st.state === 'done' ? '<span class="tag ok">已完成</span>' : '') + '</div>' +
        '<div class="phase-s"><span>' + esc(p.days || '') + '</span><span>' + st.done + '/' + st.total + ' 项</span></div>' +
        '</div><div class="phase-pct">' + st.pct + '%</div></div>';
      h += '<div class="phase-bar">' + UI.bar(st.pct, st.state === 'done' ? 'ok' : (st.state === 'doing' ? '' : 'info')) + '</div>';

      if (st.state !== 'todo') {
        h += '<div class="phase-bd">';
        (p.tasks || []).forEach(function (t) {
          h += '<div class="task' + (t.done ? ' is-done' : '') + '" data-t="' + esc(t.id) + '">' +
            '<div class="task-box">' + UI.ICON.check + '</div>' +
            '<div class="task-main"><div class="task-t">' + esc(t.name) + '</div>' +
            (t.date || (t.photos && t.photos.length) ? '<div class="task-s">' +
              (t.date ? '<span>📅 ' + UI.dateCn(t.date) + '</span>' : '') +
              (t.photos && t.photos.length ? '<span>📷 ' + t.photos.length + ' 张</span>' : '') +
              '</div>' : '') + '</div>';
          if (t.photos && t.photos.length) {
            h += '<div class="task-photo" data-pv="' + esc(t.photos[0]) + '">' +
              '<img src="' + esc(t.photos[0]) + '" alt=""></div>';
          } else {
            h += '<div class="task-photo" data-add="' + esc(t.id) + '" ' +
              'style="display:grid;place-items:center;color:var(--ink-3);background:#faf9f7">' +
              '<svg viewBox="0 0 24 24" style="width:14px;height:14px">' + UI.ICON.cam.path + '</svg></div>';
          }
          h += '</div>';
        });
        h += '<div style="display:flex;gap:8px;margin-top:11px">' +
          '<button class="btn-mini" data-addtask="' + esc(p.id) + '">＋ 加任务</button>' +
          '<button class="btn-mini" data-photophase="' + esc(p.id) + '">📷 阶段留证</button></div>';
        h += '</div>';
      }
      h += '</div>';
    });
    return h;
  }

  function mount(root) {
    root.innerHTML = render();

    root.querySelectorAll('.phase-hd').forEach(function (hd) {
      hd.onclick = function (e) {
        if (e.target.closest('[data-addtask]') || e.target.closest('[data-photophase]')) return;
        var ph = hd.parentNode;
        ph.classList.toggle('is-open');
        var bd = ph.querySelector('.phase-bd');
        if (bd) { if (ph.classList.contains('is-open')) ph.appendChild(bd); else ph.insertBefore(bd, ph.querySelector('.phase-bar').nextSibling); }
      };
    });

    /* 默认展开第一个未完成阶段 */
    var first = root.querySelector('.phase:not(.is-done)');
    if (first) first.classList.add('is-open');

    root.querySelectorAll('.task').forEach(function (el) {
      el.querySelector('.task-box').onclick = function () {
        UI.haptic();
        Store.toggleTask(el.closest('.phase').getAttribute('data-p'), el.getAttribute('data-t'));
      };
    });

    root.querySelectorAll('[data-addtask]').forEach(function (b) {
      b.onclick = function () {
        var pid = b.getAttribute('data-addtask');
        var ph = Store._s.phases.filter(function (x) { return x.id === pid; })[0];
        UI.sheet('新增任务 · ' + ph.name,
          '<div class="field"><label class="field-l">任务名称</label>' +
          '<input class="input" id="nt" placeholder="例：卫生间闭水试验 48 小时" autofocus></div>' +
          '<button class="btn" id="ns">添加</button>',
          function () {
            var inp = $('#nt', $('#sheetBody'));
            setTimeout(function () { inp.focus(); }, 260);
            $('#ns').onclick = function () {
              var v = inp.value.trim();
              if (!v) { UI.toast('任务名称不能为空'); return; }
              Store.addTask(pid, v).then(function () { UI.closeSheet(); UI.toast('已添加'); });
            };
          });
      };
    });

    root.querySelectorAll('[data-add]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var tid = b.getAttribute('data-add');
        var ph = Store._s.phases.filter(function (x) {
          return (x.tasks || []).some(function (t) { return t.id === tid; });
        })[0];
        var t = ph.tasks.filter(function (x) { return x.id === tid; })[0];
        w.Photo.save().then(function (p) {
          t.photos = t.photos || [];
          t.photos.unshift(p.url);
          Store._s.phases.filter(function (x) { return x.id === ph.id; })[0];
          w.DB.put('phases', ph).then(function () { UI.toast('已留证'); });
        });
      };
    });

    root.querySelectorAll('[data-pv]').forEach(function (el) {
      el.onclick = function (e) {
        e.stopPropagation();
        UI.lightbox(el.querySelector('img').src);
      };
    });

    root.querySelectorAll('[data-photophase]').forEach(function (b) {
      b.onclick = function () {
        var pid = b.getAttribute('data-photophase');
        UI.sheet('阶段留证 · 现场照片',
          '<p class="hint" style="margin:0 0 12px">工地现状、水电走管、隐蔽工程照片，存本机随时可翻。</p>' +
          '<div class="photo-grid" id="pg"></div>' +
          '<button class="btn" id="pad" style="margin-top:14px">' + UI.ICON.cam + ' 拍照 / 选图</button>',
          function (bd) {
            renderPhasePhotos(bd, pid);
            $('#pad', bd).onclick = function () {
              w.Photo.save().then(function (p) { addToPhase(pid, p); renderPhasePhotos(bd, pid); });
            };
          });
      };
    });
  }

  function addToPhase(pid, p) {
    var ph = Store._s.phases.filter(function (x) { return x.id === pid; })[0];
    ph._photos = ph._photos || [];
    ph._photos.unshift(p);
    var t = (ph.tasks || []).filter(function (x) { return !x.photos; })[0];
    if (t) t.photos = [p.url];
    return w.DB.put('phases', ph);
  }

  function renderPhasePhotos(bd, pid) {
    var ph = Store._s.phases.filter(function (x) { return x.id === pid; })[0];
    var all = [];
    (ph._photos || []).forEach(function (x) { all.push({ url: x.url, id: x.id }); });
    (ph.tasks || []).forEach(function (t) {
      (t.photos || []).forEach(function (u) { all.push({ url: u, id: null }); });
    });
    var g = $('#pg', bd);
    if (!all.length) { g.innerHTML = '<p class="hint" style="grid-column:1/-1">还没有照片，点下方按钮拍一张。</p>'; return; }
    g.innerHTML = all.map(function (p, i) {
      return '<div class="photo-cell"><img src="' + esc(p.url) + '" data-i="' + i + '">' +
        (p.id ? '<button class="rm" data-rm="' + esc(p.id) + '">✕</button>' : '') + '</div>';
    }).join('');
    g.querySelectorAll('img').forEach(function (im) {
      im.onclick = function () { UI.lightbox(im.src); };
    });
    g.querySelectorAll('[data-rm]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var id = b.getAttribute('data-rm');
        w.PhotoStore.del(id).then(function () {
          ph._photos = (ph._photos || []).filter(function (x) { return x.id !== id; });
          w.DB.put('phases', ph).then(function () { renderPhasePhotos(bd, pid); });
        });
      };
    });
  }

  w.PageProgress = { mount: mount };
})(window);
