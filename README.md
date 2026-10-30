# EMT – Tính toán cơ điện

Bộ công cụ hỗ trợ tính toán cơ điện cho nhà máy giấy bao bì. Trang web tĩnh (HTML/CSS/JS thuần), không cần máy chủ, không liên kết với ứng dụng nào khác. Mở `index.html` bằng trình duyệt là dùng được, kể cả khi mất mạng.

- Mỗi bảng tính có **hệ số an toàn k** chọn nhanh (1 · 1,1 · 1,15 · 1,2 · 1,25 · 1,3 · 1,5) hoặc tự nhập.
- Kết quả chọn theo dãy thiết bị tiêu chuẩn, có mục kiểm tra Đạt / Lưu ý / Không đạt, bảng diễn giải công thức và mục **Cơ sở tính toán & cách kiểm chứng** (tiêu chuẩn, giả thiết, cách tự kiểm).
- **Tùy biến:** cuối phần thông số của mỗi bảng có ô "Cách chọn …" hoặc "Giả thiết tính". Chọn **Tự nhập (tùy biến)** để nhập thiết bị có sẵn, số liệu catalogue hoặc thay giả thiết của tool; tool kiểm tra và báo Đạt / Lưu ý / Không đạt.
- **Không lưu dữ liệu.** Số nhập chỉ giữ khi đang dùng; về trang chủ (bấm logo) thì mọi bảng trở về số mặc định.

> Đây là công cụ hỗ trợ tính toán. Thiết kế chính thức phải được kỹ sư có thẩm quyền kiểm tra theo tiêu chuẩn hiện hành và catalogue thiết bị.

## Kiểm chứng

- Trang **Kiểm chứng** (`#kiem-chung`) chạy trực tiếp các hàm tính với các ca có đáp số độc lập: số trong bảng tiêu chuẩn, catalogue hãng, quy định, phép tính tay theo công thức gốc. Ca nào lệch quá dung sai sẽ hiện "Lệch". Trang cũng liệt kê các lỗi đã phát hiện và sửa.
- Chạy kiểm thử không cần trình duyệt:

  ```bash
  node tests/run.js
  ```

  Lệnh này chạy toàn bộ ca kiểm chứng và mọi bảng tính với mọi tổ hợp ô chọn ở k = 1; 1,25; 1,5, báo lỗi nếu có kết quả sai lệch hoặc NaN.

## Danh mục bảng tính và cơ sở chính

| Mã | Bảng tính | Cơ sở chính |
|---|---|---|
| Đ-01 | Tính dòng điện | I = S/(√3·U); Ib ≤ In ≤ Iz (IEC 60364-4-43) |
| Đ-02 | Tiết diện dây & sụt áp | IEC 60364-5-52:2009 bảng B.52.4, B.52.5 (cột B2, C, E, D1), B.52.14/15/17/19, phụ lục G; IEC 60364-4-43; IEC 60364-5-54 |
| Đ-03 | Chọn aptomat | IEC 60364-4-43, IEC 60898-1, IEC 60947-2 |
| Đ-04 | Dòng ngắn mạch hạ thế | IEC 60909-0 (c = 1,05, hệ số KT, phần góp của động cơ) |
| Đ-05 | Động cơ & khởi động | In = P/(√3·U·cosφ·η); contactor AC-3 (IEC 60947-4-1) |
| Đ-06 | Tụ bù công suất phản kháng | Qc = P·(tanφ1 − tanφ2); IEC 60831-1; TT 15/2014/TT-BCT |
| T-01 | Chọn máy biến áp | Hệ số nhu cầu; Uk theo IEC 60076-5; Ik theo IEC 60909 |
| T-02 | Tủ trung thế | IEC 62271; ổn định nhiệt cáp IEC 60949 |
| T-03 | Tủ hạ thế tổng (MSB) | IEC 60909; thanh cái DIN 43671; IEC 61439 |
| T-04 | Thanh cái hạ thế | DIN 43671 (1–4 thanh/pha, rộng đến 200 mm) hoặc tự nhập cấu hình và dòng định mức của nhà chế tạo; ổn định nhiệt IEC 60865-1/IEC 60949; lực điện động |
| T-05 | Máy phát điện dự phòng | ISO 8528-1; sụt áp khởi động động cơ |
| T-06 | Hệ thống tiếp địa | Điện trở cọc chôn sâu; hệ số sử dụng (cận dưới) |
| C-01 | Hệ thống chiller | Cân bằng nhiệt, công suất bơm, nước bổ sung tháp |
| C-02 | Điều hoà treo tường | Ước tính tải theo diện tích, người, thiết bị |
| C-03 | Hệ thống khí nén | Atlas Copco Compressed Air Manual (bình chứa, đường kính ống) |
| C-04 | Hút khí thải & thông gió | Bội số trao đổi, cân bằng nhiệt, chụp hút |
| C-05 | Bơm & tiết kiệm bằng biến tần | P = ρ·g·Q·H/η; luật đồng dạng |
| C-06 | Ống hơi & lò hơi | Bảng hơi IAPWS-IF97; ống Sch40 |
| C-07 | Chiếu sáng nhà xưởng | Phương pháp quang thông; QCVN 22:2016/BYT |
| C-08 | Quy đổi đơn vị | Hằng số quy đổi chuẩn |

