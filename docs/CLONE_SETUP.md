# Bản sao độc lập vnr-game

- Repo: https://github.com/nguyendangkhang79/vnr-game
- Nguồn: https://github.com/nguyendangkhang79/hcm201-game
- Commit nguồn: `8acc7cf66529f3c9901dfa79d1f2c7d226c38037`
- Ngày sao chép: 11/11/2026.
- Firebase project mới: `vnr-game-20261111`.
- Realtime Database mới: `https://vnr-game-20261111-default-rtdb.asia-southeast1.firebasedatabase.app`.

Giữ nguyên giao diện, routes và chức năng. Toàn bộ các nhánh `/courses`, `/gameState`, `/quizBank` được chép từ bản chụp database gốc và đối chiếu bằng dữ liệu JSON, gồm 568 câu hỏi. Đây là bản chụp tại thời điểm sao chép; các thay đổi về sau của hai database không đồng bộ với nhau.

`src/firebase.js` trỏ đến project mới. `.firebaserc` đặt project mới làm mặc định. Khóa dịch vụ Firebase và hai khóa Quiz được tạo riêng, lưu trong `.env.local` ở máy này và cấu hình trên Vercel; không đưa chúng lên Git. Bản sao dữ liệu và các tệp quản trị cục bộ nằm trong `.private/`, được Git bỏ qua.

Khi chạy ở máy khác, tạo `.env.local` theo `.env.example` với khóa của bản mới. Redis dành cho phiên Quiz phải là database riêng. Không dùng lại thông tin Redis hoặc khóa dịch vụ từ website gốc.

## Kiểm tra

`npm test`, `npm run lint`, `npm run build`, `node tests/checkQuizBundle.mjs`.

## Triển khai rules

Chỉ triển khai vào project mới:

```sh
firebase deploy --only database --project vnr-game-20261111
```

Git remote `origin` trỏ tới `vnr-game`. Remote `source` chỉ để đọc lịch sử nguồn và đã chặn push bằng địa chỉ không hợp lệ.
