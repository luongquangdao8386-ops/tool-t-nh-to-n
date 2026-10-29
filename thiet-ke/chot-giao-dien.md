# Chốt giao diện web app “Tính toán cơ điện”

Ngày cập nhật: 30/10/2026.

## 1. Nội dung đã chốt

- **Bảng màu đã được duyệt:** nền trắng, vàng ấm làm màu chủ đạo, xanh than cho chữ và biểu tượng.
- **Điều chỉnh điều hướng:** nút menu ba gạch đặt ở góc trên bên trái trên điện thoại, trước logo và tên app. Menu danh mục mở từ bên trái.
- Ngôn ngữ: tiếng Việt có dấu.
- Đối tượng sử dụng: kỹ sư và nhân sự vận hành nhà máy giấy bao bì.
- Ưu tiên iPhone rộng 390 px; bố cục máy tính được thiết kế ở rộng 1440 px và co giãn theo màn hình.
- Phạm vi hiện tại: giao diện và tương tác mẫu. Kết quả Đ-02 là dữ liệu minh họa cố định.

## 2. Bảng màu HEX và công dụng

| Thành phần | HEX | Công dụng |
| --- | --- | --- |
| Nền chính | `#FFFFFF` | Nền trang, thẻ, menu |
| Nền phụ | `#F7F9FA` | Ô tìm kiếm, vùng thông tin phụ, chỉ số |
| Chữ chính | `#172B3A` | Tên app, tiêu đề, kết quả, biểu tượng |
| Chữ nội dung | `#344B5A` | Nhãn nhập liệu và nội dung diễn giải |
| Chữ phụ | `#657682` | Mô tả, đơn vị và chú thích |
| Viền chung | `#DDE4E8` | Viền thẻ, menu, đường phân cách |
| Viền ô nhập | `#CFD8DF` | Ô số và ô chọn |
| Vàng chủ đạo | `#F5C400` | Logo, nút chính, hệ số đang chọn, điểm nhấn |
| Vàng khi trỏ chuột | `#E4B600` | Trạng thái hover của nút chính |
| Vàng nhạt | `#FFF8DB` | Nền mục đang chọn và kết quả chính |
| Đạt — chữ / nền | `#147D57` / `#E9F5EE` | Nhãn và biểu tượng Đạt |
| Lưu ý — chữ / nền | `#946200` / `#FFF2D3` | Nhãn và biểu tượng Lưu ý |
| Không đạt — chữ / nền | `#B93A38` / `#FDEEEE` | Nhãn và biểu tượng Không đạt |
| Focus bàn phím | `#3A6CA8` | Viền đánh dấu thành phần đang được chọn bằng bàn phím |

Chữ trên nút vàng dùng xanh than `#172B3A`. Mỗi trạng thái kiểm tra có nhãn chữ và biểu tượng đi cùng màu.

## 3. Font và kích thước