## Tùy biến

| Mã | Tự nhập được |
|---|---|
| Đ-02 | Cỡ cáp bất kỳ (kể cả 400–630 mm², cáp đơn lõi), số sợi, Iz của hãng (ở điều kiện chuẩn hoặc đã hiệu chỉnh), aptomat thực tế, điện kháng x |
| Đ-03 | Aptomat có sẵn: In / Ir, Icu, loại MCB hoặc MCCB / ACB |
| Đ-04 | Hệ số điện áp c, điện kháng cáp x, bội số ILR/IrM của động cơ |
| Đ-05 | In theo nhãn, IA/IN, dòng giới hạn khởi động mềm, dòng khởi động qua biến tần |
| Đ-06 | Số cấp bất kỳ, điện áp định mức tụ, cuộn kháng p, tủ có sẵn (quy đổi dung lượng trên nhãn ↔ công suất thực ở lưới) |
| T-01 | Công suất MBA bất kỳ (kể cả trên 5000 kVA), hệ số quá tải sự cố |
| T-02 | Cầu chì theo bảng của hãng, cỡ cáp trung thế và dòng cho phép theo catalogue |
| T-03 | ACB có sẵn: In / Ir, Icu |
| T-04 | Cấu hình thanh cái bất kỳ và dòng định mức của nhà chế tạo |
| T-05 | Nhiều máy phát chạy song song, công suất mỗi máy, bội số khởi động, η và cosφ động cơ, điện áp, hệ số công suất máy phát |
| T-06 | Số cọc bất kỳ, hệ số sử dụng (mạch vòng, lưới, nhiều hàng) |
| C-01 | Cỡ chiller (kể cả trên 2000 RT), hiệu suất bơm, hệ số động cơ bơm, cosφ, điện áp |
| C-02 | Mật độ tải lạnh, hệ số nắng, cỡ máy, COP, điện áp |
| C-03 | Số chu kỳ tải / không tải, chênh áp, chiều dài tương đương, số máy dự phòng, hệ số máy sấy |
| C-04 | Khối lượng riêng không khí, hệ số động cơ, tỉ lệ cạnh ống, tỉ lệ gió bù |
| C-05 | Động cơ có sẵn (kể cả trên 1000 kW), điện áp, cosφ, hiệu suất biến tần, đặc tính tiết lưu |
| C-06 | Cỡ ống DN để kiểm tra vận tốc |
| C-07 | Hệ số sử dụng U, số hàng đèn, dòng MCB, cosφ đèn |

Đ-01 chỉ tính dòng điện từ công suất (mọi ô đều tự nhập; cáp và aptomat chi tiết ở Đ-02, Đ-03). C-08 là quy đổi đơn vị.

## Giao diện

Theo bản thiết kế 01 đã chốt (`thiet-ke/chot-giao-dien.md`): nền trắng, vàng ấm `#F5C400`, xanh than `#172B3A`, font Be Vietnam Pro nhúng sẵn. Điện thoại: nút ba gạch bên trái, menu danh mục trượt từ trái. Máy tính: thanh danh mục bên trái.

## Xem trên điện thoại

1. GitHub Pages: **Settings → Pages**, chọn nhánh chứa code và thư mục `/ (root)`.
2. Mở link bằng Safari → **Chia sẻ → Thêm vào MH chính** để chạy toàn màn hình như app.

## Cấu trúc

```
index.html             khung trang
manifest.webmanifest   cấu hình chạy như app khi thêm vào màn hình chính
css/style.css          giao diện
fonts/                 Be Vietnam Pro (giấy phép SIL OFL 1.1 trong OFL.txt)
icons/                 biểu tượng app
js/core.js             lõi: điều hướng, form, hệ số an toàn, hiển thị kết quả, trang Kiểm chứng
js/m-dien.js           nhóm Điện động lực (Đ-01 … Đ-06), bảng dòng cho phép cáp, ngắn mạch IEC 60909
js/m-tram.js           nhóm Trạm & nguồn (T-01 … T-06), bảng thanh cái
js/m-co.js             nhóm Cơ – nhiệt – tiện ích (C-01 … C-08)
js/kiem-chung.js       các ca kiểm chứng và danh sách lỗi đã sửa
tests/run.js           kiểm thử chạy bằng Node
thiet-ke/              bản chốt giao diện
```

Thêm bảng tính mới: gọi `CD.register({...})` với `id`, `group`, `code`, `title`, `short`, `desc`, `inputs`, `basis` (`std`, `assume`, `verify`) và hàm `calc(v, k, U)` trả về `tiles`, `checks` (`[trạng thái, tiêu đề, chi tiết]`), `steps`, `notes`, `raw` (số liệu thô để kiểm chứng). Thêm ca kiểm chứng tương ứng trong `js/kiem-chung.js`.
