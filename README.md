# Tính toán cơ điện

Bộ công cụ tính toán cơ điện cho nhà máy giấy bao bì. Trang web tĩnh (HTML/CSS/JS thuần), không cần máy chủ, không liên kết với ứng dụng nào khác. Mở `index.html` bằng trình duyệt là dùng được.

Mỗi bảng tính có **hệ số an toàn k** chọn nhanh (1 · 1,1 · 1,15 · 1,2 · 1,25 · 1,3 · 1,5) hoặc tự nhập, kết quả chọn theo dãy thiết bị tiêu chuẩn, có mục kiểm tra Đạt / Lưu ý / Không đạt và bảng diễn giải công thức.

## Danh mục bảng tính

| Mã | Bảng tính | Nội dung |
|---|---|---|
| Đ-01 | Tính dòng điện | Dòng từ kW / kVA / HP, S – P – Q |
| Đ-02 | Tiết diện dây & sụt áp | IEC 60364-5-52, hiệu chỉnh nhiệt độ, nhóm mạch, sụt áp, ổn định nhiệt |
| Đ-03 | Chọn aptomat | In, MCB/MCCB/ACB, đường cong, Icu, phối hợp với cáp |
| Đ-04 | Dòng ngắn mạch hạ thế *(gợi ý)* | IEC 60909 rút gọn, Ik3, ip, Icu |
| Đ-05 | Động cơ & khởi động *(gợi ý)* | DOL, Y–Δ, khởi động mềm, biến tần; contactor, rơ le nhiệt, cáp |
| Đ-06 | Tụ bù công suất phản kháng *(gợi ý)* | kVAr, số cấp, cuộn kháng khi có sóng hài |
| T-01 | Chọn máy biến áp | Hệ số nhu cầu, dự phòng, 1 hoặc 2 máy, quá tải sự cố |
| T-02 | Tủ trung thế | Thanh cái, Ik, cầu chì / VCB, CT, cáp trung thế |
| T-03 | Tủ hạ thế tổng (MSB) | ACB, Icu, CT, thanh cái, ATS, tụ bù sơ bộ |
| T-04 | Thanh cái hạ thế | DIN 43671, ổn định nhiệt, lực điện động |
| T-05 | Máy phát điện dự phòng | Tải chạy, khởi động động cơ, nhiên liệu, bồn dầu |
| T-06 | Hệ thống tiếp địa *(gợi ý)* | Điện trở cọc, số cọc theo hệ số sử dụng |
| C-01 | Hệ thống chiller | RT, kW/RT, nước lạnh, tháp giải nhiệt, bơm, ống |
| C-02 | Điều hoà treo tường | BTU theo phòng, người, thiết bị, nắng; aptomat, dây, ống đồng |
| C-03 | Hệ thống khí nén | FAD, máy nén, bình chứa, ống chính, máy sấy, chi phí rò rỉ |
| C-04 | Hút khí thải & thông gió | Bội số trao đổi / nhiệt / chụp hút, quạt, ống gió |
| C-05 | Bơm & tiết kiệm bằng biến tần *(gợi ý)* | Công suất bơm, ống hút/đẩy, luật đồng dạng |
| C-06 | Ống hơi & lò hơi *(gợi ý)* | Bảng hơi bão hòa, cỡ ống, nhiệt lượng, nước ngưng |
| C-07 | Chiếu sáng nhà xưởng *(gợi ý)* | Phương pháp quang thông, bố trí lưới đèn |
| C-08 | Quy đổi đơn vị *(gợi ý)* | Công suất, áp suất, lưu lượng, năng lượng, nhiệt độ |

## Xem trên điện thoại qua GitHub Pages

1. Vào **Settings → Pages** của repo.
2. Mục *Build and deployment*: Source = **Deploy from a branch**, chọn nhánh chứa code và thư mục `/ (root)`, bấm **Save**.
3. Sau 1–2 phút trang có địa chỉ dạng `https://<tên-tài-khoản>.github.io/tool-t-nh-to-n/`.

## Cấu trúc

```
index.html       khung trang
css/style.css    giao diện vàng – đen
js/core.js       lõi: form, hệ số an toàn, hiển thị kết quả, dãy tiêu chuẩn
js/m-dien.js     nhóm Điện động lực (Đ-01 … Đ-06)
js/m-tram.js     nhóm Trạm & nguồn (T-01 … T-06)
js/m-co.js       nhóm Cơ – nhiệt – tiện ích (C-01 … C-08)
```

Thêm bảng tính mới: gọi `CD.register({...})` với danh sách `inputs` và hàm `calc(v, k, U)` trả về `tiles`, `checks`, `steps`, `notes`.

## Lưu ý

Kết quả là tính toán sơ bộ theo công thức và bảng tra phổ biến. Khi đặt hàng thiết bị cần đối chiếu catalogue nhà sản xuất và điều kiện lắp đặt thực tế.