**Font chính:** [Be Vietnam Pro — Google Fonts](https://fonts.google.com/specimen/Be+Vietnam+Pro), hỗ trợ tiếng Việt.

| Thành phần | Độ đậm |
| --- | --- |
| Nội dung, mô tả | 400 |
| Nhãn nhập liệu, điều hướng phụ | 500 |
| Tên công cụ, số phụ | 600 |
| Tiêu đề, kết quả chính, nút chính | 700 |
| Tên app | 800 |

- Tiêu đề điện thoại khoảng 27–28 px; máy tính khoảng 30–32 px.
- Tên bảng tính trên danh sách: 14 px.
- Số kết quả chính: khoảng 65 px trên điện thoại, 72 px trên máy tính.
- Ô nhập và ô chọn trên điện thoại dùng chữ từ 16 px; số đầu vào khoảng 21 px.
- Nút ba gạch và các nút chọn hệ số có vùng chạm tối thiểu 44 × 44 px.
- Font đã được nhúng trong HTML để mở ngoại tuyến. Font dự phòng: Arial, sans-serif; giấy phép font được giữ trong tệp HTML.

## 4. Header và điều hướng

### Trên điện thoại

Thứ tự từ trái sang phải: **nút ba gạch → logo → tên app “Tính toán cơ điện”**.

- Nút ba gạch ở góc trên bên trái, thụt 20 px tại màn hình rộng 390 px; kích thước 44 × 44 px.
- Khoảng cách giữa nút và cụm logo/tên app: 10 px.
- Header cao khoảng 77 px.
- Chạm nút ba gạch để mở menu danh mục từ trái.
- Thanh điều hướng dưới gồm Tổng quan, Danh mục và Bảng tính Đ-02.

### Trên máy tính

- Logo và tên app ở bên trái header.
- Điều hướng trên gồm Tổng quan và Danh mục.
- Thanh bên trái hiển thị các nhóm bảng tính.
- Vùng nội dung chính nằm bên phải thanh danh mục.

## 5. Màn hình tổng quan

- Hiển thị logo, tên app, ô tìm theo tên hoặc mã.
- Đủ 20 bảng tính, chia ba nhóm 6–6–8.
- Mỗi bảng có mã, tên và một dòng mô tả.
- Bảng Đ-02 được nhấn bằng nền vàng nhạt để mở mẫu chi tiết.
- Điện thoại: các nhóm xếp dọc. Máy tính: ba nhóm thành ba cột khi đủ rộng.

Danh mục đề xuất:

### Điện động lực — 6 bảng

| Mã | Tên | Mô tả |
| --- | --- | --- |
| Đ-01 | Công suất & dòng điện | Quy đổi công suất, dòng tải ba pha. |
| Đ-02 | Tiết diện dây & sụt áp | Chọn cáp, kiểm tra tải và sụt áp. |
| Đ-03 | Chọn aptomat | Chọn dòng định mức và bảo vệ tải. |
| Đ-04 | Khởi động động cơ | Ước tính dòng khởi động động cơ. |
| Đ-05 | Bù công suất phản kháng | Tính dung lượng tụ bù theo cosφ. |
| Đ-06 | Biến tần & động cơ | Đối chiếu công suất và dòng tải. |

### Trạm & nguồn — 6 bảng

| Mã | Tên | Mô tả |
| --- | --- | --- |
| T-01 | Phụ tải tổng | Tổng hợp tải theo hệ số đồng thời. |
| T-02 | Máy biến áp | Chọn dung lượng và dự phòng trạm. |
| T-03 | Máy phát dự phòng | Ước tính công suất nguồn dự phòng. |
| T-04 | Dòng ngắn mạch | Kiểm tra dòng sự cố tại điểm cấp. |
| T-05 | Thanh cái & tủ điện | Chọn thanh dẫn theo dòng làm việc. |
| T-06 | Tiếp địa | Ước tính điện trở hệ thống nối đất. |

### Cơ – nhiệt – tiện ích — 8 bảng

| Mã | Tên | Mô tả |
| --- | --- | --- |
| C-01 | Bơm & đường ống | Tính lưu lượng, cột áp và công suất. |
| C-02 | Quạt & thông gió | Ước tính lưu lượng và áp suất quạt. |
| C-03 | Khí nén | Tính nhu cầu khí và bình tích áp. |
| C-04 | Hơi & nước ngưng | Cân bằng hơi cho hệ thống sấy giấy. |
| C-05 | Truyền động cơ khí | Tính tốc độ, tỉ số truyền và mômen. |
| C-06 | Nhiệt sấy giấy | Ước tính nhiệt lượng và hơi tiêu thụ. |
| C-07 | Nước công nghệ | Tính lưu lượng cấp và tuần hoàn. |
| C-08 | Hiệu suất năng lượng | So mức tiêu hao theo sản lượng. |

## 6. Màn hình bảng tính Đ-02

**Tên:** Tiết diện dây & sụt áp.

Hàng chọn hệ số an toàn k: **1 / 1,1 / 1,15 / 1,2 / 1,25 / 1,3 / 1,5 / Khác**. Mặc định chọn **1,25**; mục Khác mở ô nhập hệ số tùy chọn. Trên điện thoại, tám lựa chọn xếp thành hai hàng, mỗi hàng bốn nút.

### Thông số đầu vào mẫu

| Trường | Giá trị | Đơn vị / ghi chú |
| --- | --- | --- |
| Dòng tải | 180 | A |
| Điện áp | 400 | V |
| Chiều dài tuyến cáp | 120 | m, tính theo một chiều |
| Cách lắp đặt | E – thang cáp | Ô chọn |
| Vật liệu / cách điện | Đồng (Cu) / XLPE | Ngữ cảnh mẫu |
| Hệ số công suất cosφ | 0,85 | Ngữ cảnh mẫu |
| Giới hạn sụt áp mẫu | 5 | % |

### Kết quả mẫu

| Kết quả | Giá trị | Cách thể hiện |
| --- | --- | --- |
| Tiết diện | **120 mm²** | Kết quả chính thật lớn, nền vàng nhạt |
| Dòng cho phép Iz | 259 A | Ô phụ |
| Sụt áp | 2,36 % | Ô phụ |
| Aptomat | 250 A | Ô phụ |

### Danh sách kiểm tra

| Mục kiểm tra | Nội dung mẫu | Nhãn |
| --- | --- | --- |
| Khả năng tải & bảo vệ | 225 A ≤ 250 A ≤ 259 A | Đạt |
| Sụt áp trên tuyến | 2,36 % ≤ giới hạn 5 % | Đạt |
| Điều kiện lắp thực tế | Kiểm tra nhiệt độ và cáp đi nhóm | Lưu ý |
| Phương án nhỏ hơn: 95 mm² | Chưa đáp ứng aptomat 250 A trong dữ liệu minh họa | Không đạt |

Phương án Không đạt dùng để minh họa cách hiển thị một lựa chọn nhỏ hơn bị loại; kết quả chính đang trình bày vẫn là 120 mm².

### Bảng diễn giải công thức

| Đại lượng | Công thức | Giá trị mẫu |
| --- | --- | --- |
| Dòng thiết kế | Ib = k × I | 225 A |
| Bảo vệ dây | Ib ≤ In ≤ Iz | 225 ≤ 250 ≤ 259 A |
| Sụt áp | δ = ΔU / U × 100 | 2,36 % |
| Tiết diện | Theo bảng tra mẫu | 120 mm² |

Hai nút thao tác: **Sao chép kết quả** dùng màu vàng chủ đạo và **Đặt lại mặc định** dùng nền trắng, có viền.

Điện thoại xếp khung đầu vào trước, kết quả sau. Máy tính đặt hai khung cạnh nhau.

## 7. Menu danh mục trên điện thoại

- Mở từ cạnh trái; rộng khoảng 342 px tại màn hình 390 px.
- Phần còn lại của màn hình được phủ tối.
- Có logo, tên app, nút đóng, ô tìm kiếm và ba nhóm danh mục.
- Nhóm Điện động lực mở sẵn; Trạm & nguồn và Cơ – nhiệt – tiện ích có thể bung/thu.
- Mục Đ-02 được tô nền vàng nhạt và có vạch vàng bên trái.
- Có lối về Trang tổng quan ở cuối menu.
- Đóng bằng nút X, chạm nền phủ hoặc phím Escape.

## 8. Tệp triển khai và phạm vi mẫu

- `tinh-toan-co-dien.html`: HTML/CSS/JavaScript tĩnh, nhúng font và biểu tượng SVG.
- `00-ban-duyet-giao-dien.png`: tờ tổng hợp thiết kế.
- Các tệp `01-...`, `02-...`, `03-...`: ảnh đầy đủ từng màn hình cho điện thoại và máy tính.
- `xem-truoc-menu-trai.png`: ảnh xem nhanh header sau khi chuyển nút ba gạch sang trái.
- `tinh-toan-co-dien-ui.zip`: bộ tệp bàn giao cập nhật.

Tương tác mẫu gồm tìm kiếm, điều hướng, mở/đóng menu, chọn k, nhập thông số, chọn cách lắp đặt, sao chép kết quả mẫu và đặt lại mặc định. Các bảng ngoài Đ-02 hiện có nội dung danh mục để duyệt giao diện.

Kết quả kỹ thuật đang là dữ liệu mẫu cố định, chưa tính lại theo đầu vào. Các PNG là bản xuất thiết kế tĩnh; chưa phải ảnh chụp trình duyệt. HTML chưa được xác nhận bằng kiểm thử trên iPhone thật.
