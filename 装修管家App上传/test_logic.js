/* 核心业务逻辑测试：用内存 mock 替代 IndexedDB，验证数据与统计正确性 */
const path = require('path');
const fs = require('fs');
const vm = require('vm');

/* ---------- 内存版 IndexedDB ---------- */
const mem = {};
const IDB = {
  get(store, id) {
    return Promise.resolve(mem[store + '|' + id] || null);
  },
  put(store, obj) {
    mem[store + '|' + obj.id] = JSON.parse(JSON.stringify(obj));
    return Promise.resolve(obj.id);
  },
  putMany(store, arr) {
    arr.forEach(o => { mem[store + '|' + o.id] = JSON.parse(JSON.stringify(o)); });
    return Promise.resolve(arr.length);
  },
  del(store, id) { delete mem[store + '|' + id]; return Promise.resolve(); },
  all(store) {
    return Promise.resolve(Object.keys(mem)
      .filter(k => k.startsWith(store + '|'))
      .map(k => JSON.parse(JSON.stringify(mem[k]))));
  },
  clear(store) {
    Object.keys(mem).filter(k => k.startsWith(store + '|')).forEach(k => delete mem[k]);
    return Promise.resolve();
  },
  dump() { return Promise.resolve([]); },
  restore() { return Promise.resolve(0); }
};

/* ---------- 造一个 window 环境跑 www/js ---------- */
const WWW = path.join(__dirname, 'www', 'js');

/* 极简 DOM 桩：ui.js 启动时需要 #sheetMask / #sheetClose / #lightbox */
function stubEl() {
  return {
    textContent: '', innerHTML: '', style: {},
    classList: { add() { }, remove() { }, toggle() { }, contains() { return false; } },
    addEventListener() { }, appendChild() { }, removeChild() { }, click() { },
    querySelector: () => null, querySelectorAll: () => []
  };
}
const els = {};
['sheetMask', 'sheet', 'sheetTitle', 'sheetBody', 'sheetClose', 'lightbox', 'lightboxImg', 'toast'].forEach(id => {
  els['#' + id] = stubEl();
});

const sandbox = {
  console, Promise, Date, Math, JSON, setTimeout, clearTimeout, Object, Array, String, Number, RegExp, Error, isNaN, parseInt, parseFloat,
  navigator: { vibrate() { } },
  document: {
    querySelector: (s) => els[s] || null,
    querySelectorAll: () => [],
    addEventListener() { },
    removeChild() { },
    createElement: () => stubEl(),
    body: { appendChild() { }, removeChild() { }, style: {} },
    getElementById: (id) => els['#' + id] || null
  },
  indexedDB: {},
  location: { hash: '' },
  UI: null
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.addEventListener = () => { };
vm.createContext(sandbox);

function loadScript(f) {
  const code = fs.readFileSync(path.join(WWW, f), 'utf8');
  vm.runInContext(code, sandbox, { filename: f });
}

loadScript('db.js');
loadScript('seed.js');
loadScript('ui.js');
/* store.js 引用了 DB（不是 DB.__store），手动挂 */
sandbox.DB = IDB;
/* photo.js 引用 UI，用不到但需能加载 */
sandbox.PhotoStore = { save: () => Promise.resolve(), get: () => Promise.resolve(null), del: () => Promise.resolve() };
loadScript('store.js');
/* 覆盖 DB 为 mock */
sandbox.DB = IDB;

const Store = sandbox.Store;
const SEED = sandbox.SEED;

/* ---------- 测试 ---------- */
let pass = 0, fail = 0;
const errors = [];
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✅ ' + name); }
  else { fail++; errors.push(name + (extra ? ' :: ' + extra : '')); console.log('  ❌ ' + name + (extra ? ' :: ' + extra : '')); }
}
function eq(name, a, b) { ok(name, a === b, 'got=' + JSON.stringify(a) + ' want=' + JSON.stringify(b)); }

