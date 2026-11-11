# Quiz ôn tập VNR202

Quiz lấy câu hỏi đang bật từ nhánh `/quizBank` trong Firebase Realtime Database. Ngân hàng bản sao có 568 câu hỏi. Quản trị viên quản lý nội dung tại `/admin`. Người học chọn lượt 10, 20, 30 hoặc 50 câu tùy số câu trong các chủ đề đã chọn. Người học cũng có thể ôn toàn bộ số câu thuộc các chủ đề đã chọn.

Người học xem lời giải ngay sau khi xác nhận từng câu. Firebase `/quizRuntime` giữ bản đề và tiến độ tối đa 48 giờ, với transaction riêng cho mỗi bài. Dữ liệu hết hạn được dọn theo lô khi có hoạt động. Sửa, ẩn hoặc xóa câu hỏi chỉ ảnh hưởng đến bài tạo sau đó.

Thư viện câu hỏi và thẻ ghi nhớ hiển thị đáp án của các câu đang bật cho người học. Đặt `QUIZ_STUDY_ENABLED=false` nếu ngân hàng cần giữ kín đáp án. Tiến độ thẻ được lưu trên trình duyệt.

## Cấu hình Firebase

1. Chỉ sử dụng project riêng `vnr-game-20261111`. Trong **Realtime Database → Rules**, triển khai [database.rules.json](../database.rules.json). Rules giữ quyền hiện có ở hai nhánh `/courses` và `/gameState`, rồi giới hạn `/quizBank` và `/quizRuntime` cho Firebase Admin SDK với UID dịch vụ riêng. Không triển khai rules của bản sao vào project gốc.
2. Trong **Project settings → Service accounts**, tạo khóa cho Firebase Admin SDK. Lưu JSON khóa trên máy chủ dưới dạng một dòng. Giữ khóa ngoài Git và ngoài trình duyệt. [Hướng dẫn Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
3. Cấu hình các biến sau trong `.env.local` khi chạy tại máy hoặc trong Environment Variables của Vercel.

   | Biến | Giá trị |
   | --- | --- |
   | `QUIZ_FIREBASE_DATABASE_URL` | URL Realtime Database, có mẫu của project hiện tại trong `.env.example` |
   | `QUIZ_FIREBASE_SERVICE_ACCOUNT` | Nội dung JSON khóa dịch vụ |
   | `QUIZ_IMPORT_SECRET` | Khóa ngẫu nhiên riêng, ít nhất 32 ký tự, để mở ngân hàng |
   | `QUIZ_SESSION_SECRET` | Khóa ký phiên riêng, ít nhất 32 ký tự. Vite tạo khóa tạm khi chạy tại máy nếu để trống |

   Tạo mỗi khóa ngẫu nhiên bằng `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Các biến ở trên chỉ dành cho máy chủ. Trên Vercel dùng Node 22 trở lên, build bằng `npm run build`, output `dist`.

4. Chạy lại `npm run dev` hoặc triển khai lại Vercel. Mở `/api/quiz` để kiểm tra tổng số câu. API từ chối dùng Firebase nếu phát hiện `/quizBank` hoặc `/quizRuntime` vẫn đọc được công khai, hoặc URL/khóa dịch vụ thuộc project khác.

Khi đã cấu hình Firebase, cả câu hỏi và tiến độ đều được lưu bền vững trên Firebase khi chạy local hoặc Vercel. Không cần Redis. `npm run preview` chỉ phục vụ file tĩnh.

## Quản lý ngân hàng

1. Mở `/admin` → **Ngân hàng câu hỏi ôn tập**. Nhập khóa `QUIZ_IMPORT_SECRET` và chọn **Mở ngân hàng**.
2. Chọn **Thêm câu hỏi** để nhập từng câu, hoặc **Nhập nhiều câu từ JSON** để tải mẫu và gửi tối đa 100 câu mỗi tệp, giới hạn 256 KB. Mỗi câu có một chủ đề, nội dung, bốn phương án, đáp án A–D và lời giải. Nguồn tham khảo là tùy chọn. Ngân hàng lưu tối đa 1.000 câu.
3. Lọc theo chủ đề để sửa, ẩn, bật lại hoặc xóa câu hỏi. Câu trùng trong cùng chủ đề được bỏ qua khi nhập. Nếu người khác sửa cùng lúc, tải lại danh sách trước khi tiếp tục.
4. Nút **Chuyển câu đã nhập từ Redis** được giữ từ giao diện gốc; bản sao không kết nối Redis nên không có dữ liệu cũ để chuyển qua nút này. Các câu hỏi hiện tại đã được chép đầy đủ trong `/quizBank`.

## Kiểm chứng

- `npm test` kiểm tra ngân hàng trống, xác thực quản trị, nhập, sửa, ẩn, bật, xóa, xung đột cập nhật và bản đề đã lưu.
- `npm run lint`, `npm run build` và `node tests/checkQuizBundle.mjs`.
