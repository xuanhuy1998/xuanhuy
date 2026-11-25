# TOEIC 850 Coach

Web app giúp bạn theo dõi và cá nhân hoá việc học từ vựng TOEIC để nâng điểm từ 700 lên 850+.

## Chạy app

Không cần cài đặt hay build gì. Có 2 cách:

- Mở trực tiếp file `toeic/index.html` bằng trình duyệt.
- Hoặc chạy một server tĩnh: `cd toeic && python3 -m http.server 8000`, rồi mở http://localhost:8000.

Toàn bộ tiến độ được lưu trong trình duyệt (localStorage). Muốn chuyển sang máy khác, dùng mục **Lộ trình → Sao lưu và chuyển máy**.

## Tính năng

- **Lộ trình cá nhân**: nhập điểm hiện tại, điểm mục tiêu, ngày thi và số từ mới mỗi ngày. App tính số từ cần học mỗi ngày để kịp ngày thi (chừa 10 ngày cuối để ôn), cho bạn chọn chủ đề muốn học trước, và xếp thứ tự cấp độ theo điểm hiện tại.
- **Tổng quan**: 3 nhiệm vụ mỗi ngày (ôn thẻ đến hạn, học từ mới, chơi game), thang điểm Đầu vào → Ước tính → Mục tiêu, "phiếu 1500 từ" (mỗi ô tròn là một từ, được tô dần khi bạn học), tiến độ và độ chính xác theo từng chủ đề, lịch học 12 tuần, chuỗi ngày học, XP, danh sách từ hay sai.
- **Flashcard lặp lại ngắt quãng** (thuật toán SM-2 rút gọn): chấm Quên/Khó/Nhớ/Dễ, mỗi nút hiển thị lần ôn kế tiếp. Có nút "Tôi đã biết từ này" để bỏ qua từ đã biết, phát âm từ và câu ví dụ, gắn sao, học theo chủ đề. Phím tắt: `Space` lật thẻ, `1`–`4` chấm điểm.
- **5 mini game**: Trắc nghiệm A-B-C-D, Điền từ kiểu Part 5, Ghép cặp tính giờ, Nghe và gõ từ, Đúng/Sai trong 60 giây. Game ưu tiên những từ bạn hay sai; trả lời sai thì từ đó quay lại hàng đợi flashcard.
- **Tra từ vựng**: tìm kiếm theo tiếng Anh hoặc tiếng Việt, lọc theo chủ đề, cấp độ, trạng thái hoặc từ đã gắn sao, rồi học ngay nhóm từ vừa lọc.

## Bộ từ vựng

Bộ từ có 1500 từ, mỗi từ kèm loại từ, nghĩa tiếng Việt, câu ví dụ trong ngữ cảnh công sở và cấp độ:

- 1: Nền tảng 700
- 2: Bứt phá 800
- 3: Chinh phục 850+

Từ được chia thành 15 chủ đề hay gặp trong đề TOEIC Listening & Reading:

| Chủ đề | Chủ đề | Chủ đề |
|---|---|---|
| Văn phòng & Hành chính | Nhân sự & Tuyển dụng | Tài chính & Ngân hàng |
| Marketing & Truyền thông | Bán hàng & Khách hàng | Hợp đồng & Pháp lý |
| Sản xuất & Chất lượng | Vận chuyển & Mua hàng | Du lịch & Đi lại |
| Nhà hàng & Khách sạn | Hội họp & Sự kiện | Công nghệ & IT |
| Bất động sản & Cơ sở vật chất | Sức khoẻ & Bảo hiểm | Từ học thuật Part 5–7 (liên từ, giới từ, trạng từ, cụm động từ) |

Dữ liệu nằm trong `data/words-*.js`. Mỗi dòng có dạng `từ|loại từ|nghĩa|câu ví dụ|cấp độ`, nên bạn có thể tự thêm hoặc sửa từ. Nếu một từ bị trùng, app chỉ giữ lần xuất hiện đầu tiên.

Lưu ở đây: "điểm ước tính" chỉ dựa trên tiến độ từ vựng, dùng để tạo động lực. Nó không thay thế một đề thi thử đầy đủ.
