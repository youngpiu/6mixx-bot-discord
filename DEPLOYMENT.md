# Hướng dẫn Triển khai (Debian VPS)

Tài liệu này hướng dẫn triển khai dự án lên VPS Debian bằng Docker Compose, và cấu hình CI/CD với GitHub Actions.

## 1. Tổng quan luồng triển khai

1.  Push code lên nhánh `main`.
2.  GitHub Actions chạy CI (`lint`, `prettier --check`, `build`, `docker build`).
3.  Nếu CI vượt qua, workflow `deploy.yml` sẽ kết nối SSH vào VPS:
4.  Thực hiện `git pull origin main`.
5.  Build lại image: `docker compose --profile prod build --no-cache bot migrate`.
6.  Chạy migration: `docker compose --profile prod run --rm migrate`.
7.  Khởi động Bot: `docker compose --profile prod up -d bot`.
8.  Kiểm tra trạng thái hoạt động của container `bot`.

## 2. Chuẩn bị VPS Debian

### 2.1 Cài đặt Docker + Compose plugin

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg jq git rsync

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 2.2 Cho phép người dùng hiện tại sử dụng Docker

```bash
sudo usermod -aG docker $USER
# Cần đăng nhập lại hoặc chạy lệnh sau để áp dụng thay đổi
newgrp docker
docker --version
docker compose version
```

## 3. Chuẩn bị mã nguồn trên VPS

```bash
mkdir -p ~/6mixx-bot-discord
cd ~/6mixx-bot-discord
git clone https://github.com/yngpiu/6mixx-bot-discord.git .
```

Nếu là repository riêng tư, hãy sử dụng deploy key hoặc Personal Access Token (PAT) để server có quyền `git pull`.

## 4. Cấu hình biến môi trường

1.  Tạo file `.env` trong thư mục `~/6mixx-bot-discord` (tham khảo `.env.example`).
2.  Các biến bắt buộc:
    - `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
    - `DISCORD_TOKEN`, `TEST_GUILDS_ID`, `OWNER_BOT_ID`
    - `BANK_ACCOUNT_NUMBER`, `BANK_NAME`, `BANK_ACCOUNT_NAME`
    - `DEFAULT_PREFIX` (nếu không có sẽ mặc định là `.`)
    - `MUSIC_QUIZ_BASE_PATH` (Đường dẫn gốc cho Music Quiz - Xem phần 11)

## 5. Khởi động lần đầu (thủ công)

### 5.1 Chạy Database và Redis

```bash
cd ~/6mixx-bot-discord
docker compose up -d postgres redis
```

### 5.2 Build và chạy Migration

```bash
docker compose --profile prod build --no-cache bot migrate
docker compose --profile prod run --rm migrate
```

### 5.3 Chạy Bot

```bash
docker compose --profile prod up -d bot
docker compose --profile prod ps
docker compose --profile prod logs -f bot
```

## 6. Seed dữ liệu `data/` (chạy 1 lần)

```bash
cd ~/6mixx-bot-discord
docker compose --profile prod run --rm \
  -v ~/6mixx-bot-discord/data:/app/data \
  migrate pnpm exec prisma db seed --config ./prisma.config.ts