(async function run() {
  console.log('\n========== 1. 种子数据完整性 ==========');
  await Store.init();
  const S = Store._s;

  eq('阶段数 = 7', S.phases.length, 7);
  eq('验收项 = 14', S.checks.length, 14);
  eq('采购项 = 11', S.buys.length, 11);
  eq('付款节点 = 4', S.payments.length, 4);
  ok('主材清单已预置 11 项', S.buys.length === 11);

  /* ID 唯一性 —— 重复会导致数据互相覆盖，是最难查的 bug */
  ['phases', 'ledger', 'payments', 'buys', 'checks'].forEach(k => {
    const ids = S[k].map(x => x.id);
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
    ok(k + ' ID 无重复', dup.length === 0, dup.join(','));
  });

  /* 阶段任务 ID 全局唯一 */
  const tids = [];
  S.phases.forEach(p => (p.tasks || []).forEach(t => tids.push(t.id)));
  const tdup = tids.filter((id, i) => tids.indexOf(id) !== i);
  ok('任务 ID 无重复', tdup.length === 0, tdup.join(','));

  /* 金额字段都是数字 */
  ok('付款金额均为数字', S.payments.every(p => typeof p.amount === 'number' && p.amount > 0));
  ok('采购预算均为数字', S.buys.every(b => typeof b.budget === 'number' && b.budget > 0));
  ok('记账金额均为正数', S.ledger.every(l => typeof l.amount === 'number' && l.amount > 0));

  console.log('\n========== 2. 付款比例与总额一致性 ==========');
  const ratioSum = S.payments.reduce((a, p) => a + p.ratio, 0);
  eq('付款比例合计 = 100%', ratioSum, 100);
  const total = Store.payTotal();
  const amountSum = S.payments.reduce((a, p) => a + p.amount, 0);
  eq('付款金额合计 = 明细之和', total, amountSum);
  /* 首付 ≤30%、尾款 ≥10% —— 用户的合同护栏 */
  ok('首期款比例 ≤ 30%（护栏）', S.payments[0].ratio <= 30, S.payments[0].ratio + '%');
  ok('尾款比例 ≥ 10%（护栏）', S.payments[S.payments.length - 1].ratio >= 10);

  console.log('\n========== 3. 阶段进度计算 ==========');
  const p1 = S.phases.find(p => p.id === 'p1');
  const s1 = Store.phaseStat(p1);
  eq('p1（拆改）全部完成', s1.pct, 100);
  eq('p1 状态 = done', s1.state, 'done');

  const p2 = S.phases.find(p => p.id === 'p2');
  const s2 = Store.phaseStat(p2);
  eq('p2（水电）4/6 完成', s2.done, 4);
  eq('p2 百分比 = 67%', s2.pct, 67);
  eq('p2 状态 = doing', s2.state, 'doing');

  const p3 = S.phases.find(p => p.id === 'p3');
  eq('p3（防水）状态 = todo', Store.phaseStat(p3).state, 'todo');

  const ov = Store.overall();
  const totalTasks = S.phases.reduce((a, p) => a + p.tasks.length, 0);
  eq('总任务数正确', ov.total, totalTasks);
  const doneTasks = S.phases.reduce((a, p) => a + p.tasks.filter(t => t.done).length, 0);
  eq('已完成任务数正确', ov.done, doneTasks);
  ok('总进度 0-100% 区间', ov.pct >= 0 && ov.pct <= 100, ov.pct + '%');

  console.log('\n========== 4. 勾选任务切换 ==========');
  const before = Store.phaseStat(p2).done;
  await Store.toggleTask('p2', 't205');
  const after = Store.phaseStat(p2).done;
  eq('勾选任务后完成数 +1', after, before + 1);
  await Store.toggleTask('p2', 't205');
  eq('取消勾选后回到原值', Store.phaseStat(p2).done, before);
  eq('取消勾选后日期被清空', p2.tasks.find(t => t.id === 't205').date, '');

  console.log('\n========== 5. 记账统计 ==========');
  const spent = Store.spentTotal();
  const manual = S.ledger.reduce((a, l) => a + l.amount, 0);
  eq('总支出 = 明细之和', spent, manual);
  ok('总支出 > 0', spent > 0, String(spent));

  const byCat = Store.ledgerByCat();
  ok('分类汇总非空', byCat.length > 0);
  const catSum = byCat.reduce((a, c) => a + c.spent, 0);
  eq('分类汇总 = 总支出', catSum, spent);

  const m = Store.spentByMonth();
  ok('按月汇总含 2026-09', Object.prototype.hasOwnProperty.call(m, '2026-09'));
  eq('按月汇总 = 总支出', Object.keys(m).reduce((a, k) => a + m[k], 0), spent);

  console.log('\n========== 6. 增项识别 ==========');
  ok('普通支出不标增项', Store.isExtra({ item: '瓷砖', note: '' }) === false);
  ok('备注含"增项"→ 识别', Store.isExtra({ item: '瓷砖', note: '增项' }) === true);
  ok('项目名含"补差"→ 识别', Store.isExtra({ item: '瓷砖胶补差', note: '' }) === true);
  ok('项目名含"超预算"→ 识别', Store.isExtra({ item: '超预算追加', note: '' }) === true);
  ok('自动记账不误判', Store.isExtra({ item: '二期款（水电验收）', note: '自动:二期款（水电验收）' }) === false);

  console.log('\n========== 7. 新增记账 ==========');
  const n0 = S.ledger.length;
  await Store.addLedger({ amount: 1234.5, cat: '主材', item: '测试瓷砖', date: '2026-10-10', payee: '测试', note: '' });
  eq('记账数 +1', S.ledger.length, n0 + 1);
  ok('金额被转成数字', typeof S.ledger[0].amount === 'number');
  eq('新记录排在最前', S.ledger[0].item, '测试瓷砖');
  await Store.delLedger(S.ledger[0].id);
  eq('删除后恢复', S.ledger.length, n0);

  console.log('\n========== 8. 付款勾选 → 自动记账（关键） ==========');
  const pay2 = S.payments.find(p => p.id === 'pay2');
  const ledN = S.ledger.length;
  const ledBefore = Store.spentTotal();

  await Store.togglePay('pay2');
  ok('标记已付后 paid=true', pay2.paid === true);
  ok('自动生成 1 笔支出', S.ledger.length === ledN + 1, `${ledN} -> ${S.ledger.length}`);
  const auto = S.ledger.find(l => l.note === '自动:' + pay2.name);
  ok('自动支出可识别', !!auto);
  eq('自动支出金额 = 付款金额', auto.amount, pay2.amount);
  eq('自动支出分类 = 半包施工费', auto.cat, '半包施工费');
  eq('总支出增加对应金额', Store.spentTotal(), ledBefore + pay2.amount);

  await Store.togglePay('pay2');  /* 再点一次取消 */
  eq('取消已付后记账被回滚', S.ledger.length, ledN);
  eq('取消后总支出恢复', Store.spentTotal(), ledBefore);

  console.log('\n========== 9. 采购状态与超支 ==========');
  const buy1 = S.buys.find(b => b.id === 'buy1');
  await Store.toggleBuy('buy1');
  ok('标记已买', buy1.bought === true);
  eq('未填实付价时默认用预算价', buy1.actualPrice, buy1.budget);
  await Store.editBuy('buy1', { actualPrice: buy1.budget + 300 });
  eq('已买金额按实付价算', Store.buyBoughtAmount(), buy1.budget + 300);
  await Store.toggleBuy('buy1');
  eq('取消已买', buy1.bought, false);

  console.log('\n========== 10. 验收清单 ==========');
  const c = S.checks.find(x => x.id === 'c1');
  await Store.toggleCheck('c1');
  ok('勾选验收', c.done === true);
  ok('自动记录验收日期', !!c.date, c.date);
  const cs = Store.checkStat();
  eq('验收统计 done=1', cs.done, 1);
  eq('验收总数', cs.total, 14);
  await Store.toggleCheck('c1');
  eq('取消后日期清空', S.checks.find(x => x.id === 'c1').date, '');

  console.log('\n========== 11. 采购到期提醒 ==========');
  const due = Store.dueBuys();
  ok('逾期/到期项非空（有 seed 日期）', due.length > 0, String(due.length));
  ok('已买的不会进"到期"列表', due.every(b => !b.bought));
  const soon = Store.soonBuys();
  ok('14 天内列表不含已买的', soon.every(b => !b.bought));

  console.log('\n========== 12. 备份导出/恢复 ==========');
  const json = await Store.exportJSON(false);
  ok('导出是合法 JSON', (() => { try { JSON.parse(json); return true; } catch (e) { return false; } })());
  const parsed = JSON.parse(json);
  eq('备份含 7 个阶段', parsed.phases.length, 7);
  eq('备份含 14 个验收项', parsed.checks.length, 14);
  eq('备份含 6 类预算', parsed.budgets.length, 6);

  /* 破坏数据后恢复 */
  const snapPhases = S.phases.length;
  S.phases = [];
  await Store.load();
  await Store.importJSON(json);
  eq('恢复后阶段数一致', Store._s.phases.length, snapPhases);

  console.log('\n========== 13. 边界情况 ==========');
  const c0 = await Store.addLedger({ amount: 0, cat: '主材', item: '', date: '' });
  ok('空金额被归零为 0', c0.amount === 0);
  ok('空日期自动补今天', /^\d{4}-\d{2}-\d{2}$/.test(c0.date), c0.date);
  await Store.delLedger(c0.id);

  const huge = await Store.addLedger({ amount: 9999999, cat: '其他杂费', item: '大额', date: '2026-10-10', payee: '', note: '' });
  ok('大额金额不溢出', Store.spentTotal() > 9999999);
  await Store.delLedger(huge.id);

  await Store.addTask('p3', '');
  eq('空任务名被忽略', S.phases.find(p => p.id === 'p3').tasks.length, 5);
  await Store.addTask('p3', '新任务X');
  eq('合法任务被添加', S.phases.find(p => p.id === 'p3').tasks.length, 6);

  console.log('\n========== 14. 预置预算合理性 ==========');
  const bSum = SEED.BUDGET.reduce((a, b) => a + b.budget, 0);
  ok('分类预算合计 = 总预算', bSum === S.meta.budgetTotal, `${bSum} vs ${S.meta.budgetTotal}`);
  ok('总预算金额合理（20-30 万）', S.meta.budgetTotal >= 200000 && S.meta.budgetTotal <= 300000, String(S.meta.budgetTotal));
  ok('半包预算落在真实区间 5.5-6.5 万',
    SEED.BUDGET.find(b => b.name === '半包施工费').budget >= 55000 &&
    SEED.BUDGET.find(b => b.name === '半包施工费').budget <= 65000,
    String(SEED.BUDGET.find(b => b.name === '半包施工费').budget));

  console.log('\n================================');
  console.log(`结果： ${pass} 通过, ${fail} 失败`);
  if (fail) { console.log('\n失败项：'); errors.forEach(e => console.log('  - ' + e)); process.exit(1); }
  else { console.log('🎉 全部通过'); }
})().catch(e => {
  console.error('\n💥 测试崩溃：', e);
  process.exit(1);
});
