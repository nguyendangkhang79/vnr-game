# Bản sao độc lập vnr-game

- Repo: https://github.com/nguyendangkhang79/vnr-game
- Website: https://vnr-game-blush.vercel.app
- Nguồn: https://github.com/nguyendangkhang79/hcm201-game
- Commit nguồn: `8acc7cf66529f3c9901dfa79d1f2c7d226c38037`
- Ngày sao chép: 11/11/2026.
- Firebase project mới: `vnr-game-20261111`.
- Realtime Database mới: `https://vnr-game-20261111-default-rtdb.asia-southeast1.firebasedatabase.app`.

Giữ nguyên giao diện, routes và chức năng. Toàn bộ các nhánh `/courses`, `/gameState`, `/quizBank` được chép từ bản chụp database gốc và đối chiếu bằng dữ liệu JSON, gồm 568 câu hỏi. Đây là bản chụp tại thời điểm sao chép; các thay đổi về sau của hai database không đồng bộ với nhau.

`src/firebase.js` trỏ đến project mới. `.firebaserc` đặt project mới làm mặc định. Khóa dịch vụ Firebase và hai khóa Quiz được tạo riêng, lưu trong `.env.local` ở máy này và cấu hình trên Vercel; không đưa chúng lên Git. Bản sao dữ liệu và các tệp quản trị cục bộ nằm trong `.private/`, được Git bỏ qua.

Khi chạy ở máy khác, tạo `.env.local` theo `.env.example` với khóa của bản mới. Theo lựa chọn của chủ dự án, phiên Quiz dùng Firebase riêng thay cho Redis; không cần tạo hoặc trả tiền cho Redis mới. Máy chủ từ chối URL database gốc hoặc khóa dịch vụ thuộc project khác.

`/quizRuntime` chỉ dành cho máy chủ, chứa phiên Quiz, liên kết người học và giới hạn tần suất. Mỗi bài được cập nhật bằng transaction riêng để xử lý thao tác đồng thời và giữ nguyên đề đã phát. Phiên hết hạn sau 48 giờ như bản gốc. Dữ liệu hết hạn bị loại khỏi kết quả ngay, rồi được dọn theo lô khi Quiz có hoạt động, tối đa một đợt mỗi 5 phút cho mỗi tiến trình máy chủ. Các phiên tạm trên Redis cũ không được chuyển sang bản mới; bài làm mới độc lập với website gốc.

## Kiểm tra

`npm test`, `npm run lint`, `npm run build`, `node tests/checkQuizBundle.mjs`.

## Triển khai rules

Chỉ triển khai vào project mới:

```sh
firebase deploy --only database --project vnr-game-20261111
```

Git remote `origin` trỏ tới `vnr-game`. Remote `source` chỉ để đọc lịch sử nguồn và đã chặn push bằng địa chỉ không hợp lệ.
