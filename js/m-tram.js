/* Nhóm TRẠM & NGUỒN: T-01 … T-06 */
(function () {
  'use strict';
  const { U } = CD;
  const f = U.f, SQ3 = U.SQ3;
  const guard = (cond, msg) => { if (cond) throw new Error(msg); };
  const custom = U.custom;

  // ---------- Thanh cái đồng chữ nhật, AC 50 Hz – DIN 43671 (môi trường 35 °C, thanh 65 °C) ----------
  // [rộng, dày, 1 thanh có sơn, 2 thanh có sơn, 3 thanh có sơn, 4 thanh có sơn (bố trí 2 cặp II II; null = bảng không có), 1 thanh để trần] – A mỗi pha.
  // Thanh để trần nhiều thanh: lấy theo tỉ lệ trần/sơn của 1 thanh.
  const BB = [
    [20, 5, 319, 560, 728, null, 274], [25, 5, 384, 692, 865, null, 327], [30, 5, 447, 760, 1050, null, 379], [40, 5, 573, 952, 1330, null, 482],
    [50, 5, 697, 1140, 1580, null, 583], [60, 5, 826, 1330, 1830, null, 688], [80, 5, 1070, 1680, 2280, null, 885], [100, 5, 1300, 2010, 2720, null, 1080],
    [30, 10, 676, 1200, 1600, null, 573], [40, 10, 850, 1470, 2000, null, 715], [50, 10, 1020, 1720, 2380, null, 852], [60, 10, 1180, 1960, 2730, 3800, 985],
    [80, 10, 1500, 2410, 3310, 4800, 1240], [100, 10, 1810, 2860, 3900, 5600, 1490], [120, 10, 2110, 3280, 4460, 6400, 1740],
    [160, 10, 2700, 4130, 5450, 7600, 2220], [200, 10, 3290, 4970, 6370, 9000, 2690]
  ];
  // 4 thanh/pha: lấy thận trọng, không vượt 0,9 × 2 × giá trị 2 thanh (hai cặp đặt cách nhau có sưởi nóng lẫn nhau)
  const bbPainted = (b, n) => (n === 4 ? (b[5] ? Math.min(b[5], 0.9 * 2 * b[3]) : null) : b[1 + n]);
  function bbBase(b, n, surf) {
    if (n < 1 || n > 4) return null;
    const p = bbPainted(b, n);
    if (!p) return null;
    return surf === 'paint' ? p : p * b[6] / b[2];
  }
  // Hiệu chỉnh nhiệt độ (θcp − θ)/30 mũ 0,6 khi ΔT < 30 K, mũ 0,54 khi ΔT ≥ 30 K (khớp bảng Siemens 573 / 756 / 900 A ở 65 / 85 / 105 °C)
  const bbTempK = (tb, ta) => { const r = Math.max(tb - ta, 0) / 30; return Math.pow(r, r < 1 ? 0.6 : 0.54); };
  // Ổn định nhiệt thanh cái trần: k = K·√ln((θf + β)/(θi + β)), Cu K = 226, β = 234,5; Al K = 148, β = 228; θf = 200 °C
  const bbK = (mat, ti, tf = 200) => (mat === 'Al' ? 148 * Math.sqrt(Math.log((tf + 228) / (ti + 228))) : 226 * Math.sqrt(Math.log((tf + 234.5) / (ti + 234.5))));
  const K_BB_AL = 0.78;   // nhôm so với đồng cùng kích thước (DIN 43670 cho ≈ 0,80–0,82)

  // Liệt kê các cấu hình trong bảng; chọn cấu hình có tổng tiết diện nhỏ nhất thỏa dòng yêu cầu (bằng nhau thì ít thanh hơn)
  function busbar(Ireq, o) {
    o = Object.assign({ mat: 'Cu', surf: 'paint', ta: 35, tb: 65, max: 3 }, o);
    const kT = bbTempK(o.tb, o.ta);
    const kM = o.mat === 'Al' ? K_BB_AL : 1;
    const list = [];
    for (const b of BB) for (let n = 1; n <= Math.min(o.max, 4); n++) {
      const base = bbBase(b, n, o.surf);
      if (!base) continue;
      list.push({ w: b[0], t: b[1], n, I: base * kT * kM, Ibase: base, A: b[0] * b[1] * n });
    }
    list.sort((x, y) => x.A - y.A || x.n - y.n);
    const ok = list.filter((x) => x.I >= Ireq);
    const best = list.reduce((m, x) => (x.I > m.I ? x : m), list[0]);
    return { pick: ok[0] || null, alt: ok.slice(1, 4), kT, kM, best };
  }
  const bbTxt = (b) => `${b.n > 1 ? b.n + ' × ' : ''}${f(b.w)}×${f(b.t)}`;
  Object.assign(U, { busbar, bbTxt, bbK, bbTempK, bbBase, BB });

  const UHV = [['22', '22 kV'], ['35', '35 kV'], ['10', '10 kV'], ['6', '6 kV']];
  const UM = { 22: 24, 35: 40.5, 10: 12, 6: 7.2 };

  // ================= T-01 Máy biến áp =================
  CD.register({
    id: 'may-bien-ap', group: 'tram', code: 'T-01', title: 'Chọn máy biến áp', short: 'Chọn dung lượng, 1 hoặc 2 máy.',
    desc: 'Công suất tính toán theo hệ số nhu cầu, dự phòng phát triển, phương án 1 hoặc 2 máy, dòng định mức và dòng ngắn mạch đầu cực hạ thế.',
    sf: 1.1, sfNote: 'Stk = Stt × (1 + dự phòng) × k.',
    inputs: [
      { id: 'p', label: 'Tổng công suất đặt ΣPđ', unit: 'kW', value: 2400 },
      { id: 'kdt', label: 'Hệ số nhu cầu × đồng thời', value: 0.7, hint: 'Lấy theo số liệu đo hoặc thống kê của nhà máy; nhà máy giấy chạy 3 ca thường 0,65–0,8' },
      { id: 'cos', label: 'cosφ tính toán', value: 0.92, hint: 'Đã có tụ bù: 0,92–0,95' },
      { id: 'dp', label: 'Dự phòng phát triển', unit: '%', value: 20 },
      { id: 'n', label: 'Số máy biến áp', type: 'sel', value: '1', opts: [['1', '1 máy'], ['2', '2 máy (dự phòng lẫn nhau)']] },
      { id: 'type', label: 'Loại máy', type: 'sel', value: 'oil', opts: [['oil', 'Máy dầu'], ['dry', 'Máy khô (cast resin)']] },
      { id: 'uk', label: 'Điện áp ngắn mạch Uk', unit: '%', value: 0, hint: '0 = lấy giá trị tối thiểu theo IEC 60076-5; có nhãn máy thì nhập theo nhãn' },
      { id: 'uhv', label: 'Điện áp sơ cấp', type: 'sel', value: '22', opts: UHV },
      { id: 'ulv', label: 'Điện áp thứ cấp', unit: 'V', value: 400 },
      U.cfg('Cách chọn MBA', 'Tự chọn theo dãy chuẩn', 'Tự nhập: MBA cỡ bất kỳ (kể cả trên 5000 kVA), hệ số quá tải sự cố'),
      { id: 'cs', label: 'Công suất mỗi MBA', unit: 'kVA', value: 0, show: custom, hint: 'Cỡ bất kỳ, kể cả trên 5000 kVA. 0 = tool chọn theo dãy chuẩn' },
      { id: 'ckqt', label: 'Hệ số quá tải sự cố cho phép', value: 0, show: (v) => custom(v) && v.n === '2', hint: '0 = 1,4 máy dầu; 1,2 máy khô. Lấy theo hướng dẫn tải IEC 60076-7 / 60076-12 hoặc nhà sản xuất' }
    ],
    basis: {
      std: [
        'Ptt = ΣPđ × Knc; Stt = Ptt / cosφ (phương pháp hệ số nhu cầu).',
        'Uk tối thiểu: IEC 60076-5 bảng 1 (≤ 630 kVA 4 %; 631–1250 kVA 5 %; 1251–2500 kVA 6 %; 2501–6300 kVA 7 %).',
        'Ik đầu cực hạ thế theo IEC 60909-0 (c = 1,05, hệ số KT), lưới trung thế vô cùng lớn.'
      ],
      assume: [
        '2 máy: mỗi máy ≥ max(Stk/2; Stk/kqt), kqt = 1,4 máy dầu (quá tải sự cố ≤ 5 ngày, ≤ 6 giờ/ngày), 1,2 máy khô không quạt.',
        'Dãy công suất phổ biến 50…5000 kVA.',
        'Chế độ tự nhập: kiểm tra MBA cỡ bất kỳ và hệ số quá tải sự cố theo hồ sơ nhà sản xuất; Uk = 0 thì lấy tối thiểu IEC 60076-5 (đến 8 % cho 6,3–25 MVA, 10 % cho 25–40 MVA).'
      ],
      verify: [
        'Knc nên lấy từ số liệu công tơ đa năng (Pmax 15–30 phút) của các tháng gần nhất.',
        'Quá tải cho phép của máy cụ thể theo hướng dẫn tải IEC 60076-7 (máy dầu) / IEC 60076-12 (máy khô) và nhà sản xuất.'
      ]
    },
    calc(v, k) {
      guard(!(v.kdt > 0 && v.kdt <= 1 && v.cos > 0 && v.cos <= 1), 'Hệ số nhu cầu và cosφ phải trong khoảng 0–1.');
      guard(!(v.p > 0), 'Công suất đặt phải lớn hơn 0.');
      const Ptt = v.p * v.kdt, Stt = Ptt / v.cos;
      const Stk = Stt * (1 + v.dp / 100) * k;
      const n = Number(v.n);
      const own = custom(v);
      guard(own && (v.cs < 0 || v.ckqt < 0), 'Công suất MBA và hệ số quá tải không được âm.');
      const kqt = own && v.ckqt > 0 ? v.ckqt : v.type === 'oil' ? 1.4 : 1.2;
      const need = n === 1 ? Stk : Math.max(Stk / 2, Stk / kqt);
      const mine = own && v.cs > 0;
      const Sdm = mine ? v.cs : U.pick(U.STD.trafo, need);
      guard(!Sdm, `Cần ${f(need, 0)} kVA mỗi máy, vượt dãy chuẩn 5000 kVA – chọn 2 máy, lên cấp điện áp, hoặc chọn "Tự nhập MBA" để kiểm tra máy lớn hơn.`);
      const uk = v.uk > 0 ? v.uk : U.ukIEC(Sdm);
      const Ihv = Sdm / (SQ3 * Number(v.uhv)), Ilv = Sdm * 1000 / (SQ3 * v.ulv);
      const ik1 = U.ikTrafo(Sdm, uk, v.ulv);
      const Isc = ik1.Ik * n;
      const beta = Stt / (n * Sdm);
      const checks = [];
      if (mine) checks.push([Sdm >= need ? 'ok' : 'bad', 'Công suất MBA tự nhập', n === 1 ? `${f(Sdm)} kVA ${Sdm >= need ? '≥' : '<'} Stk = ${f(Stk, 0)} kVA` : `${f(Sdm)} kVA ${Sdm >= need ? '≥' : '<'} max(Stk/2; Stk/${f(kqt, 2)}) = ${f(need, 0)} kVA`]);
      checks.push([beta >= 0.4 && beta <= 0.85 ? 'ok' : 'warn', 'Hệ số mang tải hiện tại', `β = ${f(beta * 100, 0)} % (nên 40–85 %, kinh tế nhất 50–80 %)`]);
      if (n === 2) checks.push([Sdm * kqt >= Stk ? 'ok' : 'bad', 'Sự cố 1 máy', `Máy còn lại quá tải ${f(kqt, 2)} lần gánh ${f(Sdm * kqt, 0)} kVA ${Sdm * kqt >= Stk ? '≥' : '<'} ${f(Stk, 0)} kVA`]);
      if (n === 1 && Sdm >= 2000) checks.push(['warn', 'Độ tin cậy', 'Một máy ≥ 2000 kVA: mất máy là dừng toàn nhà máy – cân nhắc 2 máy.']);
      if (Ilv > 6300) checks.push(['warn', 'Dòng phía hạ thế', `${f(Ilv, 0)} A vượt ACB lớn nhất 6300 A – chia nhiều MBA, nhiều phân đoạn hoặc dùng điện áp thứ cấp cao hơn.`]);
      if (n === 2) checks.push(['warn', 'Vận hành song song', `Hai máy cùng tổ đấu dây, cùng tỉ số biến, Uk lệch ≤ 10 %; Ik hạ thế tăng gấp đôi (${f(Isc, 1)} kA).`]);
      return {
        tiles: [
          { l: mine ? 'Máy biến áp kiểm tra' : 'Máy biến áp chọn', v: `${n > 1 ? '2 × ' : ''}${mine ? f(Sdm) : Sdm}`, u: 'kVA', main: true, s: `${v.uhv}/${f(v.ulv / 1000, 2)} kV · ${v.type === 'oil' ? 'máy dầu' : 'máy khô'} · Uk = ${f(uk, 1)} %${v.uk > 0 ? '' : ' (IEC 60076-5)'}${mine ? ' · tự nhập' : ''}` },
          { l: 'Công suất tính toán Stt', v: f(Stt, 0), u: 'kVA', s: `Ptt = ${f(Ptt, 0)} kW` },
          { l: 'Công suất thiết kế Stk', v: f(Stk, 0), u: 'kVA' },
          { l: 'Dòng định mức sơ cấp', v: f(Ihv, 1), u: 'A' },
          { l: 'Dòng định mức thứ cấp', v: f(Ilv, 0), u: 'A' },
          { l: 'Ik đầu cực hạ thế', v: f(Isc, 1), u: 'kA', s: n === 2 ? '2 máy song song, lưới vô cùng lớn' : 'Lưới vô cùng lớn (thiên an toàn)' }
        ],
        checks,
        steps: [
          ['Công suất tác dụng tính toán', 'Ptt = ΣPđ × Knc', `${f(Ptt, 1)} kW`],
          ['Công suất biểu kiến', 'Stt = Ptt / cosφ', `${f(Stt, 1)} kVA`],
          ['Công suất thiết kế', 'Stk = Stt × (1 + dp) × k', `${f(Stk, 1)} kVA`],
          n === 2 ? ['Điều kiện mỗi máy', `S ≥ max(Stk/2; Stk/${f(kqt, 2)})`, `${f(need, 1)} kVA`] : null,
          mine ? ['MBA tự nhập', 'Sđm (nhập) ≥ yêu cầu', `${f(Sdm)} kVA`] : ['Chọn theo dãy chuẩn', 'Sđm ≥ yêu cầu', `${Sdm} kVA`],
          ['Dòng sơ cấp', 'I1 = Sđm / (√3·U1)', `${f(Ihv, 2)} A`],
          ['Dòng thứ cấp', 'I2 = Sđm / (√3·U2)', `${f(Ilv, 1)} A`],
          ['Ngắn mạch đầu cực', 'Ik = c·Un / (√3·KT·ZT), c = 1,05', `${f(Isc, 2)} kA`]
        ].filter(Boolean),
        notes: [
          'Nên chọn máy hiệu suất cao theo TCVN 8525 để giảm tổn thất không tải khi chạy non tải.',
          'Lắp trong nhà xưởng nhiều bụi giấy: ưu tiên máy dầu kín hoặc máy khô có vỏ IP31 trở lên.'
        ],
        raw: { Ptt, Stt, Stk, need, kqt, Sdm, uk, Ihv, Ilv, Isc, beta }
      };
    }
  });

  // ================= T-02 Tủ trung thế =================
  const MV_CT = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 150, 200, 300, 400, 600, 800, 1000, 1200];
  // Cáp Cu/XLPE 3 lõi 24 kV đi ngầm – giá trị thấp, chỉ để kiểm tra sơ bộ, đối chiếu catalogue
  const MV_CABLE = [[25, 130], [35, 150], [50, 175], [70, 215], [95, 255], [120, 290], [150, 325], [185, 365], [240, 420], [300, 470], [400, 530]];
  CD.register({
    id: 'tu-trung-the', group: 'tram', code: 'T-02', title: 'Tủ trung thế', short: 'Thanh cái, cầu chì / VCB, CT, cáp.',
    desc: 'Dòng định mức thanh cái và máy cắt, dòng chịu ngắn mạch, cầu chì bảo vệ MBA, tỉ số CT, tiết diện cáp trung thế.',
    sf: 1.25, sfNote: 'Dòng thiết kế thanh cái, CT và cáp = I × k.',
    inputs: [
      { id: 'u', label: 'Điện áp lưới', type: 'sel', value: '22', opts: UHV },
      { id: 's', label: 'Tổng công suất MBA', unit: 'kVA', value: 2500 },
      { id: 'smax', label: 'MBA lớn nhất', unit: 'kVA', value: 1250 },
      { id: 'ik', label: 'Dòng ngắn mạch lưới', unit: 'kA', value: 25, hint: 'Hỏi Điện lực; 22 kV thường 20–25 kA' },
      { id: 't', label: 'Thời gian chịu ngắn mạch của tủ', unit: 's', value: 1 },
      { id: 'tc', label: 'Thời gian cắt sự cố (tính cáp)', unit: 's', value: 0.5, hint: 'Thời gian rơ le + máy cắt, thường 0,3–1 s' },
      { id: 'prot', label: 'Bảo vệ MBA', type: 'sel', value: 'auto', opts: [['auto', 'Tự đề xuất'], ['lbs', 'Cầu dao phụ tải + cầu chì'], ['vcb', 'Máy cắt chân không + rơ le']] },
      U.cfg('Cầu chì, cáp trung thế', 'Tự chọn (ước tính)', 'Tự nhập: cầu chì theo bảng của hãng, cáp theo catalogue'),
      { id: 'cfu', label: 'Cầu chì theo bảng của hãng', unit: 'A', value: 0, show: (v) => custom(v) && v.prot !== 'vcb', hint: '0 = ước tính 1,6 × I MBA' },
      { id: 'ccs', label: 'Tiết diện cáp trung thế', unit: 'mm²', value: 0, show: custom, hint: '0 = tool tự chọn' },
      { id: 'cci', label: 'Dòng cho phép cáp theo catalogue', unit: 'A', value: 0, show: custom, hint: 'Đã hiệu chỉnh theo cách lắp. 0 = bảng ước tính của tool (cáp Cu/XLPE 3 lõi 24 kV đi ngầm)' }
    ],
    basis: {
      std: [
        'I = S / (√3·U); thiết bị trung thế theo IEC 62271 (dòng định mức tối thiểu 630 A, dòng đỉnh = 2,5 × dòng ngắn hạn ở 50 Hz).',
        'Ổn định nhiệt cáp: S ≥ Ik·√t / 143 (Cu/XLPE 90 → 250 °C) – IEC 60949.'
      ],
      assume: [
        'Cầu chì bảo vệ MBA ≈ 1,6–2 × I định mức MBA (chịu dòng xung kích khi đóng máy) – quy tắc kinh nghiệm.',
        'Dòng cho phép cáp trung thế lấy thấp, chỉ để kiểm tra sơ bộ.',
        'Chế độ tự nhập: dùng cầu chì theo bảng phối hợp của hãng và cáp theo catalogue; tool kiểm tra dòng tải và ổn định nhiệt ngắn mạch của cáp.'
      ],
      verify: [
        'Cầu chì phải chọn theo bảng phối hợp cầu chì – MBA của hãng (Siemens, Schneider, ABB, SIBA).',
        'Chỉnh định rơ le 50/51 theo tính toán bảo vệ và yêu cầu của Điện lực.'
      ]
    },
    calc(v, k) {
      const Ukv = Number(v.u);
      guard(!(v.s > 0 && v.smax > 0 && v.ik > 0), 'Công suất và dòng ngắn mạch phải lớn hơn 0.');
      const I = v.s / (SQ3 * Ukv), Itk = I * k;
      const Ir = U.pick([630, 800, 1250, 1600, 2000, 2500], Itk);
      const Ika = U.pick([16, 20, 25, 31.5, 40], v.ik);
      guard(!Ika, 'Dòng ngắn mạch vượt 40 kA – cần thiết bị đặc biệt.');
      const IT = v.smax / (SQ3 * Ukv);
      const own = custom(v);
      guard(own && (v.cfu < 0 || v.ccs < 0 || v.cci < 0), 'Số liệu tự nhập không được âm.');
      const myFuse = own && v.cfu > 0;
      const fuse = myFuse ? v.cfu : U.pick(U.STD.fuseMV, 1.6 * IT);
      const useVcb = v.prot === 'vcb' || (v.prot === 'auto' && v.smax > 1000);
      const ct = U.pick(MV_CT, Itk);
      const sMin = v.ik * 1000 * Math.sqrt(v.tc) / 143;
      const myCab = own && (v.ccs > 0 || v.cci > 0);
      let cab;
      if (myCab) {
        const S = v.ccs > 0 ? v.ccs : (MV_CABLE.find((c) => c[0] >= Math.max(sMin, 50) && c[1] >= Itk) || [400])[0];
        const tab = MV_CABLE.find((c) => c[0] === S);
        cab = [S, v.cci > 0 ? v.cci : tab ? tab[1] : null];
      } else cab = MV_CABLE.find((c) => c[0] >= Math.max(sMin, 50) && c[1] >= Itk);
      return {
        tiles: [
          { l: 'Phương án bảo vệ MBA', v: useVcb ? 'Máy cắt VCB' : 'LBS + cầu chì', main: true, s: useVcb ? 'Rơ le 50/51, 50N/51N; MBA > 1000 kVA' : `Cầu chì ${f(fuse, 1)} A${myFuse ? ' (theo hãng)' : ''} cho MBA ${f(v.smax)} kVA` },
          { l: 'Cấp điện áp thiết bị', v: f(UM[Ukv], 1), u: 'kV', s: `Lưới ${Ukv} kV` },
          { l: 'Dòng định mức thanh cái / tủ', v: `${Ir}`, u: 'A', s: `Itk = ${f(Itk, 1)} A` },
          { l: 'Dòng chịu ngắn mạch', v: `${f(Ika, 1)} kA / ${f(v.t)} s`, s: `Ip ≥ ${f(Ika * 2.5, 1)} kA đỉnh` },
          { l: 'Tỉ số CT', v: `${ct}/5`, u: 'A', s: 'hoặc /1 A' },
          { l: myCab ? 'Cáp trung thế kiểm tra' : 'Cáp trung thế Cu/XLPE', v: cab ? `3 × ${f(cab[0])}` : '> 400', u: 'mm²', s: myCab ? `Icp = ${cab[1] ? `${f(cab[1], 0)} A` : '— (nhập theo catalogue)'} · Smin = ${f(sMin, 1)} mm²` : `Smin ngắn mạch = ${f(sMin, 1)} mm²` }
        ],
        checks: [
          ['ok', 'Dòng làm việc', `Tổng I = ${f(I, 1)} A; MBA lớn nhất ${f(IT, 1)} A`],
          useVcb ? ['warn', 'Chỉnh định rơ le (sơ bộ)', `51 ≈ 1,2–1,5 × I MBA = ${f(1.2 * IT, 0)}–${f(1.5 * IT, 0)} A; 50 đặt trên dòng xung kích (≈ 10 × I MBA = ${f(10 * IT, 0)} A). Phải tính bảo vệ chính thức.`]
            : myFuse ? [fuse > IT ? 'warn' : 'bad', 'Cầu chì theo hãng', fuse > IT ? `${f(fuse, 1)} A > I MBA = ${f(IT, 1)} A; tỉ số ${f(fuse / IT, 2)} – kiểm tra lại với bảng phối hợp cầu chì – MBA của hãng (dòng xung kích, chọn lọc với aptomat hạ thế).` : `${f(fuse, 1)} A ≤ I MBA = ${f(IT, 1)} A – cầu chì chảy khi MBA chạy định mức.`]
              : ['warn', 'Cầu chì (sơ bộ)', `1,6–2 × I MBA = ${f(1.6 * IT, 1)}–${f(2 * IT, 1)} A → ${f(fuse, 1)} A; bắt buộc đối chiếu bảng chọn cầu chì của hãng.`],
          v.smax > 1250 && !useVcb ? ['bad', 'Phương án bảo vệ', 'MBA > 1250 kVA không nên bảo vệ bằng cầu chì – dùng máy cắt.'] : ['ok', 'Phương án bảo vệ', 'Phù hợp công suất MBA.'],
          myCab ? (cab[1] ? [cab[1] >= Itk ? 'ok' : 'bad', 'Dòng cho phép cáp', `${f(cab[1], 0)} A ${cab[1] >= Itk ? '≥' : '<'} Itk = ${f(Itk, 1)} A`] : ['warn', 'Dòng cho phép cáp', `Cỡ ${f(cab[0])} mm² không có trong bảng ước tính – nhập dòng cho phép theo catalogue.`]) : null,
          myCab ? [cab[0] >= sMin ? 'ok' : 'bad', 'Ổn định nhiệt cáp', `${f(cab[0])} mm² ${cab[0] >= sMin ? '≥' : '<'} Smin = ${f(sMin, 1)} mm² (${f(v.ik)} kA, ${f(v.tc)} s)`] : null
        ].filter(Boolean),
        steps: [
          ['Dòng làm việc tổng', 'I = ΣS / (√3·U)', `${f(I, 2)} A`],
          ['Dòng thiết kế', 'Itk = I × k', `${f(Itk, 2)} A`],
          ['Dòng MBA lớn nhất', 'IT = Smax / (√3·U)', `${f(IT, 2)} A`],
          ['Cầu chì', 'Icc ≈ 1,6–2 × IT', `${f(fuse, 1)} A`],
          ['Ổn định nhiệt cáp', 'Smin = Ik·√tc / 143 (Cu/XLPE)', `${f(sMin, 1)} mm²`],
          myCab ? ['Cáp tự nhập', 'S, Icp theo catalogue', `${f(cab[0])} mm² (${cab[1] ? `${f(cab[1], 0)} A` : '—'})`] : ['Cáp chọn', 'S ≥ max(Smin; 50) và Icp ≥ Itk', cab ? `${cab[0]} mm² (${cab[1]} A)` : '—']
        ],
        notes: [
          'Tủ RMU/tủ hợp bộ chọn loại thử nghiệm điển hình theo IEC 62271-200, có phân loại hồ quang nội bộ IAC AFL 20 kA 1 s.',
          'Đầu nối, đo đếm, chống sét van theo thỏa thuận đấu nối và yêu cầu của Điện lực địa phương.'
        ],
        raw: { I, Itk, Ir, Ika, IT, fuse, ct, sMin, cabS: cab ? cab[0] : null }
      };
    }
  });

  // ================= T-03 Tủ hạ thế tổng (MSB) =================
  CD.register({
    id: 'tu-ha-the', group: 'tram', code: 'T-03', title: 'Tủ hạ thế tổng (MSB)', short: 'ACB tổng, CT, thanh cái, ATS.',
    desc: 'Aptomat tổng ACB, khả năng cắt, CT đo lường, thanh cái pha/N/PE, ATS máy phát và dung lượng tụ bù sơ bộ.',
    sf: 1.25, sfNote: 'ACB, CT, thanh cái chọn theo I × k; Icu ≥ Ik × k.',
    inputs: [
      { id: 's', label: 'Công suất MBA', unit: 'kVA', value: 1600 },
      { id: 'uk', label: 'Uk của MBA', unit: '%', value: 6, hint: 'Theo nhãn; IEC 60076-5: ≤ 630 kVA 4 %, 631–1250 kVA 5 %, 1251–2500 kVA 6 %' },
      { id: 'u', label: 'Điện áp', unit: 'V', value: 400 },
      { id: 'ta', label: 'Nhiệt độ trong tủ', unit: '°C', value: 45, hint: 'Thường = nhiệt độ phòng + 10 °C' },
      { id: 'mat', label: 'Thanh cái', type: 'sel', value: 'Cu', opts: [['Cu', 'Đồng'], ['Al', 'Nhôm']] },
      { id: 'gen', label: 'Có máy phát dự phòng', type: 'sel', value: 'y', opts: [['y', 'Có – dùng ATS'], ['n', 'Không']] },
      { id: 'sg', label: 'Công suất máy phát', unit: 'kVA', value: 1000, show: (v) => v.gen === 'y' },
      U.cfg('Cách chọn ACB tổng', 'Tự chọn theo dãy chuẩn', 'Tự nhập: kiểm tra ACB có sẵn (In / Ir, Icu)'),
      { id: 'cacb', label: 'Dòng định mức / chỉnh định ACB', unit: 'A', value: 2500, show: custom, hint: 'ACB chỉnh được: nhập dòng chỉnh định Ir' },
      { id: 'cicu', label: 'Icu của ACB', unit: 'kA', value: 65, show: custom, hint: 'Theo nhãn / catalogue ở 400–415 V' }
    ],
    basis: {
      std: [
        'Ik thanh cái theo IEC 60909-0 (c = 1,05, hệ số KT), lưới vô cùng lớn, bỏ qua tổng trở cáp MBA – tủ (thiên an toàn).',
        'Thanh cái theo bảng DIN 43671 (sơn, AC, 35 °C / 65 °C) – xem T-04; ổn định nhiệt S ≥ Ik·√t / k, k theo IEC 60865-1.'
      ],
      assume: ['Thanh N = 100 % pha (có sóng hài), PE ≥ 50 % pha; thời gian ngắn mạch 1 s cho thanh cái.', 'Chế độ kiểm tra ACB có sẵn: In ≥ Itk là Đạt, I MBA ≤ In < Itk là Lưu ý; Icu ≥ Ik × k là Đạt, Ik ≤ Icu < Ik × k là Lưu ý. Thanh cái vẫn chọn theo Itk – cấu hình riêng tính ở T-04.'],
      verify: [
        'Tủ tổng phải là tủ thử nghiệm điển hình theo IEC 61439-1/2; đối chiếu kích thước thanh cái với hồ sơ của nhà chế tạo tủ.',
        'Đối chiếu ACB, Icu với catalogue hãng.'
      ]
    },
    calc(v, k) {
      guard(!(v.s > 0 && v.uk > 0 && v.u > 0), 'Công suất, Uk và điện áp phải lớn hơn 0.');
      const I = v.s * 1000 / (SQ3 * v.u), Itk = I * k;
      const own = custom(v);
      guard(own && !(v.cacb > 0 && v.cicu > 0), 'Dòng định mức và Icu của ACB tự nhập phải lớn hơn 0.');
      const acb = own ? v.cacb : U.pick(U.STD.breaker, Itk);
      guard(!acb, `Dòng thiết kế ${f(Itk, 0)} A vượt ACB lớn nhất 6300 A – chia thành 2 phân đoạn thanh cái (2 MBA), hoặc chọn "Kiểm tra ACB có sẵn".`);
      const Ik = U.ikTrafo(v.s, v.uk, v.u).Ik;
      const icu = own ? v.cicu : U.pick(U.STD.icu, Ik * k);
      const ct = U.pick(U.STD.ct, Itk);
      const bb = busbar(Itk, { mat: v.mat, ta: v.ta, max: 4 });
      const bbN = busbar(Itk * 0.5, { mat: v.mat, ta: v.ta, max: 4 });
      const kth = bbK(v.mat, 65);
      const fMin = Ik * 1000 * 1 / kth;
      const tiles = [
        { l: own ? 'ACB tổng kiểm tra' : 'Aptomat tổng', v: `ACB ${own ? f(acb) : acb}`, u: 'A', main: true, s: own ? `Icu = ${f(icu)} kA · yêu cầu ≥ ${f(Ik * k, 1)} kA · tự nhập` : `${v.u === 400 ? '4P' : '3P'} · Icu ≥ ${icu || '>150'} kA · bảo vệ LSIG` },
        { l: 'Dòng định mức MBA', v: f(I, 0), u: 'A', s: `Itk = ${f(Itk, 0)} A` },
        { l: 'Ik tại thanh cái', v: f(Ik, 1), u: 'kA', s: 'IEC 60909, lưới vô cùng lớn' },
        { l: 'Biến dòng đo lường', v: `${ct}/5`, u: 'A', s: 'Cấp 0,5 cho đồng hồ đa năng' },
        { l: 'Thanh cái pha', v: bb.pick ? bbTxt(bb.pick) : '—', u: 'mm', s: bb.pick ? `${v.mat}, có sơn · ${f(bb.pick.I, 0)} A` : `Vượt bảng (lớn nhất ${bbTxt(bb.best)} = ${f(bb.best.I, 0)} A) – tính ở T-04 chế độ tự nhập` },
        { l: 'Thanh N / PE', v: bb.pick ? bbTxt(bb.pick) : '—', u: 'mm', s: `N = 100 %; PE ≥ ${bbN.pick ? bbTxt(bbN.pick) : '50 % pha'}` },
        { l: 'Tụ bù sơ bộ', v: `${U.pick(U.STD.kvar, 0.3 * v.s)}`, u: 'kVAr', s: '≈ 30 % Sđm MBA, tính ở Đ-06' }
      ];
      if (v.gen === 'y') {
        const Ig = v.sg * 1000 / (SQ3 * v.u);
        const ats = U.pick(U.STD.breaker, Math.max(Itk, Ig * k));
        tiles.push({ l: 'ATS chuyển nguồn', v: `${ats}`, u: 'A', s: `4 cực · máy phát ${f(Ig, 0)} A` });
      }
      const own1 = own ? [
        [acb >= Itk ? 'ok' : acb >= I ? 'warn' : 'bad', 'Dòng định mức ACB', acb >= Itk ? `${f(acb)} A ≥ Itk = ${f(Itk, 0)} A` : acb >= I ? `${f(acb)} A ≥ I MBA = ${f(I, 0)} A nhưng < Itk = ${f(Itk, 0)} A (chưa đủ hệ số k)` : `${f(acb)} A < I MBA = ${f(I, 0)} A – không khai thác hết công suất MBA`],
        [icu >= Ik * k ? 'ok' : icu >= Ik ? 'warn' : 'bad', 'Khả năng cắt ACB', icu >= Ik * k ? `Icu = ${f(icu)} kA ≥ Ik × k = ${f(Ik * k, 1)} kA` : icu >= Ik ? `Icu = ${f(icu)} kA ≥ Ik = ${f(Ik, 1)} kA nhưng < Ik × k = ${f(Ik * k, 1)} kA` : `Icu = ${f(icu)} kA < Ik = ${f(Ik, 1)} kA – không cắt được ngắn mạch`]
      ] : [];
      return {
        tiles,
        checks: [
          ...own1,
          [bb.pick && bb.pick.A >= fMin ? 'ok' : 'bad', 'Ổn định nhiệt thanh cái', `${bb.pick ? f(bb.pick.A) : '—'} mm² ≥ Ik·√t / k = ${f(fMin, 0)} mm² (t = 1 s, k = ${f(kth, 0)})`],
          ...(bb.pick && bb.pick.n === 4 ? [['warn', 'Thanh cái 4 thanh/pha', 'Giá trị bảng 4 thanh đã lấy thận trọng nhưng chưa đối chiếu được nguồn ngoài – kiểm tra theo hồ sơ nhà chế tạo tủ.']] : []),
          [v.ta > 40 ? 'warn' : 'ok', 'Nhiệt độ trong tủ', v.ta > 40 ? `${f(v.ta)} °C: kiểm tra hệ số giảm tải ACB theo catalogue, cân nhắc quạt thông gió tủ.` : 'Trong giới hạn chuẩn.'],
          ['ok', 'Chống sét lan truyền', 'Lắp SPD Type 1+2 (Iimp ≥ 12,5 kA/cực) tại tủ tổng.']
        ],
        steps: [
          ['Dòng định mức thứ cấp', 'I = S / (√3·U)', `${f(I, 1)} A`],
          ['Dòng thiết kế', 'Itk = I × k', `${f(Itk, 1)} A`],
          own ? ['ACB tự nhập', 'In / Ir (nhập)', `${f(acb)} A`] : ['ACB', 'In ≥ Itk', `${acb} A`],
          ['Ngắn mạch thanh cái', 'Ik = c·Un / (√3·KT·ZT)', `${f(Ik, 2)} kA`],
          ['Khả năng cắt', 'Icu ≥ Ik × k', `${icu ? f(icu) : '> 150'} kA`],
          ['Hiệu chỉnh nhiệt thanh cái', `((65 − ${f(v.ta)}) / 30)^${65 - v.ta < 30 ? '0,6' : '0,54'}`, f(bb.kT, 3)]
        ],
        notes: [
          'Tủ tổng nên phân ngăn Form 3b hoặc 4b để bảo trì từng lộ khi tủ vẫn có điện.',
          'Liên động cơ – điện giữa ACB nguồn lưới và ACB máy phát (hoặc ATS 4 cực) để không hòa ngược lưới.'
        ],
        raw: { I, Itk, acb, Ik, icu, ct, bbA: bb.pick ? bb.pick.A : null, bbI: bb.pick ? bb.pick.I : null, fMin }
      };
    }
  });

  // ================= T-04 Thanh cái =================
  const isCustom = (v) => v.mode === 'custom';
  CD.register({
    id: 'thanh-cai', group: 'tram', code: 'T-04', title: 'Thanh cái hạ thế', short: 'Kích thước thanh cái, ổn định nhiệt.',
    desc: 'Chọn thanh cái đồng/nhôm theo bảng DIN 43671 (1–4 thanh mỗi pha, rộng đến 200 mm) hoặc tự nhập cấu hình của nhà chế tạo; kiểm tra phát nóng, ổn định nhiệt và lực điện động khi ngắn mạch.',
    sf: 1.25, sfNote: 'Dòng yêu cầu thanh cái = I × k.',
    inputs: [
      { id: 'src', label: 'Dữ liệu', type: 'sel', value: 'I', opts: [['I', 'Biết dòng điện'], ['S', 'Biết công suất kVA']] },
      { id: 'i', label: 'Dòng điện', unit: 'A', value: 2000, show: (v) => v.src === 'I' },
      { id: 's', label: 'Công suất', unit: 'kVA', value: 1250, show: (v) => v.src === 'S' },
      { id: 'u', label: 'Điện áp', unit: 'V', value: 400, show: (v) => v.src === 'S' },
      { id: 'mode', label: 'Cách chọn thanh cái', type: 'sel', value: 'auto', opts: [['auto', 'Tự chọn theo bảng DIN 43671'], ['custom', 'Tự nhập cấu hình (tùy biến)']] },
      { id: 'mat', label: 'Vật liệu', type: 'sel', value: 'Cu', opts: [['Cu', 'Đồng'], ['Al', 'Nhôm']] },
      { id: 'surf', label: 'Bề mặt', type: 'sel', value: 'paint', opts: [['paint', 'Có sơn / bọc co nhiệt'], ['bare', 'Để trần']] },
      { id: 'ta', label: 'Nhiệt độ quanh thanh cái', unit: '°C', value: 45 },
      { id: 'tb', label: 'Nhiệt độ thanh cái cho phép', unit: '°C', value: 65, hint: 'DIN 43671: 65 °C. Cao hơn phải theo hồ sơ thử nghiệm tủ IEC 61439' },
      { id: 'max', label: 'Số thanh mỗi pha tối đa', type: 'sel', value: '4', show: (v) => !isCustom(v), opts: [['1', '1 thanh'], ['2', '2 thanh'], ['3', '3 thanh'], ['4', '4 thanh (2 cặp II II, thanh dày 10 mm)']] },
      { id: 'cw', label: 'Chiều rộng thanh', unit: 'mm', value: 120, show: isCustom },
      { id: 'ct', label: 'Chiều dày thanh', unit: 'mm', value: 10, show: isCustom },
      { id: 'cn', label: 'Số thanh mỗi pha', value: 4, show: isCustom, hint: 'Nhập bất kỳ, ví dụ 6 thanh = 2 bộ 3 thanh' },
      { id: 'cir', label: 'Dòng định mức của cấu hình', unit: 'A', value: 0, show: isCustom, hint: 'Theo catalogue hoặc hồ sơ thử nghiệm IEC 61439 của nhà chế tạo. 0 = tra bảng DIN nếu cấu hình có trong bảng' },
      { id: 'cref', label: 'Dòng định mức nhập ở điều kiện', type: 'sel', value: 'std', show: isCustom, opts: [['std', 'Chuẩn 35/65 °C (tool hiệu chỉnh)'], ['site', 'Đúng điều kiện lắp (giữ nguyên)']] },
      { id: 'ik', label: 'Dòng ngắn mạch', unit: 'kA', value: 40 },
      { id: 't', label: 'Thời gian ngắn mạch', unit: 's', value: 1 },
      { id: 'l', label: 'Khoảng cách giữa 2 gối sứ', unit: 'cm', value: 40 },
      { id: 'a', label: 'Khoảng cách giữa các pha', unit: 'cm', value: 15 }
    ],
    basis: {
      std: [
        'Dòng cho phép: DIN 43671 (E-Cu, AC 50 Hz, môi trường 35 °C, thanh 65 °C), 1–4 thanh mỗi pha, rộng 20–200 mm.',
        'Ổn định nhiệt: S ≥ Ik·√t / k, k = 226·√ln((200 + 234,5)/(θ + 234,5)) cho đồng, 148·√ln((200 + 228)/(θ + 228)) cho nhôm (IEC 60865-1, θcuối = 200 °C).',
        'Lực điện động pha giữa: F = 0,866·2·10⁻⁷·ip²·l/a (N) = 1,76·10⁻²·(l/a)·ixk² (kG); M = F·l/10; σ = M/W.'
      ],
      assume: [
        '4 thanh/pha (2 cặp II II): lấy thận trọng, không vượt 0,9 × 2 × giá trị 2 thanh.',
        'Thanh để trần nhiều thanh lấy theo tỉ lệ trần/sơn của 1 thanh; nhôm 0,78 × đồng cùng kích thước.',
        'Chế độ tùy biến: cấu hình ngoài bảng phải nhập dòng định mức của nhà chế tạo; tool vẫn kiểm tra nhiệt, lực điện động theo kích thước nhập.',
        'Ứng suất cho phép: đồng 1400 kG/cm², nhôm 700 kG/cm²; W theo mặt rộng đối diện nhau (bất lợi nhất), bỏ qua lực giữa các thanh cùng pha.'
      ],
      verify: [
        'Giá trị 1 thanh/pha đến 120×10 đối chiếu được với bảng của Rittal, Siemens (ví dụ 100×10 có sơn 1810 A, 30×10 trần 573 A).',
        'Cỡ 160×10, 200×10 và các phương án nhiều thanh chưa đối chiếu được nguồn ngoài: kiểm tra theo catalogue thanh cái hoặc hồ sơ thử nghiệm tủ IEC 61439.'
      ]
    },
    calc(v, k) {
      guard(v.tb <= v.ta, 'Nhiệt độ thanh cái cho phép phải lớn hơn nhiệt độ xung quanh.');
      guard(!(v.l > 0 && v.a > 0), 'Khoảng cách gối sứ và khoảng cách pha phải lớn hơn 0.');
      const I = v.src === 'I' ? v.i : v.s * 1000 / (SQ3 * v.u);
      guard(!(I > 0), 'Dòng điện phải lớn hơn 0.');
      const Itk = I * k;
      const kT = bbTempK(v.tb, v.ta), kM = v.mat === 'Al' ? K_BB_AL : 1;
      const checks = [];
      let b, how, rated = true, alt = [];
      if (isCustom(v)) {
        guard(!(v.cw > 0 && v.ct > 0 && v.cn >= 1), 'Chiều rộng, chiều dày và số thanh phải lớn hơn 0.');
        const n = Math.round(v.cn);
        const row = BB.find((r) => r[0] === v.cw && r[1] === v.ct);
        const tab = row ? bbBase(row, n, v.surf) : null;
        let Iok = null, Ibase = null;
        if (v.cir > 0) {
          Ibase = v.cir; Iok = v.cref === 'std' ? v.cir * kT : v.cir;
          how = v.cref === 'std' ? `Dòng nhà chế tạo ${f(v.cir, 0)} A × kθ` : `Dòng nhà chế tạo ${f(v.cir, 0)} A (không hiệu chỉnh)`;
          checks.push(['ok', 'Dòng định mức', `Theo số liệu nhà chế tạo nhập vào: ${f(v.cir, 0)} A${v.cref === 'std' ? ` ở 35/65 °C, hiệu chỉnh về ${f(v.ta)}/${f(v.tb)} °C` : ''}.`]);
        } else if (tab) {
          Ibase = tab; Iok = tab * kT * kM; how = `Bảng DIN 43671, ${n} thanh, ${v.surf === 'paint' ? 'có sơn' : 'trần'}`;
        } else {
          rated = false; how = 'Ngoài bảng DIN 43671';
        }
        b = { w: v.cw, t: v.ct, n, I: Iok, Ibase, A: v.cw * v.ct * n };
        if (n > 4) checks.push(['warn', 'Trên 4 thanh mỗi pha', 'Hiệu ứng lân cận làm các thanh phía trong mang ít dòng; chỉ dùng theo thiết kế đã thử nghiệm của nhà chế tạo (thường chia thành nhiều bộ thanh song song).']);
      } else {
        const r = busbar(Itk, { mat: v.mat, surf: v.surf, ta: v.ta, tb: v.tb, max: Number(v.max) });
        if (!r.pick) {
          const r4 = Number(v.max) < 4 ? busbar(Itk, { mat: v.mat, surf: v.surf, ta: v.ta, tb: v.tb, max: 4 }) : null;
          if (r4 && r4.pick) throw new Error(`Cần ${f(Itk, 0)} A: với tối đa ${v.max} thanh/pha bảng không đủ. Chọn "Số thanh mỗi pha tối đa" = 4 để có phương án ${bbTxt(r4.pick)} mm (${f(r4.pick.I, 0)} A).`);
          throw new Error(`Cần ${f(Itk, 0)} A nhưng cấu hình lớn nhất trong bảng DIN 43671 (${bbTxt(r.best)} mm) chỉ đạt ${f(r.best.I, 0)} A ở ${f(v.ta)} / ${f(v.tb)} °C. Cách xử lý: chọn "Tự nhập cấu hình" với dòng định mức của nhà chế tạo; dùng hệ thanh cái hoặc busway có thử nghiệm điển hình; chia phân đoạn thanh cái (nhiều MBA); hoặc xem lại hệ số k.`);
        }
        b = r.pick; alt = r.alt;
        how = `Bảng DIN 43671, ${b.n} thanh, ${v.surf === 'paint' ? 'có sơn' : 'trần'}`;
      }
      const kth = bbK(v.mat, v.tb);
      const fMin = v.ik * 1000 * Math.sqrt(v.t) / kth;
      const ixk = 1.8 * Math.SQRT2 * v.ik;
      const F = 1.76e-2 * (v.l / v.a) * ixk * ixk;                // kG
      const M = F * v.l / 10;                                       // kG·cm
      const W = b.n * (b.t / 10) * (b.t / 10) * (b.w / 10) / 6;      // cm³, mặt rộng đối diện nhau
      const sig = M / W, sigCp = v.mat === 'Cu' ? 1400 : 700;
      if (rated) checks.unshift([b.I >= Itk ? 'ok' : 'bad', 'Phát nóng', `${f(b.I, 0)} A ${b.I >= Itk ? '≥' : '<'} ${f(Itk, 0)} A`]);
      else checks.unshift(['warn', 'Phát nóng', `Cấu hình ${bbTxt(b)} mm ngoài bảng DIN 43671 – nhập "Dòng định mức của cấu hình" theo catalogue / hồ sơ thử nghiệm để kiểm tra.`]);
      if (b.n === 4 && !(isCustom(v) && v.cir > 0)) checks.push(['warn', 'Cấu hình 4 thanh/pha', 'Giá trị bảng 4 thanh (2 cặp II II) đã lấy thận trọng nhưng chưa đối chiếu được nguồn ngoài – bắt buộc kiểm tra theo catalogue nhà chế tạo tủ.']);
      if (b.w > 120 && !(isCustom(v) && v.cir > 0)) checks.push(['warn', 'Thanh rộng trên 120 mm', 'Giá trị bảng cho cỡ 160×10, 200×10 chưa đối chiếu được nguồn ngoài – kiểm tra theo catalogue.']);
      checks.push([b.A >= fMin ? 'ok' : 'bad', 'Ổn định nhiệt', `${f(b.A)} mm² ${b.A >= fMin ? '≥' : '<'} Ik·√t / k = ${f(fMin, 0)} mm²`]);
      checks.push([sig <= sigCp ? 'ok' : 'bad', 'Ổn định động (ước tính)', `σ = ${f(sig, 0)} ${sig <= sigCp ? '≤' : '>'} ${sigCp} kG/cm²${sig > sigCp ? ' – giảm khoảng cách gối sứ hoặc tăng khoảng cách pha' : ''}`]);
      if (alt.length) checks.push(['ok', 'Phương án khác cũng đạt', alt.map((x) => `${bbTxt(x)} mm (${f(x.I, 0)} A)`).join(' · ')]);
      return {
        tiles: [
          { l: 'Thanh cái mỗi pha', v: bbTxt(b), u: 'mm', main: true, s: `${v.mat === 'Cu' ? 'Đồng' : 'Nhôm'} · ${v.surf === 'paint' ? 'có sơn' : 'để trần'} · ${f(b.A)} mm²${isCustom(v) ? ' · cấu hình tự nhập' : ''}` },
          { l: 'Dòng cho phép sau hiệu chỉnh', v: rated ? f(b.I, 0) : '—', u: rated ? 'A' : '', s: rated ? `Yêu cầu ${f(Itk, 0)} A` : 'Cần dòng định mức của nhà chế tạo' },
          { l: 'Mật độ dòng', v: f(I / b.A, 2), u: 'A/mm²' },
          { l: 'Tiết diện tối thiểu (nhiệt)', v: f(fMin, 0), u: 'mm²', s: `k = ${f(kth, 0)}` },
          { l: 'Ứng suất uốn', v: f(sig, 0), u: 'kG/cm²', s: `Cho phép ${sigCp} kG/cm²` }
        ],
        checks,
        steps: [
          ['Dòng làm việc', v.src === 'I' ? 'I (nhập)' : 'I = S / (√3·U)', `${f(I, 1)} A`],
          ['Dòng yêu cầu', 'Itk = I × k', `${f(Itk, 1)} A`],
          rated ? ['Dòng cơ sở', how, `${f(b.Ibase, 0)} A`] : ['Dòng cơ sở', how, '—'],
          ['Hiệu chỉnh nhiệt độ', `((θcp − θ)/30)^${(v.tb - v.ta) < 30 ? '0,6' : '0,54'}`, f(kT, 3)],
          ['Hệ số vật liệu', v.mat === 'Al' ? 'Nhôm 0,78 × đồng (khi tra bảng)' : 'Đồng', f(kM, 2)],
          ['Hệ số ổn định nhiệt', 'k = K·√ln((θf + β)/(θi + β))', f(kth, 1)],
          ['Dòng xung kích', 'ixk = 1,8·√2·Ik', `${f(ixk, 1)} kA`],
          ['Lực điện động', 'F = 1,76·10⁻²·(l/a)·ixk²', `${f(F, 0)} kG`],
          ['Mô-men uốn', 'M = F·l / 10', `${f(M, 0)} kG·cm`],
          ['Mô-men chống uốn', 'W = n·b²·h / 6', `${f(W, 2)} cm³`]
        ],
        notes: [
          'Dòng trên khoảng 4000 A nên dùng hệ thanh cái hoặc busway có thử nghiệm điển hình (IEC 61439) của nhà chế tạo; nhiều bộ thanh song song phải đối xứng để chia dòng đều.',
          'Mối nối bulông: bề mặt mạ thiếc, siết đúng lực, kiểm tra camera nhiệt định kỳ 6 tháng.'
        ],
        raw: { I, Itk, A: b.A, n: b.n, w: b.w, t: b.t, Ibar: b.I, Ibase: b.Ibase, kT, kth, fMin, F, sig, rated }
      };
    }
  });

  // ================= T-05 Máy phát điện =================
  const GEN_START = { dol: ['Trực tiếp (DOL)', 7], yd: ['Sao – tam giác', 2.3], soft: ['Khởi động mềm', 3.5], vfd: ['Biến tần', 1.5] };
  CD.register({
    id: 'may-phat', group: 'tram', code: 'T-05', title: 'Máy phát điện dự phòng', short: 'Công suất, khởi động động cơ, dầu.',
    desc: 'Công suất máy phát theo tải ưu tiên và khởi động động cơ lớn nhất, tiêu hao nhiên liệu, bồn dầu, aptomat và ATS.',
    sf: 1.2, sfNote: 'Công suất yêu cầu × k trước khi chọn theo dãy máy phát.',
    inputs: [
      { id: 'p', label: 'Tổng tải ưu tiên', unit: 'kW', value: 600 },
      { id: 'kdt', label: 'Hệ số đồng thời', value: 0.8 },
      { id: 'cos', label: 'cosφ tải', value: 0.85 },
      { id: 'pm', label: 'Động cơ lớn nhất', unit: 'kW', value: 90 },
      { id: 'st', label: 'Khởi động động cơ đó', type: 'sel', value: 'yd', opts: Object.entries(GEN_START).map(([a, b]) => [a, b[0]]) },
      { id: 'xd', label: "Điện kháng X''d", unit: 'pu', value: 0.15, hint: 'Lấy theo catalogue máy phát; thông dụng 0,12–0,20' },
      { id: 'dv', label: 'Sụt áp cho phép khi khởi động', unit: '%', value: 20 },
      { id: 'dp', label: 'Dự phòng', unit: '%', value: 10 },
      { id: 'mode', label: 'Chế độ chọn', type: 'sel', value: 'prime', opts: [['prime', 'Prime – chạy liên tục'], ['standby', 'Standby – dự phòng mất điện']] },
      { id: 'h', label: 'Thời gian chạy liên tục', unit: 'giờ', value: 8 },
      { id: 'lf', label: 'Mức tải trung bình', unit: '%', value: 75 },
      { id: 'sfc', label: 'Suất tiêu hao dầu', unit: 'L/kWh', value: 0.24, hint: 'Lấy theo catalogue động cơ máy phát ở mức tải tương ứng' },
      U.cfg('Cách chọn máy phát', 'Tự chọn 1 máy (đến 3000 kVA)', 'Tự nhập: nhiều máy song song, công suất máy, thông số động cơ, điện áp'),
      { id: 'cn', label: 'Số máy phát chạy song song', value: 1, show: custom, hint: 'Các máy hòa đồng bộ cùng gánh tải; tool chia đều công suất' },
      { id: 'cs', label: 'Công suất mỗi máy', unit: 'kVA', value: 0, show: custom, hint: '0 = tool chọn theo dãy chuẩn. Nhập đúng định mức của chế độ đã chọn (Prime hoặc Standby)' },
      { id: 'cm', label: 'Bội số dòng khởi động động cơ lớn nhất', unit: '× In', value: 0, show: custom, hint: '0 = điển hình theo cách khởi động (DOL 7; Y–Δ 2,3; mềm 3,5; biến tần 1,5)' },
      { id: 'cmeta', label: 'Hiệu suất động cơ lớn nhất', value: 0.92, show: custom },
      { id: 'cmcos', label: 'cosφ động cơ lớn nhất', value: 0.86, show: custom },
      { id: 'cu', label: 'Điện áp máy phát', unit: 'V', value: 400, show: custom },
      { id: 'cpf', label: 'Hệ số công suất định mức máy phát', value: 0.8, show: custom, hint: 'ISO 8528: thường 0,8' }
    ],
    basis: {
      std: [
        'Định mức Prime / Standby theo ISO 8528-1; Standby ≈ 1,1 × Prime.',
        "Sụt áp khi đóng tải động cơ: ΔU ≈ Sst·X''d / (Sg + Sst·X''d) → Sg ≥ Sst·X''d·(1 − ΔU)/ΔU."
      ],
      assume: [
        'Động cơ lớn nhất chạy với η = 0,92, cosφ = 0,86; bội số khởi động như Đ-05.',
        `Cáp ra máy phát chọn nhanh theo aptomat: ${U.QUICK_NOTE}.`,
        'Chế độ tự nhập: nhiều máy chạy song song chia đều tải; sụt áp khi khởi động tính với tổng công suất các máy đang chạy (X″d tương đương không đổi).'
      ],
      verify: [
        'Kiểm khả năng khởi động động cơ (SkVA ở 20 % sụt áp) bằng phần mềm chọn máy của hãng (Cummins, CAT, Kohler…).',
        'Suất tiêu hao nhiên liệu theo bảng dữ liệu động cơ máy phát.'
      ]
    },
    calc(v, k) {
      guard(!(v.dv > 0 && v.dv < 100), 'Sụt áp cho phép phải trong khoảng 0–100 %.');
      guard(!(v.p > 0 && v.cos > 0 && v.cos <= 1), 'Tải phải lớn hơn 0 và cosφ trong khoảng 0–1.');
      const own = custom(v);
      const n = own ? Math.round(v.cn) : 1;
      const meta = own ? v.cmeta : 0.92, mcos = own ? v.cmcos : 0.86;
      const Ug = own ? v.cu : 400, pf = own ? v.cpf : 0.8;
      guard(own && !(n >= 1 && v.cs >= 0 && v.cm >= 0 && meta > 0 && meta <= 1 && mcos > 0 && mcos <= 1 && Ug > 0 && pf > 0 && pf <= 1),
        'Số máy phải ≥ 1; hiệu suất, cosφ, hệ số công suất trong khoảng 0–1; công suất, điện áp không được âm.');
      const Srun = v.p * v.kdt / v.cos;
      const Sm = v.pm / (meta * mcos);
      const mult = own && v.cm > 0 ? v.cm : GEN_START[v.st][1];
      const Sst = Sm * mult;
      const dv = v.dv / 100;
      const Sgs = Sst * v.xd * (1 - dv) / dv;
      const Sreq = Math.max(Srun * (1 + v.dp / 100), Sgs) * k;     // tổng các máy chạy song song
      const per = Sreq / n;
      const mine = own && v.cs > 0;
      const Sg = mine ? v.cs : U.pick(U.STD.gen, per);
      guard(!Sg, `Cần ${f(per, 0)} kVA mỗi máy, vượt dãy chuẩn 3000 kVA – chọn "Tự nhập" để tăng số máy phát chạy song song hoặc nhập máy lớn hơn.`);
      const prime = v.mode === 'prime' ? Sg : Sg / 1.1;
      const standby = v.mode === 'prime' ? Sg * 1.1 : Sg;
      const kw = prime * pf;
      const lph = n * kw * v.lf / 100 * v.sfc;
      const tank = lph * v.h * 1.1;
      const Ig = Sg * 1000 / (SQ3 * Ug);
      const brk = U.pick(U.STD.breaker, Ig);
      const cab = U.cableQuick(brk || Ig);
      const load = Srun / (n * prime);
      const SgTxt = mine ? f(Sg) : `${Sg}`;
      const checks = [];
      if (mine) checks.push([n * Sg >= Sreq ? 'ok' : 'bad', 'Công suất máy phát tự nhập', `${n > 1 ? `${n} × ${SgTxt} = ${f(n * Sg)}` : SgTxt} kVA ${n * Sg >= Sreq ? '≥' : '<'} yêu cầu ${f(Sreq, 0)} kVA`]);
      checks.push([load >= 0.3 ? 'ok' : 'warn', 'Mức tải vận hành', `≈ ${f(load * 100, 0)} %${load < 0.3 ? ' – dưới 30 % dễ đóng muội (wet stacking), cần tải giả khi chạy thử' : ''}`]);
      checks.push([Sgs <= Srun * (1 + v.dp / 100) ? 'ok' : 'warn', 'Yếu tố quyết định công suất', Sgs > Srun * (1 + v.dp / 100) ? 'Do khởi động động cơ – đổi sang khởi động mềm/biến tần để giảm cỡ máy.' : 'Do tải chạy.']);
      if (n > 1) checks.push(['warn', 'Chạy song song', `${n} máy hòa đồng bộ: cần tủ hòa, bộ chia tải; khi 1 máy sự cố, ${n - 1} máy còn lại gánh ${f((n - 1) * Sg)} kVA – cắt bớt tải không ưu tiên hoặc thêm 1 máy dự phòng (N+1).`]);
      checks.push(['ok', 'Khởi động tuần tự', 'Đóng động cơ lớn nhất trước, các tải khác cách nhau 5–10 s.']);
      return {
        tiles: [
          { l: `Máy phát ${mine ? 'kiểm tra' : 'chọn'} (${v.mode === 'prime' ? 'Prime' : 'Standby'})`, v: n > 1 ? `${n} × ${SgTxt}` : SgTxt, u: 'kVA', main: true, s: `${n > 1 ? 'Mỗi máy: ' : ''}Prime ≈ ${f(prime, 0)} kVA / ${f(kw, 0)} kW · Standby ≈ ${f(standby, 0)} kVA` },
          { l: 'Tải chạy Srun', v: f(Srun, 0), u: 'kVA' },
          { l: 'Yêu cầu do khởi động', v: f(Sgs, 0), u: 'kVA', s: `Sst động cơ = ${f(Sst, 0)} kVA (${f(mult, 2)} × In)` },
          { l: 'Tiêu hao nhiên liệu', v: f(lph, 0), u: 'L/h', s: `tại ${f(v.lf)} % tải${n > 1 ? `, ${n} máy` : ''}` },
          { l: 'Bồn dầu ngày', v: f(tank, 0), u: 'L', s: `${f(v.h)} giờ + 10 % đáy bồn` },
          { l: n > 1 ? 'Aptomat đầu cực mỗi máy' : 'Aptomat đầu cực / ATS', v: brk ? `${brk}` : '> 6300', u: 'A', s: `Iđm máy phát = ${f(Ig, 0)} A ở ${f(Ug)} V` },
          n > 1 ? { l: 'Dòng tổng thanh cái hòa', v: f(n * Ig, 0), u: 'A', s: 'Chọn ATS, thanh cái theo dòng này' } : null,
          { l: 'Cáp ra máy phát', v: U.cableTxt(cab), s: `Cu/XLPE chịu được aptomat · ${U.QUICK_NOTE}` }
        ].filter(Boolean),
        checks,
        steps: [
          ['Tải chạy', 'Srun = ΣP × Kđt / cosφ', `${f(Srun, 1)} kVA`],
          ['Động cơ lớn nhất khi chạy', `Sm = P / (η·cosφ), η = ${f(meta, 2)}, cosφ = ${f(mcos, 2)}`, `${f(Sm, 1)} kVA`],
          ['Công suất khởi động', `Sst = Sm × ${f(mult, 2)}`, `${f(Sst, 1)} kVA`],
          ['Theo sụt áp khởi động', "Sg ≥ Sst·X''d·(1 − ΔU)/ΔU", `${f(Sgs, 1)} kVA`],
          ['Công suất yêu cầu', 'max(Srun·(1+dp); Sg) × k', `${f(Sreq, 1)} kVA`],
          n > 1 ? ['Mỗi máy', `S ≥ Sreq / ${n}`, `${f(per, 1)} kVA`] : null,
          ['Nhiên liệu', `Q = ${n > 1 ? 'n·' : ''}P·tải%·suất tiêu hao, P = ${f(pf, 2)} × kVA Prime`, `${f(lph, 1)} L/h`]
        ].filter(Boolean),
        notes: [
          'Standby chỉ dùng khi mất điện lưới, tải trung bình ≤ 70 %, không quá 200 giờ/năm (ISO 8528). Chạy thay lưới thường xuyên phải chọn theo Prime.',
          'Tải phi tuyến (biến tần) > 30 %: chọn máy phát có kích từ PMG và tăng công suất 15–25 %.'
        ],
        raw: { Srun, Sm, Sst, Sgs, Sreq, n, Sg, prime, lph, tank, Ig, brk }
      };
    }
  });

  // ================= T-06 Tiếp địa =================
  // Hệ số sử dụng cọc đặt thành một dãy, không tính thanh nối (sổ tay thiết kế cung cấp điện) – lấy cận dưới
  const ETA = {
    1: [[1, 1], [2, 0.84], [3, 0.76], [5, 0.67], [10, 0.56], [15, 0.51], [20, 0.47]],
    2: [[1, 1], [2, 0.9], [3, 0.85], [5, 0.79], [10, 0.72], [15, 0.66], [20, 0.65]],
    3: [[1, 1], [2, 0.93], [3, 0.9], [5, 0.85], [10, 0.79], [15, 0.76], [20, 0.74]]
  };
  // Lấy bảng của tỉ số a/L thấp hơn và hàng có số cọc ≥ n (thiên an toàn)
  function etaOf(n, ratio) {
    const t = ETA[Math.min(3, Math.floor(ratio))];
    for (const r of t) if (r[0] >= n) return r[1];
    return null;
  }
  CD.register({
    id: 'tiep-dia', group: 'tram', code: 'T-06', title: 'Hệ thống tiếp địa', short: 'Điện trở cọc và số cọc cần thiết.',
    desc: 'Điện trở một cọc, số cọc cần thiết theo hệ số sử dụng, so với điện trở yêu cầu của trạm, chống sét hoặc thiết bị điện tử.',
    sf: 1.2, sfNote: 'Điện trở mục tiêu = R yêu cầu / k (khắt khe hơn khi k lớn).',
    inputs: [
      { id: 'rho', label: 'Điện trở suất đất ρ', unit: 'Ω·m', value: 100, hint: 'Nên đo tại hiện trường (phương pháp Wenner). Tham khảo: đất sét 40–100; pha cát 100–300; cát khô > 500' },
      { id: 'km', label: 'Hệ số mùa Kmùa', value: 1.4, hint: 'Cọc chôn sâu 0,8 m: 1,2–1,6 tùy vùng khí hậu' },
      { id: 'L', label: 'Chiều dài cọc', unit: 'm', value: 2.4 },
      { id: 'd', label: 'Đường kính cọc', unit: 'mm', value: 16, hint: 'Cọc thép mạ đồng D16; thép góc cạnh b quy đổi d ≈ 0,95·b' },
      { id: 'h0', label: 'Độ chôn sâu đỉnh cọc', unit: 'm', value: 0.8 },
      { id: 'a', label: 'Khoảng cách giữa các cọc', unit: 'm', value: 5 },
      { id: 'ryc', label: 'Điện trở yêu cầu', unit: 'Ω', value: 4, hint: 'Trạm, trung tính: ≤ 4 Ω; chống sét (TCVN 9385:2012): ≤ 10 Ω; thiết bị điện tử theo nhà sản xuất' },
      U.cfg('Cách bố trí cọc', 'Một hàng, tool tự tính số cọc', 'Tự nhập: số cọc bất kỳ, hệ số sử dụng (mạch vòng, lưới)'),
      { id: 'cn', label: 'Số cọc', value: 10, show: custom, hint: 'Không giới hạn 20 cọc khi nhập hệ số sử dụng' },
      { id: 'ceta', label: 'Hệ số sử dụng η', value: 0, show: custom, hint: '0 = tra bảng một hàng (≤ 20 cọc). Mạch vòng, lưới: lấy theo sổ tay thiết kế' }
    ],
    basis: {
      std: [
        'Điện trở cọc thẳng đứng chôn sâu: R1 = ρ·Kmùa / (2πL) · [ln(2L/d) + ½·ln((4t + L)/(4t − L))], t = h0 + L/2.',
        'Hệ cọc: Rn = R1 / (n·η), η – hệ số sử dụng cọc đặt thành dãy.'
      ],
      assume: [
        'Hệ số sử dụng lấy cận dưới của bảng, bỏ qua phần thanh nối nằm ngang (kết quả thiên an toàn).',
        'Tối đa 20 cọc một hàng; cần nhiều hơn phải chuyển sang mạch vòng / lưới tiếp địa.',
        'Chế độ tự nhập: dùng số cọc và hệ số sử dụng do người dùng nhập (mạch vòng, lưới, nhiều hàng); vẫn bỏ qua phần thanh nối nằm ngang.'
      ],
      verify: [
        'Đo điện trở suất đất trước thiết kế và đo điện trở nối đất sau thi công bằng phương pháp 3 cực, vào mùa khô.',
        'So với công thức Dwight cho cọc sát mặt đất R ≈ ρ/(2πL)·ln(4L/d): kết quả tool phải nhỏ hơn một chút do cọc chôn sâu.'
      ]
    },
    calc(v, k) {
      guard(v.L <= 0 || v.d <= 0 || v.a <= 0 || v.rho <= 0 || v.ryc <= 0, 'Số liệu phải lớn hơn 0.');
      guard(v.h0 < 0, 'Độ chôn sâu không được âm.');
      const own = custom(v);
      const ratio = v.a / v.L;
      const myEta = own && v.ceta > 0;
      guard(!myEta && ratio < 1, 'Khoảng cách giữa các cọc phải ≥ chiều dài cọc (ngoài bảng hệ số sử dụng) – hoặc chọn "Tự nhập" và nhập hệ số sử dụng η.');
      const dm = v.d / 1000, t = v.h0 + v.L / 2;
      const R1 = v.rho * v.km / (2 * Math.PI * v.L) * (Math.log(2 * v.L / dm) + 0.5 * Math.log((4 * t + v.L) / (4 * t - v.L)));
      const target = v.ryc / k;
      let n = 1, eta = 1, Rn = R1;
      if (own) {
        n = Math.round(v.cn);
        guard(!(n >= 1) || !(v.ceta >= 0 && v.ceta <= 1), 'Số cọc phải ≥ 1, hệ số sử dụng trong khoảng 0–1.');
        eta = myEta ? v.ceta : etaOf(n, ratio);
        guard(eta == null, `${n} cọc vượt bảng hệ số sử dụng một hàng (tối đa 20) – nhập hệ số sử dụng η theo sổ tay cho cách bố trí thực tế.`);
        Rn = R1 / (n * eta);
      } else while (Rn > target && n < 20) { n++; eta = etaOf(n, ratio); Rn = R1 / (n * eta); }
      const ok = Rn <= target;
      const dwight = v.rho * v.km / (2 * Math.PI * v.L) * Math.log(4 * v.L / dm);
      return {
        tiles: [
          own ? { l: 'Điện trở hệ cọc tự nhập', v: f(Rn, 2), u: 'Ω', main: true, s: `${n} cọc ${f(v.L, 1)} m · η = ${f(eta, 2)}${myEta ? ' (nhập)' : ' (bảng một hàng)'} · ${ok ? 'đạt' : 'chưa đạt'} mục tiêu ${f(target, 2)} Ω` }
            : { l: 'Số cọc cần thiết', v: ok ? `${n}` : '> 20', u: 'cọc', main: true, s: ok ? `Cọc ${f(v.L, 1)} m, cách nhau ${f(v.a, 1)} m, một hàng · R ≈ ${f(Rn, 2)} Ω` : 'Một hàng 20 cọc chưa đạt – chuyển sang mạch vòng / lưới' },
          { l: 'Điện trở 1 cọc', v: f(R1, 2), u: 'Ω', s: `Kiểm nhanh Dwight: ${f(dwight, 2)} Ω` },
          { l: 'Điện trở mục tiêu', v: f(target, 2), u: 'Ω', s: `= ${f(v.ryc)} / ${f(k, 2)}` },
          { l: 'Hệ số sử dụng η', v: f(eta, 2), s: `a/L = ${f(ratio, 2)}` },
          own ? null : { l: 'Dây nối (bố trí 1 hàng)', v: f((n - 1) * v.a, 1), u: 'm', s: 'Cáp đồng trần ≥ 50 mm² hoặc thép dẹt 40×4' }
        ].filter(Boolean),
        checks: [
          [ok ? 'ok' : 'bad', 'Điện trở hệ thống', ok ? `${f(Rn, 2)} Ω ≤ ${f(target, 2)} Ω` : own ? `${n} cọc: R = ${f(Rn, 2)} Ω > ${f(target, 2)} Ω – tăng số cọc, cọc dài hơn hoặc khoảng cách lớn hơn.` : `Với 20 cọc R = ${f(Rn, 2)} Ω > ${f(target, 2)} Ω – dùng mạch vòng/lưới, cọc sâu (khoan giếng) hoặc hóa chất giảm điện trở; tính lại theo phương pháp lưới.`],
          [ratio >= 2 ? 'ok' : 'warn', 'Khoảng cách cọc', ratio >= 2 ? 'Khoảng cách ≥ 2 lần chiều dài cọc.' : 'Khoảng cách < 2L làm giảm hiệu quả – tăng khoảng cách nếu mặt bằng cho phép.'],
          myEta ? ['warn', 'Hệ số sử dụng tự nhập', 'Ghi rõ nguồn của η (sổ tay, cách bố trí mạch vòng/lưới); đo điện trở thực tế sau thi công.'] : null
        ].filter(Boolean),
        steps: [
          ['Độ sâu tâm cọc', 't = h0 + L/2', `${f(t, 2)} m`],
          ['Điện trở 1 cọc', 'R1 = ρ·Km/(2πL)·[ln(2L/d) + ½·ln((4t+L)/(4t−L))]', `${f(R1, 3)} Ω`],
          ['Điện trở hệ cọc', 'Rn = R1 / (n·η)', `${f(Rn, 3)} Ω`],
          ['Điện trở mục tiêu', 'Ryc / k', `${f(target, 3)} Ω`]
        ],
        notes: [
          'Nối đất trạm, nối đất chống sét và nối đất thiết bị nên liên kết đẳng thế tại một thanh nối đất chính.'
        ],
        raw: { R1, Rn, n: ok ? n : null, eta, target, dwight }
      };
    }
  });
})();