```

Lưu ý:

1. Script seed đang dùng `skipDuplicates: true`, nên chạy lại sẽ không bị trùng lặp dữ liệu.
2. Vẫn nên coi seed là thao tác thủ công có kiểm soát.

## 7. Cấu hình GitHub Actions CI/CD

Repository đã có sẵn:

1. `.github/workflows/ci.yml`
2. `.github/workflows/deploy.yml`

Cần thiết lập các Secrets trên GitHub:

1. `SSH_HOST`
2. `SSH_PORT`
3. `SSH_USERNAME`
4. `SSH_PRIVATE_KEY`

Khuyến nghị:

1. Tạo người dùng riêng cho việc deploy (ví dụ: `deploy`).
2. Chỉ mở xác thực bằng SSH key, tắt xác thực bằng mật khẩu nếu có thể.
3. Gán workflow deploy vào GitHub Environment `production` để có quy tắc phê duyệt nếu cần.

## 8. Vận hành thường ngày

### 8.1 Triển khai thủ công trên VPS

```bash
cd ~/6mixx-bot-discord
git pull origin main
docker compose --profile prod build --no-cache bot migrate
docker compose --profile prod run --rm migrate
docker compose --profile prod up -d bot
docker image prune -f
```

### 8.2 Kiểm tra trạng thái

```bash
docker compose --profile prod ps
docker compose --profile prod logs --tail 100 bot
docker compose --profile prod logs --tail 100 postgres
docker compose --profile prod logs --tail 100 redis
```

## 9. Troubleshooting nhanh

1. **Bot không khởi động sau khi triển khai**:
   Kiểm tra logs: `docker compose --profile prod logs --tail 200 bot`.
2. **Lỗi DB schema**:
   Chạy lại migration: `docker compose --profile prod run --rm migrate`.
3. **Lỗi seed không tìm thấy file dữ liệu**:
   Đảm bảo đã mount thư mục dữ liệu: `-v ~/6mixx-bot-discord/data:/app/data`.
4. **CI pass nhưng deploy thất bại qua SSH**:
   Kiểm tra IP whitelist, cổng SSH, và định dạng của Private Key trong GitHub Secrets.

## 10. Bảo mật cơ bản

1. Không bao giờ commit file `.env`.
2. Sử dụng SSH key riêng cho CI/CD, có passphrase nếu hệ thống hỗ trợ.
3. Hạn chế quyền hạn của người dùng thực hiện deploy trên VPS.
4. Cập nhật image và các gói hệ thống định kỳ.

---

## 11. Hướng dẫn Triển khai Music Quiz (Local Files)

Đây là tính năng cho phép phát nhạc từ file `.opus` lưu trữ trực tiếp trên VPS để đạt tốc độ cao nhất.

### 11.1 Chuẩn bị thư mục trên VPS

```bash
# Đăng nhập VPS
ssh root@<vps-ip>

# Tạo thư mục chứa dữ liệu âm thanh độc lập với mã nguồn
sudo mkdir -p /var/data/6mixx-music-quiz
sudo chown -R $USER:$USER /var/data/6mixx-music-quiz
```

### 11.2 Đồng bộ dữ liệu âm thanh từ máy cá nhân

Chạy lệnh này **tại máy cá nhân** của bạn để upload thư mục `opus` lên VPS:

```bash
# Thay đổi đường dẫn /home/yngpiu/Downloads/opus nếu cần thiết
rsync -avzP /home/yngpiu/Downloads/opus/ root@<vps-ip>:/var/data/6mixx-music-quiz/
```

Cấu trúc thư mục mong muốn trên VPS:

```
/var/data/6mixx-music-quiz/
├── folder_album/
│   ├── folder_song/
│   │   ├── song.opus
│   │   └── thumbnail.jpg
```

### 11.3 Cấu hình Biến môi trường

Thêm dòng sau vào file `.env` trên VPS:

```env
# Đường dẫn thư mục gốc chứa dữ liệu âm thanh và ảnh
MUSIC_QUIZ_BASE_PATH="/var/data/6mixx-music-quiz"
```

> **Lưu ý quan trọng**: Docker Compose sẽ tự động ánh xạ (mount) đường dẫn này từ VPS vào bên trong container tại cùng một vị trí. Bot sẽ đọc file dựa trên biến này, đảm bảo tính nhất quán giữa môi trường Dev và Prod.

### 11.4 Cập nhật Database (Seed bài hát)

Sử dụng lệnh sau để cập nhật các đường dẫn bài hát trong database (chuyển từ link URL cũ sang đường dẫn file local):

```bash
cd ~/6mixx-bot-discord
docker compose --profile prod exec bot pnpm exec prisma db seed
```

### 11.5 Lưu ý về Ảnh Thumbnail

Bot sử dụng cơ chế **Attachment** để gửi ảnh thumbnail trực tiếp từ ổ đĩa lên Discord.

- Không cần cấu hình Public URL hay Nginx cho ảnh.
- Ảnh sẽ được lấy từ cùng thư mục `MUSIC_QUIZ_BASE_PATH`.
- Đảm bảo file ảnh có định dạng `.jpg` hoặc `.png` như khai báo trong dữ liệu bài hát.
