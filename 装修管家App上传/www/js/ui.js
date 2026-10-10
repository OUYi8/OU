/* UI 工具：格式化、DOM、弹层、Toast */
(function (w) {
  'use strict';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* 金额：12345.6 → 1.23万 / 12345 */
  function money(n, opt) {
    n = Number(n) || 0;
    opt = opt || {};
    if (opt.wan && Math.abs(n) >= 10000) {
      return (n / 10000).toFixed(n % 10000 === 0 ? 0 : 2).replace(/\.?0+$/, '') + '万';
    }
    return n.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
  }
  function money2(n) {
    return (Number(n) || 0).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  function dateCn(s) {
    if (!s) return '';
    var p = String(s).split('-');
    return p.length === 3 ? (p[1].replace(/^0/, '') + '/' + p[2].replace(/^0/, '')) : s;
  }
  function daysFrom(s) {
    if (!s) return null;
    var t = new Date(); t.setHours(0, 0, 0, 0);
    var d = new Date(s + 'T00:00:00');
    return Math.round((d - t) / 86400000);
  }
  function dueLabel(s) {
    var n = daysFrom(s);
    if (n === null) return '';
    if (n === 0) return '<span class="tag danger">今天到期</span>';
    if (n < 0) return '<span class="tag danger">已逾期 ' + (-n) + ' 天</span>';
    if (n <= 7) return '<span class="tag warn">' + n + ' 天后</span>';
    return '';
  }

  var ICON = {
    check: '<svg viewBox="0 0 24 24"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>',
    cam: '<svg viewBox="0 0 24 24"><path d="M9 4h6l1.2 2H20a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3.8zM12 8.5A4.5 4.5 0 1 0 12 17.5 4.5 4.5 0 0 0 12 8.5zm0 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z"/></svg>',
    empty: '<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z" opacity=".3"/><path d="M6 7h12v2H6zm0 4h8v2H6zm0 4h8v2H6z" opacity=".5"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M3 17.2V21h3.8L18 9.8 14.2 6zM20.7 7.1a1 1 0 0 0 0-1.4l-2.4-2.4a1 1 0 0 0-1.4 0L15 5.2 18.8 9z"/></svg>'
  };

  var UI = {
    $: $, $$: $$, esc: esc, money: money, money2: money2, dateCn: dateCn,
    daysFrom: daysFrom, dueLabel: dueLabel, ICON: ICON,

    toast: function (msg, ms) {
      var t = $('#toast');
      t.textContent = msg;
      t.classList.add('is-on');
      clearTimeout(t._tm);
      t._tm = setTimeout(function () { t.classList.remove('is-on'); }, ms || 1700);
    },

    haptic: function () {
      try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) { }
    },

    sheet: function (title, html, onMount) {
      var s = $('#sheet'), m = $('#sheetMask');
      $('#sheetTitle').textContent = title;
      $('#sheetBody').innerHTML = html;
      s.classList.add('is-on'); m.classList.add('is-on');
      document.body.style.overflow = 'hidden';
      if (onMount) onMount($('#sheetBody'));
    },
    closeSheet: function () {
      var s = $('#sheet'), m = $('#sheetMask');
      s.classList.remove('is-on'); m.classList.remove('is-on');
      $('#sheetBody').innerHTML = '';
      document.body.style.overflow = '';
    },

    confirm: function (title, text, onYes) {
      var s = $('#sheet'), m = $('#sheetMask');
      $('#sheetTitle').textContent = title;
      $('#sheetBody').innerHTML =
        '<p class="hint" style="font-size:13.5px;color:var(--ink-2);margin:4px 0 14px">' + esc(text) + '</p>' +
        '<div class="btn-row"><button class="btn ghost" id="cNo">取消</button>' +
        '<button class="btn danger" id="cYes">确定</button></div>';
      s.classList.add('is-on'); m.classList.add('is-on');
      document.body.style.overflow = 'hidden';
      $('#cNo').onclick = UI.closeSheet;
      $('#cYes').onclick = function () { UI.closeSheet(); onYes(); };
    },

    lightbox: function (src) {
      $('#lightboxImg').src = src;
      $('#lightbox').classList.add('is-on');
    },

    /* 进度环 */
    ring: function (pct, size, stroke, color, track) {
      size = size || 76; stroke = stroke || 7;
      color = color || '#fff'; track = track || 'rgba(255,255,255,.2)';
      var r = (size - stroke) / 2, c = 2 * Math.PI * r;
      var off = c * (1 - Math.min(100, pct) / 100);
      return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" style="transform:rotate(-90deg)">' +
        '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + track + '" stroke-width="' + stroke + '"/>' +
        '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + stroke + '" ' +
        'stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" ' +
        'style="transition:stroke-dashoffset .7s cubic-bezier(.4,0,.2,1)"/></svg>';
    },

    bar: function (pct, cls) {
      return '<div class="bar"><i class="' + (cls || '') + '" style="width:' + Math.min(100, pct) + '%"></i></div>';
    },

    pctCls: function (pct, b, w) {
      if (pct > (w || 100)) return 'danger';
      if (pct >= (b || 90)) return 'ok';
      if (pct >= 75) return 'warn';
      return '';
    },

    options: function (list, cur) {
      return list.map(function (n) {
        return '<option value="' + esc(n) + '"' + (n === cur ? ' selected' : '') + '>' + esc(n) + '</option>';
      }).join('');
    },

    empty: function (text) {
      return '<div class="empty">' + ICON.empty + '<p>' + esc(text) + '</p></div>';
    }
  };

  $('#sheetMask').addEventListener('click', UI.closeSheet);
  $('#sheetClose').addEventListener('click', UI.closeSheet);
  $('#lightbox').addEventListener('click', function () {
    $('#lightbox').classList.remove('is-on');
  });

  w.UI = UI;
})(window);
