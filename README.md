# Dấu ấn lịch sử Đảng · VNR202

Repo độc lập: [nguyendangkhang79/vnr-game](https://github.com/nguyendangkhang79/vnr-game), sao chép từ `hcm201-game` tại commit `8acc7cf66529f3c9901dfa79d1f2c7d226c38037`. Firebase riêng: `vnr-game-20261111`. Xem [thông tin bản sao](docs/CLONE_SETUP.md).

Ứng dụng React + Vite chuyển từ chủ đề cũ sang Lịch sử Đảng Cộng sản Việt Nam, trọng tâm Chủ đề 5 (1975–1986). Giữ kiến trúc React Router và chức năng Bingo qua Firebase.

## Chạy tại máy

```sh
npm ci
npm run dev
npm test
npm run lint
npm run build
node tests/checkQuizBundle.mjs
```

Vite in địa chỉ xem trước trong terminal. Build nằm ở `dist/`. Giữ file `vercel.json` để truy cập trực tiếp các route của SPA.

## Các trang

| Route | Chức năng |
| --- | --- |
| `/` | Giới thiệu, timeline, địa điểm, lối vào Quiz/Bingo |
| `/explore` | Lọc giai đoạn, xem sự kiện và nguồn |
| `/explore?site=ba-dinh` | Chi tiết một địa điểm |
| `/quiz` | Ôn tập theo chủ đề, xem đáp án và lời giải |
| `/bingo` | Nhập tên và hướng dẫn Bingo |
| `/play` | Xếp bảng và tham gia Bingo cùng lớp |
| `/admin` | Điều khiển Bingo và quản lý ngân hàng câu hỏi Quiz |
| `/live` | Người tham gia và kết quả trực tiếp |

## Dữ liệu cần biên tập

- Firebase Realtime Database `/quizBank`: câu hỏi, phương án, đáp án và lời giải do quản trị viên quản lý.
- `src/data/quiz.js`: chỉ chứa tên/mô tả chủ đề công khai.
- `src/data/history.js`: địa điểm, sự kiện, timeline, trạng thái tham quan và bản quyền ảnh.
- `src/data/sources.js`: nguồn tham khảo chính thống dùng chung.
- `src/data/bingo.js`: 36 từ khóa VNR202.

Mỗi lượt Quiz lấy ngẫu nhiên 10, 20, 30 hoặc 50 câu trong các chủ đề đã chọn và đảo cả phương án. Bạn cũng có thể chọn ôn toàn bộ số câu thuộc các chủ đề đã chọn. Sau khi xác nhận từng câu, bạn có thể đọc lời giải ngay. Bài ôn tập không giới hạn thời gian và có thể tiếp tục sau khi tải lại.

Ngân hàng bắt đầu trống. Để thêm, nhập JSON, sửa, ẩn hoặc xóa câu hỏi, cấu hình Firebase và mở mục **Ngân hàng câu hỏi ôn tập** tại `/admin`. Xem các biến môi trường và cách triển khai rules trong [docs/QUIZ_SECURITY.md](docs/QUIZ_SECURITY.md).

Bingo chuyển sang `courses/vnr202/gameState` và `courses/vnr202/chat/messages`. Lần đăng nhập trọng tài đầu tiên khởi tạo kho từ khóa bằng transaction nếu chưa có dữ liệu. Không ghi đè kho đã tồn tại và không di chuyển/xóa phòng cũ.

Xóa kho lưu `wordList: false` để phân biệt kho đã được xóa với kho chưa khởi tạo (`null`); không tự nạp lại từ mặc định sau khi xóa. Thao tác này đưa ván về trạng thái chuẩn bị và xóa kết quả. Trạng thái mở khóa trọng tài được giữ bằng `sessionStorage` trong tab hiện tại; đây chỉ là duy trì giao diện của cơ chế PIN cũ, không thay thế Firebase Authentication.

## Giới hạn bàn giao

Đây là bản triển khai cục bộ, chưa đổi tên miền hoặc triển khai Vercel. Dữ liệu lịch sử đã kèm nguồn đối chiếu nhưng nhóm/giảng viên cần duyệt theo đúng giáo trình đang học. Có bốn địa điểm, chưa đủ sáu; Pò Hèn chưa có ảnh được cấp phép hoặc tour số. Không địa điểm nào được quảng cáo là tour 3D khi chưa xác minh.

Cơ chế PIN phía client và Firebase rules đọc/ghi công khai của **Bingo** là thiết kế có sẵn, chưa phải phân quyền an toàn. Quiz lưu câu hỏi ở nhánh Firebase riêng do máy chủ truy cập và lưu phiên ôn tập trong Redis.

Xem phân tích, quyết định và ma trận nghiệm thu tại [docs/VNR202_REVAMP.md](docs/VNR202_REVAMP.md).
