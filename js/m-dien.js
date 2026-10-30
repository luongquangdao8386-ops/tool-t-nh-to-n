/* Nhóm ĐIỆN ĐỘNG LỰC: Đ-01 … Đ-06 */
(function () {
  'use strict';
  const { U } = CD;
  const f = U.f, SQ3 = U.SQ3;

  // ---------- Dòng cho phép cáp đồng nhiều lõi, 3 ruột mang tải – IEC 60364-5-52:2009 ----------
  // PVC (70 °C): bảng B.52.4 · XLPE (90 °C): bảng B.52.5. Không khí chuẩn 30 °C, đất chuẩn 20 °C.
  // B2: cáp nhiều lõi trong ống / máng kín · C: kẹp trực tiếp lên tường · E: ngoài không khí, máng đục lỗ, thang · D: D1 trong ống chôn đất.
  // Cỡ: 1,5 · 2,5 · 4 · 6 · 10 · 16 · 25 · 35 · 50 · 70 · 95 · 120 · 150 · 185 · 240 · 300 mm².
  const AMP = {
    PVC: {
      B2: [15, 20, 27, 34, 46, 62, 80, 99, 118, 149, 179, 206, 225, 255, 297, 339],
      C: [17.5, 24, 32, 41, 57, 76, 96, 119, 144, 184, 223, 259, 299, 341, 403, 464],
      E: [18.5, 25, 34, 43, 60, 80, 101, 126, 153, 196, 238, 276, 319, 364, 430, 497],
      D: [18, 24, 30, 38, 50, 64, 82, 98, 116, 143, 169, 192, 217, 243, 280, 316]
    },
    XLPE: {
      B2: [19.5, 26, 35, 44, 60, 80, 105, 128, 154, 194, 233, 268, 300, 340, 398, 455],
      C: [22, 30, 40, 51, 70, 94, 119, 147, 179, 229, 278, 322, 371, 424, 500, 576],
      E: [23, 32, 42, 54, 75, 100, 127, 158, 192, 246, 298, 346, 399, 456, 538, 621],
      D: [21, 28, 36, 44, 58, 75, 96, 115, 135, 167, 197, 223, 251, 281, 324, 365]
    }
  };
  const K_AL = 0.75;      // nhôm so với đồng (IEC cho ≈ 0,76–0,78; lấy thấp để thiên an toàn)
  const K_1PH = 1.10;     // mạch 1 pha (2 ruột mang tải) so với 3 ruột (IEC cho 1,10–1,20; lấy thấp)

  // Hệ số nhóm mạch: [số mạch, hệ số] – IEC 60364-5-52 bảng B.52.17 (mục 1, 2, 4) và B.52.19 (ống chôn đất, sát nhau)
  const GROUP = {
    bunch: [[1, 1], [2, 0.8], [3, 0.7], [4, 0.65], [5, 0.6], [6, 0.57], [7, 0.54], [8, 0.52], [9, 0.5], [12, 0.45], [16, 0.41], [20, 0.38]],
    wall: [[1, 1], [2, 0.85], [3, 0.79], [4, 0.75], [5, 0.73], [6, 0.72], [7, 0.72], [8, 0.71], [9, 0.7]],
    tray: [[1, 1], [2, 0.88], [3, 0.82], [4, 0.77], [5, 0.75], [6, 0.73], [7, 0.73], [8, 0.72], [9, 0.72]],
    duct: [[1, 1], [2, 0.85], [3, 0.75], [4, 0.7], [5, 0.65], [6, 0.6]]
  };
  const GROUP_NAME = {
    bunch: 'bó chung / nhiều lớp / trong ống, máng kín',
    wall: 'một lớp áp tường',
    tray: 'một lớp trên máng đục lỗ',
    duct: 'ống chôn đất đặt sát nhau'
  };
  // Lấy hệ số của hàng có số mạch ≥ n (không nội suy, thiên an toàn).
  // Một lớp (wall, tray): IEC không giảm thêm khi quá 9 mạch. Bó chung quá 20, ống quá 6: ngoài bảng → null.
  function groupFactor(kind, n) {
    const t = GROUP[kind];
    for (const r of t) if (r[0] >= n) return r[1];
    return kind === 'wall' || kind === 'tray' ? t[t.length - 1][1] : null;
  }

  const SIZES = U.STD.cable;
  const RHO = { Cu: 0.0225, Al: 0.036 };          // Ω·mm²/m ở nhiệt độ làm việc – IEC 60364-5-52 phụ lục G
  const XL = 0.08e-3;                             // Ω/m – IEC 60364-5-52 phụ lục G
  const KSC = { Cu: { PVC: 115, XLPE: 143 }, Al: { PVC: 76, XLPE: 94 } }; // IEC 60364-4-43 bảng 43A
  const MET_LABEL = {
    B2: 'B2 – trong ống / máng kín',
    C: 'C – kẹp trực tiếp lên tường, trần',
    E: 'E – máng đục lỗ, thang cáp, không khí',
    D: 'D1 – trong ống chôn đất'
  };
  const AMP_TABLE = (ins) => (ins === 'PVC' ? 'B.52.4' : 'B.52.5');

  function izBase(i, mat, ins, met, pha) {
    return AMP[ins][met][i] * (mat === 'Al' ? K_AL : 1) * (pha === '1' ? K_1PH : 1);
  }
  // Hệ số nhiệt độ: √((θmax − θ)/(θmax − θchuẩn)) – trùng bảng B.52.14 (không khí) và B.52.15 (đất)
  function kTemp(ins, ta, ref) {
    const tmax = ins === 'XLPE' ? 90 : 70;
    if (ta >= tmax) return NaN;
    return Math.sqrt((tmax - ta) / (tmax - ref));
  }
  // Chọn cáp theo dòng yêu cầu (đã chia hệ số hiệu chỉnh); o.min = tiết diện tối thiểu (mm²)
  function cableFor(Ireq, o) {
    o = Object.assign({ mat: 'Cu', ins: 'XLPE', met: 'B2', pha: '3', min: 0 }, o);
    let i0 = o.mat === 'Al' ? 5 : 0;
    if (o.min) i0 = Math.max(i0, SIZES.findIndex((x) => x >= o.min));
    for (let i = i0; i < SIZES.length; i++) {
      const iz = izBase(i, o.mat, o.ins, o.met, o.pha);
      if (iz >= Ireq) return { S: SIZES[i], Iz: iz, np: 1 };
    }
    const iz240 = izBase(14, o.mat, o.ins, o.met, o.pha);
    return { S: 240, Iz: iz240, np: Math.ceil(Ireq / iz240) };
  }
  // Chọn cáp nhanh cho mạch động lực trong xưởng (thiên an toàn):
  // Cu/XLPE nhiều lõi trong ống / máng kín (B2), 40 °C, 2 mạch bó chung (0,8), tối thiểu 2,5 mm²; Iz đã hiệu chỉnh ≥ I.
  function cableQuick(I, o) {
    o = Object.assign({ ins: 'XLPE', met: 'B2', min: 2.5 }, o);
    const k1 = kTemp(o.ins, 40, 30), k2 = 0.8;
    const c = cableFor(I / (k1 * k2), o);
    c.IzCorr = c.Iz * k1 * k2 * c.np;
    return c;
  }
  const QUICK_NOTE = 'trong ống/máng kín, 40 °C, 2 mạch bó chung, tối thiểu 2,5 mm²';
  // Dây bảo vệ PE – IEC 60364-5-54 bảng 54.2
  function peSize(Sph) {
    const s = Sph <= 16 ? Sph : Sph <= 35 ? 16 : Sph / 2;
    return U.pick(SIZES, s) || s;
  }
  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  function sci(x) {
    const e = Math.floor(Math.log10(x));
    return `${f(x / Math.pow(10, e), 1)}·10${String(e).split('').map((c) => SUP[c]).join('')}`;
  }
  const cableTxt = (c) => (c.np > 1 ? `${c.np} × ${f(c.S)} mm²/pha` : `${f(c.S)} mm²`);

  // ---------- Ngắn mạch 3 pha phía hạ thế – IEC 60909-0 ----------
  // o: sn (kVA), uk (%), pk (kW, 0 = ước tính 0,9 % Sn), un (V), skq (MVA lưới trung thế, 0 = vô cùng lớn). Kết quả mΩ.
  function ikNet(o) {
    const c = 1.05, Un = o.un;
    const ZQ = o.skq > 0 ? c * Un * Un / (o.skq * 1e6) * 1000 : 0;
    const XQ = 0.995 * ZQ, RQ = 0.1 * XQ;
    const pk = o.pk > 0 ? o.pk : 0.009 * o.sn;
    const Zb = Un * Un / (o.sn * 1000) * 1000;
    const ZT = o.uk / 100 * Zb;
    const RT0 = pk * 1000 * Un * Un / Math.pow(o.sn * 1000, 2) * 1000;
    const XT0 = Math.sqrt(Math.max(ZT * ZT - RT0 * RT0, 0));
    const KT = 0.95 * c / (1 + 0.6 * XT0 / Zb);               // hệ số hiệu chỉnh MBA, IEC 60909-0 (12a)
    const RT = RT0 * KT, XT = XT0 * KT;
    return { c, Un, pk, ZQ, RQ, XQ, ZT, RT0, XT0, KT, RT, XT, R: RQ + RT, X: XQ + XT };
  }
  const ikOf = (c, Un, R, X) => c * Un / (SQ3 * Math.hypot(R, X));   // kA khi R, X tính bằng mΩ
  const kappa = (R, X) => 1.02 + 0.98 * Math.exp(-3 * R / X);
  // Ik đầu cực MBA, lưới vô cùng lớn (dùng cho T-01, T-03)
  function ikTrafo(sn, uk, un) {
    const n = ikNet({ sn, uk, pk: 0, un, skq: 0 });
    return { Ik: ikOf(n.c, un, n.R, n.X), ip: kappa(n.R, n.X) * Math.SQRT2 * ikOf(n.c, un, n.R, n.X), KT: n.KT };
  }
  // Uk tối thiểu của MBA hai cuộn dây – IEC 60076-5 bảng 1
  const ukIEC = (sn) => (sn <= 630 ? 4 : sn <= 1250 ? 5 : sn <= 2500 ? 6 : sn <= 6300 ? 7 : 8);

  Object.assign(U, { izBase, kTemp, cableFor, cableQuick, peSize, cableTxt, sci, groupFactor, ikNet, ikOf, kappa, ikTrafo, ukIEC, AMP, K_AL, K_1PH, QUICK_NOTE });

  // Dòng điện từ công suất
  function current(Pkw, Uv, cos, pha, eta = 1) {
    return pha === '1' ? Pkw * 1000 / (Uv * cos * eta) : Pkw * 1000 / (SQ3 * Uv * cos * eta);
  }
  U.current = current;

  const PHA = { id: 'pha', label: 'Số pha', type: 'sel', value: '3', opts: [['3', '3 pha'], ['1', '1 pha']] };
  const U3 = { id: 'u3', label: 'Điện áp dây', unit: 'V', value: 400, show: (v) => v.pha === '3' };
  const U1 = { id: 'u1', label: 'Điện áp pha', unit: 'V', value: 230, show: (v) => v.pha === '1' };
  const uOf = (v) => (v.pha === '1' ? v.u1 : v.u3);
  const guard = (cond, msg) => { if (cond) throw new Error(msg); };

  // ================= Đ-01 Tính dòng điện =================
  const isMotor = (v) => v.mode === 'motor' || v.mode === 'hp';
  CD.register({
    id: 'dong-dien', group: 'dien', code: 'Đ-01', title: 'Tính dòng điện', short: 'Dòng tải từ kW, kVA hoặc HP.',
    desc: 'Dòng làm việc của động cơ hoặc tải thường từ kW, HP, kVA; công suất S, P, Q, dòng thiết kế có hệ số an toàn, aptomat và cáp sơ bộ.',
    sf: 1.25, sfNote: 'Itk = Ib × k → aptomat In ≥ Itk → cáp phải chịu được In (Ib ≤ In ≤ Iz).',
    inputs: [
      { id: 'mode', label: 'Dữ liệu đã biết', type: 'sel', value: 'motor', opts: [['motor', 'Động cơ – công suất trục (kW)'], ['hp', 'Động cơ – công suất (HP)'], ['kw', 'Tải thường – công suất P (kW)'], ['kva', 'Công suất biểu kiến S (kVA)']] },
      PHA, U3, U1,
      { id: 'p', label: 'Công suất P', unit: 'kW', value: 7.5, show: (v) => v.mode === 'motor' || v.mode === 'kw' },
      { id: 's', label: 'Công suất S', unit: 'kVA', value: 100, show: (v) => v.mode === 'kva' },
      { id: 'hp', label: 'Công suất động cơ', unit: 'HP', value: 10, show: (v) => v.mode === 'hp' },
      { id: 'cos', label: 'Hệ số công suất cosφ', value: 0.85, hint: 'Lấy theo nhãn; động cơ 4 cực 0,80–0,87; tải điện trở = 1' },
      { id: 'etam', label: 'Hiệu suất động cơ η', value: 0.9, show: isMotor, hint: 'Lấy theo nhãn; IE3 4 cực: 4 kW ≈ 0,88; 7,5 kW ≈ 0,90; 15 kW ≈ 0,92; 55 kW ≈ 0,945' },
      { id: 'eta', label: 'Hiệu suất η', value: 1, show: (v) => v.mode === 'kw', hint: 'Sấy điện trở, chiếu sáng, tải thuần = 1' }
    ],
    basis: {
      std: [
        'Dòng xoay chiều: I = S / (√3·U) (3 pha), I = S / U (1 pha); S = P / cosφ; Q = √(S² − P²).',
        'Điều kiện bảo vệ quá tải Ib ≤ In ≤ Iz – IEC 60364-4-43.',
        'Cáp chọn nhanh tra IEC 60364-5-52:2009 bảng B.52.5 cột B2, hệ số nhiệt độ bảng B.52.14.'
      ],
      assume: [
        'Cáp chọn nhanh: Cu/XLPE nhiều lõi trong ống / máng kín, 40 °C, 2 mạch bó chung (0,8), tối thiểu 2,5 mm².',
        'Động cơ: công suất nhập là công suất trục trên nhãn; điện vào = Ptrục / η.'
      ],
      verify: [
        'So dòng Ib với dòng định mức ghi trên nhãn động cơ (thường lệch < 5 % nếu nhập đúng η, cosφ).',
        'Tính tay lại theo bảng "Diễn giải công thức".',
        'Cáp cần tính đúng cách lắp, chiều dài, ngắn mạch ở Đ-02.'
      ]
    },
    calc(v, k) {
      const Uv = uOf(v);
      guard(!(v.cos > 0 && v.cos <= 1), 'cosφ phải trong khoảng 0–1.');
      guard(Uv <= 0, 'Điện áp phải lớn hơn 0.');
      const motor = isMotor(v);
      const eta = motor ? v.etam : v.eta;
      let P, S, Pm = 0;
      if (v.mode === 'kva') { S = v.s; P = S * v.cos; }
      else {
        guard(!(eta > 0 && eta <= 1), 'Hiệu suất η phải trong khoảng 0–1.');
        Pm = v.mode === 'hp' ? v.hp * 0.7457 : v.p;
        P = Pm / eta; S = P / v.cos;
      }
      guard(!(S > 0), 'Công suất phải lớn hơn 0.');
      const Q = Math.sqrt(Math.max(S * S - P * P, 0));
      const I = v.pha === '1' ? S * 1000 / Uv : S * 1000 / (SQ3 * Uv);
      const Itk = I * k;
      const In = U.pick(U.STD.breaker, Itk);
      const cab = cableQuick(In || Itk, { pha: v.pha });
      const checks = [];
      if (In) checks.push([cab.IzCorr >= In ? 'ok' : 'bad', 'Bảo vệ cáp', `Itk = ${f(Itk, 1)} A ≤ In = ${In} A ≤ Iz = ${f(cab.IzCorr, 0)} A`]);
      else checks.push(['bad', 'Dòng quá lớn', 'Vượt 6300 A – chia thành nhiều lộ.']);
      if (motor) checks.push(['warn', 'Động cơ khởi động trực tiếp', 'Dòng khởi động 6–8 × Ib: dùng aptomat bảo vệ động cơ hoặc đường cong D. Contactor, rơ le nhiệt tính ở Đ-05.']);
      return {
        tiles: [
          { l: 'Dòng thiết kế Itk = Ib × k', v: f(Itk, 1), u: 'A', main: true, s: `Dòng làm việc Ib = ${f(I, 1)} A` },
          { l: 'Công suất biểu kiến S', v: f(S, 1), u: 'kVA' },
          { l: 'Công suất điện vào P', v: f(P, 1), u: 'kW', s: motor ? `Trục ${f(Pm, 2)} kW, η = ${f(eta, 2)}` : '' },
          { l: 'Công suất phản kháng Q', v: f(Q, 1), u: 'kVAr' },
          { l: 'Aptomat sơ bộ', v: In ? `${In}` : '> 6300', u: 'A', s: In ? (motor ? `${U.breakerType(In)} bảo vệ động cơ` : U.breakerType(In)) : 'Chia lộ' },
          { l: 'Cáp Cu/XLPE sơ bộ', v: cableTxt(cab), s: `Chịu được In · ${QUICK_NOTE}` }
        ],
        checks,
        steps: [
          v.mode === 'hp' ? ['Đổi HP → kW', 'Ptrục = HP × 0,7457', `${f(Pm, 2)} kW`] : null,
          v.mode !== 'kva' ? ['Công suất điện vào', 'P = Ptrục / η', `${f(P, 2)} kW`] : null,
          ['Công suất biểu kiến', v.mode === 'kva' ? 'S (đã biết)' : 'S = P / cosφ', `${f(S, 2)} kVA`],
          ['Công suất phản kháng', 'Q = √(S² − P²)', `${f(Q, 2)} kVAr`],
          ['Dòng làm việc', v.pha === '1' ? 'Ib = S / U' : 'Ib = S / (√3 × U)', `${f(I, 2)} A`],
          ['Dòng thiết kế', 'Itk = Ib × k', `${f(Itk, 2)} A`],
          In ? ['Aptomat', 'In ≥ Itk (dãy chuẩn)', `${In} A`] : null,
          ['Cáp sơ bộ', 'Iz(B2) × 0,91 (40 °C) × 0,8 (2 mạch) ≥ In; ≥ 2,5 mm²', cableTxt(cab)]
        ].filter(Boolean),
        notes: [
          'Cáp phải chịu được dòng định mức aptomat (Ib ≤ In ≤ Iz), không chỉ dòng tải.',
          'Aptomat và cáp ở đây là chọn nhanh; dùng Đ-02 để tính theo cách lắp thực tế, số mạch đi chung, chiều dài (sụt áp) và ngắn mạch.'
        ],
        raw: { I, Itk, S, P, Q, In, cabS: cab.S, cabNp: cab.np }
      };
    }
  });

  // ================= Đ-02 Tiết diện dây & sụt áp =================
  CD.register({
    id: 'tiet-dien-day', group: 'dien', code: 'Đ-02', title: 'Tiết diện dây & sụt áp', short: 'Chọn cáp, kiểm tra tải và sụt áp.',
    desc: 'Chọn tiết diện cáp theo dòng cho phép (hiệu chỉnh nhiệt độ, số mạch đi chung), sụt áp và ổn định nhiệt ngắn mạch.',
    sf: 1.25, sfNote: 'Itk = Ib × k → aptomat In ≥ Itk → cáp phải chịu được In (Ib ≤ In ≤ Iz); sụt áp tính theo Itk.',
    inputs: [
      PHA,
      { id: 'circ', label: 'Loại mạch', type: 'sel', value: 'pow', opts: [['pow', 'Động lực (tối thiểu 2,5 mm²)'], ['light', 'Chiếu sáng, điều khiển (tối thiểu 1,5 mm²)']] },
      { id: 'src', label: 'Dữ liệu tải', type: 'sel', value: 'I', opts: [['I', 'Biết dòng tải Ib'], ['P', 'Biết công suất P']] },
      { id: 'ib', label: 'Dòng tải Ib', unit: 'A', value: 180, show: (v) => v.src === 'I' },
      { id: 'p', label: 'Công suất P', unit: 'kW', value: 90, show: (v) => v.src === 'P' },
      U3, U1,
      { id: 'cos', label: 'cosφ', value: 0.85 },
      { id: 'mat', label: 'Vật liệu ruột', type: 'sel', value: 'Cu', opts: [['Cu', 'Đồng (Cu)'], ['Al', 'Nhôm (Al)']] },
      { id: 'ins', label: 'Cách điện', type: 'sel', value: 'XLPE', opts: [['XLPE', 'XLPE (90 °C)'], ['PVC', 'PVC (70 °C)']] },
      { id: 'met', label: 'Cách lắp đặt (IEC 60364-5-52)', type: 'sel', value: 'E', opts: [['B2', MET_LABEL.B2], ['C', MET_LABEL.C], ['E', MET_LABEL.E], ['D', MET_LABEL.D]] },
      { id: 'arr', label: 'Cách xếp các cáp đi chung', type: 'sel', value: 'bunch', show: (v) => v.met === 'C' || v.met === 'E', opts: [['bunch', 'Bó chung hoặc nhiều lớp (thiên an toàn)'], ['single', 'Một lớp, các cáp đặt sát nhau']] },
      { id: 'ta', label: 'Nhiệt độ không khí', unit: '°C', value: 40, show: (v) => v.met !== 'D', hint: 'Xưởng giấy gần máy xeo, lò hơi: 40–45 °C' },
      { id: 'tg', label: 'Nhiệt độ đất', unit: '°C', value: 30, show: (v) => v.met === 'D' },
      { id: 'n', label: 'Số mạch đi chung', value: 3, hint: 'Gồm cả mạch đang tính và các sợi song song (đếm theo cáp nhiều lõi)' },
      { id: 'np', label: 'Số sợi song song mỗi pha', value: 1 },
      { id: 'L', label: 'Chiều dài tuyến cáp', unit: 'm', value: 120, hint: 'Một chiều, từ tủ đến tải' },
      { id: 'du', label: 'Sụt áp cho phép', unit: '%', value: 5, hint: 'Khuyến nghị ≤ 5 %. IEC giới hạn: lưới công cộng 3 % chiếu sáng, 5 % động lực; trạm riêng 6 % / 8 %' },
      { id: 'prot', label: 'Thiết bị cắt ngắn mạch', type: 'sel', value: 'auto', opts: [['auto', 'Tự chọn theo aptomat (≤ 630 A cắt tức thời)'], ['limit', 'MCB / MCCB cắt tức thời, hạn dòng'], ['delay', 'ACB hoặc aptomat có trễ thời gian']] },
      { id: 'ik', label: 'Dòng ngắn mạch đầu cáp', unit: 'kA', value: 25, hint: 'Lấy từ Đ-04; nhập 0 nếu bỏ qua kiểm tra' },
      { id: 'tk', label: 'Thời gian trễ cắt', unit: 's', value: 0.2, show: (v) => v.prot !== 'limit', hint: 'Chỉ dùng khi aptomat có trễ thời gian' }
    ],
    basis: {
      std: [
        'Dòng cho phép: IEC 60364-5-52:2009 bảng B.52.4 (PVC) và B.52.5 (XLPE), cáp nhiều lõi, 3 ruột mang tải.',
        'Hệ số nhiệt độ: bảng B.52.14 (không khí, chuẩn 30 °C) và B.52.15 (đất, chuẩn 20 °C).',
        'Hệ số nhóm: bảng B.52.17 (bó chung; một lớp áp tường; một lớp trên máng đục lỗ) và B.52.19 (ống chôn đất sát nhau).',
        'Sụt áp: IEC 60364-5-52 phụ lục G, ρ = 0,0225 (Cu) / 0,036 (Al) Ω·mm²/m, x = 0,08 mΩ/m.',
        'Bảo vệ: Ib ≤ In ≤ Iz và S ≥ Ik·√t / K (K = 115/143 Cu, 76/94 Al) – IEC 60364-4-43. Dây PE: IEC 60364-5-54 bảng 54.2.'
      ],
      assume: [
        'Mạch 1 pha lấy 1,10 × giá trị 3 ruột mang tải; cáp nhôm lấy 0,75 × cáp đồng (cả hai thấp hơn bảng IEC, thiên an toàn).',
        'Số mạch không có trong bảng: lấy hệ số của hàng lớn hơn kế tiếp, không nội suy.',
        'Aptomat chọn theo dãy chuẩn In ≥ Itk; cáp chịu được In.'
      ],
      verify: [
        'Dòng "Iz một sợi (bảng)" phải trùng bảng IEC hoặc catalogue hãng cáp (Cadivi, LS Vina…) cùng cách lắp, cùng 30 °C.',
        'Các giá trị bảng được đối chiếu tự động ở trang Kiểm chứng.',
        'Sụt áp tính tay: ΔU = √3·I·L·(R·cosφ + X·sinφ).'
      ]
    },
    calc(v, k) {
      const Uv = uOf(v);
      guard(!(v.cos > 0 && v.cos <= 1), 'cosφ phải trong khoảng 0–1.');
      guard(v.n < 1 || v.np < 1, 'Số mạch và số sợi song song tối thiểu là 1.');
      guard(!(v.L >= 0), 'Chiều dài không hợp lệ.');
      const Ib = v.src === 'I' ? v.ib : current(v.p, Uv, v.cos, v.pha);
      guard(!(Ib > 0), 'Dòng tải phải lớn hơn 0.');
      const Itk = Ib * k;
      const ref = v.met === 'D' ? 20 : 30;
      const ta = v.met === 'D' ? v.tg : v.ta;
      const kt = kTemp(v.ins, ta, ref);
      guard(!isFinite(kt), 'Nhiệt độ môi trường vượt nhiệt độ làm việc cho phép của cách điện.');
      const n0 = Math.round(v.n);
      const gk = v.met === 'D' ? 'duct' : v.met === 'B2' ? 'bunch' : v.arr === 'single' ? (v.met === 'C' ? 'wall' : 'tray') : 'bunch';
      const tooMany = (nn) => `${nn} mạch vượt bảng hệ số nhóm IEC (${GROUP_NAME[gk]}, tối đa ${GROUP[gk][GROUP[gk].length - 1][0]} mạch) – tách tuyến hoặc tra bảng của hãng cáp.`;
      let n = n0;
      let kg = groupFactor(gk, n);
      guard(kg == null, tooMany(n));
      const In = U.pick(U.STD.breaker, Itk);
      const Ireq = In || Itk;                       // Ib ≤ In ≤ Iz: cáp phải chịu được dòng định mức aptomat
      const sMin0 = v.circ === 'light' ? 1.5 : 2.5;
      const iBase = v.mat === 'Al' ? 5 : 0;
      const i0 = Math.max(iBase, SIZES.indexOf(sMin0)), last = SIZES.length - 1;
      const checks = [];
      const np0 = Math.round(v.np);
      let np = np0;
      let need = Ireq / (np * kt * kg);
      if (izBase(last, v.mat, v.ins, v.met, v.pha) < need) {
        // Tăng số sợi 240 mm² song song; mỗi sợi thêm cũng là một mạch đi chung → tính lại hệ số nhóm đến khi ổn định
        for (let it = 0; it < 10; it++) {
          const npNew = Math.max(np0, Math.ceil(Ireq / (izBase(14, v.mat, v.ins, v.met, v.pha) * kt * kg)));
          const nNew = n0 + (npNew - np0);
          const kgNew = groupFactor(gk, nNew);
          guard(kgNew == null, tooMany(nNew));
          const stable = npNew === np && kgNew === kg;
          np = npNew; n = nNew; kg = kgNew;
          if (stable) break;
        }
        checks.push(['warn', 'Tăng số sợi song song', `Một sợi 300 mm² không đủ – đã tăng lên ${np} sợi mỗi pha và tính ${n} mạch đi chung (gồm cả các sợi song song).`]);
        need = Ireq / (np * kt * kg);
      }
      let iNat = iBase;
      while (iNat < last && izBase(iNat, v.mat, v.ins, v.met, v.pha) < need) iNat++;
      let i = Math.max(iNat, i0);
      const iHeat = i;
      const sinp = Math.sqrt(1 - v.cos * v.cos);
      const du = (idx) => {
        const R = RHO[v.mat] / SIZES[idx] / np, X = XL / np;
        const dV = (v.pha === '1' ? 2 : SQ3) * Itk * v.L * (R * v.cos + X * sinp);
        return { dV, pct: dV / Uv * 100 };
      };
      while (i < last && du(i).pct > v.du) i++;
      const iVd = i;
      // Aptomat cắt tức thời, hạn dòng: không áp Ik·√t mà so I²t cho qua với (K·S)² (IEC 60364-4-43)
      const delay = v.prot === 'delay' || (v.prot === 'auto' && In > 630);
      let sMin = 0;
      if (v.ik > 0 && delay) {
        sMin = v.ik * 1000 * Math.sqrt(v.tk) / KSC[v.mat][v.ins];
        while (i < last && SIZES[i] * np < sMin) i++;
      }
      const S = SIZES[i];
      const IzOne = izBase(i, v.mat, v.ins, v.met, v.pha);
      const IzTot = IzOne * kt * kg * np;
      const d = du(i);
      const pe = peSize(S * np);
      const gov = i > iVd ? 'ổn định nhiệt ngắn mạch' : i > iHeat ? 'sụt áp' : iNat < i0 ? `tiết diện tối thiểu ${f(sMin0)} mm²` : 'phát nóng (dòng cho phép)';
      const izAt = (idx) => izBase(idx, v.mat, v.ins, v.met, v.pha) * kt * kg * np;
      checks.push([IzTot < Ireq ? 'bad' : 'ok', 'Khả năng tải & bảo vệ',
        In ? `Itk = ${f(Itk, 0)} A ≤ In = ${In} A ${In <= IzTot ? '≤' : '>'} Iz = ${f(IzTot, 0)} A` : `Iz = ${f(IzTot, 0)} A ≥ Itk = ${f(Itk, 0)} A`]);
      checks.push([d.pct <= v.du ? 'ok' : 'bad', 'Sụt áp trên tuyến', `${f(d.pct, 2)} % ${d.pct <= v.du ? '≤' : '>'} giới hạn ${f(v.du)} %`]);
      if (v.ik > 0 && delay) checks.push([S * np >= sMin ? 'ok' : 'bad', 'Ổn định nhiệt ngắn mạch', `S = ${f(S * np)} mm² ≥ Smin = ${f(sMin, 1)} mm² (${f(v.ik)} kA, ${f(v.tk)} s)`]);
      else if (v.ik > 0) checks.push(['warn', 'Ổn định nhiệt ngắn mạch', `Aptomat cắt tức thời: I²t cho qua của aptomat ở ${f(v.ik)} kA phải ≤ (K·S)² = ${sci(Math.pow(KSC[v.mat][v.ins] * S * np, 2))} A²s – tra catalogue aptomat.`]);
      checks.push(['warn', 'Điều kiện lắp thực tế', `Đã tính ở ${f(ta)} °C, ${n} mạch ${GROUP_NAME[gk]}, ${MET_LABEL[v.met]}. Kiểm tra lại tại hiện trường.`]);
      if (i > i0) {
        const j = i - 1, dj = du(j), izj = izAt(j);
        const why = izj < Ireq ? (In ? `Iz = ${f(izj, 0)} A < In aptomat = ${In} A` : `Iz = ${f(izj, 0)} A < Itk = ${f(Itk, 0)} A`)
          : dj.pct > v.du ? `sụt áp ${f(dj.pct, 2)} % > ${f(v.du)} %`
            : `S = ${f(SIZES[j] * np)} mm² < Smin = ${f(sMin, 1)} mm²`;
        checks.push(['bad', `Phương án nhỏ hơn: ${np > 1 ? np + ' × ' : ''}${f(SIZES[j])} mm²`, `Không dùng được vì ${why}.`]);
      }
      if (v.mat === 'Al') checks.push(['warn', 'Cáp nhôm', 'Dùng đầu cốt đồng–nhôm (bimetal), siết lực đúng mô-men.']);
      return {
        tiles: [
          { l: 'Tiết diện ruột pha', v: np > 1 ? `${np} × ${f(S)}` : f(S), u: 'mm²', main: true, s: `${v.mat}/${v.ins} · quyết định bởi: ${gov}` },
          { l: 'Ruột PE (bảo vệ)', v: f(pe), u: 'mm²', s: np > 1 ? 'tổng, có thể chia theo số sợi' : '' },
          { l: 'Iz sau hiệu chỉnh', v: f(IzTot, 0), u: 'A' },
          { l: 'Dòng thiết kế Itk', v: f(Itk, 1), u: 'A', s: `Ib = ${f(Ib, 1)} A` },
          { l: 'Sụt áp', v: f(d.pct, 2), u: '%', s: `${f(d.dV, 1)} V` },
          { l: 'Aptomat đề xuất', v: In ? `${In}` : '—', u: 'A', s: In ? U.breakerType(In) : '' }
        ],
        checks,
        steps: [
          ['Dòng làm việc', v.src === 'I' ? 'Ib (nhập)' : (v.pha === '1' ? 'P / (U·cosφ)' : 'P / (√3·U·cosφ)'), `${f(Ib, 2)} A`],
          ['Dòng thiết kế', 'Itk = Ib × k', `${f(Itk, 2)} A`],
          In ? ['Aptomat', 'In ≥ Itk (dãy chuẩn)', `${In} A`] : null,
          ['Hệ số nhiệt độ', `k1 = √((θmax − θ)/(θmax − ${ref})), θ = ${f(ta)} °C`, f(kt, 3)],
          ['Hệ số nhóm mạch', `k2 – ${GROUP_NAME[gk]}, ${n} mạch`, f(kg, 2)],
          ['Dòng yêu cầu mỗi sợi', In ? 'In / (n·k1·k2)' : 'Itk / (n·k1·k2)', `${f(need, 1)} A`],
          ['Tiết diện tối thiểu', v.circ === 'light' ? 'Mạch chiếu sáng, điều khiển' : 'Mạch động lực', `${f(sMin0)} mm²`],
          ['Tiết diện theo phát nóng', `IEC 60364-5-52 bảng ${AMP_TABLE(v.ins)}, cột ${v.met === 'D' ? 'D1' : v.met}`, `${f(SIZES[iHeat])} mm²`],
          ['Tiết diện theo sụt áp', `ΔU = ${v.pha === '1' ? '2' : '√3'}·I·L·(R·cosφ + X·sinφ)`, `${f(SIZES[iVd])} mm²`],
          v.ik > 0 && delay ? ['Tiết diện theo ngắn mạch', `Smin = Ik·√t / K (K = ${KSC[v.mat][v.ins]})`, `${f(sMin, 1)} mm²`] : null,
          v.ik > 0 && !delay ? ['Năng lượng cáp chịu được', `(K·S)², K = ${KSC[v.mat][v.ins]}`, `${sci(Math.pow(KSC[v.mat][v.ins] * S * np, 2))} A²s`] : null,
          ['Iz một sợi (bảng)', `${v.mat === 'Al' ? 'Nhôm × 0,75; ' : ''}${v.pha === '1' ? 'mạch 1 pha × 1,10' : 'mạch 3 pha'}`, `${f(IzOne, 1)} A`],
          ['Điện trở, điện kháng', `ρ = ${f(RHO[v.mat], 4)} Ω·mm²/m; x = 0,08 mΩ/m`, `${f(RHO[v.mat] / S * 1000, 3)} mΩ/m`]
        ].filter(Boolean),
        notes: [
          'Cáp chôn trực tiếp hoặc đất có nhiệt trở cao (> 2,5 K·m/W) cần nhân thêm hệ số hiệu chỉnh của nhà sản xuất.',
          'Cáp ra biến tần nên dùng loại có màn chắn, đấu đất màn chắn 360° hai đầu.',
          'Tuyến cáp trên 300 mm² nên chia nhiều sợi 240 mm² song song, cùng chiều dài và cùng loại.',
          'MCB, MCCB cắt ngắn mạch trong vài mili giây và hạn dòng, nên chỉ cần I²t cho qua ≤ (K·S)²; với aptomat có trễ thời gian mới dùng Smin = Ik·√t / K.'
        ],
        raw: { Ib, Itk, In, kt, kg, need, S, np, IzOne, IzTot, dpct: d.pct, sMin, pe }
      };
    }
  });

  // ================= Đ-03 Aptomat =================
  const CURVE = {
    L: ['B', 'MCB đường cong B (3–5 In)'],
    G: ['C', 'MCB đường cong C (5–10 In) / MCCB TM'],
    M: ['D', 'MCB đường cong D (10–20 In) hoặc MCCB/MPCB bảo vệ động cơ'],
    T: ['D', 'Đường cong D / MCCB chỉnh Im cao (dòng xung kích MBA, tụ bù)']
  };
  CD.register({
    id: 'aptomat', group: 'dien', code: 'Đ-03', title: 'Chọn aptomat', short: 'Chọn In, loại, đường cong và Icu.',
    desc: 'Chọn dòng định mức In, loại MCB/MCCB/ACB, đường cong cắt, khả năng cắt Icu và phối hợp với cáp.',
    sf: 1.25, sfNote: 'In ≥ Ib × k; Icu ≥ Ik × k tại điểm lắp đặt.',
    inputs: [
      { id: 'src', label: 'Dữ liệu tải', type: 'sel', value: 'P', opts: [['I', 'Biết dòng tải Ib'], ['P', 'Biết công suất P']] },
      PHA, U3, U1,
      { id: 'p', label: 'Công suất P', unit: 'kW', value: 110, show: (v) => v.src === 'P' },
      { id: 'cos', label: 'cosφ', value: 0.85, show: (v) => v.src === 'P' },
      { id: 'ib', label: 'Dòng tải Ib', unit: 'A', value: 160, show: (v) => v.src === 'I' },
      { id: 'load', label: 'Loại tải', type: 'sel', value: 'G', opts: [['L', 'Chiếu sáng, ổ cắm, điện trở'], ['G', 'Tải hỗn hợp / tủ phân phối'], ['M', 'Động cơ khởi động trực tiếp'], ['T', 'Máy biến áp, tụ bù']] },
      { id: 'iz', label: 'Dòng cho phép của cáp Iz', unit: 'A', value: 300, hint: 'Lấy "Iz sau hiệu chỉnh" ở Đ-02; nhập 0 nếu chưa có cáp' },
      { id: 'isc', label: 'Dòng ngắn mạch tại điểm lắp', unit: 'kA', value: 30, hint: 'Lấy từ Đ-04' }
    ],
    basis: {
      std: [
        'Ib ≤ In ≤ Iz và I2 ≤ 1,45·Iz – IEC 60364-4-43 điều 433.1.',
        'Dòng tác động chắc chắn I2: MCB 1,45·In (IEC 60898-1); MCCB/ACB 1,30·In (IEC 60947-2).',
        'Khả năng cắt Icu ≥ dòng ngắn mạch tại điểm lắp – IEC 60364-4-43 điều 434.5.1.'
      ],
      assume: [
        'Dãy In chuẩn 6…6300 A; MCB ≤ 63 A, MCCB đến 630 A, 800–1600 A MCCB hoặc ACB, trên 1600 A ACB.',
        'Icu nhân thêm hệ số k để có dự phòng.'
      ],
      verify: [
        'Đối chiếu In, Icu, đường cong với catalogue hãng (Schneider, ABB, LS, Mitsubishi…).',
        'Iz lấy từ Đ-02 (đã hiệu chỉnh nhiệt độ, nhóm mạch).'
      ]
    },
    calc(v, k) {
      const Uv = uOf(v);
      const Ib = v.src === 'I' ? v.ib : current(v.p, Uv, v.cos, v.pha);
      guard(!(Ib > 0), 'Dòng tải phải lớn hơn 0.');
      const Itk = Ib * k;
      const In = U.pick(U.STD.breaker, Itk);
      guard(!In, 'Dòng vượt 6300 A – cần chia thành nhiều lộ.');
      const type = U.breakerType(In);
      const frame = U.pick(U.STD.frame, In);
      const ir = Math.max(0.4, Math.ceil(Itk / frame / 0.05) * 0.05);
      const iscK = v.isc * k;
      const icu = U.pick(U.STD.icu, iscK);
      const checks = [];
      checks.push(['ok', 'Dòng định mức', `Itk = ${f(Itk, 1)} A ≤ In = ${In} A`]);
      if (v.iz > 0) {
        checks.push([In <= v.iz ? 'ok' : 'bad', 'Bảo vệ quá tải cáp', `In = ${In} A ${In <= v.iz ? '≤' : '>'} Iz = ${f(v.iz)} A`]);
        const i2 = (type === 'MCB' ? 1.45 : 1.3) * In;
        checks.push([i2 <= 1.45 * v.iz ? 'ok' : 'bad', 'Dòng tác động chắc chắn', `I2 = ${f(i2, 0)} A ${i2 <= 1.45 * v.iz ? '≤' : '>'} 1,45·Iz = ${f(1.45 * v.iz, 0)} A`]);
      }
      if (type === 'MCB' && iscK > 25) checks.push(['warn', 'Khả năng cắt của MCB', 'Ik × k > 25 kA: MCB thông thường không đủ – dùng MCCB.']);
      if (!icu) checks.push(['bad', 'Khả năng cắt', 'Ik vượt 150 kA – cần giải pháp hạn dòng.']);
      else checks.push(['ok', 'Khả năng cắt', `Icu ≥ Ik × k = ${f(iscK, 1)} kA → chọn ${icu} kA`]);
      if (v.load === 'L') checks.push(['warn', 'Chống giật', 'Mạch ổ cắm, chiếu sáng khu ẩm ướt: thêm RCD/RCBO 30 mA.']);
      return {
        tiles: [
          { l: 'Dòng định mức aptomat In', v: `${In}`, u: 'A', main: true, s: `${type} · ${v.pha === '1' ? '1P+N / 2P' : '3P hoặc 4P'}` },
          { l: 'Khả năng cắt Icu', v: icu ? `${icu}` : '> 150', u: 'kA', s: `≥ ${f(iscK, 1)} kA` },
          { l: 'Đường cong / đặc tính', v: CURVE[v.load][0], s: CURVE[v.load][1] },
          { l: 'Khung (frame) nếu chỉnh được', v: `${frame}`, u: 'AF', s: `Đặt Ir = ${f(ir, 2)} × In = ${f(ir * frame, 0)} A` },
          { l: 'Dòng thiết kế Itk', v: f(Itk, 1), u: 'A', s: `Ib = ${f(Ib, 1)} A` }
        ],
        checks,
        steps: [
          ['Dòng làm việc', v.src === 'I' ? 'Ib (nhập)' : (v.pha === '1' ? 'Ib = P / (U·cosφ)' : 'Ib = P / (√3·U·cosφ)'), `${f(Ib, 2)} A`],
          ['Dòng thiết kế', 'Itk = Ib × k', `${f(Itk, 2)} A`],
          ['In tiêu chuẩn', 'In ≥ Itk (dãy 6…6300 A)', `${In} A`],
          ['Điều kiện quá tải', 'Ib ≤ In ≤ Iz; I2 ≤ 1,45·Iz', v.iz > 0 ? 'Đã kiểm' : 'Chưa nhập Iz'],
          ['Khả năng cắt', 'Icu ≥ Ik × k', `${icu || '—'} kA`]
        ],
        notes: [
          'Chọn lọc: aptomat tổng nên ≥ 1,6–2 lần aptomat nhánh và dùng loại có chỉnh thời gian trễ (LSI) cho tủ tổng; kiểm tra bảng chọn lọc của hãng.',
          'Nhiệt độ trong tủ trên 40 °C phải giảm tải aptomat theo catalogue.'
        ],
        raw: { Ib, Itk, In, icu, frame }
      };
    }
  });

  // ================= Đ-04 Dòng ngắn mạch =================
  CD.register({
    id: 'ngan-mach', group: 'dien', code: 'Đ-04', title: 'Dòng ngắn mạch hạ thế', short: 'Ik3 tại tủ tổng và cuối tuyến cáp.',
    desc: 'Ngắn mạch 3 pha tại thanh cái tủ tổng và cuối tuyến cáp theo IEC 60909-0, có hệ số hiệu chỉnh MBA và phần góp của động cơ, để chọn Icu, Icm của aptomat.',
    sf: 1.1, sfNote: 'Icu yêu cầu = Ik × k; dòng ngắn mạch bản thân không nhân k.',
    inputs: [
      { id: 'sn', label: 'Công suất MBA', unit: 'kVA', value: 1600 },
      { id: 'uk', label: 'Điện áp ngắn mạch Uk', unit: '%', value: 6, hint: 'Theo nhãn MBA; IEC 60076-5: ≤ 630 kVA 4 %, 631–1250 kVA 5 %, 1251–2500 kVA 6 %' },
      { id: 'pk', label: 'Tổn thất ngắn mạch Pk', unit: 'kW', value: 0, hint: '0 = ước tính 0,9 % Sn' },
      { id: 'un', label: 'Điện áp hạ thế', unit: 'V', value: 400 },
      { id: 'uq', label: 'Điện áp lưới trung thế', type: 'sel', value: '22', opts: [['22', '22 kV'], ['35', '35 kV'], ['10', '10 kV'], ['6', '6 kV']] },
      { id: 'ikq', label: 'Dòng ngắn mạch lưới trung thế', unit: 'kA', value: 25, hint: 'Hỏi Điện lực; nhập 0 để coi lưới vô cùng lớn (thiên an toàn)' },
      { id: 'pmot', label: 'Tổng công suất động cơ đang chạy', unit: 'kW', value: 0, hint: 'Động cơ góp dòng ngắn mạch; 0 = bỏ qua' },
      { id: 'mat', label: 'Vật liệu cáp', type: 'sel', value: 'Cu', opts: [['Cu', 'Đồng (Cu)'], ['Al', 'Nhôm (Al)']] },
      { id: 'L', label: 'Chiều dài cáp đến điểm tính', unit: 'm', value: 60, hint: '0 = tại thanh cái tủ tổng' },
      { id: 's', label: 'Tiết diện mỗi sợi', unit: 'mm²', value: 240 },
      { id: 'np', label: 'Số sợi song song mỗi pha', value: 2 }
    ],
    basis: {
      std: [
        'IEC 60909-0:2016: Ik" = c·Un / (√3·Zk), c = 1,05 (hạ thế, dung sai +6 %).',
        'Lưới trung thế: ZQ = c·Un² / S"kQ, XQ = 0,995·ZQ, RQ = 0,1·XQ.',
        'MBA: ZT = uk·Un²/Sn, RT = Pk·Un²/Sn², hệ số hiệu chỉnh KT = 0,95·c / (1 + 0,6·xT).',
        'Cáp: ρ20 = 18,51 (Cu) / 29,41 (Al) mΩ·mm²/m (cho Ik lớn nhất), x = 0,08 mΩ/m.',
        'Dòng xung kích ip = κ·√2·Ik", κ = 1,02 + 0,98·e^(−3R/X). Động cơ hạ thế: ILR/In = 5, κ = 1,3.'
      ],
      assume: [
        'Động cơ đang chạy: Sđm ≈ P / 0,8; phần góp cộng thẳng vào cả thanh cái và cuối cáp (thiên an toàn).',
        'Bỏ qua tổng trở thanh cái, aptomat, mối nối (làm Ik lớn hơn, thiên an toàn).'
      ],
      verify: [
        'Kiểm nhanh: Ik đầu cực MBA ≈ In MBA × 100 / Uk% (lưới vô cùng lớn); tool cho kết quả cao hơn khoảng 8 % do c và KT.',
        'So với phần mềm của hãng (Ecodial, DOC, Simaris) cùng số liệu.'
      ]
    },
    calc(v, k) {
      guard(v.sn <= 0 || v.uk <= 0, 'Công suất MBA và Uk phải lớn hơn 0.');
      guard(v.ikq < 0 || v.pmot < 0, 'Số liệu không được âm.');
      const Un = v.un;
      const skq = v.ikq > 0 ? SQ3 * Number(v.uq) * v.ikq : 0;   // MVA
      const nt = ikNet({ sn: v.sn, uk: v.uk, pk: v.pk, un: Un, skq });
      const rho = v.mat === 'Cu' ? 18.51 : 29.41;
      const np = Math.max(1, Math.round(v.np));
      const RC = v.L > 0 ? rho * v.L / (v.s * np) : 0;
      const XC = v.L > 0 ? 0.08 * v.L / np : 0;
      const R0 = nt.R, X0 = nt.X, R1 = R0 + RC, X1 = X0 + XC;
      const IkT0 = ikOf(nt.c, Un, R0, X0), IkT1 = ikOf(nt.c, Un, R1, X1);
      const IrM = v.pmot > 0 ? (v.pmot / 0.8) * 1000 / (SQ3 * Un) : 0;          // A
      const IkM = 5 * nt.c * IrM / 1000;                                         // kA
      const ipM = 1.3 * Math.SQRT2 * IkM;
      const Ik0 = IkT0 + IkM, Ik1 = IkT1 + IkM;
      const ip0 = kappa(R0, X0) * Math.SQRT2 * IkT0 + ipM, ip1 = kappa(R1, X1) * Math.SQRT2 * IkT1 + ipM;
      const In = v.sn * 1000 / (SQ3 * Un);
      const icu0 = U.pick(U.STD.icu, Ik0 * k), icu1 = U.pick(U.STD.icu, Ik1 * k);
      const quick = In * 100 / v.uk / 1000;
      return {
        tiles: [
          { l: 'Ik3 tại thanh cái tủ tổng', v: f(Ik0, 1), u: 'kA', main: true, s: `Dòng xung kích ip = ${f(ip0, 1)} kA${IkM > 0 ? ` · gồm ${f(IkM, 1)} kA từ động cơ` : ''}` },
          { l: `Ik3 cuối cáp ${f(v.L)} m`, v: f(Ik1, 1), u: 'kA', s: `ip = ${f(ip1, 1)} kA` },
          { l: 'Icu aptomat tổng', v: icu0 ? `${icu0}` : '> 150', u: 'kA', s: `≥ ${f(Ik0 * k, 1)} kA` },
          { l: 'Icu aptomat cuối cáp', v: icu1 ? `${icu1}` : '> 150', u: 'kA', s: `≥ ${f(Ik1 * k, 1)} kA` },
          { l: 'Dòng định mức MBA', v: f(In, 0), u: 'A', s: `Kiểm nhanh In·100/Uk = ${f(quick, 1)} kA` }
        ],
        checks: [
          ['ok', 'Khả năng đóng của aptomat tổng', `Icm ≥ ip = ${f(ip0, 1)} kA đỉnh`],
          v.ikq > 0 ? ['ok', 'Lưới trung thế', `Đã tính với ${f(v.ikq)} kA tại ${v.uq} kV (S"kQ = ${f(skq, 0)} MVA).`] : ['warn', 'Lưới trung thế', 'Coi lưới vô cùng lớn – kết quả lớn hơn thực tế, thiên an toàn.'],
          v.pmot > 0 ? ['ok', 'Động cơ góp dòng', `${f(v.pmot)} kW động cơ góp ≈ ${f(IkM, 1)} kA.`] : ['warn', 'Động cơ góp dòng', 'Chưa tính phần động cơ góp; nhà máy nhiều động cơ nên nhập tổng kW đang chạy.']
        ],
        steps: [
          ['Lưới trung thế (quy về HT)', 'ZQ = c·Un² / S"kQ; XQ = 0,995·ZQ; RQ = 0,1·XQ', `${f(nt.ZQ, 3)} mΩ`],
          ['Tổng trở MBA', 'ZT = uk·Un² / Sn', `${f(nt.ZT, 3)} mΩ`],
          ['Điện trở, điện kháng MBA', `RT = Pk·Un²/Sn² (Pk = ${f(nt.pk, 1)} kW); XT = √(ZT² − RT²)`, `${f(nt.RT0, 3)} + j${f(nt.XT0, 3)} mΩ`],
          ['Hệ số hiệu chỉnh MBA', 'KT = 0,95·c / (1 + 0,6·xT)', f(nt.KT, 4)],
          ['Cáp', `RC = ρ·L/(S·n); XC = 0,08·L/n (ρ = ${rho})`, `${f(RC, 3)} + j${f(XC, 3)} mΩ`],
          ['Tổng trở tại tủ tổng', 'Z = √((RQ + KT·RT)² + (XQ + KT·XT)²)', `${f(Math.hypot(R0, X0), 3)} mΩ`],
          ['Tổng trở cuối cáp', 'Z = √(ΣR² + ΣX²)', `${f(Math.hypot(R1, X1), 3)} mΩ`],
          ['Ngắn mạch từ lưới qua MBA', 'Ik = c·Un / (√3·Z), c = 1,05', `${f(IkT0, 2)} / ${f(IkT1, 2)} kA`],
          v.pmot > 0 ? ['Động cơ góp', 'IkM = 5·c·ΣIđm động cơ', `${f(IkM, 2)} kA`] : null,
          ['Dòng xung kích', 'ip = κ·√2·Ik, κ = 1,02 + 0,98·e^(−3R/X)', `${f(ip0, 1)} / ${f(ip1, 1)} kA`]
        ].filter(Boolean),
        notes: [
          'Hai MBA vận hành song song: nhập tổng công suất và cùng Uk% – dòng ngắn mạch gần gấp đôi.',
          'Ngắn mạch 1 pha chạm vỏ (TN-S) nhỏ hơn Ik3; dùng để kiểm tra điều kiện tự động cắt nguồn.'
        ],
        raw: { Ik0, Ik1, ip0, IkT0, IkM, KT: nt.KT, ZT: nt.ZT, quick }
      };
    }
  });

  // ================= Đ-05 Động cơ & khởi động =================
  const START = {
    dol: { n: 'Trực tiếp (DOL)', m: 7 },
    yd: { n: 'Sao – tam giác (Y–Δ)', m: 2.3 },
    soft: { n: 'Khởi động mềm', m: 3.5 },
    vfd: { n: 'Biến tần (VFD)', m: 1.5 }
  };
  const CONTACTOR = [9, 12, 18, 25, 32, 40, 50, 65, 80, 95, 115, 150, 185, 225, 265, 330, 400, 500, 630, 780];
  CD.register({
    id: 'dong-co', group: 'dien', code: 'Đ-05', title: 'Động cơ & khởi động', short: 'Dòng khởi động, contactor, rơ le nhiệt.',
    desc: 'Dòng định mức, dòng khởi động, chọn aptomat, contactor, rơ le nhiệt, cáp theo phương pháp khởi động.',
    sf: 1.2, sfNote: 'Aptomat, contactor và cáp chọn theo In × k.',
    inputs: [
      { id: 'p', label: 'Công suất trục', unit: 'kW', value: 55 },
      { id: 'u', label: 'Điện áp', unit: 'V', value: 400 },
      { id: 'cos', label: 'cosφ', value: 0.86, hint: 'Lấy theo nhãn động cơ' },
      { id: 'eta', label: 'Hiệu suất η', value: 0.94, hint: 'Lấy theo nhãn; IE3: 15 kW ≈ 0,92; 55 kW ≈ 0,945; 160 kW ≈ 0,96' },
      { id: 'st', label: 'Phương pháp khởi động', type: 'sel', value: 'yd', opts: Object.entries(START).map(([a, b]) => [a, b.n]) },
      { id: 'L', label: 'Chiều dài cáp động cơ', unit: 'm', value: 60 }
    ],
    basis: {
      std: [
        'In = P / (√3·U·cosφ·η).',
        'Y–Δ: dòng nhánh pha = In/√3 ≈ 0,58·In (contactor K1, KΔ, rơ le nhiệt), contactor KY ≈ In/3.',
        'Contactor theo loại sử dụng AC-3 (IEC 60947-4-1).'
      ],
      assume: [
        'Bội số dòng khởi động: trực tiếp 7, Y–Δ 2,3, khởi động mềm 3,5, biến tần 1,5 lần In (giá trị điển hình).',
        `Cáp chọn nhanh: ${QUICK_NOTE}.`
      ],
      verify: [
        'So In với dòng trên nhãn động cơ; bội số khởi động lấy theo catalogue (IA/IN).',
        'Chọn contactor, rơ le nhiệt theo bảng phối hợp (type 2) của hãng.'
      ]
    },
    calc(v, k) {
      guard(!(v.cos > 0 && v.cos <= 1 && v.eta > 0 && v.eta <= 1), 'cosφ và η phải trong khoảng 0–1.');
      guard(!(v.p > 0 && v.u > 0), 'Công suất và điện áp phải lớn hơn 0.');
      const In = current(v.p, v.u, v.cos, '3', v.eta);
      const s = START[v.st];
      const Ist = In * s.m;
      const Itk = In * k;
      const brk = U.pick(U.STD.breaker, Itk);
      const yd = v.st === 'yd';
      const kMain = yd ? 1 / SQ3 : 1;
      const cMain = U.pick(CONTACTOR, Itk * kMain);
      const cStar = yd ? U.pick(CONTACTOR, Itk / 3) : null;
      const ol = In * kMain;
      const cab = cableQuick(Itk * kMain);
      const Sst = SQ3 * v.u * Ist / 1000;
      const tiles = [
        { l: 'Dòng định mức In', v: f(In, 1), u: 'A', main: true, s: `Dòng khởi động ≈ ${f(Ist, 0)} A (${f(s.m, 1)} × In)` },
        { l: 'Aptomat / MCCB', v: brk ? `${brk}` : '—', u: 'A', s: v.st === 'dol' ? 'Loại bảo vệ động cơ, Im ≥ 12 × In' : 'Loại bảo vệ động cơ' },
        { l: yd ? 'Contactor K1, KΔ (AC-3)' : 'Contactor (AC-3)', v: cMain ? `${cMain}` : '> 780', u: 'A' }
      ];
      if (yd) tiles.push({ l: 'Contactor KY (AC-3)', v: `${cStar}`, u: 'A' });
      if (v.st === 'soft' || v.st === 'vfd') tiles.push({ l: v.st === 'vfd' ? 'Biến tần (dòng ra)' : 'Khởi động mềm', v: `≥ ${f(Itk, 0)}`, u: 'A', s: 'Chọn tải nặng cho bơm bột, băng tải' });
      tiles.push({ l: 'Chỉnh rơ le nhiệt', v: f(ol, 1), u: 'A', s: yd ? 'Đặt trên nhánh pha (0,58 In)' : '1,0 × In' });
      tiles.push({ l: yd ? 'Cáp mỗi bộ (2 bộ 3 ruột)' : 'Cáp Cu/XLPE', v: cableTxt(cab), s: QUICK_NOTE });
      tiles.push({ l: 'Công suất khởi động', v: f(Sst, 0), u: 'kVA', s: 'Dùng cho tính máy phát' });
      const du = SQ3 * In * kMain * v.L * (RHO.Cu / cab.S / cab.np * v.cos + XL / cab.np * Math.sqrt(1 - v.cos * v.cos)) / v.u * 100;
      return {
        tiles,
        checks: [
          [du <= 5 ? 'ok' : 'warn', 'Sụt áp vận hành', `≈ ${f(du, 2)} % (giới hạn 5 %)`],
          [v.st === 'dol' && v.p > 30 ? 'warn' : 'ok', 'Phương pháp khởi động', v.st === 'dol' && v.p > 30 ? 'Động cơ > 30 kW khởi động trực tiếp gây sụt áp lớn – cân nhắc Y–Δ, mềm hoặc biến tần.' : 'Phù hợp công suất.']
        ],
        steps: [
          ['Dòng định mức', 'In = P / (√3·U·cosφ·η)', `${f(In, 2)} A`],
          ['Dòng khởi động', `Ist ≈ ${f(s.m, 1)} × In (${s.n})`, `${f(Ist, 1)} A`],
          ['Dòng thiết kế', 'Itk = In × k', `${f(Itk, 2)} A`],
          yd ? ['Dòng nhánh pha Y–Δ', 'Iph = In / √3', `${f(In / SQ3, 1)} A`] : null,
          ['Công suất khởi động', 'Sst = √3·U·Ist', `${f(Sst, 0)} kVA`]
        ].filter(Boolean),
        notes: [
          'Cáp biến tần dài > 50–100 m: thêm cuộn kháng đầu ra hoặc bộ lọc dv/dt để bảo vệ cách điện động cơ.',
          'Y–Δ: chỉ dùng cho động cơ đấu Δ ở 400 V (nhãn 400/690 V).'
        ],
        raw: { In, Ist, Itk, brk, cMain, cStar, ol, cabS: cab.S, Sst }
      };
    }
  });

  // ================= Đ-06 Tụ bù =================
  const STEP = [5, 10, 12.5, 15, 20, 25, 30, 40, 50, 60, 75, 100];
  CD.register({
    id: 'tu-bu', group: 'dien', code: 'Đ-06', title: 'Tụ bù công suất phản kháng', short: 'Dung lượng tụ bù theo cosφ.',
    desc: 'Dung lượng tụ bù nâng cosφ, số cấp, dòng tụ, aptomat, cáp và khuyến nghị cuộn kháng khi có nhiều biến tần.',
    sf: 1.1, sfNote: 'Qtk = Qc × k (dự phòng tụ suy giảm dung lượng theo thời gian).',
    inputs: [
      { id: 'p', label: 'Công suất tác dụng cần bù', unit: 'kW', value: 900 },
      { id: 'c1', label: 'cosφ hiện tại', value: 0.78 },
      { id: 'c2', label: 'cosφ mong muốn', value: 0.95 },
      { id: 'u', label: 'Điện áp', unit: 'V', value: 400 },
      { id: 'h', label: 'Tỷ lệ tải phi tuyến', unit: '%', value: 30, hint: 'Biến tần, UPS, chỉnh lưu… trên tổng tải' },
      { id: 'n', label: 'Số cấp tụ', type: 'sel', value: '8', opts: [['6', '6 cấp'], ['8', '8 cấp'], ['12', '12 cấp']] }
    ],
    basis: {
      std: [
        'Qc = P·(tanφ1 − tanφ2); Ic = Q / (√3·U).',
        'Aptomat và cáp tủ tụ ≥ 1,43·Ic: quá dòng cho phép 1,3·In (sóng hài) × dung sai điện dung 1,1 – IEC 60831-1.',
        'Cuộn kháng 7 %: tần số cộng hưởng 50/√0,07 ≈ 189 Hz.',
        'Mua bán công suất phản kháng khi cosφ < 0,9 (khách hàng ≥ 40 kW) – Thông tư 15/2014/TT-BCT.'
      ],
      assume: [`Cáp chọn nhanh: ${QUICK_NOTE}.`],
      verify: [
        'Kiểm tay bằng bảng hệ số kVAr/kW (ví dụ cosφ 0,78 → 0,95: 0,474 kVAr/kW).',
        'Kiểm tra văn bản quy định mua bán công suất phản kháng còn hiệu lực.'
      ]
    },
    calc(v, k) {
      guard(!(v.c1 > 0 && v.c1 < 1 && v.c2 > 0 && v.c2 <= 1), 'cosφ phải trong khoảng 0–1.');
      guard(v.c2 <= v.c1, 'cosφ mong muốn phải lớn hơn cosφ hiện tại.');
      guard(!(v.p > 0 && v.u > 0), 'Công suất và điện áp phải lớn hơn 0.');
      const t1 = Math.tan(Math.acos(v.c1)), t2 = Math.tan(Math.acos(v.c2));
      const Qc = v.p * (t1 - t2), Qtk = Qc * k;
      const Q = U.pick(U.STD.kvar, Qtk) || Math.ceil(Qtk / 50) * 50;
      const n = Number(v.n);
      const step = U.pick(STEP, Q / n) || Math.ceil(Q / n / 25) * 25;
      const Ic = Q * 1000 / (SQ3 * v.u);
      const brk = U.pick(U.STD.breaker, 1.43 * Ic);
      const cab = cableQuick(1.43 * Ic);
      const S1 = v.p / v.c1, S2 = v.p / v.c2;
      const detune = v.h > 15;
      return {
        tiles: [
          { l: 'Dung lượng tủ tụ bù', v: f(Q, 0), u: 'kVAr', main: true, s: `Tính toán Qc = ${f(Qc, 1)} kVAr · × k = ${f(Qtk, 1)} kVAr` },
          { l: 'Bước bù gợi ý', v: `${n} × ${f(step, 1)}`, u: 'kVAr', s: 'Bộ điều khiển tụ bù tự động' },
          { l: 'Dòng định mức tụ', v: f(Ic, 0), u: 'A' },
          { l: 'Aptomat tổng tủ tụ', v: brk ? `${brk}` : '—', u: 'A', s: '≥ 1,43 × Ic' },
          { l: 'Cáp cấp tủ tụ', v: cableTxt(cab), s: 'Cu/XLPE theo 1,43 × Ic' },
          { l: 'Giải phóng công suất MBA', v: f(S1 - S2, 0), u: 'kVA', s: `${f(S1, 0)} → ${f(S2, 0)} kVA` }
        ],
        checks: [
          [v.c2 >= 0.9 ? 'ok' : 'bad', 'Mua công suất phản kháng', 'cosφ ≥ 0,9 để không phải mua công suất phản kháng (TT 15/2014/TT-BCT).'],
          [v.c2 > 0.98 ? 'warn' : 'ok', 'Mức cosφ mục tiêu', v.c2 > 0.98 ? 'Đặt cosφ > 0,98 dễ bù thừa khi non tải – nên đặt 0,95–0,97.' : 'Hợp lý.'],
          [detune ? 'warn' : 'ok', 'Sóng hài', detune ? 'Tải phi tuyến > 15 %: dùng tụ có cuộn kháng 7 % (cộng hưởng 189 Hz), tụ định mức 440–480 V.' : 'Có thể dùng tụ thường 440 V.']
        ],
        steps: [
          ['tanφ hiện tại', 'tanφ1 = tan(arccos cosφ1)', f(t1, 4)],
          ['tanφ mong muốn', 'tanφ2 = tan(arccos cosφ2)', f(t2, 4)],
          ['Dung lượng bù', 'Qc = P·(tanφ1 − tanφ2)', `${f(Qc, 1)} kVAr`],
          ['Dung lượng thiết kế', 'Qtk = Qc × k → dãy tiêu chuẩn', `${f(Q, 0)} kVAr`],
          ['Dòng tụ', 'Ic = Q / (√3·U)', `${f(Ic, 1)} A`]
        ],
        notes: [
          'Tham khảo nhanh: dung lượng tụ bù thường bằng 25–35 % công suất MBA.',
          'Tụ bù cần thời gian xả 30–60 s giữa hai lần đóng; bộ điều khiển phải có trễ đóng lại.',
          'Tải phi tuyến > 40–50 %: cân nhắc bộ lọc sóng hài tích cực (AHF) thay vì chỉ tụ có kháng.'
        ],
        raw: { t1, t2, Qc, Qtk, Q, Ic, brk }
      };
    }
  });
})();
