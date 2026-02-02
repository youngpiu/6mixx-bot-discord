# Thống kê Message - Tính năng Setting

Tài liệu này tổng hợp toàn bộ các nội dung văn bản (messages), thông báo và placeholder được sử dụng trong tính năng Setting.

## 1. Lệnh /setting (Cài đặt máy chủ)

| Loại             | Nội dung                                                    |
| :--------------- | :---------------------------------------------------------- |
| **Description**  | `[OWNER] Cài đặt máy chủ`                                   |
| **Option: type** | `Loại cài đặt`                                              |
| **Choices**      | 1. Chung, 2. Hỗ trợ thành viên, 3. Quyên góp, 4. Confession |

## 2. Cài đặt hệ thống (General/Channel)

### Giao diện điều hướng

- **Tiêu đề**: `# Cài đặt hệ thống`
- **Các thành phần**:
  - `### Kênh` (Nút: `btn-channel-setting`)
  - `### Tạo kênh thông báo lỗi` (Nút: `btn-general-create-error-notification-thread`)

### Modal: Cài đặt hệ thống

- **Tiêu đề**: `Cài đặt hệ thống`
- **Inputs**:
  - **Kênh dịch vụ**: Các bài hướng dẫn về các gửi yêu cầu hỗ trợ, quyên góp,... sẽ được tạo ở kênh này.
  - **Kênh thông báo**: Các kênh thông báo riêng cho từng loại sẽ được tạo ở kênh này.

### Thông báo phản hồi

- **Thành công**: `Thiết lập thành công`
  - `Kênh dịch vụ: <#id>`
  - `Kênh thông báo: <#id>`
- **Lỗi**: `Kênh thông báo chưa được thiết lập.` / `Kênh thông báo không tồn tại hoặc không phải là kênh văn bản.`

---

## 3. Cài đặt hỗ trợ (Ticket)

### Giao diện điều hướng

- **Tiêu đề**: `# Cài đặt tính năng hỗ trợ thành viên`
- **Các thành phần**:
  - `### Cài đặt chung` (Nút: `btn-ticket-general-setting`)
  - `### Gửi hướng dẫn` (Nút: `btn-ticket-send`)
  - `### Tạo kênh thông báo` (Nút: `btn-ticket-create-notification-thread`)

### Modal: Cài đặt hỗ trợ

- **Tiêu đề**: `Cài đặt hỗ trợ`
- **Inputs**:
  - **Danh mục kênh**: Các kênh hỗ trợ sẽ được tạo trong danh mục này.

### Thông báo phản hồi

- **Thành công**: `Bài đăng hướng dẫn gửi yêu cầu hỗ trợ đã được tạo`
- **Thành công**: `Tạo kênh thông báo hỗ trợ thành công: <#id>`
- **Thành công (Update Category)**: `Danh mục chứa các kênh hỗ trợ: <#id>`

---

## 4. Cài đặt Confession

### Giao diện điều hướng

- **Tiêu đề**: `# Cài đặt tính năng Confession`
- **Các thành phần**:
  - `### Cài đặt chung` (Nút: `btn-confession-general-setting`)
  - `### Gửi hướng dẫn` (Nút: `btn-confession-send`)
  - `### Tạo kênh thông báo` (Nút: `btn-confession-create-notification-thread`)

### Modal: Cài đặt Confession

- **Tiêu đề**: `Cài đặt Confession`
- **Inputs**:
  - **Kênh confession**: Kênh diễn đàn để đăng các confession.

### Thông báo phản hồi

- **Thành công**: `Bài đăng hướng dẫn gửi confession đã được tạo`
- **Thành công**: `Tạo kênh thông báo confession thành công: <#id>`
- **Thành công (Update Forum)**: `Kênh đăng confession: <#id>`

---

## 5. Cài đặt quyên góp (Donation)

### Giao diện điều hướng

- **Tiêu đề**: `# Cài đặt tính năng quyên góp`
- **Các thành phần**:
  - `### Gửi hướng dẫn` (Nút: `btn-donation-send`)
  - `### Tạo kênh thông báo` (Nút: `btn-donation-create-notification-thread`)

### Thông báo phản hồi

- **Thành công**: `Bài đăng hướng dẫn quyên góp đã được tạo`
- **Thành công**: `Tạo kênh thông báo quyên góp thành công: <#id>`

---

## 6. Placeholders (Dùng chung cho các Select Menu)

| Trường hợp                         | Nội dung                                    |
| :--------------------------------- | :------------------------------------------ |
| **Đã cấu hình & Tồn tại**          | `Chọn [tên loại]`                           |
| **Đã cấu hình & Bị xóa**           | `[Tên loại] đã thiết lập không còn tồn tại` |
| **Chưa cấu hình**                  | `Chưa thiết lập [tên loại]`                 |
| **Không có kênh nào trong server** | `Không có [loại kênh] nào`                  |

## 7. Các thông báo lỗi hệ thống (Common Errors)

- `Bạn phải thực hiện lệnh này trong một máy chủ.` (GuildOnlyError)
- `Không có thay đổi nào được lưu.`
