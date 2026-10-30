/* Nhóm CƠ – NHIỆT – TIỆN ÍCH: C-01 … C-08 */
(function () {
  'use strict';
  const { U } = CD;
  const f = U.f, SQ3 = U.SQ3;
  const guard = (cond, msg) => { if (cond) throw new Error(msg); };
  const custom = U.custom;
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
      { id: 'm', label: 'Dữ liệu tải lạnh', type: 'sel', value: 'kw', opts: [['kw', 'Biết tải lạnh (kW)'], ['rt', 'Biết tải lạnh (RT)'], ['area', 'Theo diện tích (ước tính)']] },
      { id: 'q', label: 'Tải lạnh', unit: 'kW', value: 1400, show: (v) => v.m === 'kw' },
      { id: 'rt', label: 'Tải lạnh', unit: 'RT', value: 400, show: (v) => v.m === 'rt' },
      { id: 'a', label: 'Diện tích điều hoà', unit: 'm²', value: 4000, show: (v) => v.m === 'area' },
      { id: 'qd', label: 'Mật độ tải lạnh', unit: 'W/m²', value: 300, show: (v) => v.m === 'area', hint: 'Văn phòng 120–180; xưởng in, cắt, dán 250–350; phòng sạch > 400 (kinh nghiệm)' },
      { id: 'type', label: 'Loại chiller', type: 'sel', value: 'water', opts: [['water', 'Giải nhiệt nước'], ['air', 'Giải nhiệt gió']] },
      { id: 'copw', label: 'COP', value: 5.8, show: (v) => v.type === 'water', hint: 'Lấy theo catalogue; giải nhiệt nước thường 5,5–6,5' },
      { id: 'copa', label: 'COP', value: 3.0, show: (v) => v.type === 'air', hint: 'Lấy theo catalogue; giải nhiệt gió thường 2,8–3,3' },
      { id: 'n', label: 'Số chiller vận hành', value: 2 },
      { id: 'sp', label: 'Máy dự phòng', type: 'sel', value: '1', opts: [['1', 'Thêm 1 máy dự phòng (N+1)'], ['0', 'Không dự phòng']] },
      { id: 'dtc', label: 'ΔT nước lạnh', unit: '°C', value: 5, hint: 'Thường 7/12 °C' },
      { id: 'dtw', label: 'ΔT nước giải nhiệt', unit: '°C', value: 5, show: (v) => v.type === 'water', hint: 'Thường 32/37 °C' },
      { id: 'hc', label: 'Cột áp bơm nước lạnh', unit: 'm', value: 32 },
      { id: 'hw', label: 'Cột áp bơm giải nhiệt', unit: 'm', value: 25, show: (v) => v.type === 'water' },
      { id: 'vel', label: 'Vận tốc nước ống chính', unit: 'm/s', value: 2 },
      { id: 'coc', label: 'Chu kỳ cô đặc tháp', value: 4, show: (v) => v.type === 'water' },
      U.cfg('Thiết bị & giả thiết', 'Tự chọn, giả thiết điển hình', 'Tự nhập: cỡ chiller, hiệu suất bơm, hệ số động cơ, cosφ, điện áp'),
      { id: 'cu', label: 'Công suất mỗi chiller', unit: 'RT', value: 0, show: custom, hint: 'Cỡ bất kỳ, kể cả trên 2000 RT. 0 = tool chọn theo dãy chuẩn' },
      { id: 'cep', label: 'Hiệu suất bơm', value: 0.75, show: custom, hint: 'Theo đường đặc tính bơm tại điểm làm việc' },
      { id: 'cmm', label: 'Hệ số dự phòng động cơ bơm', value: 1.15, show: custom, hint: 'Động cơ ≥ hệ số × công suất trục' },
      { id: 'cpf', label: 'cosφ chiller', value: 0.9, show: custom },
      { id: 'cv', label: 'Điện áp cấp chiller', unit: 'V', value: 400, show: custom }
    ],
    basis: {
      std: [
        '1 RT = 3,517 kW = 12.000 BTU/h; 1 tấn tháp giải nhiệt = 15.000 BTU/h = 4,396 kW.',
        'Lưu lượng nước G (m³/h) = Q (kW) × 0,86 / ΔT (°C), từ Q = G·ρ·cp·ΔT.',
        'Công suất trục bơm P = ρ·g·G·H / η.',
        'Nước bổ sung tháp: bay hơi E ≈ 0,00153·G·ΔT; xả đáy B = E / (COC − 1); cuốn theo 0,02 % G.'
      ],
      assume: ['Hiệu suất bơm 0,75; động cơ bơm ≥ 1,15 × công suất trục; điện chiller cosφ 0,9, 400 V.', 'Tải lạnh theo diện tích chỉ là ước tính sơ bộ.', 'Chế độ tự nhập: đổi được cỡ chiller (kiểm tra số máy × RT ≥ tải thiết kế), hiệu suất bơm, hệ số động cơ bơm, cosφ và điện áp.'],
      verify: [
        'Dự án lớn nên tính tải nhiệt chi tiết bằng phần mềm (HAP, TRACE…).',
        'Chọn chiller, bơm, tháp theo catalogue ở điều kiện vận hành thực tế; aptomat chiller theo MCA/MOP trên nhãn máy.'
      ]
    },
    calc(v, k) {
      const Q = v.m === 'kw' ? v.q : v.m === 'rt' ? v.rt * RT_KW : v.a * v.qd / 1000;
      const water = v.type === 'water';
      const cop = water ? v.copw : v.copa;
      guard(!(Q > 0) || cop <= 0 || v.n < 1 || v.dtc <= 0 || v.vel <= 0, 'Tải lạnh, COP, số máy, ΔT và vận tốc phải lớn hơn 0.');
      const n = Math.round(v.n);
      const own = custom(v);
      const ep = own ? v.cep : 0.75, mm = own ? v.cmm : 1.15, pf = own ? v.cpf : 0.9, Uv = own ? v.cv : 400;
      guard(own && !(v.cu >= 0 && ep > 0 && ep <= 1 && mm >= 1 && pf > 0 && pf <= 1 && Uv > 0), 'Hiệu suất bơm, cosφ trong khoảng 0–1; hệ số động cơ ≥ 1; công suất, điện áp không được âm.');
      const Qtk = Q * k, RT = Qtk / RT_KW;
      const mine = own && v.cu > 0;
      const unit = mine ? v.cu : U.pick(CH_RT, RT / n);
      guard(!unit, `Mỗi máy cần ${f(RT / n, 0)} RT, vượt dãy chuẩn 2000 RT – tăng số chiller hoặc chọn "Tự nhập" để nhập cỡ máy.`);
      const nTot = n + Number(v.sp);
      const kind = unit < 150 ? (water ? 'Trục vít / scroll' : 'Scroll giải nhiệt gió') : unit <= 500 ? 'Trục vít (screw)' : 'Ly tâm (centrifugal)';
      const Pin = Qtk / cop, PinU = unit * RT_KW / cop;
      const Iu = PinU * 1000 / (SQ3 * Uv * pf);
      const brk = U.pick(U.STD.breaker, Iu * 1.25);
      const fc = Qtk * 0.86 / v.dtc;
      const pc = pumpKw(fc / n, v.hc, ep), pcM = U.pick(U.STD.motor, pc * mm);
      const pipeC = dnFor(fc, v.vel);
      const raw = { Q, Qtk, RT, unit, Pin, fc, pc, pcM };
      const tiles = [
        { l: mine ? 'Chiller kiểm tra' : 'Chiller chọn', v: `${nTot} × ${mine ? f(unit) : unit}`, u: 'RT', main: true, s: `${n} chạy${Number(v.sp) ? ' + 1 dự phòng' : ''} · ${kind} · ${f(unit * RT_KW, 0)} kW lạnh/máy${mine ? ' · tự nhập' : ''}` },
        { l: 'Tải lạnh thiết kế', v: f(RT, 0), u: 'RT', s: `${f(Qtk, 0)} kW · ${f(Qtk * 3412.14 / 1e6, 2)} triệu BTU/h` },
        { l: 'Điện năng chiller', v: f(Pin, 0), u: 'kW', s: `${f(Pin / RT, 2)} kW/RT · ${f(PinU, 0)} kW/máy` },
        { l: 'Aptomat mỗi chiller (sơ bộ)', v: `${brk}`, u: 'A', s: `I ≈ ${f(Iu, 0)} A; theo MCA/MOP trên nhãn` },
        { l: 'Lưu lượng nước lạnh', v: f(fc, 0), u: 'm³/h', s: `${f(fc / 3.6, 1)} L/s · ${f(fc * 4.403, 0)} GPM` },
        { l: 'Bơm nước lạnh (mỗi bơm)', v: pcM ? `${f(pcM)}` : '> 1000', u: 'kW', s: `${f(fc / n, 0)} m³/h × ${f(v.hc)} m · trục ${f(pc, 1)} kW` },
        { l: 'Ống nước lạnh chính', v: dnTxt(pipeC), s: pipeC.v ? `v thực = ${f(pipeC.v, 2)} m/s` : '' }
      ];
      const steps = [
        ['Tải lạnh', v.m === 'area' ? 'Q = A × q' : v.m === 'rt' ? 'Q = RT × 3,517' : 'Q (nhập)', `${f(Q, 1)} kW`],
        ['Tải thiết kế', 'Qtk = Q × k; RT = Qtk / 3,517', `${f(RT, 1)} RT`],
        ['Công suất điện', 'P = Qtk / COP', `${f(Pin, 1)} kW`],
        ['Lưu lượng nước lạnh', 'G = Qtk × 0,86 / ΔT', `${f(fc, 1)} m³/h`],
        ['Công suất trục bơm', `P = ρ·g·G·H / η (η = ${f(ep, 2)})`, `${f(pc, 2)} kW`],
        ['Động cơ bơm', `Pđc ≥ ${f(mm, 2)} × P trục`, `${f(pcM)} kW`]
      ];
      if (water) {
        guard(v.dtw <= 0, 'ΔT nước giải nhiệt phải lớn hơn 0.');
        const Qc = Qtk + Pin, fw = Qc * 0.86 / v.dtw;
        const pw = pumpKw(fw / n, v.hw, ep), pwM = U.pick(U.STD.motor, pw * mm);
        const E = fw * 0.00153 * v.dtw, B = E / Math.max(v.coc - 1, 0.5), D = fw * 0.0002;
        const mk = E + B + D;
        Object.assign(raw, { Qc, fw, pw, pwM, E, mk });
        tiles.push(
          { l: 'Tháp giải nhiệt', v: f(Qc / 4.396, 0), u: 'tấn tháp', s: `Thải nhiệt ${f(Qc, 0)} kW` },
          { l: 'Lưu lượng nước giải nhiệt', v: f(fw, 0), u: 'm³/h', s: `Bơm ${f(pwM)} kW/bơm (trục ${f(pw, 1)} kW)` },
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
          ...(mine ? [[n * unit >= RT ? 'ok' : 'bad', 'Công suất chiller tự nhập', `${n} × ${f(unit)} RT = ${f(n * unit)} RT ${n * unit >= RT ? '≥' : '<'} tải thiết kế ${f(RT, 0)} RT`]] : []),
          [pipeC.v && pipeC.v >= 1 && pipeC.v <= 3 ? 'ok' : 'warn', 'Vận tốc ống chính', `${f(pipeC.v, 2)} m/s (khuyến nghị 1,2–3 m/s)`],
          [Pin / RT <= (water ? 0.7 : 1.25) ? 'ok' : 'warn', 'Hiệu suất chiller', `${f(Pin / RT, 2)} kW/RT (tốt: nước ≤ 0,65; gió ≤ 1,2)`]
        ],
        steps,
        notes: [
          'Nên dùng bơm biến tần cho hệ thống nước lạnh lưu lượng thay đổi (VPF) và điều khiển chiller theo tải.',
          'Nước tháp giải nhiệt cần xử lý hóa chất chống cáu cặn, rêu tảo và kiểm soát Legionella.'
        ],
        raw
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
      { id: 'room', label: 'Loại phòng', type: 'sel', value: 'off', opts: [...Object.entries(ROOM).map(([a, b]) => [a, `${b[0]} (${b[1]} BTU/m²)`]), ['cus', 'Khác – tự nhập mật độ']] },
      { id: 'qd', label: 'Mật độ tải lạnh', unit: 'BTU/m²', value: 500, show: (v) => v.room === 'cus', hint: 'Cho trần 3 m; tool tự tăng khi trần cao hơn' },
      { id: 'pp', label: 'Số người', value: 6 },
      { id: 'eq', label: 'Thiết bị toả nhiệt', unit: 'W', value: 1200, hint: 'Máy tính ≈ 150 W/bộ, máy in ≈ 300 W' },
      { id: 'sun', label: 'Điều kiện nắng / nhiệt', type: 'sel', value: 'n', opts: [...Object.entries(SUN).map(([a, b]) => [a, `${b[0]} (× ${f(b[1], 2)})`]), ['cus', 'Khác – tự nhập hệ số']] },
      { id: 'sk', label: 'Hệ số nắng / nhiệt', value: 1.1, show: (v) => v.sun === 'cus' },
      U.cfg('Cách chọn máy', 'Tự chọn 9.000–24.000 BTU/h', 'Tự nhập: cỡ máy, COP, điện áp'),
      { id: 'cunit', label: 'Công suất mỗi máy', unit: 'BTU/h', value: 0, show: custom, hint: '0 = tool chọn 9.000–24.000 BTU/h' },
      { id: 'ccop', label: 'COP / EER của máy', value: 3.2, show: custom, hint: 'Theo catalogue; máy inverter thường 3,2–4,5' },
      { id: 'cv', label: 'Điện áp cấp', unit: 'V', value: 220, show: custom }
    ],
    basis: {
      std: [
        'Ước tính nhanh: Q = (A·q·max(1; H/3) + 450 BTU/h × số người + W × 3,412) × hệ số nắng.',
        'Điện năng ≈ BTU/h × 0,000293 / COP (COP ≈ 3,2); dòng 1 pha I = P / (220·0,9).'
      ],
      assume: ['Mật độ q (BTU/m²) theo loại phòng là số liệu kinh nghiệm, trần 3 m; chọn "Khác" để tự nhập mật độ, hệ số nắng.', 'Cáp chịu được aptomat, đi riêng, 40 °C, tối thiểu 2,5 mm².', 'Chế độ tự nhập: cỡ máy bất kỳ (số máy = tải / cỡ máy, làm tròn lên), COP và điện áp theo catalogue.'],
      verify: [
        'Phòng lớn, phòng server, phòng nhiều thiết bị: tính tải nhiệt chi tiết.',
        'Aptomat, dây, ống đồng theo hướng dẫn lắp đặt của hãng máy lạnh.'
      ]
    },
    calc(v, k) {
      guard(v.L <= 0 || v.W <= 0 || v.H <= 0, 'Kích thước phòng phải lớn hơn 0.');
      guard(v.pp < 0 || v.eq < 0, 'Số người, công suất thiết bị không được âm.');
      const dens = v.room === 'cus' ? v.qd : ROOM[v.room][1];
      const sunK = v.sun === 'cus' ? v.sk : SUN[v.sun][1];
      guard(!(dens > 0 && sunK > 0), 'Mật độ tải lạnh và hệ số nắng phải lớn hơn 0.');
      const own = custom(v);
      const cop = own ? v.ccop : 3.2, Uv = own ? v.cv : 220;
      guard(own && !(v.cunit >= 0 && cop > 0 && Uv > 0), 'Công suất máy, COP và điện áp phải lớn hơn 0.');
      const A = v.L * v.W, hf = Math.max(1, v.H / 3);
      const Qa = A * dens * hf, Qp = v.pp * 450, Qe = v.eq * 3.412;
      const Q = (Qa + Qp + Qe) * sunK, Qtk = Q * k;
      const mine = own && v.cunit > 0;
      const n = Math.max(1, Math.ceil(Qtk / (mine ? v.cunit : 24000)));
      const unit = mine ? v.cunit : U.pick(WALL, Qtk / n);
      const Pin = unit * 0.000293 / cop;
      const I = Pin * 1000 / (Uv * 0.9);
      const brk = U.pick(U.STD.breaker, Math.max(10, 1.3 * I * k));
      const cab = U.cableFor(brk / U.kTemp('PVC', 40, 30), { pha: '1', ins: 'PVC', met: 'B2', min: 2.5 });
      const S = Math.max(2.5, cab.S);
      const big = Qtk > 4 * 24000;
      return {
        tiles: [
          { l: 'Điều hoà treo tường', v: `${n} × ${f(unit, 0)}`, u: 'BTU/h', main: true, s: `${n} máy${HP[unit] ? ` ${HP[unit]}` : ''} · tổng ${f(n * unit, 0)} BTU/h${mine ? ' · cỡ máy tự nhập' : ''}` },
          { l: 'Tải lạnh thiết kế', v: f(Qtk, 0), u: 'BTU/h', s: `${f(Qtk * 0.000293, 2)} kW · ${f(Qtk / A, 0)} BTU/m²` },
          { l: 'Điện năng mỗi máy', v: f(Pin, 2), u: 'kW', s: `I ≈ ${f(I, 1)} A (1 pha ${f(Uv)} V, COP ${f(cop, 2)})` },
          { l: 'Aptomat mỗi máy', v: `${brk}`, u: 'A', s: 'MCB 1P+N hoặc 2P, đường cong C' },
          { l: 'Dây cấp nguồn', v: `${f(S)}`, u: 'mm²', s: 'Cu/PVC, 2 lõi + tiếp địa' },
          { l: 'Ống đồng lỏng / hơi', v: PIPE[unit] || 'Theo hãng', u: PIPE[unit] ? 'mm' : '', s: 'Theo hãng; ống nước ngưng PVC Ø21' }
        ],
        checks: [
          [big ? 'warn' : 'ok', 'Loại máy', big ? 'Tải lớn: cân nhắc âm trần cassette, tủ đứng hoặc VRV thay nhiều máy treo tường.' : 'Phù hợp dùng máy treo tường.'],
          mine ? [unit > 30000 ? 'warn' : 'ok', 'Cỡ máy tự nhập', unit > 30000 ? 'Trên 30.000 BTU/h ít có máy treo tường – kiểm tra loại máy (cassette, tủ đứng, áp trần).' : `${n} máy × ${f(unit, 0)} = ${f(n * unit, 0)} BTU/h ≥ ${f(Qtk, 0)} BTU/h`] : null,
          v.room === 'srv' || v.room === 'ctrl' ? ['warn', 'Dự phòng', 'Phòng chạy 24/7: thêm 1 máy dự phòng (N+1) chạy luân phiên, ưu tiên điều hoà chính xác.']
            : v.room === 'cus' ? ['warn', 'Dự phòng', 'Nếu phòng chạy 24/7 (server, điều khiển): thêm 1 máy dự phòng (N+1) chạy luân phiên.'] : ['ok', 'Dự phòng', 'Phòng làm việc theo giờ hành chính.']
        ].filter(Boolean),
        steps: [
          ['Diện tích', 'A = D × R', `${f(A, 1)} m²`],
          ['Tải theo diện tích', `Qa = A × ${f(dens)} × max(1; H/3)`, `${f(Qa, 0)} BTU/h`],
          ['Tải do người', 'Qp = số người × 450 BTU/h', `${f(Qp, 0)} BTU/h`],
          ['Tải do thiết bị', 'Qe = W × 3,412', `${f(Qe, 0)} BTU/h`],
          ['Hệ số nắng / nhiệt', v.sun === 'cus' ? 'Tự nhập' : SUN[v.sun][0], f(sunK, 2)],
          ['Tải thiết kế', 'Qtk = (Qa + Qp + Qe) × hệ số × k', `${f(Qtk, 0)} BTU/h`]
        ],
        notes: [
          'Quy đổi: 1 HP ≈ 9.000 BTU/h; 1 kW lạnh = 3.412 BTU/h.',
          'Ưu tiên máy inverter, môi chất R32; khoảng cách dàn nóng – dàn lạnh và chênh cao theo giới hạn của hãng.'
        ],
        raw: { A, Q, Qtk, n, unit, Pin, I, brk, S }
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
      { id: 'q', label: 'Tổng nhu cầu thiết bị', unit: 'm³/min', value: 18, hint: 'Cộng lưu lượng khí tự do (FAD) các xi lanh, súng thổi, máy xeo, máy in…' },
      { id: 'kdt', label: 'Hệ số sử dụng đồng thời', value: 0.75 },
      { id: 'leak', label: 'Rò rỉ', unit: '%', value: 10 },
      { id: 'dp', label: 'Dự phòng phát triển', unit: '%', value: 20 },
      { id: 'p', label: 'Áp suất làm việc tại thiết bị', unit: 'bar', value: 6 },
      { id: 'dpd', label: 'Tổn thất qua lọc, sấy, ống', unit: 'bar', value: 1 },
      { id: 'n', label: 'Số máy nén vận hành', value: 2 },
      { id: 'sp', label: 'Suất tiêu hao điện ở 7 bar', unit: 'kW/(m³/min)', value: 6.3, hint: 'Lấy theo catalogue (ISO 1217); trục vít ngâm dầu thường 6,0–6,8' },
      { id: 'lp', label: 'Chiều dài ống chính', unit: 'm', value: 200 },
      { id: 'dpl', label: 'Tụt áp ống cho phép', unit: 'bar', value: 0.1 },
      { id: 'h', label: 'Giờ chạy mỗi năm', unit: 'h', value: 7000 },
      { id: 'price', label: 'Giá điện bình quân', unit: 'đ/kWh', value: 1900 },
      U.cfg('Giả thiết tính', 'Theo giả thiết điển hình', 'Tự nhập: chu kỳ tải, chênh áp, chiều dài ống, máy dự phòng, máy sấy'),
      { id: 'cfm', label: 'Số chu kỳ tải / không tải tối đa', unit: 'lần/phút', value: 2, show: custom, hint: 'Theo nhà sản xuất máy nén; điển hình 2 lần/phút (1 chu kỳ / 30 s)' },
      { id: 'cdp', label: 'Chênh áp đóng – cắt tải (pU − pL)', unit: 'bar', value: 0.5, show: custom },
      { id: 'cleq', label: 'Hệ số chiều dài tương đương ống', value: 1.5, show: custom, hint: 'Chiều dài tương đương = hệ số × ống thẳng (co, tê, van)' },
      { id: 'csb', label: 'Số máy nén dự phòng', value: 1, show: custom },
      { id: 'cdry', label: 'Hệ số hiệu chỉnh máy sấy', value: 0.8, show: custom, hint: 'Theo bảng hiệu chỉnh nhiệt độ, áp suất của hãng máy sấy' }
    ],
    basis: {
      std: [
        'Bình chứa (máy nén chạy có tải/không tải): V = 0,25·qc·p1·T0 / (fmax·Δp·T1) – Atlas Copco Compressed Air Manual.',
        'Đường kính ống: d⁵ = 450·qc^1,85·L / (Δp·p), d (mm), qc (L/s), L (m), Δp (bar), p (bar tuyệt đối) – cùng nguồn.',
        'Suất tiêu hao điện tăng ≈ 7 % cho mỗi bar áp suất tăng thêm.'
      ],
      assume: ['fmax = 1 chu kỳ / 30 s, Δp = 0,5 bar, T0 = T1; chiều dài tương đương = 1,5 × ống thẳng; 1 máy dự phòng.', 'Máy sấy lạnh hiệu chỉnh 0,8 cho nhiệt độ 35–40 °C.', 'Chế độ tự nhập: đổi được số chu kỳ tải/không tải, chênh áp, hệ số chiều dài tương đương, số máy dự phòng và hệ số máy sấy.'],
      verify: ['Chọn máy nén theo FAD ở áp suất làm việc trong catalogue (ISO 1217).', 'Đo lưu lượng và rò rỉ thực tế để hiệu chỉnh nhu cầu.']
    },
    calc(v, k) {
      guard(v.n < 1 || !(v.q > 0), 'Nhu cầu và số máy nén phải lớn hơn 0.');
      guard(!(v.dpl > 0 && v.lp > 0 && v.p > 0), 'Áp suất, chiều dài ống và tụt áp phải lớn hơn 0.');
      const n = Math.round(v.n);
      const own = custom(v);
      const cyc = own ? v.cfm : 2, dpt = own ? v.cdp : 0.5, leq = own ? v.cleq : 1.5, sb = own ? Math.round(v.csb) : 1, dry = own ? v.cdry : 0.8;
      guard(own && !(cyc > 0 && dpt > 0 && leq >= 1 && sb >= 0 && dry > 0 && dry <= 1), 'Số chu kỳ, chênh áp phải lớn hơn 0; hệ số chiều dài ≥ 1; hệ số máy sấy trong khoảng 0–1.');
      const Qtk = v.q * v.kdt * (1 + v.leak / 100) * (1 + v.dp / 100) * k;
      const qs = Qtk * 1000 / 60;
      const pc = v.p + v.dpd;
      const spA = v.sp * (1 + 0.07 * (pc - 7));
      const kw = Qtk * spA, kwU = U.pick(U.STD.motor, kw / n);
      const qcU = qs / n;
      const V = 0.25 * qcU * 1 / ((cyc / 60) * dpt);
      const tank = U.pick(TANK, V) || Math.ceil(V / 1000) * 1000;
      const Leq = v.lp * leq, pa = v.p + 1;
      const d = Math.pow(450 * Math.pow(qs, 1.85) * Leq / (v.dpl * pa), 0.2);
      const dn = U.pickDN(d);
      const kwh = kw * v.h, cost = kwh * v.price;
      const leakCost = cost * (v.leak / 100) / (1 + v.leak / 100);
      return {
        tiles: [
          { l: 'Lưu lượng thiết kế', v: f(Qtk, 1), u: 'm³/min', main: true, s: `${f(qs, 0)} L/s · ${f(Qtk * 35.315, 0)} CFM · áp đẩy ${f(pc, 1)} bar` },
          { l: 'Máy nén chọn', v: `${n} × ${kwU ? f(kwU) : '> 1000'}`, u: 'kW', s: `${sb > 0 ? `+ ${sb} máy dự phòng` : 'không dự phòng'} · ${f(Qtk / n, 1)} m³/min/máy` },
          { l: 'Bình chứa', v: f(tank, 0), u: 'lít', s: `Tính toán ${f(V, 0)} L (máy chạy có tải/không tải)` },
          { l: 'Ống chính', v: dn ? `DN${dn[0]}` : '> DN600', s: `d tính = ${f(d, 0)} mm` },
          { l: 'Máy sấy lạnh', v: `≥ ${f(Qtk / dry, 1)}`, u: 'm³/min', s: own ? `Đã chia hệ số hiệu chỉnh ${f(dry, 2)}` : 'Đã hiệu chỉnh nhiệt độ 35–40 °C' },
          { l: 'Điện năng / năm', v: f(kwh / 1000, 0), u: 'MWh', s: `≈ ${f(cost / 1e9, 2)} tỷ đồng` },
          { l: 'Chi phí do rò rỉ', v: f(leakCost / 1e6, 0), u: 'triệu đ/năm' }
        ],
        checks: [
          [v.leak <= 10 ? 'ok' : 'warn', 'Rò rỉ', `${f(v.leak)} %${v.leak > 10 ? ' – nên dò rò rỉ bằng thiết bị siêu âm, mục tiêu < 10 %' : ' – trong mức chấp nhận'}`],
          [pc <= 7.5 ? 'ok' : 'warn', 'Áp suất đẩy', `${f(pc, 1)} bar – mỗi 1 bar tăng thêm tốn ≈ 7 % điện năng`],
          own && sb === 0 ? ['warn', 'Dự phòng', 'Không có máy nén dự phòng: một máy dừng là thiếu khí cho sản xuất.'] : null,
          ['ok', 'Thu hồi nhiệt', `Có thể thu ≈ ${f(kw * 0.7, 0)} kW để sấy hoặc gia nhiệt nước nồi hơi`]
        ].filter(Boolean),
        steps: [
          ['Lưu lượng thiết kế', 'Q = ΣQ·Kđt·(1+rò rỉ)·(1+dp)·k', `${f(Qtk, 2)} m³/min`],
          ['Suất tiêu hao hiệu chỉnh', 'SP = SP7·(1 + 0,07·(p − 7))', `${f(spA, 2)} kW/(m³/min)`],
          ['Công suất máy nén', 'P = Q × SP', `${f(kw, 1)} kW`],
          ['Bình chứa', `V = 0,25·qc·p1 / (fmax·Δp), fmax = ${f(cyc, 2)}/60 s⁻¹, Δp = ${f(dpt, 2)} bar`, `${f(V, 0)} L`],
          ['Đường kính ống', `d = (450·qc^1,85·L / (Δp·p))^(1/5), L = ${f(leq, 2)} × ống thẳng`, `${f(d, 1)} mm`]
        ],
        notes: [
          'Máy nén biến tần (VSD) giảm 20–35 % điện năng khi nhu cầu dao động; bình chứa có thể nhỏ hơn.',
          'Ống chính nên đi mạch vòng, dốc 1–2 % về phía bẫy nước, nhánh lấy khí từ đỉnh ống.'
        ],
        raw: { Qtk, qs, pc, spA, kw, kwU, V, tank, d, dn: dn ? dn[0] : null }
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
      { id: 'ach', label: 'Bội số trao đổi', unit: 'lần/h', value: 8, show: (v) => v.m === 'ach', hint: 'Theo quy chuẩn/tiêu chuẩn thông gió cho từng loại phòng; tham khảo: xưởng in, dán, cắt 8–12; kho giấy 4–6' },
      { id: 'heat', label: 'Nhiệt cần thải', unit: 'kW', value: 150, show: (v) => v.m === 'heat', hint: 'Phòng máy nén ≈ 90 % kW máy; phòng MBA ≈ tổn thất MBA' },
      { id: 'dt', label: 'Chênh nhiệt độ cho phép', unit: '°C', value: 5, show: (v) => v.m === 'heat' },
      { id: 'ha', label: 'Diện tích miệng chụp', unit: 'm²', value: 1.2, show: (v) => v.m === 'hood' },
      { id: 'hv', label: 'Vận tốc hút tại miệng', unit: 'm/s', value: 0.75, show: (v) => v.m === 'hood', hint: 'Hơi dung môi 0,5–1; bụi giấy 1–2,5' },
      { id: 'hn', label: 'Số chụp hút', value: 4, show: (v) => v.m === 'hood' },
      { id: 'n', label: 'Số quạt', value: 4 },
      { id: 'dps', label: 'Cột áp quạt', unit: 'Pa', value: 400 },
      { id: 'eta', label: 'Hiệu suất quạt', value: 0.65 },
      { id: 'vd', label: 'Vận tốc gió ống chính', unit: 'm/s', value: 10, hint: 'Thông gió 8–12; hút bụi giấy 18–22' },
      U.cfg('Giả thiết tính', 'Theo giả thiết điển hình', 'Tự nhập: khối lượng riêng khí, hệ số động cơ, tỉ lệ ống, gió bù'),
      { id: 'crho', label: 'Khối lượng riêng không khí', unit: 'kg/m³', value: 1.2, show: (v) => custom(v) && v.m === 'heat', hint: '1,20 ở 20 °C; 1,13 ở 40 °C; 1,09 ở 50 °C' },
      { id: 'cmm', label: 'Hệ số dự phòng động cơ quạt', value: 1.15, show: custom, hint: 'Động cơ ≥ hệ số × công suất trục' },
      { id: 'car', label: 'Tỉ lệ cạnh ống chữ nhật (rộng / cao)', value: 2, show: custom },
      { id: 'cmk', label: 'Gió bù so với gió thải', unit: '%', value: 90, show: custom, hint: '< 100 % giữ áp âm nhẹ; phòng sạch dùng > 100 %' }
    ],
    basis: {
      std: [
        'Q = V × ACH; Q = 3600·P / (ρ·cp·ΔT), ρ = 1,2 kg/m³, cp = 1,005 kJ/kg·K; chụp hút Q = 3600·A·v.',
        'Công suất trục quạt P = Q·Δp / η; động cơ ≥ 1,15 × P trục.'
      ],
      assume: ['Ống gió chữ nhật tỉ lệ 2:1, làm tròn lên 50 mm; động cơ ≥ 1,15 × công suất trục; gió bù 90 %.', 'Chế độ tự nhập: đổi được khối lượng riêng không khí (khí nóng), hệ số động cơ, tỉ lệ cạnh ống và tỉ lệ gió bù.'],
      verify: ['Chọn quạt theo đường đặc tính của hãng tại điểm làm việc (Q, Δp).', 'Đo lưu lượng thực tế sau lắp đặt.']
    },
    calc(v, k) {
      guard(v.n < 1 || !(v.eta > 0 && v.eta <= 1) || !(v.vd > 0), 'Số quạt ≥ 1, hiệu suất trong khoảng 0–1, vận tốc > 0.');
      const own = custom(v);
      const rho = own ? v.crho : 1.2, mm = own ? v.cmm : 1.15, ar = own ? v.car : 2, mk = own ? v.cmk : 90;
      guard(own && !(rho > 0 && mm >= 1 && ar >= 1 && mk >= 0), 'Khối lượng riêng > 0; hệ số động cơ ≥ 1; tỉ lệ cạnh ≥ 1; gió bù không được âm.');
      let Q, how;
      if (v.m === 'ach') { Q = v.L * v.W * v.H * v.ach; how = `V × ACH = ${f(v.L * v.W * v.H, 0)} m³ × ${f(v.ach)}`; }
      else if (v.m === 'heat') { guard(v.dt <= 0, 'Chênh nhiệt độ phải lớn hơn 0.'); Q = 3600 * v.heat / (rho * 1.005 * v.dt); how = `Q = 3600·P / (ρ·cp·ΔT), ρ = ${f(rho, 2)}`; }
      else { Q = 3600 * v.ha * v.hv * v.hn; how = 'Q = 3600·A·v·số chụp'; }
      guard(!(Q > 0), 'Lưu lượng tính ra phải lớn hơn 0.');
      const n = Math.round(v.n);
      const Qtk = Q * k, Qf = Qtk / n;
      const kwF = Qf / 3600 * v.dps / v.eta / 1000;
      const mot = U.pick(U.STD.motor, kwF * mm);
      const A = Qtk / 3600 / v.vd;
      const D = Math.ceil(Math.sqrt(4 * A / Math.PI) * 1000 / 50) * 50;
      const h = Math.ceil(Math.sqrt(A / ar) * 1000 / 50) * 50, w = Math.ceil(A / (h / 1000) * 1000 / 50) * 50;
      const Af = Qf / 3600 / v.vd;
      const Df = Math.ceil(Math.sqrt(4 * Af / Math.PI) * 1000 / 50) * 50;
      return {
        tiles: [
          { l: 'Lưu lượng thiết kế', v: f(Qtk, 0), u: 'm³/h', main: true, s: `${f(Qtk * 0.5886, 0)} CFM · ${f(Qtk / 3600, 2)} m³/s` },
          { l: 'Quạt chọn', v: `${n} × ${f(Qf, 0)}`, u: 'm³/h', s: `Cột áp ${f(v.dps)} Pa` },
          { l: 'Động cơ mỗi quạt', v: mot ? `${f(mot)}` : '> 1000', u: 'kW', s: `Công suất trục ${f(kwF, 2)} kW` },
          { l: 'Ống chính tròn', v: `Ø${D}`, u: 'mm' },
          { l: 'Ống chính chữ nhật', v: `${w} × ${h}`, u: 'mm' },
          { l: 'Ống nhánh mỗi quạt', v: `Ø${Df}`, u: 'mm' },
          { l: 'Gió bù (cấp tươi)', v: f(Qtk * mk / 100, 0), u: 'm³/h', s: `≈ ${f(mk)} % gió thải${mk < 100 ? ', giữ áp âm nhẹ' : mk > 100 ? ', giữ áp dương' : ''}` }
        ],
        checks: [
          v.vd >= 15 ? ['ok', 'Vận tốc ống', 'Cao, phù hợp hút bụi (tránh lắng bụi giấy trong ống).']
            : v.vd > 12 ? ['warn', 'Vận tốc ống', '12–15 m/s: hơi ồn cho thông gió chung, lại thấp cho hút bụi.']
              : ['ok', 'Vận tốc ống', 'Phù hợp thông gió chung, độ ồn thấp.'],
          ['warn', 'Khí thải lò hơi, khu sấy', 'Phải đạt quy chuẩn khí thải công nghiệp hiện hành (QCVN của Bộ TN&MT) trước khi xả.']
        ],
        steps: [
          ['Lưu lượng', how, `${f(Q, 0)} m³/h`],
          ['Lưu lượng thiết kế', 'Qtk = Q × k', `${f(Qtk, 0)} m³/h`],
          ['Công suất trục quạt', 'P = Q·Δp / η', `${f(kwF, 2)} kW`],
          ['Động cơ', `Pđc ≥ ${f(mm, 2)} × P trục`, `${f(mot)} kW`],
          ['Tiết diện ống chính', 'A = Q / v', `${f(A, 3)} m²`]
        ],
        notes: [
          'Hút bụi giấy: quạt cánh hướng tâm hoặc cánh mở chống bám, có lọc túi hoặc cyclone; chống cháy nổ bụi theo NFPA 664 nếu bụi mịn.',
          'Quạt nên lắp biến tần để chỉnh lưu lượng theo thực tế.'
        ],
        raw: { Q, Qtk, Qf, kwF, mot, A, D }
      };
    }
  });

  // ================= C-05 Bơm & biến tần =================
  CD.register({
    id: 'bom', group: 'co', code: 'C-05', title: 'Bơm & tiết kiệm bằng biến tần', short: 'Công suất bơm, tiết kiệm biến tần.',
    desc: 'Công suất bơm theo lưu lượng – cột áp, chọn động cơ, đường kính ống hút/đẩy, ước tính tiết kiệm điện khi chạy biến tần.',
    sf: 1.15, sfNote: 'Công suất động cơ ≥ công suất trục × k (nên k ≥ 1,1).',
    inputs: [
      { id: 'q', label: 'Lưu lượng', unit: 'm³/h', value: 120 },
      { id: 'H', label: 'Cột áp', unit: 'm', value: 35 },
      { id: 'rho', label: 'Khối lượng riêng chất lỏng', unit: 'kg/m³', value: 1000, hint: 'Nước 1000; bột giấy loãng 1000–1050' },
      { id: 'ep', label: 'Hiệu suất bơm', value: 0.72, hint: 'Lấy theo đường đặc tính bơm tại điểm làm việc' },
      { id: 'em', label: 'Hiệu suất động cơ', value: 0.94 },
      { id: 'vs', label: 'Vận tốc ống hút', unit: 'm/s', value: 1.2 },
      { id: 'vd', label: 'Vận tốc ống đẩy', unit: 'm/s', value: 2.2 },
      { id: 'sp', label: 'Tốc độ chạy biến tần', unit: '%', value: 80 },
      { id: 'h', label: 'Giờ chạy mỗi năm', unit: 'h', value: 7000 },
      { id: 'price', label: 'Giá điện bình quân', unit: 'đ/kWh', value: 1900 },
      U.cfg('Thiết bị & giả thiết', 'Tự chọn động cơ, giả thiết điển hình', 'Tự nhập: động cơ có sẵn, điện áp, cosφ, hiệu suất biến tần, tiết lưu'),
      { id: 'cmot', label: 'Động cơ bơm có sẵn', unit: 'kW', value: 0, show: custom, hint: 'Cỡ bất kỳ, kể cả trên 1000 kW. 0 = tool chọn theo dãy chuẩn' },
      { id: 'cu', label: 'Điện áp động cơ', unit: 'V', value: 400, show: custom },
      { id: 'cpf', label: 'cosφ động cơ', value: 0.86, show: custom },
      { id: 'cvf', label: 'Hiệu suất biến tần', value: 0.97, show: custom },
      { id: 'cth', label: 'Công suất khi tiết lưu về 0 lưu lượng', unit: '% P100', value: 55, show: custom, hint: 'Đặc tính bơm ly tâm điển hình 50–60 %; lấy theo đường cong công suất của bơm' }
    ],
    basis: {
      std: ['Ph = ρ·g·Q·H; Ps = Ph / ηbơm; Pđiện = Ps / ηđộng cơ.', 'Luật đồng dạng bơm ly tâm: Q ~ n, H ~ n², P ~ n³.'],
      assume: ['Tiết lưu bằng van: P ≈ P100·(0,55 + 0,45·Q/Q100) (bơm ly tâm điển hình); biến tần hiệu suất 97 %; dòng động cơ ở 400 V, cosφ 0,86.', 'Hệ thống chủ yếu tổn thất ma sát (không có cột áp tĩnh lớn).', 'Chế độ tự nhập: kiểm tra động cơ có sẵn (≥ Ps × k là Đạt, ≥ Ps là Lưu ý), đổi được điện áp, cosφ, hiệu suất biến tần và đặc tính tiết lưu.'],
      verify: ['Chọn bơm theo đường đặc tính tại điểm làm việc và kiểm NPSH.', 'Mức tiết kiệm thật cần đo công suất trước và sau khi lắp biến tần.']
    },
    calc(v, k) {
      guard(!(v.ep > 0 && v.ep <= 1 && v.em > 0 && v.em <= 1), 'Hiệu suất phải trong khoảng 0–1.');
      guard(!(v.q > 0 && v.H > 0 && v.rho > 0 && v.vs > 0 && v.vd > 0), 'Lưu lượng, cột áp, khối lượng riêng và vận tốc phải lớn hơn 0.');
      const own = custom(v);
      const Um = own ? v.cu : 400, pf = own ? v.cpf : 0.86, evf = own ? v.cvf : 0.97, a0 = own ? v.cth / 100 : 0.55;
      guard(own && !(v.cmot >= 0 && Um > 0 && pf > 0 && pf <= 1 && evf > 0 && evf <= 1 && a0 >= 0 && a0 <= 1), 'Điện áp > 0; cosφ, hiệu suất biến tần trong khoảng 0–1; công suất tiết lưu trong khoảng 0–100 %.');
      const Ph = v.rho * 9.81 * (v.q / 3600) * v.H / 1000;
      const Ps = Ph / v.ep;
      const mine = own && v.cmot > 0;
      const mot = mine ? v.cmot : U.pick(U.STD.motor, Ps * k);
      guard(!mot, `Cần động cơ ${f(Ps * k, 0)} kW, vượt dãy chuẩn 1000 kW – chọn "Tự nhập" để nhập động cơ có sẵn.`);
      const Pin = Ps / v.em;
      const s = dnFor(v.q, v.vs), d = dnFor(v.q, v.vd);
      const r = v.sp / 100;
      const Pvfd = Pin * Math.pow(r, 3) / evf;
      const Pthr = Pin * (a0 + (1 - a0) * r);
      const save = Math.max(Pthr - Pvfd, 0) * v.h;
      const In = U.current(mot, Um, pf, '3', v.em);
      return {
        tiles: [
          { l: mine ? 'Động cơ bơm kiểm tra' : 'Động cơ bơm', v: `${f(mot)}`, u: 'kW', main: true, s: `Công suất trục ${f(Ps, 2)} kW · I ≈ ${f(In, 1)} A ở ${f(Um)} V${mine ? ' · tự nhập' : ''}` },
          { l: 'Công suất thủy lực', v: f(Ph, 2), u: 'kW' },
          { l: 'Ống hút', v: dnTxt(s), s: s.v ? `v = ${f(s.v, 2)} m/s` : '' },
          { l: 'Ống đẩy', v: dnTxt(d), s: d.v ? `v = ${f(d.v, 2)} m/s` : '' },
          { l: `Công suất ở ${f(v.sp)} % tốc độ`, v: f(Pvfd, 1), u: 'kW', s: `Tiết lưu bằng van: ${f(Pthr, 1)} kW` },
          { l: 'Tiết kiệm nhờ biến tần (ước tính)', v: f(save / 1000, 1), u: 'MWh/năm', s: `≈ ${f(save * v.price / 1e6, 0)} triệu đồng/năm` }
        ],
        checks: [
          mine ? [mot >= Ps * k ? 'ok' : mot >= Ps ? 'warn' : 'bad', 'Động cơ có sẵn', mot >= Ps * k ? `${f(mot)} kW ≥ Ps × k = ${f(Ps * k, 1)} kW` : mot >= Ps ? `${f(mot)} kW ≥ Ps = ${f(Ps, 1)} kW nhưng < Ps × k = ${f(Ps * k, 1)} kW – sát tải, dễ quá tải cuối đường cong` : `${f(mot)} kW < công suất trục ${f(Ps, 1)} kW – động cơ quá tải`]
            : [k >= 1.1 ? 'ok' : 'warn', 'Biên công suất động cơ', k >= 1.1 ? `Động cơ ≥ ${f(k, 2)} × công suất trục.` : 'k < 1,1: động cơ sát công suất trục, dễ quá tải khi bơm chạy cuối đường cong – nên dùng k ≥ 1,1.'],
          [s.v && s.v <= 1.5 ? 'ok' : 'warn', 'Vận tốc ống hút', `${f(s.v, 2)} m/s (≤ 1,5 m/s để tránh xâm thực)`],
          [d.v && d.v <= 3 ? 'ok' : 'warn', 'Vận tốc ống đẩy', `${f(d.v, 2)} m/s (1,5–3 m/s)`]
        ],
        steps: [
          ['Công suất thủy lực', 'Ph = ρ·g·Q·H', `${f(Ph, 3)} kW`],
          ['Công suất trục', 'Ps = Ph / ηb', `${f(Ps, 3)} kW`],
          [mine ? 'Động cơ tự nhập' : 'Động cơ', mine ? 'Pđc (nhập), yêu cầu ≥ Ps × k' : 'Pđc ≥ Ps × k', `${f(mot)} kW`],
          ['Luật đồng dạng', `Q ~ n; H ~ n²; P ~ n³; biến tần η = ${f(evf, 2)}`, `${f(Math.pow(r, 3) * 100, 0)} % công suất`],
          ['Tiết lưu bằng van (ước tính)', `P ≈ P100·(${f(a0, 2)} + ${f(1 - a0, 2)}·Q/Q100)`, `${f(Pthr, 1)} kW`]
        ],
        notes: [
          'Bơm bột giấy nồng độ > 3 % cần hiệu chỉnh hiệu suất theo đặc tính nhà sản xuất bơm.',
          'Kiểm tra NPSH khả dụng > NPSH yêu cầu + 0,5 m, nhất là bơm nước nóng ngưng tụ.'
        ],
        raw: { Ph, Ps, mot, Pin, Pvfd, Pthr, save, In }
      };
    }
  });

  // ================= C-06 Ống hơi =================
  // [áp suất tuyệt đối bar, thể tích riêng m³/kg, nhiệt độ bão hòa °C, ẩn nhiệt kJ/kg] – bảng hơi bão hòa IAPWS-IF97
  const STEAM = [[1, 1.694, 99.6, 2258], [2, 0.8857, 120.2, 2202], [3, 0.6058, 133.5, 2163], [4, 0.4624, 143.6, 2133], [5, 0.3748, 151.8, 2108],
    [6, 0.3156, 158.8, 2086], [7, 0.2728, 165.0, 2066], [8, 0.2403, 170.4, 2048], [9, 0.2149, 175.4, 2031], [10, 0.1944, 179.9, 2015],
    [12, 0.1632, 188.0, 1986], [14, 0.1408, 195.0, 1960], [16, 0.1237, 201.4, 1935], [18, 0.1104, 207.1, 1912], [21, 0.0950, 214.9, 1880]];
  const col = (i) => STEAM.map((r) => [r[0], r[i]]);
  U.STEAM = STEAM;
  CD.register({
    id: 'ong-hoi', group: 'co', code: 'C-06', title: 'Ống hơi & lò hơi', short: 'Cỡ ống hơi, nhiệt lượng, nước ngưng.',
    desc: 'Kích thước ống hơi bão hòa theo lưu lượng – áp suất – vận tốc, nhiệt lượng, nhiệt độ bão hòa và ống nước ngưng hồi.',
    sf: 1.15, sfNote: 'Lưu lượng hơi thiết kế = m × k.',
    inputs: [
      { id: 'm', label: 'Lưu lượng hơi', unit: 'kg/h', value: 8000, hint: 'Máy xeo giấy bao bì ≈ 1,5–2,5 tấn hơi / tấn giấy' },
      { id: 'p', label: 'Áp suất hơi', unit: 'bar', value: 10, hint: 'Áp suất dư (bar g)' },
      { id: 'vel', label: 'Vận tốc hơi', unit: 'm/s', value: 30, hint: 'Ống chính 25–35; ống nhánh 15–25' },
      { id: 'rec', label: 'Tỷ lệ thu hồi nước ngưng', unit: '%', value: 70 },
      U.cfg('Cách chọn ống hơi', 'Tự chọn DN theo vận tốc', 'Tự nhập: chọn cỡ DN để kiểm tra vận tốc'),
      { id: 'cdn', label: 'Cỡ ống hơi chính (Sch40)', type: 'sel', value: '150', show: custom, opts: U.STD.dn.map((x) => [String(x[0]), `DN${x[0]} – d trong ${f(x[1], 1)} mm`]) }
    ],
    basis: {
      std: ['Bảng hơi bão hòa (IAPWS-IF97), nội suy tuyến tính theo áp suất tuyệt đối.', 'd = √(4·V / (π·w)); ống thép Sch40 (ASME B36.10).', 'Nhiệt lượng hữu ích Q = m × r (ẩn nhiệt hóa hơi).'],
      assume: ['Ống nước ngưng chọn theo 5 × lưu lượng nước ở 1,5 m/s để tính hơi tái bay hơi (ước tính).', 'Chế độ tự nhập: kiểm tra vận tốc thực trong cỡ ống DN chọn (≤ 40 m/s).'],
      verify: ['So với bảng hơi: 10 bar g ≈ 184 °C, 0,177 m³/kg, r ≈ 2000 kJ/kg.', 'Kiểm tổn thất áp suất tuyến ống hơi theo hướng dẫn của hãng thiết bị hơi.']
    },
    calc(v, k) {
      const pa = v.p + 1.013;
      guard(pa < 1 || pa > 21, 'Bảng hơi trong tool hỗ trợ áp suất 0–20 bar g.');
      guard(!(v.m > 0 && v.vel > 0), 'Lưu lượng và vận tốc phải lớn hơn 0.');
      const sv = U.interp(col(1), pa), ts = U.interp(col(2), pa), hfg = U.interp(col(3), pa);
      const mtk = v.m * k;
      const m3h = mtk * sv;
      const own = custom(v);
      const auto = dnFor(m3h, v.vel);
      const row = own ? U.STD.dn.find((x) => String(x[0]) === v.cdn) : null;
      const p = row ? { d: auto.d, dn: row[0], id: row[1], v: U.velocity(m3h, row[1]) } : auto;
      const kw = mtk / 3600 * hfg;
      const cond = mtk * v.rec / 100;
      const pc = dnFor(Math.max(cond, 1) / 1000 * 5, 1.5);
      return {
        tiles: [
          { l: row ? 'Ống hơi chính kiểm tra' : 'Ống hơi chính', v: dnTxt(p), main: true, s: `Sch40 · d trong ${p.id ? f(p.id, 1) : '—'} mm · v thực ${f(p.v, 1)} m/s${row ? ` · tool đề xuất ${dnTxt(auto)}` : ''}` },
          { l: 'Lưu lượng hơi thiết kế', v: f(mtk / 1000, 2), u: 't/h' },
          { l: 'Lưu lượng thể tích', v: f(m3h, 0), u: 'm³/h' },
          { l: 'Nhiệt độ bão hòa', v: f(ts, 1), u: '°C', s: `Thể tích riêng ${f(sv, 4)} m³/kg` },
          { l: 'Nhiệt lượng hữu ích', v: f(kw, 0), u: 'kW', s: `Ẩn nhiệt ${f(hfg, 0)} kJ/kg` },
          { l: 'Ống nước ngưng hồi', v: dnTxt(pc), s: `${f(cond / 1000, 2)} t/h · tính dư cho hơi tái bay hơi` }
        ],
        checks: [
          [p.v && p.v <= 40 ? 'ok' : row ? 'bad' : 'warn', 'Vận tốc thực', `${f(p.v, 1)} m/s${p.v > 40 ? ' – cao, gây ồn và mài mòn, tăng cỡ ống' : ' (≤ 40 m/s)'}`],
          [v.rec >= 60 ? 'ok' : 'warn', 'Thu hồi nước ngưng', `${f(v.rec)} %${v.rec < 60 ? ' – tăng thu hồi để giảm nhiên liệu và nước xử lý' : ''}`]
        ],
        steps: [
          ['Áp suất tuyệt đối', 'pa = p + 1,013', `${f(pa, 2)} bar`],
          ['Thể tích riêng (nội suy bảng hơi)', 'v″(pa)', `${f(sv, 4)} m³/kg`],
          ['Lưu lượng thể tích', 'V = m × k × v″', `${f(m3h, 1)} m³/h`],
          ['Đường kính tính', 'd = √(4V / (π·w))', `${f(p.d, 1)} mm`],
          row ? ['Vận tốc trong ống chọn', `w = V / (π·d²/4), DN${row[0]} d = ${f(row[1], 1)} mm`, `${f(p.v, 1)} m/s`] : null,
          ['Nhiệt lượng', 'Q = m × r', `${f(kw, 0)} kW`]
        ].filter(Boolean),
        notes: [
          'Ống hơi đặt dốc 1/100 theo chiều hơi, bẫy hơi mỗi 30–50 m và trước van, điểm nâng.',
          'Bọc cách nhiệt cho toàn bộ ống hơi và nước ngưng nóng.'
        ],
        raw: { pa, sv, ts, hfg, mtk, m3h, d: p.d, dn: p.dn, v: p.v, kw }
      };
    }
  });

  // ================= C-07 Chiếu sáng nhà xưởng =================
  const UF = [[0.6, 0.38], [0.8, 0.45], [1, 0.5], [1.25, 0.55], [1.5, 0.59], [2, 0.64], [2.5, 0.68], [3, 0.71], [4, 0.74], [5, 0.76]];
  CD.register({
    id: 'chieu-sang', group: 'co', code: 'C-07', title: 'Chiếu sáng nhà xưởng', short: 'Số đèn theo độ rọi yêu cầu.',
    desc: 'Số đèn theo phương pháp quang thông (chỉ số phòng, hệ số sử dụng, hệ số duy trì), bố trí lưới đèn, mật độ công suất.',
    sf: 1.1, sfNote: 'Số đèn = tính toán × k.',
    inputs: [
      { id: 'L', label: 'Chiều dài xưởng', unit: 'm', value: 72 },
      { id: 'W', label: 'Chiều rộng xưởng', unit: 'm', value: 36 },
      { id: 'h', label: 'Độ cao đèn so với mặt làm việc', unit: 'm', value: 8 },
      { id: 'E', label: 'Độ rọi yêu cầu', unit: 'lux', value: 300, hint: 'Tra QCVN 22:2016/BYT theo công việc; tham khảo: sản xuất giấy 300, kho 150–200, văn phòng 500' },
      { id: 'phi', label: 'Quang thông mỗi đèn', unit: 'lm', value: 21000, hint: 'Theo catalogue đèn; highbay LED 150 W ≈ 20.000–22.000 lm' },
      { id: 'w', label: 'Công suất mỗi đèn', unit: 'W', value: 150 },
      { id: 'mf', label: 'Hệ số duy trì', value: 0.7, hint: 'Xưởng nhiều bụi giấy 0,6–0,7' },
      U.cfg('Giả thiết tính', 'Bảng hệ số sử dụng điển hình', 'Tự nhập: hệ số sử dụng U, số hàng đèn, dòng MCB, cosφ đèn'),
      { id: 'cuf', label: 'Hệ số sử dụng U', value: 0, show: custom, hint: '0 = tra bảng điển hình theo chỉ số phòng. Có file IES/LDT thì lấy theo DIALux' },
      { id: 'crow', label: 'Số hàng đèn', value: 0, show: custom, hint: 'Theo bước cột, kèo nhà xưởng. 0 = tool tự bố trí' },
      { id: 'cmcb', label: 'Dòng MCB mỗi mạch đèn', unit: 'A', value: 16, show: custom },
      { id: 'cpf', label: 'Hệ số công suất đèn', value: 0.95, show: custom }
    ],
    basis: {
      std: ['Phương pháp quang thông: N = E·A / (Φ·U·MF); chỉ số phòng K = D·R / (h·(D + R)).', 'Độ rọi yêu cầu: QCVN 22:2016/BYT.'],
      assume: ['Hệ số sử dụng U lấy theo bảng điển hình cho đèn highbay, phản xạ trần/tường thấp.', 'Mỗi mạch đèn mang 80 % dòng MCB 16 A, 230 V, cosφ 0,95.', 'Chế độ tự nhập: hệ số sử dụng U theo tính toán quang học, số hàng đèn theo kết cấu nhà xưởng, MCB và cosφ của đèn.'],
      verify: ['Mô phỏng bằng DIALux/Relux với file IES/LDT của đèn thực tế.', 'Đo độ rọi sau lắp đặt.']
    },
    calc(v, k) {
      guard(v.L <= 0 || v.W <= 0 || v.h <= 0 || v.phi <= 0 || v.w <= 0 || !(v.mf > 0 && v.mf <= 1), 'Kích thước, quang thông, công suất phải lớn hơn 0; hệ số duy trì trong khoảng 0–1.');
      const own = custom(v);
      guard(own && !(v.cuf >= 0 && v.cuf <= 1 && v.crow >= 0 && v.cmcb > 0 && v.cpf > 0 && v.cpf <= 1), 'Hệ số sử dụng, hệ số công suất trong khoảng 0–1; dòng MCB phải lớn hơn 0.');
      const A = v.L * v.W, K = A / (v.h * (v.L + v.W));
      const myUf = own && v.cuf > 0;
      const uf = myUf ? v.cuf : U.interp(UF, K);
      const N0 = v.E * A / (v.phi * uf * v.mf), Ntk = N0 * k;
      const rows = own && v.crow > 0 ? Math.round(v.crow) : Math.max(1, Math.round(Math.sqrt(Ntk * v.W / v.L)));
      const cols = Math.max(1, Math.ceil(Ntk / rows));
      const N = rows * cols;
      const Ereal = N * v.phi * uf * v.mf / A;
      const sx = v.L / cols, sy = v.W / rows;
      const kw = N * v.w / 1000;
      const mcb = own ? v.cmcb : 16, pfl = own ? v.cpf : 0.95;
      const per = Math.max(1, Math.floor(0.8 * mcb * 230 * pfl / v.w));
      return {
        tiles: [
          { l: 'Số đèn bố trí', v: `${N}`, u: 'bộ', main: true, s: `${rows} hàng × ${cols} cột · khoảng cách ${f(sx, 1)} × ${f(sy, 1)} m` },
          { l: 'Độ rọi đạt được', v: f(Ereal, 0), u: 'lux', s: `Yêu cầu ${f(v.E)} lux` },
          { l: 'Tổng công suất', v: f(kw, 1), u: 'kW', s: `${f(kw * 1000 / A, 1)} W/m²` },
          { l: 'Chỉ số phòng K', v: f(K, 2), s: `Hệ số sử dụng U = ${f(uf, 2)}${myUf ? ' (nhập)' : ''}` },
          { l: `Đèn mỗi mạch MCB ${f(mcb)} A`, v: `${per}`, u: 'bộ', s: `≈ ${Math.ceil(N / per)} mạch, chia đều 3 pha` }
        ],
        checks: [
          [Ereal >= v.E ? 'ok' : 'bad', 'Độ rọi', `${f(Ereal, 0)} lux ≥ ${f(v.E)} lux`],
          [Math.max(sx, sy) <= 1.5 * v.h ? 'ok' : 'warn', 'Độ đồng đều', `Khoảng cách đèn lớn nhất ${f(Math.max(sx, sy), 1)} m ${Math.max(sx, sy) <= 1.5 * v.h ? '≤' : '>'} 1,5 × h = ${f(1.5 * v.h, 1)} m`]
        ],
        steps: [
          ['Diện tích', 'A = D × R', `${f(A, 0)} m²`],
          ['Chỉ số phòng', 'K = D·R / (h·(D + R))', f(K, 3)],
          ['Hệ số sử dụng', myUf ? 'Nhập theo tính toán quang học' : 'Tra theo K (đèn highbay, trần tối)', f(uf, 3)],
          ['Số đèn tính toán', 'N = E·A / (Φ·U·MF)', f(N0, 1)],
          ['Số đèn thiết kế', 'N × k → bố trí lưới', `${N} bộ`]
        ],
        notes: [
          'Dùng đèn LED IP65 cho khu máy xeo ẩm, có cảm biến hoặc điều khiển theo khu để tiết kiệm.',
          'Bố trí đèn sự cố và đèn exit theo quy định PCCC.'
        ],
        raw: { A, K, uf, N0, N, Ereal, kw }
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
  U.CONV = CONV;
  function toC(x, u) { return u === '°F' ? (x - 32) * 5 / 9 : u === 'K' ? x - 273.15 : x; }
  function fromC(c, u) { return u === '°F' ? c * 9 / 5 + 32 : u === 'K' ? c + 273.15 : c; }
  CD.register({
    id: 'quy-doi', group: 'co', code: 'C-08', title: 'Quy đổi đơn vị', short: 'Công suất, áp suất, lưu lượng, nhiệt độ.',
    desc: 'Đổi nhanh công suất, năng suất lạnh, áp suất, lưu lượng, năng lượng, nhiệt độ hay gặp trong cơ điện.',
    sf: null,
    inputs: [
      { id: 'cat', label: 'Loại đại lượng', type: 'sel', value: 'pw', opts: Object.entries(CONV).map(([a, b]) => [a, b.n]) },
      { id: 'x', label: 'Giá trị', value: 100 },
      { id: 'u', label: 'Đơn vị', type: 'sel', value: 'kW', opts: (v) => Object.keys(CONV[v.cat].u).map((x) => [x, x]) }
    ],
    basis: {
      std: ['1 HP = 745,7 W; 1 CV = 735,5 W; 1 BTU/h = 0,29307 W; 1 RT = 3517 W; 1 kcal/h = 1,163 W.', '1 psi = 6894,76 Pa; 1 kgf/cm² = 98 066,5 Pa; 1 atm = 101 325 Pa; 1 CFM = 0,4719 L/s; 1 GPM (Mỹ) = 0,06309 L/s; 1 kcal = 4186,8 J.'],
      assume: [],
      verify: ['So với bảng quy đổi chuẩn (NIST SP 811).']
    },
    calc(v) {
      const c = CONV[v.cat];
      const unit = c.u[v.u] !== undefined ? v.u : Object.keys(c.u)[0];
      const tiles = [];
      if (v.cat === 'tp') {
        const C = toC(v.x, unit);
        for (const u of Object.keys(c.u)) tiles.push({ l: u, v: f(fromC(C, u), 2), main: u === unit });
      } else {
        const base = v.x * c.u[unit];
        for (const [u, m] of Object.entries(c.u)) {
          const val = base / m;
          tiles.push({ l: u, v: Math.abs(val) >= 1e-3 || val === 0 ? f(val, Math.abs(val) < 1 ? 6 : 3) : val.toExponential(3), main: u === unit });
        }
      }
      tiles.sort((a, b) => (b.main ? 1 : 0) - (a.main ? 1 : 0));
      return {
        tiles,
        notes: ['1 RT = 12.000 BTU/h = 3,517 kW; 1 HP = 0,7457 kW; 1 bar ≈ 10,2 mH2O ≈ 14,5 psi; 1 m³/min ≈ 35,3 CFM.']
      };
    }
  });
})();
