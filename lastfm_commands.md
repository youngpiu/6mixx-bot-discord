# Danh sách lệnh Last.fm (`/fm`)

Dưới đây là danh sách các lệnh Last.fm hiện có của bot, đi kèm với mô tả và các tham số (arguments) tương ứng.

## 1. Lệnh cơ bản

### `/fm set`

- **Mô tả:** Liên kết tài khoản Last.fm của bạn với Discord.
- **Tham số:**
  - `username` (Bắt buộc): Tên người dùng Last.fm của bạn.

### `/fm np`

- **Mô tả:** Hiển thị bài hát bạn hoặc người khác đang nghe.
- **Tham số:**
  - `user` (Tùy chọn): Người dùng Discord muốn xem.

### `/fm profile`

- **Mô tả:** Hiển thị hồ sơ Last.fm (tổng scrobbles, ngày tham gia, v.v.).
- **Tham số:**
  - `user` (Tùy chọn): Người dùng Discord muốn xem.

### `/fm recent`

- **Mô tả:** Xem danh sách các bài hát nghe gần đây nhất.
- **Tham số:**
  - `user` (Tùy chọn): Người dùng Discord muốn xem.

### `/fm milestone`

- **Mô tả:** Tìm bài hát tương ứng với một số thứ tự lượt nghe cụ thể.
- **Tham số:**
  - `number` (Bắt buộc): Số thứ tự lượt nghe muốn tìm (ví dụ: 1000).
  - `user` (Tùy chọn): Người dùng Discord muốn xem.

---

## 2. Thông tin chi tiết

### `/fm artist`

- **Mô tả:** Hiển thị thông tin chi tiết về một nghệ sĩ.
- **Tham số:**
  - `name` (Tùy chọn): Tên nghệ sĩ (mặc định lấy từ bài hát đang nghe).
  - `type` (Tùy chọn): Loại thông tin (`Tổng quan`, `Top bài hát`, `Top album`).

### `/fm album`

- **Mô tả:** Hiển thị thông tin chi tiết về một album.
- **Tham số:**
  - `album` (Tùy chọn): Tên album.
  - `artist` (Tùy chọn): Tên nghệ sĩ (Bắt buộc nếu cung cấp tên album).
  - `user` (Tùy chọn): Người dùng muốn xem thống kê cá nhân cho album này.
  - `type` (Tùy chọn): Loại thông tin (`Tổng quan`, `Danh sách bài hát`).

---

## 3. Thống kê & Bảng xếp hạng

### `/fm topartists`

- **Mô tả:** Xem danh sách những nghệ sĩ bạn nghe nhiều nhất.
- **Tham số:**
  - `period` (Tùy chọn): Khoảng thời gian (7 ngày, 1 tháng, tất cả thời gian, v.v.).
  - `user` (Tùy chọn): Người dùng Discord muốn xem.

### `/fm topalbums`

- **Mô tả:** Xem danh sách những album bạn nghe nhiều nhất.
- **Tham số:**
  - `period` (Tùy chọn): Khoảng thời gian.
  - `user` (Tùy chọn): Người dùng Discord muốn xem.

### `/fm toptracks`

- **Mô tả:** Xem danh sách những bài hát bạn nghe nhiều nhất.
- **Tham số:**
  - `period` (Tùy chọn): Khoảng thời gian.
  - `user` (Tùy chọn): Người dùng Discord muốn xem.

### `/fm chart`

- **Mô tả:** Tạo một grid ảnh (3x3, 4x4, v.v.) các album nghe nhiều nhất.
- **Tham số:**
  - `period` (Tùy chọn): Khoảng thời gian.
  - `size` (Tùy chọn): Kích thước grid (ví dụ: 3 cho 3x3). Tối đa 10.
  - `user` (Tùy chọn): Người dùng Discord muốn xem.

---

## 4. Whoknows (Ai nghe nhiều nhất?)

### `/fm whoknows artist`

- **Mô tả:** Ai trong server nghe nghệ sĩ này nhiều nhất?
- **Tham số:**
  - `name` (Tùy chọn): Tên nghệ sĩ.

### `/fm whoknows track`

- **Mô tả:** Ai trong server nghe bài hát này nhiều nhất?
- **Tham số:**
  - `name` (Tùy chọn): Tên bài hát.
  - `artist` (Tùy chọn): Tên nghệ sĩ.

### `/fm whoknows album`

- **Mô tả:** Ai trong server nghe album này nhiều nhất?
- **Tham số:**
  - `name` (Tùy chọn): Tên album.
  - `artist` (Tùy chọn): Tên nghệ sĩ.

---

## 5. Thống kê Server

### `/fm server np`

- **Mô tả:** Liệt kê tất cả thành viên trong server hiện đang nghe nhạc.

### `/fm server recent`

- **Mô tả:** Những bài hát được nghe gần đây nhất bởi các thành viên trong server.

### `/fm server leaderboard`

- **Mô tả:** Bảng xếp hạng tổng lượt nghe (scrobbles) của các thành viên trong server.
