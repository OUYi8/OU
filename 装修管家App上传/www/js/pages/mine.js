/* 我的：验收清单 + 合同台账 + 备份 */
(function (w) {
  'use strict';
  var UI = w.UI, Store = w.Store, esc = UI.esc, money = UI.money;

  var tab = 'check';
  var openPay = null;

  function render() {
    var h = '';
    h += '<div class="filters">' +
      '<button class="fchip' + (tab === 'check' ? ' is-on' : '') + '" data-t="check">✅ 验收清单</button>' +
      '<button class="fchip' + (tab === 'pay' ? ' is-on' : '') + '" data-t="pay">📄 半包台账</button>' +
      '<button class="fchip' + (tab === 'set' ? ' is-on' : '') + '" data-t="set">⚙️ 备份设置</button>' +
      '</div>';
    h += tab === 'check' ? renderCheck() : (tab === 'pay' ? renderPay() : renderSet());
    w.__renderMine = h;
    return h;
  }

  /* ---------- 验收 ---------- */
  function renderCheck() {
    var st = Store.checkStat();
    var h = '<div class="card"><div class="hero-top" style="gap:16px">' +
      '<div style="position:relative;width:64px;height:64px;flex:none">' +
      UI.ring(st.pct, 64, 6, '#c2703a', '#eceae6') +
      '<div style="position:absolute;inset:0;display:grid;place-items:center;font-size:15px;font-weight:700">' +
      st.pct + '%</div></div>' +
      '<div style="flex:1"><div style="font-size:14px;font-weight:650">已验收 ' + st.done + ' / ' + st.total + ' 项</div>' +
      '<div class="hint" style="margin-top:4px">隐蔽工程做完就要验收，别等贴完砖才发现水管埋错</div></div></div></div>';

    var groups = {};
    Store._s.checks.forEach(function (c) { (groups[c.group] = groups[c.group] || []).push(c); });
    Object.keys(groups).forEach(function (g) {
      var list = groups[g];
      var d = list.filter(function (c) { return c.done; }).length;
      h += '<div class="sec-t">' + esc(g) + ' · ' + d + '/' + list.length + '</div><div class="card">';
      list.forEach(function (c) {
        h += '<div class="chk' + (c.done ? ' is-done' : '') + '">' +
          '<div class="chk-box" data-cb="' + esc(c.id) + '">' + UI.ICON.check + '</div>' +
          '<div class="chk-main"><div class="chk-t">' + esc(c.name) +
          (c.date ? '<span class="tag ok" style="margin-left:6px">' + UI.dateCn(c.date) + '</span>' : '') + '</div>' +
          '<div class="chk-std">📐 ' + esc(c.std) + '</div></div>' +
          '<div class="chk-photo" data-cp="' + esc(c.id) + '" style="' +
          (c.photos ? '' : 'display:grid;place-items:center;color:var(--ink-3);background:#faf9f7') + '">' +
          (c.photos ? '<img src="' + esc(c.photos) + '">' : '<span style="font-size:15px">📷</span>') + '</div></div>';
      });
      h += '</div>';
    });
    return h;
  }

  /* ---------- 半包合同 ---------- */
  function renderPay() {
    var S = Store._s;
    var h = '<div class="card"><div class="kv"><span>施工单位</span><b>' + esc(S.meta.contractor || '未填') + '</b></div>' +
      '<div class="kv"><span>计价面积</span><b>' + (S.meta.areaBuild || '—') + ' ㎡</b></div>' +
      '<div class="kv"><span>开工 / 目标完工</span><b>' + UI.dateCn(S.meta.startDate) + ' → ' + UI.dateCn(S.meta.targetDate) + '</b></div>' +
      '<div class="kv"><span>合同总额</span><b>' + money(Store.payTotal()) + ' 元</b></div>' +
      '</div>';

    h += '<div class="card"><div class="card-hd"><h2>付款节点台账</h2>' +
      '<span class="more" data-editpay="new">＋ 加节点</span></div>';
    S.payments.slice().sort(function (a, b) { return (a.dueDate || '') < (b.dueDate || '') ? -1 : 1; })
      .forEach(function (p) {
        var late = !p.paid && UI.daysFrom(p.dueDate) !== null && UI.daysFrom(p.dueDate) < 0;
        h += '<div class="card" style="box-shadow:none;border:1px solid var(--line);margin-bottom:9px">' +
          '<div style="display:flex;align-items:center;gap:11px">' +
          '<div class="task-box" data-pay="' + esc(p.id) + '" style="' +
          (p.paid ? 'background:var(--ok);border-color:var(--ok)' : (late ? 'border-color:var(--danger)' : '')) + '">' +
          UI.ICON.check + '</div>' +
          '<div style="flex:1;min-width:0">' +
          '<div style="font-size:14px;font-weight:600">' + esc(p.name) +
          (p.paid ? '<span class="tag ok">已付</span>' : (late ? '<span class="tag danger">逾期</span>' : UI.dueLabel(p.dueDate))) + '</div>' +
          '<div class="hint" style="margin-top:3px">应付 ' + UI.dateCn(p.dueDate) +
          (p.paidDate ? ' · 实付 ' + UI.dateCn(p.paidDate) : '') + (p.note ? ' · ' + esc(p.note) : '') + '</div></div>' +
          '<div class="row-v">' + money(p.amount) + '<small>' + p.ratio + '%</small></div>' +
          '<button class="btn-mini" data-ep="' + esc(p.id) + '">改</button></div></div>';
      });
    h += '<p class="hint" style="margin-top:4px">勾选"已付"会自动在记账里生成一笔支出，不会重复记。</p></div>';

    /* 辅材验收基线（你的合同护栏） */
    h += '<div class="sec-t">📌 合同护栏（建议写进合同）</div><div class="card">';
    ['闭口价：结算价 = 合同价，不按实际量算', '增项封顶：总增项不超过合同价的 3%',
      '六项隐蔽工程列入基础报价（水电/防水/泥木/油漆/安装/人工）',
      '辅材写全品牌型号，含瓷砖胶 C1/C2 + 背胶',
      '合同抬头 = 公章 = 收款账户 = 开票主体，四者一致',
      '付款后置：首付 ≤30%，尾款 ≥10%',
      '量化验收：空鼓≤5% / 接缝≤1mm / 植筋必拍照'].forEach(function (t) {
        h += '<div class="kv"><span style="white-space:normal">' + esc(t) + '</span><span style="color:var(--brand);font-weight:700">必写</span></div>';
      });
    h += '</div>';
    return h;
  }

  /* ---------- 设置 ---------- */
  function renderSet() {
    var S = Store._s;
    var h = '<div class="card"><div class="card-hd"><h2>项目信息</h2></div>' +
      '<div class="field"><label class="field-l">项目名称</label><input class="input" data-m="name" value="' + esc(S.meta.name || '') + '"></div>' +
      '<div class="field"><label class="field-l">地址</label><input class="input" data-m="addr" value="' + esc(S.meta.addr || '') + '"></div>' +
      '<div class="field-row">' +
      '<div class="field"><label class="field-l">建筑面积</label><input class="input" type="number" data-m="areaBuild" value="' + (S.meta.areaBuild || '') + '"></div>' +
      '<div class="field"><label class="field-l">套内面积</label><input class="input" type="number" data-m="areaInner" value="' + (S.meta.areaInner || '') + '"></div>' +
      '</div>' +
      '<div class="field"><label class="field-l">户型</label><input class="input" data-m="layout" value="' + esc(S.meta.layout || '') + '"></div>' +
      '<div class="field"><label class="field-l">施工单位</label><input class="input" data-m="contractor" value="' + esc(S.meta.contractor || '') + '"></div>' +
      '<div class="field-row">' +
      '<div class="field"><label class="field-l">开工日</label><input class="input" type="date" data-m="startDate" value="' + esc(S.meta.startDate || '') + '"></div>' +
      '<div class="field"><label class="field-l">目标完工</label><input class="input" type="date" data-m="targetDate" value="' + esc(S.meta.targetDate || '') + '"></div>' +
      '</div>' +
      '<button class="btn" data-savemeta>保存</button></div>';

    h += '<div class="card"><div class="card-hd"><h2>数据备份</h2></div>' +
      '<p class="hint" style="margin:0 0 12px">数据存在手机本地。换手机或重装前，务必先导出备份文件。</p>' +
      '<button class="btn ghost" data-export>导出备份（含照片）</button>' +
      '<button class="btn ghost" data-exportnp style="margin-top:9px">只导出数据（不含照片，小）</button>' +
      '<button class="btn ghost" data-import style="margin-top:9px">从备份恢复</button>' +
      '<input type="file" id="fimp" accept=".json" style="display:none"></div>';

    h += '<div class="card"><div class="card-hd"><h2>危险操作</h2></div>' +
      '<button class="btn ghost" data-clearl>清空记账流水</button>' +
      '<button class="btn danger" data-reset style="margin-top:9px">恢复出厂预置数据</button></div>';

    h += '<p class="hint" style="text-align:center;margin-top:18px">装修管家 v1.0 · 数据全部本地存储<br>不上传任何服务器</p>';
    return h;
  }

  /* ---------- mount ---------- */
  function mount(root) {
    root.innerHTML = render();

    root.querySelectorAll('[data-t]').forEach(function (b) {
      b.onclick = function () { tab = b.getAttribute('data-t'); mount(root); };
    });

    /* 验收 */
    root.querySelectorAll('[data-cb]').forEach(function (b) {
      b.onclick = function () {
        UI.haptic();
        Store.toggleCheck(b.getAttribute('data-cb'));
      };
    });
    root.querySelectorAll('[data-cp]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-cp');
        var c = Store._s.checks.filter(function (x) { return x.id === id; })[0];
        w.Photo.save().then(function (p) {
          c.photos = p.url;
          w.DB.put('checks', c).then(function () { UI.toast('已留证'); });
        });
      };
    });

    /* 付款 */
    root.querySelectorAll('[data-pay]').forEach(function (b) {
      b.onclick = function () {
        UI.haptic();
        var id = b.getAttribute('data-pay');
        var p = Store._s.payments.filter(function (x) { return x.id === id; })[0];
        if (p.paid) {
          UI.confirm('取消已付状态？', '会自动删除记账里对应的那笔支出', function () {
            Store.togglePay(id);
          });
        } else {
          Store.togglePay(id).then(function () { UI.toast('已标记付款，自动记账'); });
        }
      };
    });
    root.querySelectorAll('[data-ep]').forEach(function (b) {
      b.onclick = function () { editPay(b.getAttribute('data-ep')); };
    });
    var np = root.querySelector('[data-editpay]');
    if (np) np.onclick = function () { editPay(null); };

    /* 设置 */
    var sm = root.querySelector('[data-savemeta]');
    if (sm) sm.onclick = function () {
      var patch = {};
      root.querySelectorAll('[data-m]').forEach(function (i) {
        var k = i.getAttribute('data-m');
        patch[k] = i.type === 'number' ? (Number(i.value) || 0) : i.value.trim();
      });
      Store.editMeta(patch).then(function () { UI.toast('已保存'); });
    };

    var ex = root.querySelector('[data-export]');
    if (ex) ex.onclick = function () { doExport(true); };
    var exnp = root.querySelector('[data-exportnp]');
    if (exnp) exnp.onclick = function () { doExport(false); };

    var im = root.querySelector('[data-import]');
    if (im) im.onclick = function () { $('#fimp').click(); };
    var fi = root.querySelector('#fimp');
    if (fi) fi.onchange = function () {
      var f = fi.files[0]; if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        UI.confirm('用备份覆盖当前数据？', '当前数据会被替换，建议先导出一次', function () {
          Store.importJSON(fr.result).then(function () { UI.toast('恢复成功'); })
            .catch(function (e) { UI.toast('失败：' + e.message, 2400); });
        });
      };
      fr.readAsText(f);
    };

    var cl = root.querySelector('[data-clearl]');
    if (cl) cl.onclick = function () {
      UI.confirm('清空所有记账流水？', '此操作不可撤销，建议先导出备份', function () {
        Store.clearLedger().then(function () { UI.toast('已清空'); });
      });
    };
    var rs = root.querySelector('[data-reset]');
    if (rs) rs.onclick = function () {
      UI.confirm('恢复出厂数据？', '所有记账、进度、验收记录都会重置', function () {
        Store.reset().then(function () { UI.toast('已重置'); });
      });
    };
  }

  function doExport(withPhotos) {
    UI.toast('正在生成备份…', 4000);
    Store.exportJSON(withPhotos).then(function (text) {
      var blob = new Blob([text], { type: 'application/json' });
      var d = new Date();
      var name = '装修备份_' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '.json';
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
      UI.toast('已导出 ' + name, 2600);
    }).catch(function (e) { UI.toast('导出失败：' + e.message, 2400); });
  }

  function editPay(id) {
    var p = id ? Store._s.payments.filter(function (x) { return x.id === id; })[0] : null;
    UI.sheet(p ? '编辑付款节点' : '新增付款节点',
      '<div class="field"><label class="field-l">节点名称</label>' +
      '<input class="input" id="pn" value="' + esc(p ? p.name : '') + '" placeholder="例：二期款（水电验收）"></div>' +
      '<div class="field-row">' +
      '<div class="field"><label class="field-l">比例 %</label><input class="input" type="number" id="pr" value="' + (p ? p.ratio : 30) + '"></div>' +
      '<div class="field"><label class="field-l">金额（元）</label><input class="input" type="number" id="pa" value="' + (p ? p.amount : '') + '"></div></div>' +
      '<div class="field"><label class="field-l">应付日期</label><input class="input" type="date" id="pd" value="' + esc(p ? p.dueDate : '') + '"></div>' +
      '<div class="field"><label class="field-l">备注</label><input class="input" id="pnote" value="' + esc(p ? p.note : '') + '"></div>' +
      '<button class="btn" id="pok">' + (p ? '保存' : '添加') + '</button>',
      function (bd) {
        $('#pok', bd).onclick = function () {
          var name = $('#pn', bd).value.trim();
          if (!name) { UI.toast('填节点名称'); return; }
          var patch = {
            name: name, ratio: Number($('#pr', bd).value) || 0,
            amount: Number($('#pa', bd).value) || 0, dueDate: $('#pd', bd).value,
            note: $('#pnote', bd).value.trim()
          };
          if (p) {
            Store.editPay(p.id, patch).then(function () { UI.closeSheet(); UI.toast('已保存'); });
          } else {
            patch.id = Store.uid('pay'); patch.paid = false; patch.paidDate = '';
            w.DB.put('payments', patch).then(function () {
              w.DB.all('payments').then(function (a) {
                Store._s.payments = a; UI.closeSheet(); UI.toast('已添加');
              });
            });
          }
        };
      });
  }

  w.PageMine = { mount: mount };
})(window);
