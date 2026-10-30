/* Các ca kiểm chứng: đáp số lấy từ bảng tiêu chuẩn, catalogue hãng, quy định và tính tay theo công thức gốc.
   ext: true = đã đối chiếu với nguồn bên ngoài trong lần rà soát 30/10/2026. */
(function () {
  'use strict';
  const U = CD.U;
  const S = U.STD.cable;
  const iz = (mm2, mat, ins, met, pha = '3') => U.izBase(S.indexOf(mm2), mat, ins, met, pha);
  const run = (id, over, k) => CD.calcWith(id, over, k).raw;
  const BB = (w, t) => U.BB.find((b) => b[0] === w && b[1] === t);

  CD.bench([
    // ---------- Bảng tra tiêu chuẩn ----------
    { kind: 'table', code: 'Đ-02', name: 'Cáp Cu/XLPE nhiều lõi, kẹp tường (cột C), 95 mm²', expect: 278, unit: 'A', digits: 1, ext: true, src: 'IEC 60364-5-52:2009 bảng B.52.5, cột C, 3 ruột mang tải, 30 °C – khớp bản chép TiSoft và một nguồn thứ hai.', run: () => iz(95, 'Cu', 'XLPE', 'C') },
    { kind: 'table', code: 'Đ-02', name: 'Cáp Cu/XLPE, cột C, 120 mm²', expect: 322, unit: 'A', digits: 1, ext: true, src: 'IEC 60364-5-52:2009 bảng B.52.5, cột C.', run: () => iz(120, 'Cu', 'XLPE', 'C') },
    { kind: 'table', code: 'Đ-02', name: 'Cáp Cu/XLPE, cột C, 240 mm²', expect: 500, unit: 'A', digits: 1, ext: true, src: 'IEC 60364-5-52:2009 bảng B.52.5, cột C.', run: () => iz(240, 'Cu', 'XLPE', 'C') },
    { kind: 'table', code: 'Đ-02', name: 'Cáp Cu/XLPE trong ống / máng kín (cột B2), 2,5 mm²', expect: 26, unit: 'A', digits: 1, ext: true, src: 'IEC 60364-5-52:2009 bảng B.52.5, cột B2 – khớp bản chép TiSoft.', run: () => iz(2.5, 'Cu', 'XLPE', 'B2') },
    { kind: 'table', code: 'Đ-02', name: 'Cáp Cu/XLPE, cột B2, 120 mm²', expect: 268, unit: 'A', digits: 1, ext: true, src: 'IEC 60364-5-52:2009 bảng B.52.5, cột B2 – khớp bản chép TiSoft.', run: () => iz(120, 'Cu', 'XLPE', 'B2') },
    { kind: 'table', code: 'Đ-02', name: 'Cáp Cu/XLPE trong ống chôn đất (cột D1), 150 mm²', expect: 251, unit: 'A', digits: 1, ext: true, src: 'IEC 60364-5-52:2009 bảng B.52.5, cột D1, đất 20 °C – khớp bản chép TiSoft.', run: () => iz(150, 'Cu', 'XLPE', 'D') },
    { kind: 'table', code: 'Đ-02', name: 'Cáp Cu/PVC, cột B2, 4 mm²', expect: 27, unit: 'A', digits: 1, ext: true, src: 'IEC 60364-5-52:2009 bảng B.52.4, cột B2.', run: () => iz(4, 'Cu', 'PVC', 'B2') },
    { kind: 'table', code: 'Đ-02', name: 'Cáp Cu/PVC, cột C, 120 mm²', expect: 259, unit: 'A', digits: 1, src: 'IEC 60364-5-52 bảng B.52.4, cột C (trùng BS 7671 bảng 4D2A) – nên tự đối chiếu bản gốc.', run: () => iz(120, 'Cu', 'PVC', 'C') },
    { kind: 'table', code: 'Đ-02', name: 'Cáp Cu/PVC, cột E (máng đục lỗ), 95 mm²', expect: 238, unit: 'A', digits: 1, src: 'IEC 60364-5-52 bảng B.52.10, 3 ruột mang tải – nên tự đối chiếu bản gốc.', run: () => iz(95, 'Cu', 'PVC', 'E') },
    { kind: 'table', code: 'Đ-02', name: 'Cáp Cu/XLPE, cột E, 95 mm²', expect: 298, unit: 'A', digits: 1, src: 'IEC 60364-5-52 bảng B.52.12, 3 ruột mang tải. Một nguồn thứ cấp ghi 304 A; tool dùng số thấp hơn (thiên an toàn).', run: () => iz(95, 'Cu', 'XLPE', 'E') },
    { kind: 'table', code: 'T-04', name: 'Thanh đồng 100×10, có sơn, 1 thanh/pha, AC, 35/65 °C', expect: 1810, unit: 'A', digits: 0, ext: true, src: 'DIN 43671 – khớp bảng dòng định mức thanh cái của Rittal.', run: () => BB(100, 10)[2] },
    { kind: 'table', code: 'T-04', name: 'Thanh đồng 30×10, để trần, 1 thanh/pha', expect: 573, unit: 'A', digits: 0, ext: true, src: 'DIN 43671 – khớp catalogue Siemens (573 A ở 65 °C).', run: () => BB(30, 10)[6] },
    { kind: 'factor', code: 'T-04', name: 'Thanh đồng 30×10 trần, thanh cho phép 85 °C (môi trường 35 °C)', expect: 756, unit: 'A', digits: 0, tol: 0.01, ext: true, src: 'Catalogue Siemens: 30×10 trần 756 A ở 85 °C. Tool: 573 A × hiệu chỉnh nhiệt độ.', run: () => BB(30, 10)[6] * U.bbTempK(85, 35) },
    { kind: 'factor', code: 'T-04', name: 'Thanh đồng 30×10 trần, thanh cho phép 105 °C (môi trường 35 °C)', expect: 900, unit: 'A', digits: 0, tol: 0.01, ext: true, src: 'Catalogue Siemens: 30×10 trần 900 A ở 105 °C. Tool: 573 A × hiệu chỉnh nhiệt độ.', run: () => BB(30, 10)[6] * U.bbTempK(105, 35) },
    { kind: 'table', code: 'T-01', name: 'Uk tối thiểu MBA 630 kVA', expect: 4, unit: '%', digits: 1, ext: true, src: 'IEC 60076-5 bảng 1: 25–630 kVA → 4,0 %.', run: () => U.ukIEC(630) },
    { kind: 'table', code: 'T-01', name: 'Uk tối thiểu MBA 1000 kVA', expect: 5, unit: '%', digits: 1, ext: true, src: 'IEC 60076-5 bảng 1: 631–1250 kVA → 5,0 % (bản cũ của tool lấy 6 %).', run: () => U.ukIEC(1000) },
    { kind: 'table', code: 'T-01', name: 'Uk tối thiểu MBA 1600 kVA', expect: 6, unit: '%', digits: 1, src: 'IEC 60076-5 bảng 1: 1251–2500 kVA → 6,0 %.', run: () => U.ukIEC(1600) },

    // ---------- Hệ số hiệu chỉnh ----------
    { kind: 'factor', code: 'Đ-02', name: 'Hệ số nhiệt độ cáp XLPE, không khí 40 °C', expect: 0.91, digits: 3, tol: 0.005, src: 'IEC 60364-5-52 bảng B.52.14: XLPE 40 °C → 0,91.', run: () => U.kTemp('XLPE', 40, 30) },
    { kind: 'factor', code: 'Đ-02', name: 'Hệ số nhiệt độ cáp PVC, không khí 45 °C', expect: 0.79, digits: 3, tol: 0.005, src: 'IEC 60364-5-52 bảng B.52.14: PVC 45 °C → 0,79.', run: () => U.kTemp('PVC', 45, 30) },
    { kind: 'factor', code: 'Đ-02', name: 'Hệ số nhiệt độ cáp XLPE trong đất 30 °C', expect: 0.93, digits: 3, tol: 0.01, src: 'IEC 60364-5-52 bảng B.52.15: XLPE 30 °C → 0,93.', run: () => U.kTemp('XLPE', 30, 20) },
    { kind: 'factor', code: 'Đ-02', name: 'Hệ số nhóm: 3 mạch bó chung', expect: 0.7, digits: 2, tol: 0, src: 'IEC 60364-5-52 bảng B.52.17, mục 1.', run: () => U.groupFactor('bunch', 3) },
    { kind: 'factor', code: 'Đ-02', name: 'Hệ số nhóm: 4 mạch một lớp trên máng đục lỗ', expect: 0.77, digits: 2, tol: 0, src: 'IEC 60364-5-52 bảng B.52.17, mục 4 (bản cũ của tool lấy 0,79).', run: () => U.groupFactor('tray', 4) },
    { kind: 'factor', code: 'Đ-02', name: 'Hệ số nhóm: 2 mạch một lớp áp tường', expect: 0.85, digits: 2, tol: 0, src: 'IEC 60364-5-52 bảng B.52.17, mục 2.', run: () => U.groupFactor('wall', 2) },
    { kind: 'factor', code: 'Đ-02', name: 'Hệ số nhóm: 3 ống chôn đất đặt sát nhau', expect: 0.75, digits: 2, tol: 0, src: 'IEC 60364-5-52 bảng B.52.19.', run: () => U.groupFactor('duct', 3) },
    { kind: 'factor', code: 'T-04', name: 'Hệ số ổn định nhiệt thanh đồng, 65 → 200 °C', expect: 137.86, digits: 2, tol: 0.001, src: 'IEC 60949 / IEC 60865-1: k = 226·√ln((200 + 234,5)/(65 + 234,5)).', run: () => U.bbK('Cu', 65) },

    // ---------- Công thức – tính tay ----------
    { kind: 'formula', code: 'Đ-01', name: 'Dòng tải 75 kW, cosφ 0,85, 400 V', expect: 127.36, unit: 'A', digits: 2, tol: 0.0005, src: 'I = P / (√3·U·cosφ) = 75 000 / (1,7321 × 400 × 0,85).', run: () => run('dong-dien', { mode: 'kw', p: 75, eta: 1, cos: 0.85 }, 1).I },
    { kind: 'formula', code: 'Đ-01', name: 'Động cơ 7,5 kW, η 0,9, cosφ 0,85', expect: 14.151, unit: 'A', digits: 3, tol: 0.0005, src: 'I = P / (√3·U·cosφ·η) = 7500 / (1,7321 × 400 × 0,85 × 0,9).', run: () => run('dong-dien', { mode: 'motor', p: 7.5, etam: 0.9, cos: 0.85 }, 1).I },
    { kind: 'formula', code: 'Đ-02', name: 'Sụt áp: Cu 70 mm², 200 A, 100 m, cosφ 0,85', expect: 2.731, unit: '%', digits: 3, tol: 0.002, src: 'ΔU = √3·I·L·(ρ/S·cosφ + x·sinφ) / U, ρ = 0,0225, x = 0,08 mΩ/m (IEC 60364-5-52 phụ lục G).', run: () => run('tiet-dien-day', { src: 'I', ib: 200, met: 'E', arr: 'single', n: 1, ta: 30, L: 100, ik: 0, cos: 0.85 }, 1).dpct },
    { kind: 'formula', code: 'Đ-02', name: 'Tiết diện tối thiểu chịu ngắn mạch: Cu/XLPE, 25 kA, 0,2 s', expect: 78.18, unit: 'mm²', digits: 2, tol: 0.001, src: 'S = Ik·√t / K = 25 000 × √0,2 / 143 (IEC 60364-4-43).', run: () => run('tiet-dien-day', { src: 'I', ib: 100, prot: 'delay', ik: 25, tk: 0.2 }, 1).sMin },
    { kind: 'formula', code: 'Đ-04', name: 'Ik đầu cực MBA 1000 kVA, uk 5 %, Pk 10,5 kW, lưới vô cùng lớn', expect: 31.28, unit: 'kA', digits: 2, tol: 0.001, src: 'IEC 60909-0: ZT = 8 mΩ, KT = 0,9691, Ik = 1,05 × 400 / (√3 × 7,753 mΩ). Kiểm nhanh In·100/uk = 28,9 kA.', run: () => run('ngan-mach', { sn: 1000, uk: 5, pk: 10.5, un: 400, ikq: 0, pmot: 0, L: 0 }, 1).Ik0 },
    { kind: 'formula', code: 'Đ-05', name: 'Dòng định mức động cơ 55 kW, cosφ 0,86, η 0,94', expect: 98.2, unit: 'A', digits: 2, tol: 0.0005, src: 'In = 55 000 / (√3 × 400 × 0,86 × 0,94).', run: () => run('dong-co', { p: 55, u: 400, cos: 0.86, eta: 0.94 }, 1).In },
    { kind: 'formula', code: 'Đ-05', name: 'Dòng nhánh pha khi đấu sao – tam giác', expect: 56.70, unit: 'A', digits: 2, tol: 0.0005, src: 'Iph = In / √3 = 98,20 / 1,7321.', run: () => run('dong-co', { p: 55, u: 400, cos: 0.86, eta: 0.94, st: 'yd' }, 1).ol },
    { kind: 'formula', code: 'Đ-06', name: 'Dung lượng bù 900 kW, cosφ 0,78 → 0,95', expect: 426.6, unit: 'kVAr', digits: 1, tol: 0.005, src: 'Bảng hệ số kVAr/kW (0,78 → 0,95: 0,474) × 900 kW.', run: () => run('tu-bu', { p: 900, c1: 0.78, c2: 0.95 }, 1).Qc },
    { kind: 'formula', code: 'T-01', name: 'Dòng hạ thế MBA 1000 kVA, 400 V', expect: 1443.4, unit: 'A', digits: 1, tol: 0.0005, src: 'I = S / (√3·U) = 1 000 000 / (1,7321 × 400).', run: () => 1000 * 1000 / (U.SQ3 * 400) },
    { kind: 'formula', code: 'T-06', name: 'Điện trở 1 cọc: L 3 m, d 16 mm, đỉnh chôn 0,8 m, ρ 100 Ω·m', expect: 33.24, unit: 'Ω', digits: 2, tol: 0.001, src: 'R = ρ/(2πL)·[ln(2L/d) + ½·ln((4t + L)/(4t − L))], t = 2,3 m.', run: () => run('tiep-dia', { rho: 100, km: 1, L: 3, d: 16, h0: 0.8, a: 6, ryc: 1000 }, 1).R1 },
    { kind: 'formula', code: 'C-01', name: 'Lưu lượng nước lạnh cho 1000 kW, ΔT 5 °C', expect: 172.0, unit: 'm³/h', digits: 1, tol: 0.001, src: 'G = Q / (ρ·cp·ΔT) = 1000 / (4,186 × 5) kg/s = 172,0 m³/h.', run: () => run('chiller', { m: 'kw', q: 1000, dtc: 5 }, 1).fc },
    { kind: 'formula', code: 'C-03', name: 'Bình chứa: máy 100 L/s, Δp 0,5 bar, 1 chu kỳ/30 s', expect: 1500, unit: 'L', digits: 0, tol: 0.001, src: 'V = 0,25·qc·p1 / (fmax·Δp) = 0,25 × 100 × 1 / (1/30 × 0,5) (Atlas Copco Compressed Air Manual).', run: () => run('khi-nen', { q: 12, kdt: 1, leak: 0, dp: 0, n: 2 }, 1).V },
    { kind: 'formula', code: 'C-05', name: 'Công suất thủy lực bơm 120 m³/h, 35 m, nước', expect: 11.445, unit: 'kW', digits: 3, tol: 0.001, src: 'P = ρ·g·Q·H = 1000 × 9,81 × (120/3600) × 35.', run: () => run('bom', { q: 120, H: 35, rho: 1000 }, 1.15).Ph },
    { kind: 'formula', code: 'C-06', name: 'Nhiệt độ hơi bão hòa ở 10 bar g', expect: 184.1, unit: '°C', digits: 1, tol: 0.005, src: 'Bảng hơi IAPWS-IF97: 11,01 bar tuyệt đối ≈ 184,1 °C.', run: () => run('ong-hoi', { p: 10 }, 1).ts },
    { kind: 'formula', code: 'C-06', name: 'Thể tích riêng hơi bão hòa ở 10 bar g', expect: 0.1774, unit: 'm³/kg', digits: 4, tol: 0.01, src: 'IAPWS-IF97 ≈ 0,1774 m³/kg; tool nội suy tuyến tính nên lệch ≈ +0,7 % (lớn hơn → ống hơi chọn dư, an toàn).', run: () => run('ong-hoi', { p: 10 }, 1).sv },
    { kind: 'formula', code: 'C-08', name: '1 bar đổi ra psi', expect: 14.504, unit: 'psi', digits: 3, tol: 0.0005, src: '1 psi = 6894,76 Pa (NIST SP 811).', run: () => U.CONV.pr.u.bar / U.CONV.pr.u.psi },
    { kind: 'formula', code: 'C-08', name: '1 RT đổi ra kW', expect: 3.517, unit: 'kW', digits: 3, tol: 0.0005, src: '1 RT = 12 000 BTU/h = 3,517 kW.', run: () => U.CONV.pw.u.RT / U.CONV.pw.u.kW },

    // ---------- Kết quả chọn thiết bị ----------
    { kind: 'select', code: 'Đ-01', name: 'Cáp sơ bộ cho động cơ 7,5 kW, k = 1,25', expect: 4, unit: 'mm²', digits: 1, tol: 0, src: 'Itk = 17,7 A → In = 20 A → cần Iz ≥ 20 / (0,913 × 0,8) = 27,4 A; cột B2 XLPE: 2,5 mm² = 26 A (thiếu), 4 mm² = 35 A.', run: () => run('dong-dien', { mode: 'motor', p: 7.5, etam: 0.9, cos: 0.85 }, 1.25).cabS },
    { kind: 'select', code: 'Đ-02', name: 'Cáp cho In 200 A, XLPE, máng đục lỗ, 30 °C, 1 mạch', expect: 70, unit: 'mm²', digits: 0, tol: 0, src: 'Bảng B.52.5 cột E: 50 mm² = 192 A < 200 A; 70 mm² = 246 A.', run: () => run('tiet-dien-day', { src: 'I', ib: 200, met: 'E', arr: 'single', n: 1, ta: 30, L: 100, ik: 0, cos: 0.85 }, 1).S },
    { kind: 'select', code: 'Đ-02', name: 'Dây PE cho ruột pha 120 mm²', expect: 70, unit: 'mm²', digits: 0, tol: 0, src: 'IEC 60364-5-54 bảng 54.2: S > 35 mm² → S/2 = 60 mm² → cỡ chuẩn 70 mm².', run: () => run('tiet-dien-day', { src: 'I', ib: 320, met: 'E', arr: 'single', n: 1, ta: 30, L: 10, ik: 0 }, 1).pe },
    { kind: 'select', code: 'Đ-03', name: 'Aptomat cho Ib 186,8 A, k = 1,25', expect: 250, unit: 'A', digits: 0, tol: 0, src: 'Itk = 233,5 A → dãy chuẩn In ≥ Itk: 250 A.', run: () => run('aptomat', { src: 'I', ib: 186.8, iz: 0 }, 1.25).In },
    { kind: 'select', code: 'T-04', name: 'Thanh cái tự nhập 6 × 120×10, dòng nhà chế tạo 7000 A, đúng điều kiện', expect: 7000, unit: 'A', digits: 0, tol: 0, src: 'Chế độ tùy biến: dùng đúng dòng định mức nhập, không hiệu chỉnh.', run: () => run('thanh-cai', { mode: 'custom', cw: 120, ct: 10, cn: 6, cir: 7000, cref: 'site', i: 6000 }, 1).Ibar },
    { kind: 'select', code: 'T-01', name: 'MBA: 2400 kW × 0,7 / 0,92, dự phòng 20 %, k = 1,1', expect: 2500, unit: 'kVA', digits: 0, tol: 0, src: 'Stt = 1826 kVA → Stk = 1826 × 1,2 × 1,1 = 2410 kVA → 2500 kVA.', run: () => run('may-bien-ap', {}, 1.1).Sdm },

    // ---------- Chế độ tùy biến (tự nhập) ----------
    { kind: 'formula', code: 'Đ-02', name: 'Cáp tự nhập 2 × 300 mm², Iz hãng 700 A ở 30 °C, lắp ở 40 °C, 1 mạch', expect: 1278.0, unit: 'A', digits: 1, tol: 0.001, src: 'Iz = 2 sợi × 700 A × k1, k1 = √((90 − 40)/(90 − 30)) = 0,9129 (XLPE).', run: () => run('tiet-dien-day', { cfg: 'custom', src: 'I', ib: 800, ins: 'XLPE', met: 'E', arr: 'bunch', ta: 40, n: 1, np: 2, cs: 300, ciz: 700, cref: 'std' }, 1).IzTot },
    { kind: 'formula', code: 'Đ-04', name: 'Động cơ 200 kW góp dòng ngắn mạch, ILR/IrM = 6 (tự nhập)', expect: 2.273, unit: 'kA', digits: 3, tol: 0.001, src: 'IkM = 6 × 1,05 × IrM; IrM = (200 / 0,8) kVA / (√3 × 400 V) = 360,8 A.', run: () => run('ngan-mach', { cfg: 'custom', cilr: 6, pmot: 200, ikq: 0, L: 0 }, 1).IkM },
    { kind: 'formula', code: 'Đ-05', name: 'Sao – tam giác, In nhãn 100 A, IA/IN = 7,5 (tự nhập)', expect: 250, unit: 'A', digits: 0, tol: 0, src: 'Ist = IA/IN ÷ 3 × In = 7,5 ÷ 3 × 100 A.', run: () => run('dong-co', { cfg: 'custom', st: 'yd', cin: 100, cia: 7.5 }, 1).Ist },
    { kind: 'factor', code: 'Đ-06', name: 'Tụ 440 V + cuộn kháng 7 % trên lưới 400 V: dung lượng nhãn / thực', expect: 1.125, digits: 3, tol: 0.001, ext: true, src: 'Vishay – Calculation of capacitor output in detuned filter circuits: 400 V, p = 7 %, tụ 440 V → nhân 1,125. Tool: (440/400)² × (1 − 0,07) = 1,1253.', run: () => 1 / run('tu-bu', { cfg: 'custom', cun: 440, cp: 7 }, 1).kN },
    { kind: 'table', code: 'T-01', name: 'Uk tối thiểu MBA 8000 kVA (tự nhập máy lớn)', expect: 8, unit: '%', digits: 1, src: 'IEC 60076-5 bảng 1: 6301–25 000 kVA → 8,0 % – nên tự đối chiếu bản gốc.', run: () => run('may-bien-ap', { cfg: 'custom', cs: 8000, p: 9000 }, 1.1).uk },
    { kind: 'select', code: 'T-05', name: '2 máy phát chạy song song, tải mặc định, k = 1,2', expect: 400, unit: 'kVA', digits: 0, tol: 0, src: 'Sreq = max(564,7 × 1,1; 157,0) × 1,2 = 745,4 kVA → mỗi máy 372,7 kVA → 400 kVA.', run: () => run('may-phat', { cfg: 'custom', cn: 2 }, 1.2).Sg },
    { kind: 'formula', code: 'T-06', name: '10 cọc 3 m, hệ số sử dụng nhập 0,6', expect: 5.54, unit: 'Ω', digits: 2, tol: 0.002, src: 'Rn = R1 / (n·η) = 33,24 / (10 × 0,6).', run: () => run('tiep-dia', { rho: 100, km: 1, L: 3, d: 16, h0: 0.8, a: 6, ryc: 1, cfg: 'custom', cn: 10, ceta: 0.6 }, 1).Rn },
    { kind: 'formula', code: 'C-02', name: 'Phòng 6 × 5 × 3,2 m, mật độ tự nhập 600 BTU/m², 6 người, 1200 W', expect: 25994.4, unit: 'BTU/h', digits: 1, tol: 0.0005, src: 'Q = 30 × 600 × 3,2/3 + 6 × 450 + 1200 × 3,412 = 19 200 + 2700 + 4094,4.', run: () => run('dieu-hoa', { room: 'cus', qd: 600, L: 6, W: 5, H: 3.2, pp: 6, eq: 1200, sun: 'n' }, 1).Q },
    { kind: 'formula', code: 'C-03', name: 'Bình chứa: 100 L/s, 1 chu kỳ/phút, chênh áp 1 bar (tự nhập)', expect: 1500, unit: 'L', digits: 0, tol: 0.001, src: 'V = 0,25 × 100 × 1 / (1/60 × 1) (Atlas Copco Compressed Air Manual).', run: () => run('khi-nen', { cfg: 'custom', q: 6, kdt: 1, leak: 0, dp: 0, n: 1, cfm: 1, cdp: 1 }, 1).V },
    { kind: 'formula', code: 'C-04', name: 'Thải 150 kW nhiệt, ΔT 5 °C, không khí 1,13 kg/m³ (tự nhập)', expect: 95100, unit: 'm³/h', digits: 0, tol: 0.001, src: 'Q = 3600 × 150 / (1,13 × 1,005 × 5) = 95 099,7 m³/h.', run: () => run('khi-thai', { cfg: 'custom', m: 'heat', heat: 150, dt: 5, crho: 1.13 }, 1).Q },
    { kind: 'factor', code: 'C-05', name: 'Tiết lưu về 80 % lưu lượng, công suất ở 0 lưu lượng = 60 % (tự nhập)', expect: 0.92, digits: 3, tol: 0.0005, src: 'P/P100 = 0,6 + 0,4 × 0,8.', run: () => { const r = run('bom', { cfg: 'custom', cth: 60, sp: 80 }, 1.15); return r.Pthr / r.Pin; } },
    { kind: 'formula', code: 'C-07', name: 'Xưởng 72 × 36 m, 300 lux, U nhập 0,6', expect: 88.16, unit: 'bộ', digits: 2, tol: 0.001, src: 'N = 300 × 2592 / (21 000 × 0,6 × 0,7) = 88,16.', run: () => run('chieu-sang', { cfg: 'custom', cuf: 0.6 }, 1).N0 }
  ]);

  CD.audit([
    ['Đ-02', 'Cột C cáp XLPE dùng nhầm bộ số', 'Thay bằng bảng B.52.5 của IEC 60364-5-52:2009. Ví dụ 95 mm²: 282 → 278 A; 240 mm²: 514 → 500 A (bản cũ cao hơn 1–3 %, lệch về phía không an toàn).'],
    ['Đ-02', 'Cáp trong ống / máng kín tra nhầm cột C', 'Thêm cột B2 cho cáp trong ống, máng kín; cột C chỉ còn là kẹp trực tiếp lên tường. Ví dụ XLPE 120 mm²: C = 322 A, B2 = 268 A.'],
    ['Đ-02', 'Hệ số cáp nhôm 0,78 cao hơn bảng IEC (≈ 0,76)', 'Giảm còn 0,75.'],
    ['Đ-02', 'Hệ số nhóm một lớp trên máng đục lỗ sai', '4 mạch: 0,79 → 0,77; 6 mạch: 0,76 → 0,73. Thêm lựa chọn "bó chung / nhiều lớp" (mặc định) và "một lớp".'],
    ['Đ-02', 'Mạch 1 pha nhân 1,12', 'Giảm còn 1,10 (thấp hơn bảng 2 ruột mang tải của IEC).'],
    ['Đ-02', 'Kiểm tra ngắn mạch làm mạch nhỏ ra cáp quá lớn', 'Aptomat cắt tức thời không áp Ik·√t mà so I²t cho qua với (K·S)² theo IEC 60364-4-43.'],
    ['Đ-01 · Đ-05 · Đ-06 · T-05', 'Cáp chọn nhanh theo dòng tải, không theo aptomat', 'Nay cáp phải chịu được In aptomat, tra cột B2 (trong ống/máng kín), 40 °C, 2 mạch bó chung, tối thiểu 2,5 mm². Động cơ 7,5 kW trước ra 1,5 mm², nay 2,5–4 mm².'],
    ['T-01', 'Uk của MBA 800–1250 kVA lấy 6 %', 'IEC 60076-5 quy định 5 % → dòng ngắn mạch trước đây thấp hơn thực tế ≈ 17 %. Thêm ô nhập Uk theo nhãn máy.'],
    ['Đ-04 · T-01 · T-03', 'Ngắn mạch thiếu hệ số hiệu chỉnh KT của IEC 60909', 'Thêm KT = 0,95·c / (1 + 0,6·xT); kết quả tăng khoảng 3–4 %. Thêm phần dòng ngắn mạch do động cơ đang chạy góp vào.'],
    ['T-03 · T-04', 'Hệ số ghép nhiều thanh cái quá cao', 'Thay hệ số chung 1,7 / 2,3 / 2,9 bằng bảng theo từng cỡ thanh (thanh rộng bị hiệu ứng lân cận lớn hơn); bỏ phương án 4 thanh/pha.'],
    ['T-03 · T-04', 'Ổn định nhiệt thanh cái dùng α = 6', 'Thay bằng công thức IEC: ở 65 °C k ≈ 138, tiết diện yêu cầu lớn hơn ≈ 20 %.'],
    ['T-06', 'Hệ số sử dụng cọc lấy giá trị giữa bảng', 'Nay lấy cận dưới và giới hạn 20 cọc một hàng.'],
    ['C-01', 'Động cơ bơm chọn sát công suất trục', 'Nay chọn ≥ 1,15 × công suất trục.']
  ]);
})();
