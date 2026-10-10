/* 预置种子数据 —— 已按你家的真实情况填好（星都汇 90㎡ / 半包 / 11 项主材） */
(function (w) {
  'use strict';

  var TODAY = new Date().toISOString().slice(0, 10);

  function d(off) {
    var t = new Date();
    t.setDate(t.getDate() + off);
    return t.toISOString().slice(0, 10);
  }

  /* ---------- 项目 ---------- */
  var META = {
    id: 'project',
    name: '星都汇 90㎡ 装修',
    addr: '雨花区 · 中交D4区',
    areaBuild: 90,
    areaInner: 79.6,
    layout: '三房一厅一厨两卫 · 26楼边户',
    startDate: '2026-09-12',
    targetDate: '2026-12-20',
    budgetTotal: 265000,
    contractor: '宅师傅装饰（半包）',
    note: '预置数据已按合同与清单填好，请按实际进展增删'
  };

  /* ---------- 预算分类（合计 = META.budgetTotal，测试有校验） ---------- */
  var BUDGET = [
    { id: 'b_semi', name: '半包施工费', budget: 62400, color: '#c2703a', icon: '🔨' },
    { id: 'b_main', name: '主材', budget: 80000, color: '#3c6e9f', icon: '🧱' },
    { id: 'b_custom', name: '全屋定制柜', budget: 42000, color: '#2e8b6b', icon: '🚪' },
    { id: 'b_appliance', name: '家电', budget: 40000, color: '#8a6bb1', icon: '📺' },
    { id: 'b_furniture', name: '家具软装', budget: 25000, color: '#c9962e', icon: '🛋️' },
    { id: 'b_other', name: '其他杂费', budget: 15600, color: '#8f97a6', icon: '📦' }
  ];

  /* ---------- 装修阶段 ---------- */
  var PHASES = [
    {
      id: 'p1', name: '开工交底与拆改', icon: '🔨', days: '9/12 - 9/20',
      tasks: [
        { id: 't101', name: '开工交底（水电点位确认）', done: true, date: '2026-09-12' },
        { id: 't102', name: '成品保护、入户门/电梯保护', done: true, date: '2026-09-12' },
        { id: 't103', name: '拆除 2 处飘窗', done: true, date: '2026-09-14' },
        { id: 't104', name: '拆除主卧 1.2m 墙体', done: true, date: '2026-09-14' },
        { id: 't105', name: '垃圾清运（含上楼费）', done: true, date: '2026-09-16' },
        { id: 't106', name: '砌墙放线 + 植筋拍照留证', done: true, date: '2026-09-18' }
      ]
    },
    {
      id: 'p2', name: '水电改造', icon: '⚡', days: '9/13 - 10/05',
      tasks: [
        { id: 't201', name: '水电点位放线（开关插座/灯位确认）', done: true, date: '2026-09-13' },
        { id: 't202', name: '强弱电分槽布管（走顶）', done: true, date: '2026-09-18' },
        { id: 't203', name: '给水管热熔（日丰 PPR Φ25×3.5）', done: true, date: '2026-09-24' },
        { id: 't204', name: '水管打压测试（保压 30 分钟）', done: true, date: '2026-09-25' },
        { id: 't205', name: '底盒清点（约 65 个）并拍照', done: false, date: '' },
        { id: 't206', name: '水电验收（点位/线管拍照留证）', done: false, date: '' }
      ]
    },
    {
      id: 'p3', name: '防水工程', icon: '🛡️', days: '10/06 - 10/12',
      tasks: [
        { id: 't301', name: '卫生间墙地面防水（雨虹 100S）', done: false, date: '' },
        { id: 't302', name: '厨房阳台地面防水（45 元/㎡）', done: false, date: '' },
        { id: 't303', name: '飘窗防水（2 处 × 500）', done: false, date: '' },
        { id: 't304', name: '闭水试验 48 小时', done: false, date: '' },
        { id: 't305', name: '防水验收（楼下无渗漏 + 墙面返高）', done: false, date: '' }
      ]
    },
    {
      id: 'p4', name: '泥木工程', icon: '🧱', days: '10/13 - 11/05',
      tasks: [
        { id: 't401', name: '厨卫墙地砖铺贴（C1/C2 瓷砖胶 + 背胶）', done: false, date: '' },
        { id: 't402', name: '厨卫归方（800 元/间 × 2）', done: false, date: '' },
        { id: 't403', name: '飘窗回填（380 元/个 × 2）', done: false, date: '' },
        { id: 't404', name: '客厅边吊 / 窗帘盒 / 5% 平顶', done: false, date: '' },
        { id: 't405', name: '厨卫铝扣板吊顶安装', done: false, date: '' },
        { id: 't406', name: '泥木验收（空鼓≤5% / 接缝≤1mm）', done: false, date: '' }
      ]
    },
    {
      id: 'p5', name: '油漆工程', icon: '🎨', days: '11/06 - 11/20',
      tasks: [
        { id: 't501', name: '墙面基层处理（铲除/找平）', done: false, date: '' },
        { id: 't502', name: '腻子两遍打磨', done: false, date: '' },
        { id: 't503', name: '底漆 + 面漆（三棵树）', done: false, date: '' },
        { id: 't504', name: '阴阳角找直', done: false, date: '' }
      ]
    },
    {
      id: 'p6', name: '安装工程', icon: '🔧', days: '11/21 - 12/10',
      tasks: [
        { id: 't601', name: '卧室门 3 樘 + 浴室门 2 樘安装', done: false, date: '' },
        { id: 't602', name: '浴室柜 2 套 + 马桶 1 + 蹲便 1', done: false, date: '' },
        { id: 't603', name: '橱柜安装 + 台面复尺', done: false, date: '' },
        { id: 't604', name: '小米智能开关 4 个 + 灯具 + 插座', done: false, date: '' },
        { id: 't605', name: '窗帘轨道 + 智能电机 2 个', done: false, date: '' },
        { id: 't606', name: '铝合金踢脚线安装', done: false, date: '' }
      ]
    },
    {
      id: 'p7', name: '竣工验收与保洁', icon: '✅', days: '12/11 - 12/20',
      tasks: [
        { id: 't701', name: '美缝（包工包料，不含清缝）', done: false, date: '' },
        { id: 't702', name: '开荒保洁', done: false, date: '' },
        { id: 't703', name: '全屋验收清单逐项核对', done: false, date: '' },
        { id: 't704', name: '家电进场安装调试', done: false, date: '' }
      ]
    }
  ];

  /* ---------- 半包合同付款节点 ---------- */
  var PAYMENTS = [
    { id: 'pay1', name: '首期款（开工前）', ratio: 30, amount: 18720, dueDate: '2026-09-10', paidDate: '2026-09-10', paid: true, note: '合同约定 ≤30%' },
    { id: 'pay2', name: '二期款（水电验收）', ratio: 30, amount: 18720, dueDate: '2026-10-10', paidDate: '', paid: false, note: '⚠️ 今天到期，记得催票' },
    { id: 'pay3', name: '三期款（泥木验收）', ratio: 30, amount: 18720, dueDate: '2026-11-10', paidDate: '', paid: false, note: '' },
    { id: 'pay4', name: '尾款（竣工验收）', ratio: 10, amount: 6240, dueDate: '2026-12-20', paidDate: '', paid: false, note: '合同约定 ≥10%' }
  ];

  /* ---------- 11 项主材采购（含时间节点） ---------- */
  var BUYS = [
    { id: 'buy1', name: '封窗阳台（3-4m）', spec: '断桥铝 + 双钢化', budget: 5000, bought: false, planDate: '2026-09-25', actualPrice: 0, vendor: '', note: '⚠️ 先确认电梯能容纳玻璃最大尺寸' },
    { id: 'buy2', name: '瓷砖 柔光砖 1200×600', spec: '通铺，客餐厅+卧室', budget: 14000, bought: false, planDate: '2026-10-08', actualPrice: 0, vendor: '', note: '含厨卫大砖上墙辅料' },
    { id: 'buy3', name: '卧室门 3 樘 + 浴室门 2 樘', spec: '实木复合', budget: 9000, bought: false, planDate: '2026-11-15', actualPrice: 0, vendor: '', note: '' },
    { id: 'buy4', name: '厨卫铝扣板吊顶', spec: '300×300', budget: 2200, bought: false, planDate: '2026-11-05', actualPrice: 0, vendor: '', note: '' },
    { id: 'buy5', name: '浴室柜 2 套', spec: '岩板/实木', budget: 5000, bought: false, planDate: '2026-11-25', actualPrice: 0, vendor: '', note: '' },
    { id: 'buy6', name: '马桶 1 + 蹲便 1', spec: '箭牌/九牧', budget: 4500, bought: false, planDate: '2026-11-25', actualPrice: 0, vendor: '', note: '' },
    { id: 'buy7', name: '小米智能开关 4 个 + 灯 + 插座', spec: '全屋智能', budget: 6000, bought: false, planDate: '2026-12-05', actualPrice: 0, vendor: '', note: '智能点位需与水电定位对齐' },
    { id: 'buy8', name: '小米 AP 路由', spec: '全屋组网', budget: 1200, bought: false, planDate: '2026-12-05', actualPrice: 0, vendor: '', note: '' },
    { id: 'buy9', name: '窗帘轨道 + 智能电机 2 个', spec: '静音款', budget: 3000, bought: false, planDate: '2026-12-08', actualPrice: 0, vendor: '', note: '' },
    { id: 'buy10', name: '铝合金踢脚线', spec: '同色系', budget: 1500, bought: false, planDate: '2026-12-08', actualPrice: 0, vendor: '', note: '' },
    { id: 'buy11', name: '美缝（包工包料）', spec: '环氧彩砂', budget: 3500, bought: false, planDate: '2026-12-12', actualPrice: 0, vendor: '', note: '不含清缝' }
  ];

  /* ---------- 量化验收清单 ---------- */
  var CHECKS = [
    { id: 'c1', group: '隐蔽工程', name: '水管打压测试', std: '保压 30 分钟压力表不下降，拍照留证', done: false, date: '', photos: 0 },
    { id: 'c2', group: '隐蔽工程', name: '水管走顶拍照', std: '日丰三层瓷芯抗菌 PPR Φ25×3.5，走顶固定间距 ≤60cm', done: false, date: '', photos: 0 },
    { id: 'c3', group: '隐蔽工程', name: '砌墙植筋留证', std: '植筋间距 ≤60cm，每面墙不少于 2 处，浇筑前拍照', done: false, date: '', photos: 0 },
    { id: 'c4', group: '隐蔽工程', name: '底盒数量核对', std: '底盒数 = 建筑面积 × 0.7 ≈ 65 个，清点无缺', done: false, date: '', photos: 0 },
    { id: 'c5', group: '防水工程', name: '闭水试验 48 小时', std: '蓄水深度 ≥2cm，48h 无渗漏（楼下天花无水印）', done: false, date: '', photos: 0 },
    { id: 'c6', group: '防水工程', name: '防水墙面返高', std: '淋浴区返高 ≥1.8m，其余墙面 ≥0.3m', done: false, date: '', photos: 0 },
    { id: 'c7', group: '泥木工程', name: '瓷砖空鼓率', std: '单块空鼓面积 ≤5%，总空鼓率 ≤5%（敲击全检）', done: false, date: '', photos: 0 },
    { id: 'c8', group: '泥木工程', name: '瓷砖接缝', std: '平直通缝，接缝宽度 ≤1mm，高差 ≤0.5mm', done: false, date: '', photos: 0 },
    { id: 'c9', group: '泥木工程', name: '大砖上墙工艺', std: '使用 C2 级瓷砖胶 + 背胶，不是水泥砂浆', done: false, date: '', photos: 0 },
    { id: 'c10', group: '油漆工程', name: '墙面平整度', std: '2m 靠尺误差 ≤3mm，无流坠、无色差', done: false, date: '', photos: 0 },
    { id: 'c11', group: '安装工程', name: '门/柜体缝隙', std: '门缝上下左右均匀，柜门无明显变形', done: false, date: '', photos: 0 },
    { id: 'c12', group: '竣工验收', name: '给排水通畅测试', std: '全屋龙头、马桶、蹲便逐个通水，5 分钟内无渗漏', done: false, date: '', photos: 0 },
    { id: 'c13', group: '竣工验收', name: '电路通电测试', std: '每个插座用测电笔验证火零地，接地连续', done: false, date: '', photos: 0 },
    { id: 'c14', group: '竣工验收', name: '甲醛/空气质量', std: 'CMA 检测报告，甲醛 ≤0.08mg/m³', done: false, date: '', photos: 0 }
  ];

  /* ---------- 示例记账（可一键清空） ---------- */
  var LEDGER = [
    { id: 'l1', date: '2026-09-10', cat: '半包施工费', item: '首期款 30%', amount: 18720, payee: '宅师傅装饰', note: '合同首款', photos: 0 },
    { id: 'l2', date: '2026-09-16', cat: '其他杂费', item: '垃圾清运 + 上楼费', amount: 1500, payee: '施工队', note: '26 楼电梯房，上楼费待确认', photos: 0 },
    { id: 'l3', date: '2026-09-25', cat: '半包施工费', item: '水管材料费', amount: 3200, payee: '施工队', note: '日丰 PPR 自采', photos: 0 }
  ];

  w.SEED = {
    META: META, BUDGET: BUDGET, PHASES: PHASES, PAYMENTS: PAYMENTS,
    BUYS: BUYS, CHECKS: CHECKS, LEDGER: LEDGER, TODAY: TODAY, D: d
  };
})(window);
