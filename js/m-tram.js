/* Nhóm TRẠM & NGUỒN: T-01 … T-06 */
(function () {
  'use strict';
  const { U } = CD;
  const f = U.f, SQ3 = U.SQ3;
  const guard = (cond, msg) => { if (cond) throw new Error(msg); };

  // ---------- Thanh cái đồng chữ nhật, AC, DIN 43671 (môi trường 35 °C, thanh 65 °C) ----------
  // [rộng, dày, có sơn, để trần] – A, 1 thanh/pha
  const BB = [
    [20, 5, 319, 274], [25, 5, 384, 327], [30, 5, 447, 379], [40, 5, 573, 482], [50, 5, 697, 583],
    [60, 5, 826, 688], [80, 5, 1070, 885], [100, 5, 1300, 1080],
    [30, 10, 676, 573], [40, 10, 850, 715], [50, 10, 1020, 852], [60, 10, 1180, 985],
    [80, 10, 1500, 1240], [100, 10, 1810, 1490], [120, 10, 2110, 1740]
  ];
  const BB_MULT = { 1: 1, 2: 1.7, 3: 2.3, 4: 2.9 };

  // Chọn thanh cái có tổng tiết diện nhỏ nhất thỏa dòng yêu cầu
  function busbar(Ireq, o) {
    o = Object.assign({ mat: 'Cu', surf: 'paint', ta: 35, tb: 65, max: 3 }, o);
    const kT = Math.pow(Math.max(o.tb - o.ta, 0) / 30, 0.6);
    const kM = o.mat === 'Al' ? 0.78 : 1;
    const list = [];
    // Thanh dày 5 mm chỉ ghép tối đa 2 thanh/pha (thực tế lắp tủ)
    for (const b of BB) for (let n = 1; n <= Math.min(o.max, b[1] < 10 ? 2 : 4); n++) {
      const I = (o.surf === 'paint' ? b[2] : b[3]) * BB_MULT[n] * kT * kM;
      list.push({ w: b[0], t: b[1], n, I, A: b[0] * b[1] * n });
    }
    list.sort((x, y) => x.A - y.A || x.n - y.n);
    return { pick: list.find((x) => x.I >= Ireq) || null, kT, kM };
  }
  const bbTxt = (b) => `${b.n > 1 ? b.n + ' × ' : ''}${b.w}×${b.t}`;
  Object.assign(U, { busbar, bbTxt });

  const UHV = [['22', '22 kV'], ['35', '35 kV'], ['10', '10 kV'], ['6', '6 kV']];
  const UM = { 22: 24, 35: 40.5, 10: 12, 6: 7.2 };

  // ================= T-01 Máy biến áp =================
  CD.register({
    id: 'may-bien-ap', group: 'tram', code: 'T-01', title: 'Chọn máy biến áp',
    desc: 'Công suất tính toán theo hệ số đồng thời, dự phòng phát triển, phương án 1 hoặc 2 máy, dòng định mức và dòng ngắn mạch phía hạ thế.',
    sf: 1.1, sfNote: 'Stk = Stt × (1 + dự phòng) × k.',
    inputs: [
      { id: 'p', label: 'Tổng công suất đặt ΣPđ', unit: 'kW', value: 2400 },
      { id: 'kdt', label: 'Hệ số nhu cầu × đồng thời', value: 0.7, hint: 'Nhà máy giấy chạy 3 ca: 0,65–0,8' },
      { id: 'cos', label: 'cosφ tính toán', value: 0.92, hint: 'Đã có tụ bù: 0,92–0,95' },
      { id: 'dp', label: 'Dự phòng phát triển', unit: '%', value: 20 },
      { id: 'n', label: 'Số máy biến áp', type: 'sel', value: '1', opts: [['1', '1 máy'], ['2', '2 máy (dự phòng lẫn nhau)']] },
      { id: 'type', label: 'Loại máy', type: 'sel', value: 'oil', opts: [['oil', 'Máy dầu'], ['dry', 'Máy khô (cast resin)']] },
      { id: 'uhv', label: 'Điện áp sơ cấp', type: 'sel', value: '22', opts: UHV },
      { id: 'ulv', label: 'Điện áp thứ cấp', unit: 'V', value: 400 }
    ],
    calc(v, k) {
      guard(!(v.kdt > 0 && v.kdt <= 1 && v.cos > 0 && v.cos <= 1), 'Hệ số nhu cầu và cosφ phải trong khoảng 0–1.');
      const Ptt = v.p * v.kdt, Stt = Ptt / v.cos;
      const Stk = Stt * (1 + v.dp / 100) * k;
      const n = Number(v.n);
      const kqt = v.type === 'oil' ? 1.4 : 1.2;
      const need = n === 1 ? Stk : Math.max(Stk / 2, Stk / kqt);
      const Sdm = U.pick(U.STD.trafo, need);
      guard(!Sdm, 'Công suất vượt 5000 kVA/máy – nên chia thêm máy hoặc lên cấp điện áp.');
      const uk = Sdm <= 630 ? 4 : Sdm <= 2500 ? 6 : 7;
      const Ihv = Sdm / (SQ3 * Number(v.uhv)), Ilv = Sdm * 1000 / (SQ3 * v.ulv);
      const Isc = Ilv * 100 / uk / 1000 * (n === 2 ? 2 : 1);
      const beta = Stt / (n * Sdm);
      const checks = [
        [beta >= 0.4 && beta <= 0.85 ? 'ok' : 'warn', `Hệ số mang tải hiện tại β = ${f(beta * 100, 0)} % (vùng kinh tế 50–80 %)`]
      ];
      if (n === 2) checks.push([Sdm * kqt >= Stk ? 'ok' : 'bad', `Sự cố 1 máy: máy còn lại quá tải ${f(kqt, 1)} lần gánh ${f(Sdm * kqt, 0)} kVA ≥ ${f(Stk, 0)} kVA`]);
      if (n === 1 && Sdm >= 2000) checks.push(['warn', 'Một máy ≥ 2000 kVA: mất máy là dừng toàn nhà máy – cân nhắc 2 máy.']);
      if (n === 2) checks.push(['warn', `Vận hành song song: hai máy cùng tổ đấu dây, cùng tỉ số biến, Uk lệch ≤ 10 %; Ik hạ thế tăng gấp đôi (${f(Isc, 1)} kA).`]);
      return {
        tiles: [
          { l: 'Máy biến áp chọn', v: `${n > 1 ? '2 × ' : ''}${Sdm}`, u: 'kVA', main: true, s: `${v.uhv}/${f(v.ulv / 1000, 2)} kV · ${v.type === 'oil' ? 'máy dầu' : 'máy khô'} · Uk ≈ ${uk} %` },
          { l: 'Công suất tính toán Stt', v: f(Stt, 0), u: 'kVA', s: `Ptt = ${f(Ptt, 0)} kW` },
          { l: 'Công suất thiết kế Stk', v: f(Stk, 0), u: 'kVA' },
          { l: 'Dòng định mức sơ cấp', v: f(Ihv, 1), u: 'A' },
          { l: 'Dòng định mức thứ cấp', v: f(Ilv, 0), u: 'A' },
          { l: 'Ik hạ thế (lưới vô cùng lớn)', v: f(Isc, 1), u: 'kA' }
        ],
        checks,
        steps: [
          ['Công suất tác dụng tính toán', 'Ptt = ΣPđ × Knc', `${f(Ptt, 1)} kW`],
          ['Công suất biểu kiến', 'Stt = Ptt / cosφ', `${f(Stt, 1)} kVA`],
          ['Công suất thiết kế', 'Stk = Stt × (1 + dp) × k', `${f(Stk, 1)} kVA`],
          n === 2 ? ['Điều kiện mỗi máy', `S ≥ max(Stk/2; Stk/${f(kqt, 1)}) (quá tải sự cố)`, `${f(need, 1)} kVA`] : null,
          ['Chọn theo dãy chuẩn', 'Sđm ≥ yêu cầu', `${Sdm} kVA`],
          ['Dòng sơ cấp', 'I1 = Sđm / (√3·U1)', `${f(Ihv, 2)} A`],
          ['Dòng thứ cấp', 'I2 = Sđm / (√3·U2)', `${f(Ilv, 1)} A`],
          ['Ngắn mạch đầu cực', 'Ik = I2 × 100 / Uk%', `${f(Isc, 2)} kA`]
        ].filter(Boolean),
        notes: [
          'Máy dầu: quá tải sự cố 40 % tối đa 5 ngày, mỗi ngày ≤ 6 giờ (quy tắc thiết kế cung cấp điện). Máy khô chỉ lấy ≈ 20 % nếu không có quạt.',
          'Nên chọn máy hiệu suất cao theo TCVN 8525 để giảm tổn thất không tải khi chạy non tải.',
          'Lắp trong nhà xưởng nhiều bụi giấy: ưu tiên máy dầu kín hoặc máy khô có vỏ IP31 trở lên.'
        ]
      };
    }
  });

  // ================= T-02 Tủ trung thế =================
  const MV_CT = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 150, 200, 300, 400, 600, 800, 1000, 1200];
  const MV_CABLE = [[25, 130], [35, 150], [50, 175], [70, 215], [95, 255], [120, 290], [150, 325], [185, 365], [240, 420], [300, 470], [400, 530]];
  CD.register({
    id: 'tu-trung-the', group: 'tram', code: 'T-02', title: 'Tủ trung thế',
    desc: 'Dòng định mức thanh cái và máy cắt, dòng chịu ngắn mạch, cầu chì bảo vệ MBA, tỉ số CT, tiết diện cáp trung thế.',
    sf: 1.25, sfNote: 'Dòng thiết kế thanh cái, CT và cáp = I × k.',
    inputs: [
      { id: 'u', label: 'Điện áp lưới', type: 'sel', value: '22', opts: UHV },
      { id: 's', label: 'Tổng công suất MBA', unit: 'kVA', value: 2500 },
      { id: 'smax', label: 'MBA lớn nhất', unit: 'kVA', value: 1250 },
      { id: 'ik', label: 'Dòng ngắn mạch lưới', unit: 'kA', value: 25, hint: 'Hỏi Điện lực; 22 kV thường 20–25 kA' },
      { id: 't', label: 'Thời gian chịu ngắn mạch của tủ', unit: 's', value: 1 },
      { id: 'tc', label: 'Thời gian cắt sự cố (tính cáp)', unit: 's', value: 0.5, hint: 'Thời gian rơ le + máy cắt, thường 0,3–1 s' },
      { id: 'prot', label: 'Bảo vệ MBA', type: 'sel', value: 'auto', opts: [['auto', 'Tự đề xuất'], ['lbs', 'Cầu dao phụ tải + cầu chì'], ['vcb', 'Máy cắt chân không + rơ le']] }
    ],
    calc(v, k) {
      const Ukv = Number(v.u);
      const I = v.s / (SQ3 * Ukv), Itk = I * k;
      const Ir = U.pick([630, 800, 1250, 1600, 2000, 2500], Itk);
      const Ika = U.pick([16, 20, 25, 31.5, 40], v.ik);
      guard(!Ika, 'Dòng ngắn mạch vượt 40 kA – cần thiết bị đặc biệt.');
      const IT = v.smax / (SQ3 * Ukv);
      const fuse = U.pick(U.STD.fuseMV, 1.6 * IT);
      const useVcb = v.prot === 'vcb' || (v.prot === 'auto' && v.smax > 1000);
      const ct = U.pick(MV_CT, Itk);
      const sMin = v.ik * 1000 * Math.sqrt(v.tc) / 143;
      const cab = MV_CABLE.find((c) => c[0] >= Math.max(sMin, 50) && c[1] >= Itk);
      return {
        tiles: [
          { l: 'Phương án bảo vệ MBA', v: useVcb ? 'Máy cắt VCB' : 'LBS + cầu chì', main: true, s: useVcb ? 'Rơ le 50/51, 50N/51N; MBA > 1000 kVA' : `Cầu chì ${f(fuse, 1)} A cho MBA ${f(v.smax)} kVA` },
          { l: 'Cấp điện áp thiết bị', v: f(UM[Ukv], 1), u: 'kV', s: `Lưới ${Ukv} kV` },
          { l: 'Dòng định mức thanh cái / tủ', v: `${Ir}`, u: 'A', s: `Itk = ${f(Itk, 1)} A` },
          { l: 'Dòng chịu ngắn mạch', v: `${f(Ika, 1)} kA / ${f(v.t)} s`, s: `Ip ≥ ${f(Ika * 2.5, 1)} kA đỉnh` },
          { l: 'Tỉ số CT', v: `${ct}/5`, u: 'A', s: 'hoặc /1 A' },
          { l: 'Cáp trung thế Cu/XLPE', v: cab ? `3 × ${cab[0]}` : '> 400', u: 'mm²', s: `Smin ngắn mạch = ${f(sMin, 1)} mm²` }
        ],
        checks: [
          ['ok', `Dòng làm việc tổng I = ${f(I, 1)} A; dòng MBA lớn nhất = ${f(IT, 1)} A`],
          useVcb ? ['ok', `Rơ le 51 đặt ≈ 1,2–1,5 × I = ${f(1.2 * IT, 0)}–${f(1.5 * IT, 0)} A; 50 đặt trên dòng xung kích (≈ 10 × I MBA) = ${f(10 * IT, 0)} A`]
            : ['ok', `Cầu chì: 1,6–2 × I MBA = ${f(1.6 * IT, 1)}–${f(2 * IT, 1)} A → chọn ${f(fuse, 1)} A; đối chiếu bảng hãng`],
          v.smax > 1250 && !useVcb ? ['bad', 'MBA > 1250 kVA không nên bảo vệ bằng cầu chì – dùng máy cắt.'] : ['ok', 'Phương án bảo vệ phù hợp công suất MBA.']
        ],
        steps: [
          ['Dòng làm việc tổng', 'I = ΣS / (√3·U)', `${f(I, 2)} A`],
          ['Dòng thiết kế', 'Itk = I × k', `${f(Itk, 2)} A`],
          ['Dòng MBA lớn nhất', 'IT = Smax / (√3·U)', `${f(IT, 2)} A`],
          ['Cầu chì', 'Icc ≈ 1,6–2 × IT (chịu xung kích đóng MBA)', `${f(fuse, 1)} A`],
          ['Ổn định nhiệt cáp', 'Smin = Ik·√tc / 143 (Cu/XLPE)', `${f(sMin, 1)} mm²`],
          ['Cáp chọn', 'S ≥ max(Smin; 50) và Icp ≥ Itk', cab ? `${cab[0]} mm² (${cab[1]} A)` : '—']
        ],
        notes: [
          'Tủ RMU/tủ hợp bộ chọn loại thử nghiệm điển hình theo IEC 62271-200, có phân loại hồ quang nội bộ IAC AFL 20 kA 1 s.',
          'Dòng cho phép cáp trung thế lấy tham khảo cho cáp 3 lõi đi ngầm; đối chiếu catalogue khi cáp đi chung rãnh.',
          'Đầu nối, đo đếm, chống sét van theo thỏa thuận đấu nối và yêu cầu của Điện lực địa phương.'
        ]
      };
    }
  });

  // ================= T-03 Tủ hạ thế tổng (MSB) =================
  CD.register({
    id: 'tu-ha-the', group: 'tram', code: 'T-03', title: 'Tủ hạ thế tổng (MSB)',
    desc: 'Aptomat tổng ACB, khả năng cắt, CT đo lường, thanh cái pha/N/PE, ATS máy phát và dung lượng tụ bù sơ bộ.',
    sf: 1.25, sfNote: 'ACB, CT, thanh cái chọn theo I × k; Icu ≥ Ik × k.',
    inputs: [
      { id: 's', label: 'Công suất MBA', unit: 'kVA', value: 1600 },
      { id: 'uk', label: 'Uk của MBA', unit: '%', value: 6 },
      { id: 'u', label: 'Điện áp', unit: 'V', value: 400 },
      { id: 'ta', label: 'Nhiệt độ trong tủ', unit: '°C', value: 45, hint: 'Thường = nhiệt độ phòng + 10 °C' },
      { id: 'mat', label: 'Thanh cái', type: 'sel', value: 'Cu', opts: [['Cu', 'Đồng'], ['Al', 'Nhôm']] },
      { id: 'gen', label: 'Có máy phát dự phòng', type: 'sel', value: 'y', opts: [['y', 'Có – dùng ATS'], ['n', 'Không']] },
      { id: 'sg', label: 'Công suất máy phát', unit: 'kVA', value: 1000, show: (v) => v.gen === 'y' }
    ],
    calc(v, k) {
      const I = v.s * 1000 / (SQ3 * v.u), Itk = I * k;
      const acb = U.pick(U.STD.breaker, Itk);
      guard(!acb, 'Dòng vượt 6300 A – chia thành 2 phân đoạn thanh cái.');
      const Ik = I * 100 / v.uk / 1000;
      const icu = U.pick(U.STD.icu, Ik * k);
      const ct = U.pick(U.STD.ct, Itk);
      const bb = busbar(Itk, { mat: v.mat, ta: v.ta, max: 4 });
      const bbN = busbar(Itk * 0.5, { mat: v.mat, ta: v.ta, max: 4 });
      const fMin = (v.mat === 'Cu' ? 6 : 11) * Ik * 1;
      const tiles = [
        { l: 'Aptomat tổng', v: `ACB ${acb}`, u: 'A', main: true, s: `${v.u === 400 ? '4P' : '3P'} · Icu ≥ ${icu || '>150'} kA · bảo vệ LSIG` },
        { l: 'Dòng định mức MBA', v: f(I, 0), u: 'A', s: `Itk = ${f(Itk, 0)} A` },
        { l: 'Ik tại thanh cái', v: f(Ik, 1), u: 'kA' },
        { l: 'Biến dòng đo lường', v: `${ct}/5`, u: 'A', s: 'Cấp 0,5 cho đồng hồ đa năng' },
        { l: 'Thanh cái pha', v: bb.pick ? bbTxt(bb.pick) : '—', u: 'mm', s: bb.pick ? `${v.mat}, có sơn · ${f(bb.pick.I, 0)} A` : 'Vượt bảng' },
        { l: 'Thanh N / PE', v: bb.pick ? bbTxt(bb.pick) : '—', u: 'mm', s: `N = 100 % (sóng hài); PE ≥ ${bbN.pick ? bbTxt(bbN.pick) : '50 %'}` },
        { l: 'Tụ bù sơ bộ', v: `${U.pick(U.STD.kvar, 0.3 * v.s)}`, u: 'kVAr', s: '≈ 30 % Sđm MBA, tính chính xác ở Đ-06' }
      ];
      if (v.gen === 'y') {
        const Ig = v.sg * 1000 / (SQ3 * v.u);
        const ats = U.pick(U.STD.breaker, Math.max(Itk, Ig * k));
        tiles.push({ l: 'ATS chuyển nguồn', v: `${ats}`, u: 'A', s: `4 cực · máy phát ${f(Ig, 0)} A` });
      }
      return {
        tiles,
        checks: [
          [bb.pick && bb.pick.n * bb.pick.w * bb.pick.t >= fMin ? 'ok' : 'bad', `Ổn định nhiệt thanh cái: ${bb.pick ? f(bb.pick.A) : '—'} mm² ≥ ${f(fMin, 0)} mm² (α·Ik·√t, t = 1 s)`],
          [v.ta > 40 ? 'warn' : 'ok', v.ta > 40 ? `Nhiệt độ trong tủ ${v.ta} °C: kiểm tra hệ số giảm tải ACB theo catalogue, cân nhắc quạt thông gió tủ.` : 'Nhiệt độ trong tủ trong giới hạn chuẩn.'],
          ['ok', 'Lắp chống sét lan truyền SPD Type 1+2 (Iimp ≥ 12,5 kA/cực) tại tủ tổng.']
        ],
        steps: [
          ['Dòng định mức thứ cấp', 'I = S / (√3·U)', `${f(I, 1)} A`],
          ['Dòng thiết kế', 'Itk = I × k', `${f(Itk, 1)} A`],
          ['ACB', 'In ≥ Itk', `${acb} A`],
          ['Ngắn mạch thanh cái', 'Ik = I × 100 / Uk%', `${f(Ik, 2)} kA`],
          ['Khả năng cắt', 'Icu ≥ Ik × k', `${icu} kA`],
          ['Hiệu chỉnh nhiệt thanh cái', `kθ = ((65 − ${v.ta}) / 30)^0,6`, f(bb.kT, 3)]
        ],
        notes: [
          'Tủ tổng nên theo IEC 61439-1/2, phân ngăn Form 3b hoặc 4b để bảo trì từng lộ khi tủ vẫn có điện.',
          'Liên động cơ – điện giữa ACB nguồn lưới và ACB máy phát (hoặc ATS 4 cực) để không hòa ngược lưới.',
          'Lắp đồng hồ đa năng có Modbus để đưa số liệu về hệ thống quản lý năng lượng.'
        ]
      };
    }
  });

  // ================= T-04 Thanh cái =================
  CD.register({
    id: 'thanh-cai', group: 'tram', code: 'T-04', title: 'Thanh cái hạ thế',
    desc: 'Chọn kích thước thanh cái đồng/nhôm theo DIN 43671, hiệu chỉnh nhiệt độ, kiểm tra ổn định nhiệt và lực điện động khi ngắn mạch.',
    sf: 1.25, sfNote: 'Dòng yêu cầu thanh cái = I × k.',
    inputs: [
      { id: 'src', label: 'Dữ liệu', type: 'sel', value: 'I', opts: [['I', 'Biết dòng điện'], ['S', 'Biết công suất kVA']] },
      { id: 'i', label: 'Dòng điện', unit: 'A', value: 2000, show: (v) => v.src === 'I' },
      { id: 's', label: 'Công suất', unit: 'kVA', value: 1250, show: (v) => v.src === 'S' },
      { id: 'u', label: 'Điện áp', unit: 'V', value: 400, show: (v) => v.src === 'S' },
      { id: 'mat', label: 'Vật liệu', type: 'sel', value: 'Cu', opts: [['Cu', 'Đồng'], ['Al', 'Nhôm']] },
      { id: 'surf', label: 'Bề mặt', type: 'sel', value: 'paint', opts: [['paint', 'Có sơn / bọc co nhiệt'], ['bare', 'Để trần']] },
      { id: 'ta', label: 'Nhiệt độ quanh thanh cái', unit: '°C', value: 45 },
      { id: 'tb', label: 'Nhiệt độ thanh cái cho phép', unit: '°C', value: 65, hint: 'DIN 43671: 65 °C; IEC 61439 cho phép cao hơn' },
      { id: 'max', label: 'Số thanh tối đa mỗi pha', type: 'sel', value: '3', opts: [['1', '1 thanh'], ['2', '2 thanh'], ['3', '3 thanh'], ['4', '4 thanh']] },
      { id: 'ik', label: 'Dòng ngắn mạch', unit: 'kA', value: 40 },
      { id: 't', label: 'Thời gian ngắn mạch', unit: 's', value: 1 },
      { id: 'l', label: 'Khoảng cách giữa 2 gối sứ', unit: 'cm', value: 40 },
      { id: 'a', label: 'Khoảng cách giữa các pha', unit: 'cm', value: 15 }
    ],
    calc(v, k) {
      guard(v.tb <= v.ta, 'Nhiệt độ thanh cái cho phép phải lớn hơn nhiệt độ xung quanh.');
      const I = v.src === 'I' ? v.i : v.s * 1000 / (SQ3 * v.u);
      const Itk = I * k;
      const r = busbar(Itk, { mat: v.mat, surf: v.surf, ta: v.ta, tb: v.tb, max: Number(v.max) });
      guard(!r.pick, 'Không có cấu hình thanh cái đủ tải – tăng số thanh mỗi pha hoặc dùng busway.');
      const b = r.pick;
      const fMin = (v.mat === 'Cu' ? 6 : 11) * v.ik * Math.sqrt(v.t);
      const ixk = 1.8 * Math.SQRT2 * v.ik;
      const F = 1.76e-2 * (v.l / v.a) * ixk * ixk;                // kG
      const M = F * v.l / 10;                                       // kG·cm
      const W = b.n * (b.t / 10) * (b.t / 10) * (b.w / 10) / 6;      // cm³, mặt rộng đối diện nhau
      const sig = M / W, sigCp = v.mat === 'Cu' ? 1400 : 700;
      return {
        tiles: [
          { l: 'Thanh cái mỗi pha', v: bbTxt(b), u: 'mm', main: true, s: `${v.mat === 'Cu' ? 'Đồng' : 'Nhôm'} · ${v.surf === 'paint' ? 'có sơn' : 'để trần'} · ${f(b.A)} mm²` },
          { l: 'Dòng cho phép sau hiệu chỉnh', v: f(b.I, 0), u: 'A', s: `Yêu cầu ${f(Itk, 0)} A` },
          { l: 'Mật độ dòng', v: f(I / b.A, 2), u: 'A/mm²' },
          { l: 'Tiết diện tối thiểu (nhiệt)', v: f(fMin, 0), u: 'mm²' },
          { l: 'Ứng suất uốn', v: f(sig, 0), u: 'kG/cm²', s: `Cho phép ${sigCp} kG/cm²` }
        ],
        checks: [
          [b.I >= Itk ? 'ok' : 'bad', `Phát nóng: ${f(b.I, 0)} A ≥ ${f(Itk, 0)} A`],
          [b.A >= fMin ? 'ok' : 'bad', `Ổn định nhiệt: ${f(b.A)} mm² ≥ α·Ik·√t = ${f(fMin, 0)} mm²`],
          [sig <= sigCp ? 'ok' : 'warn', `Ổn định động (ước tính, mặt rộng đối diện): σ = ${f(sig, 0)} ${sig <= sigCp ? '≤' : '>'} ${sigCp} kG/cm²${sig > sigCp ? ' – giảm khoảng cách gối sứ' : ''}`]
        ],
        steps: [
          ['Dòng làm việc', v.src === 'I' ? 'I (nhập)' : 'I = S / (√3·U)', `${f(I, 1)} A`],
          ['Dòng yêu cầu', 'Itk = I × k', `${f(Itk, 1)} A`],
          ['Hiệu chỉnh nhiệt độ', `kθ = ((θcp − θ)/30)^0,6`, f(r.kT, 3)],
          ['Hệ số vật liệu', 'Nhôm ≈ 0,78 × đồng', f(r.kM, 2)],
          ['Hệ số nhiều thanh', '1 / 1,7 / 2,3 / 2,9 cho 1–4 thanh', f(BB_MULT[b.n], 1)],
          ['Dòng xung kích', 'ixk = 1,8·√2·Ik', `${f(ixk, 1)} kA`],
          ['Lực điện động', 'F = 1,76·10⁻²·(l/a)·ixk²', `${f(F, 0)} kG`],
          ['Mô-men uốn', 'M = F·l / 10', `${f(M, 0)} kG·cm`],
          ['Mô-men chống uốn', 'W = n·b²·h / 6', `${f(W, 2)} cm³`]
        ],
        notes: [
          'Bảng dòng theo DIN 43671 cho AC 50 Hz, khoảng cách giữa các thanh cùng pha bằng chiều dày thanh.',
          'Từ 4 thanh/pha trở lên hoặc dòng > 4000 A nên dùng busway (thanh dẫn kín) để giảm tổn thất do hiệu ứng mặt ngoài.',
          'Mối nối bulông: bề mặt mạ thiếc, siết đúng lực, kiểm tra camera nhiệt định kỳ 6 tháng.'
        ]
      };
    }
  });

  // ================= T-05 Máy phát điện =================
  const GEN_START = { dol: ['Trực tiếp (DOL)', 7], yd: ['Sao – tam giác', 2.3], soft: ['Khởi động mềm', 3.5], vfd: ['Biến tần', 1.5] };
  CD.register({
    id: 'may-phat', group: 'tram', code: 'T-05', title: 'Máy phát điện dự phòng',
    desc: 'Công suất máy phát theo tải ưu tiên và khởi động động cơ lớn nhất, tiêu hao nhiên liệu, bồn dầu, aptomat và ATS.',
    sf: 1.2, sfNote: 'Công suất yêu cầu × k trước khi chọn theo dãy máy phát.',
    inputs: [
      { id: 'p', label: 'Tổng tải ưu tiên', unit: 'kW', value: 600 },
      { id: 'kdt', label: 'Hệ số đồng thời', value: 0.8 },
      { id: 'cos', label: 'cosφ tải', value: 0.85 },
      { id: 'pm', label: 'Động cơ lớn nhất', unit: 'kW', value: 90 },
      { id: 'st', label: 'Khởi động động cơ đó', type: 'sel', value: 'yd', opts: Object.entries(GEN_START).map(([a, b]) => [a, b[0]]) },
      { id: 'xd', label: "Điện kháng X''d", unit: 'pu', value: 0.15, hint: 'Máy phát thông dụng 0,12–0,20' },
      { id: 'dv', label: 'Sụt áp cho phép khi khởi động', unit: '%', value: 20 },
      { id: 'dp', label: 'Dự phòng', unit: '%', value: 10 },
      { id: 'mode', label: 'Chế độ chọn', type: 'sel', value: 'prime', opts: [['prime', 'Prime – chạy liên tục'], ['standby', 'Standby – dự phòng mất điện']] },
      { id: 'h', label: 'Thời gian chạy liên tục', unit: 'giờ', value: 8 },
      { id: 'lf', label: 'Mức tải trung bình', unit: '%', value: 75 },
      { id: 'sfc', label: 'Suất tiêu hao dầu', unit: 'L/kWh', value: 0.24 }
    ],
    calc(v, k) {
      guard(!(v.dv > 0 && v.dv < 100), 'Sụt áp cho phép phải trong khoảng 0–100 %.');
      const Srun = v.p * v.kdt / v.cos;
      const Sm = v.pm / (0.92 * 0.86);
      const Sst = Sm * GEN_START[v.st][1];
      const dv = v.dv / 100;
      const Sgs = Sst * v.xd * (1 - dv) / dv;
      const Sreq = Math.max(Srun * (1 + v.dp / 100), Sgs) * k;
      const Sg = U.pick(U.STD.gen, Sreq);
      guard(!Sg, 'Công suất vượt 3000 kVA – dùng nhiều máy phát hòa đồng bộ.');
      const prime = v.mode === 'prime' ? Sg : Sg / 1.1;
      const standby = v.mode === 'prime' ? Sg * 1.1 : Sg;
      const kw = prime * 0.8;
      const lph = kw * v.lf / 100 * v.sfc;
      const tank = lph * v.h * 1.1;
      const Ig = Sg * 1000 / (SQ3 * 400);
      const brk = U.pick(U.STD.breaker, Ig);
      const cab = U.cableFor(Ig / 0.91);
      const load = Srun / prime;
      return {
        tiles: [
          { l: `Máy phát chọn (${v.mode === 'prime' ? 'Prime' : 'Standby'})`, v: `${Sg}`, u: 'kVA', main: true, s: `Prime ≈ ${f(prime, 0)} kVA / ${f(kw, 0)} kW · Standby ≈ ${f(standby, 0)} kVA` },
          { l: 'Tải chạy Srun', v: f(Srun, 0), u: 'kVA' },
          { l: 'Yêu cầu do khởi động', v: f(Sgs, 0), u: 'kVA', s: `Sst động cơ = ${f(Sst, 0)} kVA` },
          { l: 'Tiêu hao nhiên liệu', v: f(lph, 0), u: 'L/h', s: `tại ${f(v.lf)} % tải` },
          { l: 'Bồn dầu ngày', v: f(tank, 0), u: 'L', s: `${f(v.h)} giờ + 10 % đáy bồn` },
          { l: 'Aptomat đầu cực / ATS', v: `${brk}`, u: 'A', s: `Iđm máy phát = ${f(Ig, 0)} A` },
          { l: 'Cáp ra máy phát', v: U.cableTxt(cab), s: 'Cu/XLPE, kiểu C, 40 °C' }
        ],
        checks: [
          [load >= 0.3 ? 'ok' : 'warn', `Mức tải vận hành ≈ ${f(load * 100, 0)} % ${load < 0.3 ? '– dưới 30 % dễ đóng muội (wet stacking), cần tải giả khi chạy thử' : ''}`],
          [Sgs <= Srun * (1 + v.dp / 100) ? 'ok' : 'warn', Sgs > Srun * (1 + v.dp / 100) ? 'Công suất do khởi động động cơ quyết định – đổi sang khởi động mềm/biến tần để giảm cỡ máy.' : 'Công suất do tải chạy quyết định.'],
          ['ok', 'Khởi động tuần tự: đóng động cơ lớn nhất trước, các tải khác cách nhau 5–10 s.']
        ],
        steps: [
          ['Tải chạy', 'Srun = ΣP × Kđt / cosφ', `${f(Srun, 1)} kVA`],
          ['Động cơ lớn nhất khi chạy', 'Sm = P / (η·cosφ), η = 0,92, cosφ = 0,86', `${f(Sm, 1)} kVA`],
          ['Công suất khởi động', `Sst = Sm × ${GEN_START[v.st][1]}`, `${f(Sst, 1)} kVA`],
          ['Theo sụt áp khởi động', "Sg ≥ Sst·X''d·(1 − ΔU)/ΔU", `${f(Sgs, 1)} kVA`],
          ['Công suất yêu cầu', 'max(Srun·(1+dp); Sg) × k', `${f(Sreq, 1)} kVA`],
          ['Nhiên liệu', 'Q = P·tải%·suất tiêu hao', `${f(lph, 1)} L/h`]
        ],
        notes: [
          'Standby chỉ dùng khi mất điện lưới, tải trung bình ≤ 70 %, không quá 200 giờ/năm (ISO 8528). Chạy thay lưới thường xuyên phải chọn theo Prime.',
          'Phòng máy phát: gió vào ≥ 1,5 lần diện tích két nước, ống khói có giảm âm, bồn dầu ngày có đê bao chống tràn.',
          'Tải phi tuyến (biến tần) > 30 %: chọn máy phát có kích từ PMG và tăng công suất 15–25 %.'
        ]
      };
    }
  });

  // ================= T-06 Tiếp địa =================
  const ETA = {
    1: [[1, 1], [2, 0.85], [3, 0.8], [4, 0.73], [6, 0.65], [10, 0.59], [20, 0.48], [40, 0.4], [100, 0.33]],
    2: [[1, 1], [2, 0.91], [3, 0.87], [4, 0.83], [6, 0.77], [10, 0.74], [20, 0.67], [40, 0.6], [100, 0.52]],
    3: [[1, 1], [2, 0.94], [3, 0.91], [4, 0.89], [6, 0.85], [10, 0.81], [20, 0.76], [40, 0.7], [100, 0.62]]
  };
  function etaOf(n, ratio) {
    const r = Math.min(3, Math.max(1, ratio));
    const lo = Math.floor(r), hi = Math.ceil(r);
    const a = U.interp(ETA[lo], n), b = U.interp(ETA[hi], n);
    return lo === hi ? a : a + (b - a) * (r - lo);
  }
  CD.register({
    id: 'tiep-dia', group: 'tram', code: 'T-06', title: 'Hệ thống tiếp địa', suggest: true,
    desc: 'Điện trở một cọc, số cọc cần thiết theo hệ số sử dụng, so với điện trở yêu cầu của trạm, chống sét hoặc thiết bị điện tử.',
    sf: 1.2, sfNote: 'Điện trở mục tiêu = R yêu cầu / k (khắt khe hơn khi k lớn).',
    inputs: [
      { id: 'rho', label: 'Điện trở suất đất ρ', unit: 'Ω·m', value: 100, hint: 'Đất sét 40–100; đất pha cát 100–300; cát khô > 500' },
      { id: 'km', label: 'Hệ số mùa Kmùa', value: 1.4, hint: 'Cọc chôn sâu 0,8 m: 1,2–1,6' },
      { id: 'L', label: 'Chiều dài cọc', unit: 'm', value: 2.4 },
      { id: 'd', label: 'Đường kính cọc', unit: 'mm', value: 16, hint: 'Cọc thép mạ đồng D16; thép góc L63 tương đương ≈ 0,95 × b' },
      { id: 'h0', label: 'Độ chôn sâu đỉnh cọc', unit: 'm', value: 0.8 },
      { id: 'a', label: 'Khoảng cách giữa các cọc', unit: 'm', value: 5 },
      { id: 'ryc', label: 'Điện trở yêu cầu', unit: 'Ω', value: 4, hint: 'Trạm, trung tính: ≤ 4 Ω; chống sét: ≤ 10 Ω; điện tử, server: ≤ 1 Ω' }
    ],
    calc(v, k) {
      guard(v.L <= 0 || v.d <= 0 || v.a <= 0, 'Kích thước cọc và khoảng cách phải lớn hơn 0.');
      const dm = v.d / 1000, t = v.h0 + v.L / 2;
      const R1 = v.rho * v.km / (2 * Math.PI * v.L) * (Math.log(2 * v.L / dm) + 0.5 * Math.log((4 * t + v.L) / (4 * t - v.L)));
      const target = v.ryc / k;
      const ratio = v.a / v.L;
      let n = 1, eta = 1, Rn = R1;
      while (Rn > target && n < 200) { n++; eta = etaOf(n, ratio); Rn = R1 / (n * eta); }
      const ok = Rn <= target;
      return {
        tiles: [
          { l: 'Số cọc cần thiết', v: ok ? `${n}` : '> 200', u: 'cọc', main: true, s: `Cọc ${f(v.L, 1)} m, cách nhau ${f(v.a, 1)} m · R ≈ ${f(Rn, 2)} Ω` },
          { l: 'Điện trở 1 cọc', v: f(R1, 2), u: 'Ω' },
          { l: 'Điện trở mục tiêu', v: f(target, 2), u: 'Ω', s: `= ${f(v.ryc)} / ${f(k, 2)}` },
          { l: 'Hệ số sử dụng η', v: f(eta, 2), s: `a/L = ${f(ratio, 2)}` },
          { l: 'Dây nối (bố trí 1 hàng)', v: f((n - 1) * v.a, 1), u: 'm', s: 'Cáp đồng trần ≥ 50 mm² hoặc thép dẹt 40×4' }
        ],
        checks: [
          [ok ? 'ok' : 'bad', ok ? `R hệ thống ${f(Rn, 2)} Ω ≤ ${f(target, 2)} Ω` : 'Không đạt với 200 cọc – dùng hóa chất giảm điện trở hoặc cọc sâu (khoan giếng).'],
          [ratio >= 2 ? 'ok' : 'warn', ratio >= 2 ? 'Khoảng cách cọc ≥ 2 lần chiều dài, hệ số sử dụng tốt.' : 'Khoảng cách cọc < 2L làm giảm hiệu quả – tăng khoảng cách nếu mặt bằng cho phép.']
        ],
        steps: [
          ['Độ sâu tâm cọc', 't = h0 + L/2', `${f(t, 2)} m`],
          ['Điện trở 1 cọc', 'R1 = ρ·Km/(2πL)·[ln(2L/d) + ½·ln((4t+L)/(4t−L))]', `${f(R1, 3)} Ω`],
          ['Điện trở hệ cọc', 'Rn = R1 / (n·η)', `${f(Rn, 3)} Ω`],
          ['Điện trở mục tiêu', 'Ryc / k', `${f(target, 3)} Ω`]
        ],
        notes: [
          'Chưa tính phần thanh nối nằm ngang (thực tế giúp giảm thêm điện trở) – kết quả thiên về an toàn.',
          'Đo kiểm điện trở nối đất định kỳ hằng năm vào mùa khô bằng phương pháp 3 cực.',
          'Nối đất trạm, nối đất chống sét và nối đất thiết bị nên liên kết đẳng thế tại một thanh nối đất chính.'
        ]
      };
    }
  });
})();
