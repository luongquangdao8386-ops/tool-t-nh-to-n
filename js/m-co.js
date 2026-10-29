/* Nhóm CƠ – NHIỆT – TIỆN ÍCH: C-01 … C-08 */
(function () {
  'use strict';
  const { U } = CD;
  const f = U.f, SQ3 = U.SQ3;
  const guard = (cond, msg) => { if (cond) throw new Error(msg); };
  const RT_KW = 3.517;
  const pumpKw = (m3h, H, eta, rho = 1000) => rho * 9.81 * (m3h / 3600) * H / eta / 1000;
  const dnFor = (m3h, vel) => {
    const d = Math.sqrt(4 * (m3h / 3600) / (Math.PI * vel)) * 1000;
    const p = U.pickDN(d);
    return { d, dn: p ? p[0] : null, id: p ? p[1] : null, v: p ? U.velocity(m3h, p[1]) : null };
  };
  const dnTxt = (x) => (x.dn ? `DN${x.dn}` : '> DN600');

  // ================= C-01 Hệ thống chiller =================
  const CH_RT = [20, 30, 40, 50, 60, 80, 100, 120, 150, 180, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 1000, 1200, 1500, 2000];
  CD.register({
    id: 'chiller', group: 'co', code: 'C-01', title: 'Hệ thống chiller', short: 'RT, nước lạnh, tháp giải nhiệt, bơm.',
    desc: 'Công suất lạnh, số lượng chiller, điện năng, lưu lượng nước lạnh / giải nhiệt, bơm, tháp giải nhiệt, ống chính và nước bổ sung.',
    sf: 1.15, sfNote: 'Tải lạnh thiết kế Qtk = Q × k.',
    inputs: [
      { id: 'm', label: 'Dữ liệu tải lạnh', type: 'sel', value: 'kw', opts: [['kw', 'Biết tải lạnh (kW)'], ['rt', 'Biết tải lạnh (RT)'], ['area', 'Theo diện tích']] },
      { id: 'q', label: 'Tải lạnh', unit: 'kW', value: 1400, show: (v) => v.m === 'kw' },
      { id: 'rt', label: 'Tải lạnh', unit: 'RT', value: 400, show: (v) => v.m === 'rt' },
      { id: 'a', label: 'Diện tích điều hoà', unit: 'm²', value: 4000, show: (v) => v.m === 'area' },
      { id: 'qd', label: 'Mật độ tải lạnh', unit: 'W/m²', value: 300, show: (v) => v.m === 'area', hint: 'Văn phòng 120–180; xưởng in, cắt, dán 250–350; phòng sạch > 400' },
      { id: 'type', label: 'Loại chiller', type: 'sel', value: 'water', opts: [['water', 'Giải nhiệt nước'], ['air', 'Giải nhiệt gió']] },
      { id: 'copw', label: 'COP', value: 5.8, show: (v) => v.type === 'water', hint: 'Giải nhiệt nước 5,5–6,5' },
      { id: 'copa', label: 'COP', value: 3.0, show: (v) => v.type === 'air', hint: 'Giải nhiệt gió 2,8–3,3' },
      { id: 'n', label: 'Số chiller vận hành', value: 2 },
      { id: 'sp', label: 'Máy dự phòng', type: 'sel', value: '1', opts: [['1', 'Thêm 1 máy dự phòng (N+1)'], ['0', 'Không dự phòng']] },
      { id: 'dtc', label: 'ΔT nước lạnh', unit: '°C', value: 5, hint: 'Thường 7/12 °C' },
      { id: 'dtw', label: 'ΔT nước giải nhiệt', unit: '°C', value: 5, show: (v) => v.type === 'water', hint: 'Thường 32/37 °C' },
      { id: 'hc', label: 'Cột áp bơm nước lạnh', unit: 'm', value: 32 },
      { id: 'hw', label: 'Cột áp bơm giải nhiệt', unit: 'm', value: 25, show: (v) => v.type === 'water' },
      { id: 'vel', label: 'Vận tốc nước ống chính', unit: 'm/s', value: 2 },
      { id: 'coc', label: 'Chu kỳ cô đặc tháp', value: 4, show: (v) => v.type === 'water' }
    ],
    calc(v, k) {
      const Q = v.m === 'kw' ? v.q : v.m === 'rt' ? v.rt * RT_KW : v.a * v.qd / 1000;
      const water = v.type === 'water';
      const cop = water ? v.copw : v.copa;
      guard(Q <= 0 || cop <= 0 || v.n < 1, 'Tải lạnh, COP và số máy phải lớn hơn 0.');
      const n = Math.round(v.n);
      const Qtk = Q * k, RT = Qtk / RT_KW;
      const unit = U.pick(CH_RT, RT / n);
      guard(!unit, 'Mỗi máy vượt 2000 RT – tăng số chiller.');
      const nTot = n + Number(v.sp);
      const kind = unit < 150 ? (water ? 'Trục vít / scroll' : 'Scroll giải nhiệt gió') : unit <= 500 ? 'Trục vít (screw)' : 'Ly tâm (centrifugal)';
      const Pin = Qtk / cop, PinU = unit * RT_KW / cop;
      const Iu = PinU * 1000 / (SQ3 * 400 * 0.9);
      const brk = U.pick(U.STD.breaker, Iu * 1.25);
      const fc = Qtk * 0.86 / v.dtc;
      const pc = pumpKw(fc / n, v.hc, 0.75);
      const pipeC = dnFor(fc, v.vel);
      const tiles = [
        { l: 'Chiller chọn', v: `${nTot} × ${unit}`, u: 'RT', main: true, s: `${n} chạy${Number(v.sp) ? ' + 1 dự phòng' : ''} · ${kind} · ${f(unit * RT_KW, 0)} kW lạnh/máy` },
        { l: 'Tải lạnh thiết kế', v: f(RT, 0), u: 'RT', s: `${f(Qtk, 0)} kW · ${f(Qtk * 3412 / 1e6, 2)} triệu BTU/h` },
        { l: 'Điện năng chiller', v: f(Pin, 0), u: 'kW', s: `${f(Pin / RT, 2)} kW/RT · ${f(PinU, 0)} kW/máy` },
        { l: 'Aptomat mỗi chiller', v: `${brk}`, u: 'A', s: `I ≈ ${f(Iu, 0)} A` },
        { l: 'Lưu lượng nước lạnh', v: f(fc, 0), u: 'm³/h', s: `${f(fc / 3.6, 1)} L/s · ${f(fc * 4.403, 0)} GPM` },
        { l: 'Bơm nước lạnh (mỗi bơm)', v: `${f(U.pick(U.STD.motor, pc))}`, u: 'kW', s: `${f(fc / n, 0)} m³/h × ${f(v.hc)} m` },
        { l: 'Ống nước lạnh chính', v: dnTxt(pipeC), s: `v thực = ${f(pipeC.v, 2)} m/s` }
      ];
      const steps = [
        ['Tải lạnh', v.m === 'area' ? 'Q = A × q' : v.m === 'rt' ? 'Q = RT × 3,517' : 'Q (nhập)', `${f(Q, 1)} kW`],
        ['Tải thiết kế', 'Qtk = Q × k; RT = Qtk / 3,517', `${f(RT, 1)} RT`],
        ['Công suất điện', 'P = Qtk / COP', `${f(Pin, 1)} kW`],
        ['Lưu lượng nước lạnh', 'G = Qtk × 0,86 / ΔT', `${f(fc, 1)} m³/h`],
        ['Công suất bơm', 'P = ρ·g·G·H / η (η = 0,75)', `${f(pc, 2)} kW`]
      ];
      if (water) {
        const Qc = Qtk + Pin, fw = Qc * 0.86 / v.dtw;
        const pw = pumpKw(fw / n, v.hw, 0.75);
        const E = fw * 0.00153 * v.dtw, B = E / Math.max(v.coc - 1, 0.5), D = fw * 0.0002;
        const mk = E + B + D;
        tiles.push(
          { l: 'Tháp giải nhiệt', v: f(Qc / 4.396, 0), u: 'tấn tháp', s: `Thải nhiệt ${f(Qc, 0)} kW` },
          { l: 'Lưu lượng nước giải nhiệt', v: f(fw, 0), u: 'm³/h', s: `Bơm ${f(U.pick(U.STD.motor, pw))} kW/bơm` },
          { l: 'Ống giải nhiệt chính', v: dnTxt(dnFor(fw, v.vel)) },
          { l: 'Nước bổ sung tháp', v: f(mk, 1), u: 'm³/h', s: `≈ ${f(mk * 24, 0)} m³/ngày` }
        );
        steps.push(
          ['Nhiệt thải bình ngưng', 'Qc = Qtk + P', `${f(Qc, 1)} kW`],
          ['Lưu lượng giải nhiệt', 'Gw = Qc × 0,86 / ΔTw', `${f(fw, 1)} m³/h`],
          ['Bay hơi', 'E = Gw × 0,00153 × ΔTw', `${f(E, 2)} m³/h`],
          ['Xả đáy + cuốn theo', 'B = E/(COC − 1); D = 0,02 % Gw', `${f(B + D, 2)} m³/h`]
        );
      }
      return {
        tiles,
        checks: [
          [pipeC.v >= 1 && pipeC.v <= 3 ? 'ok' : 'warn', `Vận tốc ống chính ${f(pipeC.v, 2)} m/s (khuyến nghị 1,2–3 m/s)`],
          [Pin / RT <= (water ? 0.7 : 1.25) ? 'ok' : 'warn', `Hiệu suất ${f(Pin / RT, 2)} kW/RT (tốt: nước ≤ 0,65; gió ≤ 1,2)`]
        ],
        steps,
        notes: [
          '1 RT = 3,517 kW = 12.000 BTU/h; 1 tấn tháp giải nhiệt = 15.000 BTU/h = 4,396 kW.',
          'Nên dùng bơm biến tần cho hệ thống nước lạnh lưu lượng thay đổi (VPF) và điều khiển chiller theo tải (chiller plant manager).',
          'Nước tháp giải nhiệt cần xử lý hóa chất chống cáu cặn, rêu tảo và kiểm soát Legionella.'
        ]
      };
    }
  });

  // ================= C-02 Điều hoà treo tường =================
  const ROOM = { off: ['Văn phòng', 400], meet: ['Phòng họp', 450], ctrl: ['Phòng điều khiển / tủ điện', 500], srv: ['Phòng server', 600], rest: ['Phòng nghỉ, ký túc', 350] };
  const SUN = { n: ['Bình thường', 1], w: ['Hướng Tây / mái tôn', 1.15], h: ['Gần nguồn nhiệt (máy xeo, lò hơi)', 1.25] };
  const WALL = [9000, 12000, 18000, 24000];
  const HP = { 9000: '1 HP', 12000: '1,5 HP', 18000: '2 HP', 24000: '2,5 HP' };
  const PIPE = { 9000: '6,35 / 9,52', 12000: '6,35 / 9,52', 18000: '6,35 / 12,7', 24000: '6,35 / 15,88' };
  CD.register({
    id: 'dieu-hoa', group: 'co', code: 'C-02', title: 'Điều hoà treo tường', short: 'BTU theo phòng, aptomat, ống đồng.',
    desc: 'Tải lạnh phòng theo diện tích, chiều cao, người, thiết bị, hướng nắng; chọn số máy, BTU, HP, aptomat, dây và ống đồng.',
    sf: 1.1, sfNote: 'Tải lạnh thiết kế = Q × k.',
    inputs: [
      { id: 'L', label: 'Chiều dài phòng', unit: 'm', value: 6 },
      { id: 'W', label: 'Chiều rộng phòng', unit: 'm', value: 5 },
      { id: 'H', label: 'Chiều cao trần', unit: 'm', value: 3.2 },
      { id: 'room', label: 'Loại phòng', type: 'sel', value: 'off', opts: Object.entries(ROOM).map(([a, b]) => [a, `${b[0]} (${b[1]} BTU/m²)`]) },
      { id: 'pp', label: 'Số người', value: 6 },
      { id: 'eq', label: 'Thiết bị toả nhiệt', unit: 'W', value: 1200, hint: 'Máy tính ≈ 150 W/bộ, máy in ≈ 300 W' },
      { id: 'sun', label: 'Điều kiện nắng / nhiệt', type: 'sel', value: 'n', opts: Object.entries(SUN).map(([a, b]) => [a, b[0]]) }
    ],
    calc(v, k) {
      guard(v.L <= 0 || v.W <= 0 || v.H <= 0, 'Kích thước phòng phải lớn hơn 0.');
      const A = v.L * v.W, hf = Math.max(1, v.H / 3);
      const Qa = A * ROOM[v.room][1] * hf, Qp = v.pp * 450, Qe = v.eq * 3.412;
      const Q = (Qa + Qp + Qe) * SUN[v.sun][1], Qtk = Q * k;
      let n = Math.max(1, Math.ceil(Qtk / 24000));
      const unit = U.pick(WALL, Qtk / n);
      const Pin = unit * 0.000293 / 3.2;
      const I = Pin * 1000 / (220 * 0.9);
      const brk = U.pick(U.STD.breaker, Math.max(10, 1.3 * I * k));
      const cab = U.cableFor(1.3 * I * k / 0.91, { pha: '1', ins: 'PVC' });
      const S = Math.max(2.5, cab.S);
      const big = Qtk > 4 * 24000;
      return {
        tiles: [
          { l: 'Điều hoà treo tường', v: `${n} × ${f(unit, 0)}`, u: 'BTU/h', main: true, s: `${n} máy ${HP[unit]} · tổng ${f(n * unit, 0)} BTU/h` },
          { l: 'Tải lạnh thiết kế', v: f(Qtk, 0), u: 'BTU/h', s: `${f(Qtk * 0.000293, 2)} kW · ${f(Qtk / A, 0)} BTU/m²` },
          { l: 'Điện năng mỗi máy', v: f(Pin, 2), u: 'kW', s: `I ≈ ${f(I, 1)} A (1 pha 220 V)` },
          { l: 'Aptomat mỗi máy', v: `${brk}`, u: 'A', s: 'MCB 1P+N hoặc 2P, đường cong C' },
          { l: 'Dây cấp nguồn', v: `${f(S)}`, u: 'mm²', s: 'Cu/PVC, 2 lõi + tiếp địa' },
          { l: 'Ống đồng lỏng / hơi', v: PIPE[unit], u: 'mm', s: 'Ống nước ngưng PVC Ø21' }
        ],
        checks: [
          [big ? 'warn' : 'ok', big ? 'Tải lớn: cân nhắc âm trần cassette, tủ đứng hoặc VRV thay nhiều máy treo tường.' : 'Phù hợp dùng máy treo tường.'],
          [v.room === 'srv' || v.room === 'ctrl' ? 'warn' : 'ok', v.room === 'srv' || v.room === 'ctrl' ? 'Phòng chạy 24/7: thêm 1 máy dự phòng (N+1) chạy luân phiên, ưu tiên điều hoà chính xác.' : 'Phòng làm việc theo giờ hành chính.']
        ],
        steps: [
          ['Diện tích', 'A = D × R', `${f(A, 1)} m²`],
          ['Tải theo diện tích', `Qa = A × ${ROOM[v.room][1]} × max(1; H/3)`, `${f(Qa, 0)} BTU/h`],
          ['Tải do người', 'Qp = số người × 450 BTU/h', `${f(Qp, 0)} BTU/h`],
          ['Tải do thiết bị', 'Qe = W × 3,412', `${f(Qe, 0)} BTU/h`],
          ['Hệ số nắng / nhiệt', SUN[v.sun][0], f(SUN[v.sun][1], 2)],
          ['Tải thiết kế', 'Qtk = (Qa + Qp + Qe) × hệ số × k', `${f(Qtk, 0)} BTU/h`]
        ],
        notes: [
          'Quy đổi thường dùng: 1 HP ≈ 9.000 BTU/h; 1 kW lạnh = 3.412 BTU/h.',
          'Ưu tiên máy inverter, môi chất R32; khoảng cách dàn nóng – dàn lạnh nên ≤ 15 m, chênh cao ≤ 10 m.',
          'Phòng tủ điện, phòng điều khiển ở xưởng giấy nhiều bụi: vệ sinh lưới lọc hằng tháng.'
        ]
      };
    }
  });

  // ================= C-03 Khí nén =================
  const TANK = [300, 500, 1000, 1500, 2000, 3000, 4000, 5000, 6000, 8000, 10000, 15000, 20000];
  CD.register({
    id: 'khi-nen', group: 'co', code: 'C-03', title: 'Hệ thống khí nén', short: 'Máy nén, bình chứa, ống chính.',
    desc: 'Lưu lượng máy nén theo nhu cầu, rò rỉ, dự phòng; công suất máy nén, bình chứa, đường ống chính, máy sấy, chi phí điện năng.',
    sf: 1.15, sfNote: 'Lưu lượng thiết kế = nhu cầu × đồng thời × (1 + rò rỉ) × (1 + dự phòng) × k.',
    inputs: [
      { id: 'q', label: 'Tổng nhu cầu thiết bị', unit: 'm³/min', value: 18, hint: 'Cộng FAD các xi lanh, súng thổi, máy xeo, máy in…' },
      { id: 'kdt', label: 'Hệ số sử dụng đồng thời', value: 0.75 },
      { id: 'leak', label: 'Rò rỉ', unit: '%', value: 10 },
      { id: 'dp', label: 'Dự phòng phát triển', unit: '%', value: 20 },
      { id: 'p', label: 'Áp suất làm việc tại thiết bị', unit: 'bar', value: 6 },
      { id: 'dpd', label: 'Tổn thất qua lọc, sấy, ống', unit: 'bar', value: 1 },
      { id: 'n', label: 'Số máy nén vận hành', value: 2 },
      { id: 'sp', label: 'Suất tiêu hao điện ở 7 bar', unit: 'kW/(m³/min)', value: 6.3, hint: 'Trục vít ngâm dầu 6,0–6,8' },
      { id: 'lp', label: 'Chiều dài ống chính', unit: 'm', value: 200 },
      { id: 'dpl', label: 'Tụt áp ống cho phép', unit: 'bar', value: 0.1 },
      { id: 'h', label: 'Giờ chạy mỗi năm', unit: 'h', value: 7000 },
      { id: 'price', label: 'Giá điện bình quân', unit: 'đ/kWh', value: 1900 }
    ],
    calc(v, k) {
      guard(v.n < 1 || v.q <= 0, 'Nhu cầu và số máy nén phải lớn hơn 0.');
      const n = Math.round(v.n);
      const Qtk = v.q * v.kdt * (1 + v.leak / 100) * (1 + v.dp / 100) * k;
      const qs = Qtk * 1000 / 60;
      const pc = v.p + v.dpd;
      const spA = v.sp * (1 + 0.07 * (pc - 7));
      const kw = Qtk * spA, kwU = U.pick(U.STD.motor, kw / n);
      const qcU = qs / n;
      const V = 0.25 * qcU * 1 / ((1 / 30) * 0.5);
      const tank = U.pick(TANK, V) || Math.ceil(V / 1000) * 1000;
      const Leq = v.lp * 1.5, pa = v.p + 1;
      const d = Math.pow(450 * Math.pow(qs, 1.85) * Leq / (v.dpl * pa), 0.2);
      const dn = U.pickDN(d);
      const kwh = kw * v.h, cost = kwh * v.price;
      const leakCost = cost * (v.leak / 100) / (1 + v.leak / 100);
      return {
        tiles: [
          { l: 'Lưu lượng thiết kế', v: f(Qtk, 1), u: 'm³/min', main: true, s: `${f(qs, 0)} L/s · ${f(Qtk * 35.315, 0)} CFM · áp đẩy ${f(pc, 1)} bar` },
          { l: 'Máy nén chọn', v: `${n} × ${f(kwU)}`, u: 'kW', s: `+ 1 máy dự phòng · ${f(Qtk / n, 1)} m³/min/máy` },
          { l: 'Bình chứa', v: f(tank, 0), u: 'lít', s: `Tính toán ${f(V, 0)} L (máy chạy có tải/không tải)` },
          { l: 'Ống chính', v: dn ? `DN${dn[0]}` : '> DN600', s: `d tính = ${f(d, 0)} mm` },
          { l: 'Máy sấy lạnh', v: `≥ ${f(Qtk / 0.8, 1)}`, u: 'm³/min', s: 'Đã hiệu chỉnh nhiệt độ 35–40 °C' },
          { l: 'Điện năng / năm', v: f(kwh / 1000, 0), u: 'MWh', s: `≈ ${f(cost / 1e9, 2)} tỷ đồng` },
          { l: 'Chi phí do rò rỉ', v: f(leakCost / 1e6, 0), u: 'triệu đ/năm' }
        ],
        checks: [
          [v.leak <= 10 ? 'ok' : 'warn', `Rò rỉ ${f(v.leak)} % ${v.leak > 10 ? '– nên dò rò rỉ bằng thiết bị siêu âm, mục tiêu < 10 %' : 'trong mức chấp nhận'}`],
          [pc <= 7.5 ? 'ok' : 'warn', `Áp đẩy ${f(pc, 1)} bar – mỗi 1 bar tăng thêm tốn ≈ 7 % điện năng`],
          ['ok', `Thu hồi nhiệt máy nén có thể lấy ≈ ${f(kw * 0.7, 0)} kW để sấy hoặc gia nhiệt nước nồi hơi`]
        ],
        steps: [
          ['Lưu lượng thiết kế', 'Q = ΣQ·Kđt·(1+rò rỉ)·(1+dp)·k', `${f(Qtk, 2)} m³/min`],
          ['Suất tiêu hao hiệu chỉnh', 'SP = SP7·(1 + 0,07·(p − 7))', `${f(spA, 2)} kW/(m³/min)`],
          ['Công suất máy nén', 'P = Q × SP', `${f(kw, 1)} kW`],
          ['Bình chứa', 'V = 0,25·qc·p1 / (fmax·Δp), fmax = 1/30 s⁻¹, Δp = 0,5 bar', `${f(V, 0)} L`],
          ['Đường kính ống', 'd = (450·qc^1,85·L / (Δp·p))^(1/5), L = 1,5 × ống thẳng', `${f(d, 1)} mm`]
        ],
        notes: [
          'Máy nén biến tần (VSD) giảm 20–35 % điện năng khi nhu cầu dao động; bình chứa có thể nhỏ hơn.',
          'Ống chính nên đi mạch vòng, dốc 1–2 % về phía bẫy nước, nhánh lấy khí từ đỉnh ống.',
          'Phòng máy nén cần thông gió đủ thải ≈ 90 % công suất điện thành nhiệt (xem C-04, phương pháp theo nhiệt).'
        ]
      };
    }
  });

  // ================= C-04 Hút khí thải / thông gió =================
  CD.register({
    id: 'khi-thai', group: 'co', code: 'C-04', title: 'Hút khí thải & thông gió', short: 'Lưu lượng gió, quạt, ống gió.',
    desc: 'Lưu lượng gió theo bội số trao đổi, theo nhiệt thải hoặc theo chụp hút; chọn quạt, công suất động cơ, kích thước ống gió.',
    sf: 1.15, sfNote: 'Lưu lượng thiết kế = Q × k.',
    inputs: [
      { id: 'm', label: 'Phương pháp tính', type: 'sel', value: 'ach', opts: [['ach', 'Bội số trao đổi không khí'], ['heat', 'Theo nhiệt cần thải'], ['hood', 'Theo chụp hút cục bộ']] },
      { id: 'L', label: 'Chiều dài', unit: 'm', value: 60, show: (v) => v.m === 'ach' },
      { id: 'W', label: 'Chiều rộng', unit: 'm', value: 30, show: (v) => v.m === 'ach' },
      { id: 'H', label: 'Chiều cao', unit: 'm', value: 9, show: (v) => v.m === 'ach' },
      { id: 'ach', label: 'Bội số trao đổi', unit: 'lần/h', value: 8, show: (v) => v.m === 'ach', hint: 'Xưởng in, dán, cắt 8–12; kho giấy 4–6; nhà vệ sinh 10–15; phòng sạc ắc quy 6–12' },
      { id: 'heat', label: 'Nhiệt cần thải', unit: 'kW', value: 150, show: (v) => v.m === 'heat', hint: 'Phòng máy nén ≈ 90 % kW máy; phòng MBA ≈ tổn thất MBA' },
      { id: 'dt', label: 'Chênh nhiệt độ cho phép', unit: '°C', value: 5, show: (v) => v.m === 'heat' },
      { id: 'ha', label: 'Diện tích miệng chụp', unit: 'm²', value: 1.2, show: (v) => v.m === 'hood' },
      { id: 'hv', label: 'Vận tốc hút tại miệng', unit: 'm/s', value: 0.75, show: (v) => v.m === 'hood', hint: 'Hơi dung môi 0,5–1; bụi giấy 1–2,5' },
      { id: 'hn', label: 'Số chụp hút', value: 4, show: (v) => v.m === 'hood' },
      { id: 'n', label: 'Số quạt', value: 4 },
      { id: 'dps', label: 'Cột áp quạt', unit: 'Pa', value: 400 },
      { id: 'eta', label: 'Hiệu suất quạt', value: 0.65 },
      { id: 'vd', label: 'Vận tốc gió ống chính', unit: 'm/s', value: 10, hint: 'Thông gió 8–12; hút bụi giấy 18–22' }
    ],
    calc(v, k) {
      guard(v.n < 1 || !(v.eta > 0 && v.eta <= 1), 'Số quạt ≥ 1 và hiệu suất trong khoảng 0–1.');
      let Q, how;
      if (v.m === 'ach') { Q = v.L * v.W * v.H * v.ach; how = `V × ACH = ${f(v.L * v.W * v.H, 0)} m³ × ${f(v.ach)}`; }
      else if (v.m === 'heat') { guard(v.dt <= 0, 'Chênh nhiệt độ phải lớn hơn 0.'); Q = 3600 * v.heat / (1.2 * 1.005 * v.dt); how = 'Q = 3600·P / (ρ·cp·ΔT)'; }
      else { Q = 3600 * v.ha * v.hv * v.hn; how = 'Q = 3600·A·v·số chụp'; }
      const n = Math.round(v.n);
      const Qtk = Q * k, Qf = Qtk / n;
      const kwF = Qf / 3600 * v.dps / v.eta / 1000;
      const mot = U.pick(U.STD.motor, kwF * 1.15);
      const A = Qtk / 3600 / v.vd;
      const D = Math.ceil(Math.sqrt(4 * A / Math.PI) * 1000 / 50) * 50;
      const h = Math.ceil(Math.sqrt(A / 2) * 1000 / 50) * 50, w = Math.ceil(A / (h / 1000) * 1000 / 50) * 50;
      const Af = Qf / 3600 / v.vd;
      const Df = Math.ceil(Math.sqrt(4 * Af / Math.PI) * 1000 / 50) * 50;
      return {
        tiles: [
          { l: 'Lưu lượng thiết kế', v: f(Qtk, 0), u: 'm³/h', main: true, s: `${f(Qtk * 0.5886, 0)} CFM · ${f(Qtk / 3600, 2)} m³/s` },
          { l: 'Quạt chọn', v: `${n} × ${f(Qf, 0)}`, u: 'm³/h', s: `Cột áp ${f(v.dps)} Pa` },
          { l: 'Động cơ mỗi quạt', v: `${f(mot)}`, u: 'kW', s: `Công suất trục ${f(kwF, 2)} kW` },
          { l: 'Ống chính tròn', v: `Ø${D}`, u: 'mm' },
          { l: 'Ống chính chữ nhật', v: `${w} × ${h}`, u: 'mm' },
          { l: 'Ống nhánh mỗi quạt', v: `Ø${Df}`, u: 'mm' },
          { l: 'Gió bù (cấp tươi)', v: f(Qtk * 0.9, 0), u: 'm³/h', s: '≈ 90 % gió thải, giữ áp âm nhẹ' }
        ],
        checks: [
          v.vd >= 15 ? ['ok', 'Vận tốc cao phù hợp hút bụi (tránh lắng bụi giấy trong ống).']
            : v.vd > 12 ? ['warn', 'Vận tốc 12–15 m/s: hơi ồn cho thông gió chung, lại thấp cho hút bụi.']
              : ['ok', 'Vận tốc phù hợp thông gió chung, độ ồn thấp.'],
          ['ok', 'Khí thải lò hơi, khu sấy: phải đạt quy chuẩn khí thải công nghiệp QCVN 19/BTNMT trước khi xả.']
        ],
        steps: [
          ['Lưu lượng', how, `${f(Q, 0)} m³/h`],
          ['Lưu lượng thiết kế', 'Qtk = Q × k', `${f(Qtk, 0)} m³/h`],
          ['Công suất trục quạt', 'P = Q·ΔP / η', `${f(kwF, 2)} kW`],
          ['Động cơ', 'Pđc ≥ 1,15 × P trục', `${f(mot)} kW`],
          ['Tiết diện ống chính', 'A = Q / v', `${f(A, 3)} m²`]
        ],
        notes: [
          'Hút bụi giấy: dùng quạt cánh hướng tâm hoặc cánh mở chống bám, có lọc túi hoặc cyclone; chống cháy nổ bụi theo NFPA 664 nếu bụi mịn.',
          'Quạt nên lắp biến tần để chỉnh lưu lượng theo thực tế, tiết kiệm điện theo luật lập phương.',
          'Kiểm tra cân bằng gió và đo lưu lượng thực tế sau lắp đặt.'
        ]
      };
    }
  });

  // ================= C-05 Bơm & biến tần =================
  CD.register({
    id: 'bom', group: 'co', code: 'C-05', title: 'Bơm & tiết kiệm bằng biến tần', short: 'Công suất bơm, tiết kiệm biến tần.', suggest: true,
    desc: 'Công suất bơm theo lưu lượng – cột áp, chọn động cơ, đường kính ống hút/đẩy, ước tính tiết kiệm điện khi chạy biến tần.',
    sf: 1.15, sfNote: 'Công suất động cơ ≥ công suất trục × k.',
    inputs: [
      { id: 'q', label: 'Lưu lượng', unit: 'm³/h', value: 120 },
      { id: 'H', label: 'Cột áp', unit: 'm', value: 35 },
      { id: 'rho', label: 'Khối lượng riêng chất lỏng', unit: 'kg/m³', value: 1000, hint: 'Nước 1000; bột giấy loãng 1000–1050' },
      { id: 'ep', label: 'Hiệu suất bơm', value: 0.72 },
      { id: 'em', label: 'Hiệu suất động cơ', value: 0.94 },
      { id: 'vs', label: 'Vận tốc ống hút', unit: 'm/s', value: 1.2 },
      { id: 'vd', label: 'Vận tốc ống đẩy', unit: 'm/s', value: 2.2 },
      { id: 'sp', label: 'Tốc độ chạy biến tần', unit: '%', value: 80 },
      { id: 'h', label: 'Giờ chạy mỗi năm', unit: 'h', value: 7000 },
      { id: 'price', label: 'Giá điện bình quân', unit: 'đ/kWh', value: 1900 }
    ],
    calc(v, k) {
      guard(!(v.ep > 0 && v.ep <= 1 && v.em > 0 && v.em <= 1), 'Hiệu suất phải trong khoảng 0–1.');
      const Ph = v.rho * 9.81 * (v.q / 3600) * v.H / 1000;
      const Ps = Ph / v.ep, mot = U.pick(U.STD.motor, Ps * k);
      const Pin = Ps / v.em;
      const s = dnFor(v.q, v.vs), d = dnFor(v.q, v.vd);
      const r = v.sp / 100;
      const Pvfd = Pin * Math.pow(r, 3) / 0.97;
      const Pthr = Pin * (0.55 + 0.45 * r);
      const save = Math.max(Pthr - Pvfd, 0) * v.h;
      const In = U.current(mot, 400, 0.86, '3', v.em);
      return {
        tiles: [
          { l: 'Động cơ bơm', v: `${f(mot)}`, u: 'kW', main: true, s: `Công suất trục ${f(Ps, 2)} kW · I ≈ ${f(In, 1)} A` },
          { l: 'Công suất thủy lực', v: f(Ph, 2), u: 'kW' },
          { l: 'Ống hút', v: dnTxt(s), s: `v = ${f(s.v, 2)} m/s` },
          { l: 'Ống đẩy', v: dnTxt(d), s: `v = ${f(d.v, 2)} m/s` },
          { l: `Công suất ở ${f(v.sp)} % tốc độ`, v: f(Pvfd, 1), u: 'kW', s: `Tiết lưu bằng van: ${f(Pthr, 1)} kW` },
          { l: 'Tiết kiệm nhờ biến tần', v: f(save / 1000, 1), u: 'MWh/năm', s: `≈ ${f(save * v.price / 1e6, 0)} triệu đồng/năm` }
        ],
        checks: [
          [s.v <= 1.5 ? 'ok' : 'warn', `Vận tốc ống hút ${f(s.v, 2)} m/s (≤ 1,5 m/s để tránh xâm thực)`],
          [d.v <= 3 ? 'ok' : 'warn', `Vận tốc ống đẩy ${f(d.v, 2)} m/s (1,5–3 m/s)`]
        ],
        steps: [
          ['Công suất thủy lực', 'Ph = ρ·g·Q·H', `${f(Ph, 3)} kW`],
          ['Công suất trục', 'Ps = Ph / ηb', `${f(Ps, 3)} kW`],
          ['Động cơ', 'Pđc ≥ Ps × k', `${f(mot)} kW`],
          ['Luật đồng dạng', 'Q ~ n; H ~ n²; P ~ n³', `${f(Math.pow(r, 3) * 100, 0)} % công suất`],
          ['Tiết lưu bằng van (ước tính)', 'P ≈ P100·(0,55 + 0,45·Q/Q100)', `${f(Pthr, 1)} kW`]
        ],
        notes: [
          'Luật lập phương đúng khi hệ thống chủ yếu là tổn thất ma sát; nếu có cột áp tĩnh lớn, mức tiết kiệm thấp hơn.',
          'Bơm bột giấy nồng độ > 3 % cần hiệu chỉnh hiệu suất theo đặc tính nhà sản xuất bơm.',
          'Kiểm tra NPSH khả dụng > NPSH yêu cầu + 0,5 m, nhất là bơm nước nóng ngưng tụ.'
        ]
      };
    }
  });

  // ================= C-06 Ống hơi =================
  // [áp suất tuyệt đối bar, thể tích riêng m³/kg, nhiệt độ bão hòa °C, ẩn nhiệt kJ/kg]
  const STEAM = [[1, 1.694, 99.6, 2258], [2, 0.8857, 120.2, 2202], [3, 0.6058, 133.5, 2163], [4, 0.4624, 143.6, 2133], [5, 0.3748, 151.8, 2108],
    [6, 0.3156, 158.8, 2086], [7, 0.2728, 165.0, 2066], [8, 0.2403, 170.4, 2048], [9, 0.2149, 175.4, 2031], [10, 0.1944, 179.9, 2015],
    [12, 0.1632, 188.0, 1986], [14, 0.1408, 195.0, 1960], [16, 0.1237, 201.4, 1935], [18, 0.1104, 207.1, 1912], [21, 0.0950, 214.9, 1880]];
  const col = (i) => STEAM.map((r) => [r[0], r[i]]);
  CD.register({
    id: 'ong-hoi', group: 'co', code: 'C-06', title: 'Ống hơi & lò hơi', short: 'Cỡ ống hơi, nhiệt lượng, nước ngưng.', suggest: true,
    desc: 'Kích thước ống hơi bão hòa theo lưu lượng – áp suất – vận tốc, nhiệt lượng, nhiệt độ bão hòa và ống nước ngưng hồi.',
    sf: 1.15, sfNote: 'Lưu lượng hơi thiết kế = m × k.',
    inputs: [
      { id: 'm', label: 'Lưu lượng hơi', unit: 'kg/h', value: 8000, hint: 'Máy xeo giấy bao bì ≈ 1,5–2,5 tấn hơi / tấn giấy' },
      { id: 'p', label: 'Áp suất hơi', unit: 'bar', value: 10, hint: 'Áp suất dư (bar g)' },
      { id: 'vel', label: 'Vận tốc hơi', unit: 'm/s', value: 30, hint: 'Ống chính 25–35; ống nhánh 15–25' },
      { id: 'rec', label: 'Tỷ lệ thu hồi nước ngưng', unit: '%', value: 70 }
    ],
    calc(v, k) {
      const pa = v.p + 1.013;
      guard(pa < 1 || pa > 21, 'Bảng hơi trong tool hỗ trợ áp suất 0–20 bar g.');
      const sv = U.interp(col(1), pa), ts = U.interp(col(2), pa), hfg = U.interp(col(3), pa);
      const mtk = v.m * k;
      const m3h = mtk * sv;
      const p = dnFor(m3h, v.vel);
      const kw = mtk / 3600 * hfg;
      const cond = mtk * v.rec / 100;
      const pc = dnFor(cond / 1000 * 5, 1.5);
      return {
        tiles: [
          { l: 'Ống hơi chính', v: dnTxt(p), main: true, s: `Sch40 · d trong ${p.id ? f(p.id, 1) : '—'} mm · v thực ${f(p.v, 1)} m/s` },
          { l: 'Lưu lượng hơi thiết kế', v: f(mtk / 1000, 2), u: 't/h' },
          { l: 'Lưu lượng thể tích', v: f(m3h, 0), u: 'm³/h' },
          { l: 'Nhiệt độ bão hòa', v: f(ts, 1), u: '°C', s: `Thể tích riêng ${f(sv, 4)} m³/kg` },
          { l: 'Nhiệt lượng hữu ích', v: f(kw, 0), u: 'kW', s: `Ẩn nhiệt ${f(hfg, 0)} kJ/kg` },
          { l: 'Ống nước ngưng hồi', v: dnTxt(pc), s: `${f(cond / 1000, 2)} t/h · tính dư cho hơi tái bay hơi` }
        ],
        checks: [
          [p.v <= 40 ? 'ok' : 'warn', `Vận tốc thực ${f(p.v, 1)} m/s ${p.v > 40 ? '– cao, gây ồn và mài mòn, tăng cỡ ống' : '(≤ 40 m/s)'}`],
          [v.rec >= 60 ? 'ok' : 'warn', `Thu hồi nước ngưng ${f(v.rec)} % ${v.rec < 60 ? '– tăng thu hồi để giảm nhiên liệu và nước xử lý' : ''}`]
        ],
        steps: [
          ['Áp suất tuyệt đối', 'pa = p + 1,013', `${f(pa, 2)} bar`],
          ['Thể tích riêng (nội suy bảng hơi)', 'v″(pa)', `${f(sv, 4)} m³/kg`],
          ['Lưu lượng thể tích', 'V = m × k × v″', `${f(m3h, 1)} m³/h`],
          ['Đường kính tính', 'd = √(4V / (π·w))', `${f(p.d, 1)} mm`],
          ['Nhiệt lượng', 'Q = m × r', `${f(kw, 0)} kW`]
        ],
        notes: [
          'Ống hơi đặt dốc 1/100 theo chiều hơi, bẫy hơi mỗi 30–50 m và trước van, điểm nâng.',
          'Bọc cách nhiệt bông khoáng/ đá ≥ 50 mm cho ống hơi; mỗi mét ống DN100 không bọc ở 10 bar mất ≈ 1 kW.',
          'Ống nước ngưng chọn dư 3–5 lần lưu lượng nước vì có hơi tái bay hơi (flash steam).'
        ]
      };
    }
  });

  // ================= C-07 Chiếu sáng nhà xưởng =================
  const UF = [[0.6, 0.38], [0.8, 0.45], [1, 0.5], [1.25, 0.55], [1.5, 0.59], [2, 0.64], [2.5, 0.68], [3, 0.71], [4, 0.74], [5, 0.76]];
  CD.register({
    id: 'chieu-sang', group: 'co', code: 'C-07', title: 'Chiếu sáng nhà xưởng', short: 'Số đèn theo độ rọi yêu cầu.', suggest: true,
    desc: 'Số đèn theo phương pháp quang thông (chỉ số phòng, hệ số sử dụng, hệ số duy trì), bố trí lưới đèn, mật độ công suất.',
    sf: 1.1, sfNote: 'Số đèn = tính toán × k.',
    inputs: [
      { id: 'L', label: 'Chiều dài xưởng', unit: 'm', value: 72 },
      { id: 'W', label: 'Chiều rộng xưởng', unit: 'm', value: 36 },
      { id: 'h', label: 'Độ cao đèn so với mặt làm việc', unit: 'm', value: 8 },
      { id: 'E', label: 'Độ rọi yêu cầu', unit: 'lux', value: 300, hint: 'Sản xuất giấy 300; kho 150–200; phòng điều khiển, văn phòng 500' },
      { id: 'phi', label: 'Quang thông mỗi đèn', unit: 'lm', value: 21000, hint: 'Highbay LED 150 W ≈ 20.000–22.000 lm' },
      { id: 'w', label: 'Công suất mỗi đèn', unit: 'W', value: 150 },
      { id: 'mf', label: 'Hệ số duy trì', value: 0.7, hint: 'Xưởng nhiều bụi giấy 0,6–0,7' }
    ],
    calc(v, k) {
      guard(v.L <= 0 || v.W <= 0 || v.h <= 0 || v.phi <= 0, 'Kích thước và quang thông phải lớn hơn 0.');
      const A = v.L * v.W, K = A / (v.h * (v.L + v.W)), uf = U.interp(UF, K);
      const N0 = v.E * A / (v.phi * uf * v.mf), Ntk = N0 * k;
      let rows = Math.max(1, Math.round(Math.sqrt(Ntk * v.W / v.L)));
      let cols = Math.ceil(Ntk / rows);
      const N = rows * cols;
      const Ereal = N * v.phi * uf * v.mf / A;
      const sx = v.L / cols, sy = v.W / rows;
      const kw = N * v.w / 1000;
      const per = Math.floor(0.8 * 16 * 230 * 0.95 / v.w);
      return {
        tiles: [
          { l: 'Số đèn bố trí', v: `${N}`, u: 'bộ', main: true, s: `${rows} hàng × ${cols} cột · khoảng cách ${f(sx, 1)} × ${f(sy, 1)} m` },
          { l: 'Độ rọi đạt được', v: f(Ereal, 0), u: 'lux', s: `Yêu cầu ${f(v.E)} lux` },
          { l: 'Tổng công suất', v: f(kw, 1), u: 'kW', s: `${f(kw * 1000 / A, 1)} W/m²` },
          { l: 'Chỉ số phòng K', v: f(K, 2), s: `Hệ số sử dụng U = ${f(uf, 2)}` },
          { l: 'Đèn mỗi mạch MCB 16 A', v: `${per}`, u: 'bộ', s: `≈ ${Math.ceil(N / per)} mạch, chia đều 3 pha` }
        ],
        checks: [
          [Ereal >= v.E ? 'ok' : 'bad', `Độ rọi ${f(Ereal, 0)} lux ≥ ${f(v.E)} lux`],
          [Math.max(sx, sy) <= 1.5 * v.h ? 'ok' : 'warn', `Khoảng cách đèn lớn nhất ${f(Math.max(sx, sy), 1)} m ${Math.max(sx, sy) <= 1.5 * v.h ? '≤' : '>'} 1,5 × h = ${f(1.5 * v.h, 1)} m (độ đồng đều)`]
        ],
        steps: [
          ['Diện tích', 'A = D × R', `${f(A, 0)} m²`],
          ['Chỉ số phòng', 'K = D·R / (h·(D + R))', f(K, 3)],
          ['Hệ số sử dụng', 'Tra theo K (đèn highbay, trần tối)', f(uf, 3)],
          ['Số đèn tính toán', 'N = E·A / (Φ·U·MF)', f(N0, 1)],
          ['Số đèn thiết kế', 'N × k → bố trí lưới', `${N} bộ`]
        ],
        notes: [
          'Độ rọi tham khảo QCVN 22:2016/BYT về chiếu sáng nơi làm việc; khu kiểm tra chất lượng in nên ≥ 500 lux.',
          'Dùng đèn LED IP65 cho khu máy xeo ẩm, có cảm biến hoặc điều khiển theo khu để tiết kiệm.',
          'Bố trí đèn sự cố và đèn exit theo quy định PCCC.'
        ]
      };
    }
  });

  // ================= C-08 Quy đổi đơn vị =================
  const CONV = {
    pw: { n: 'Công suất / năng suất lạnh', u: { kW: 1000, W: 1, HP: 745.7, 'CV (mã lực mét)': 735.5, 'BTU/h': 0.29307, RT: 3517, 'kcal/h': 1.163 } },
    pr: { n: 'Áp suất', u: { bar: 1e5, MPa: 1e6, kPa: 1000, Pa: 1, psi: 6894.76, 'kgf/cm²': 98066.5, atm: 101325, mH2O: 9806.65, mmH2O: 9.80665, mmHg: 133.322 } },
    fl: { n: 'Lưu lượng', u: { 'm³/h': 1 / 3600, 'm³/min': 1 / 60, 'm³/s': 1, 'L/s': 0.001, 'L/min': 1 / 60000, CFM: 0.000471947, 'GPM (Mỹ)': 0.0000630902 } },
    en: { n: 'Năng lượng', u: { kWh: 3.6e6, MJ: 1e6, kJ: 1000, kcal: 4186.8, BTU: 1055.06, 'TOE (tấn dầu quy đổi)': 4.1868e10 } },
    tp: { n: 'Nhiệt độ', u: { '°C': 1, '°F': 1, K: 1 } }
  };
  function toC(x, u) { return u === '°F' ? (x - 32) * 5 / 9 : u === 'K' ? x - 273.15 : x; }
  function fromC(c, u) { return u === '°F' ? c * 9 / 5 + 32 : u === 'K' ? c + 273.15 : c; }
  CD.register({
    id: 'quy-doi', group: 'co', code: 'C-08', title: 'Quy đổi đơn vị', short: 'Công suất, áp suất, lưu lượng, nhiệt độ.', suggest: true,
    desc: 'Đổi nhanh công suất, năng suất lạnh, áp suất, lưu lượng, năng lượng, nhiệt độ hay gặp trong cơ điện.',
    sf: null,
    inputs: [
      { id: 'cat', label: 'Loại đại lượng', type: 'sel', value: 'pw', opts: Object.entries(CONV).map(([a, b]) => [a, b.n]) },
      { id: 'x', label: 'Giá trị', value: 100 },
      { id: 'u', label: 'Đơn vị', type: 'sel', value: 'kW', opts: (v) => Object.keys(CONV[v.cat].u).map((x) => [x, x]) }
    ],
    calc(v) {
      const c = CONV[v.cat];
      const tiles = [];
      if (v.cat === 'tp') {
        const C = toC(v.x, v.u);
        for (const u of Object.keys(c.u)) tiles.push({ l: u, v: f(fromC(C, u), 2), main: u === v.u });
      } else {
        const base = v.x * c.u[v.u];
        for (const [u, m] of Object.entries(c.u)) {
          const val = base / m;
          tiles.push({ l: u, v: Math.abs(val) >= 1e-3 || val === 0 ? f(val, Math.abs(val) < 1 ? 6 : 3) : val.toExponential(3), main: u === v.u });
        }
      }
      tiles.sort((a, b) => (b.main ? 1 : 0) - (a.main ? 1 : 0));
      return {
        tiles,
        notes: ['1 RT = 12.000 BTU/h = 3,517 kW; 1 HP = 0,7457 kW; 1 bar = 10,2 mH2O ≈ 14,5 psi; 1 m³/min = 35,3 CFM.']
      };
    }
  });
})();
