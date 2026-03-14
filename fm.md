# Hướng dẫn Migrate Module Last.fm (Từ Python sang JavaScript)

Tài liệu này chi tiết hóa logic, các lệnh gọi API và cơ chế cào dữ liệu (scraping) được sử dụng trong module Last.fm của Miso Bot để hỗ trợ việc chuyển đổi sang môi trường JavaScript/TypeScript.

## 1. Kiến trúc Cốt lõi

### Điều kiện tiên quyết

- **Last.fm API Key**: Cần thiết cho tất cả các lệnh gọi REST API.
- **Các bảng Database**:
  - `user_settings`: Lưu `user_id` và `lastfm_username`.
  - `lastfm_vote_setting`: Lưu tùy chỉnh bình chọn (`is_enabled`, `upvote_emoji`, `downvote_emoji`).
  - `lastfm_blacklist`: Danh sách người dùng bị loại khỏi bảng xếp hạng server.
  - `artist_image_cache`: Cache hash ảnh nghệ sĩ và ngày cào dữ liệu.
  - `image_color_cache`: Cache màu chủ đạo (RGB/Hex) của các hash ảnh.
  - `artist_crown`: Theo dõi thành viên có lượt nghe cao nhất cho một nghệ sĩ trong guild.

### Xử lý Context (`create_lastfm_context`)

Hầu hết các lệnh dựa vào `LastFmContext`, bao gồm:

1.  **Người dùng mục tiêu**: Người được nhắc tên (mention) hoặc người dùng thực hiện lệnh.
2.  **Username**: Lấy `lastfm_username` từ bảng `user_settings`.
3.  **Xác thực**: Đảm bảo người dùng đã liên kết tài khoản của họ.

---

## 2. Tham chiếu API (`modules/lastfm.py`)

Tất cả các lệnh gọi API được gửi tới `http://ws.audioscrobbler.com/2.0/` dưới định dạng `json`.

| Hàm                      | Method API Last.fm     | Mục đích                                                              |
| :----------------------- | :--------------------- | :-------------------------------------------------------------------- |
| `user_get_info`          | `user.getinfo`         | Lấy chỉ số profile (tổng lượt nghe, ngày đăng ký, quốc gia).          |
| `user_get_recent_tracks` | `user.getrecenttracks` | Lấy lịch sử nghe. Lưu ý xử lý thuộc tính `nowplaying`.                |
| `user_get_top_artists`   | `user.gettopartists`   | Top nghệ sĩ theo `Khoảng thời gian` (tuần, tháng, v.v.).              |
| `user_get_top_albums`    | `user.gettopalbums`    | Top album theo `Khoảng thời gian`.                                    |
| `user_get_top_tracks`    | `user.gettoptracks`    | Top bài hát theo `Khoảng thời gian`.                                  |
| `artist_get_info`        | `artist.getinfo`       | Lấy tiểu sử, tag nghệ sĩ và **lượt nghe của user** (nếu có username). |
| `album_get_info`         | `album.getinfo`        | Lấy thông tin metadata và danh sách bài hát của album.                |
| `track_get_info`         | `track.getinfo`        | Lấy thông tin bài hát và lượt nghe của user.                          |

---

## 3. Cào Dữ liệu (Web Scraping) & Cải thiện Metadata

API Last.fm thường thiếu dữ liệu. Bot cào trực tiếp từ trang `last.fm` cho các mục sau:

### Metadata của Album (`scrape_album_metadata`)

- **URL**: `https://www.last.fm/music/<nghệ_sĩ>/<album>`
- **Dữ liệu**: Ngày phát hành, Độ dài album.
- **Logic**: Chọn các class `.catalogue-metadata-heading` và `.catalogue-metadata-description`.

### Ảnh Nghệ sĩ (`scrape_artist_image`)

- **URL**: `https://www.last.fm/music/<nghệ_sĩ>/+images`
- **Dữ liệu**: Nguồn ảnh hàng đầu (top image).
- **Caching**: Lưu trong `artist_image_cache` trong 1 tuần.

### Lượt nghe trong Thư viện (`get_library_playcounts`)

Dùng cho lệnh `artist overview` và `album tracklist`.

- **URL**: `https://www.last.fm/user/<username>/library/music/<nghệ_sĩ>` (kèm tham số như `?date_preset=LAST_7_DAYS`).
- **Scraping**: Quét `.chartlist-row` để lấy lượt nghe chính xác cho các mục nhỏ (bài hát/album) trong một khoảng thời gian cụ thể.
- **Phân trang**: `get_additional_library_pages` xử lý kết quả thư viện nhiều trang.

---

## 4. Danh sách Lệnh & Mô tả Chi tiết

### Nhóm lệnh Cá nhân (`>fm`)

- **`>fm set <username>`**:
  - **Mô tả**: Lưu username Last.fm vào cơ sở dữ liệu.
  - **Logic**: Kiểm tra profile có tồn tại không trước khi lưu. Nếu tồn tại, hiển thị một Embed tóm tắt profile.
- **`>fm nowplaying` (Alias: `np`, `no`)**:
  - **Mô tả**: Hiển thị bài hát bạn đang nghe.
  - **Tính năng**: Hiển thị ảnh bìa, tên bài hát, nghệ sĩ, album, năm phát hành (từ scraping), lượt nghe cá nhân, và các tag (thể loại). Nếu đang nghe, hiện "Now Playing", nếu đã dừng, hiện thời gian bài cuối được phát.
- **`>fm profile`**:
  - **Mô tả**: Xem thẻ thông tin cá nhân.
  - **Dữ liệu**: Tổng scrobbles, số lượng nghệ sĩ/album/bài hát duy nhất đã nghe, ngày đăng ký, quốc gia.
- **`>fm topartists` | `topalbums` | `toptracks`**:
  - **Tham số**: `[timeframe]` (ví dụ: `weekly`, `overall`).
  - **Mô tả**: Danh sách 100 mục đứng đầu. Tự động phân trang (Pagination) 10 mục mỗi trang.
- **`>fm recent` (Alias: `re`)**:
  - **Mô tả**: 100 bài hát nghe gần đây nhất. Hiển thị thời gian nghe tương đối (ví dụ: 5 minutes ago) bằng cách sử dụng timestamp của Discord.
- **`>fm artist [timeframe] [toptracks|topalbums|overview] <tên_nghệ_sĩ>`**:
  - **Overview**: Hiển thị tổng quan lượt nghe của bạn cho nghệ sĩ đó, bao gồm cả top 10 bài hát và top 10 album của nghệ sĩ đó trong thư viện của bạn.
  - **Top Tracks/Albums**: Liệt kê toàn bộ danh sách bài hát/album của nghệ sĩ đó mà bạn đã nghe.
- **`>fm album [timeframe] [toptracks|tracklist] <tên_album | nghệ_sĩ>`**:
  - **Tracklist**: Hiển thị danh sách bài hát trong album đó cùng với lượt nghe của bạn cho từng bài (nếu có).
- **`>fm chart [timeframe] [size] [options]`**:
  - **Tham số size**: Định dạng `WxH` (ví dụ: `3x3`, `5x5`). Tối đa 12x12.
  - **Options**:
    - `artist`: Vẽ chart nghệ sĩ thay vì album.
    - `recent`: Vẽ chart dựa trên các bài nghe gần đây nhất.
    - `topster`: Hiển thị danh sách tên ở bên cạnh ảnh.
    - `notitle`: Ẩn tên bài hát đè lên ảnh.
    - `padded`: Thêm khoảng trắng giữa các ảnh cover.
- **`>fm colorchart [color|rainbow] [size]`**:
  - **Mô tả**: Tìm các album trong thư viện có màu chủ đạo gần nhất với màu yêu cầu.
  - **Logic**: Sử dụng thuật toán K-Nearest Neighbors (KNN) để tìm kiếm trong không gian màu RGB.
- **`>fm milestone <số_thứ_tự>`**:
  - **Mô tả**: "Lục lại quá khứ". Ví dụ: `>fm milestone 10000` sẽ tìm xem bài hát thứ 10.000 bạn nghe là bài gì.

### Nhóm lệnh Server (`>fm server` hoặc `>fm s`)

- **`>fm s nowplaying`**: Hiển thị danh sách tất cả những người trong server đang nghe nhạc ngay lúc này.
- **`>fm s recent`**: Tổng hợp các bài hát vừa được nghe bởi tất cả thành viên trong server, sắp xếp theo thời gian thực.
- **`>fm s topartists/topalbums/toptracks`**:
  - **Chế độ `scrobble`**: Xếp hạng theo tổng lượt nghe của cả server cộng lại.
  - **Chế độ `score`**: Xếp hạng dựa trên "điểm số" (vị trí trong top 100 của từng người). Cách này giúp tránh việc một người nghe quá nhiều (hardcore fan) làm lệch bảng xếp hạng.

### Nhóm lệnh Tương tác & Xếp hạng

- **`>whoknows <nghệ_sĩ>`**:
  - **Mô tả**: Bảng xếp hạng lượt nghe của các thành viên trong server cho một nghệ sĩ.
  - **Crown (Vương miện)**: Người đứng đầu sẽ nhận được 👑. Nếu có người vượt qua, bot sẽ thông báo việc cướp ngôi.
- **`>crowns [user]`**: Xem tất cả các nghệ sĩ mà bạn (hoặc người khác) đang đứng đầu lượt nghe trong server hiện tại.
- **`>fm voting`**:
  - **`enabled <yes|no>`**: Bật/tắt tự động thả reaction cho lệnh `np`.
  - **`upvote/downvote <emoji>`**: Tùy chỉnh emoji mà bot sẽ dùng để "vote".

---

## 5. Phân tích Luồng Lệnh Quan Trọng

## 5. UI & Tiện ích

### Xử lý Màu Ảnh

- **Công cụ**: Tính toán màu RGB trung bình/chủ đạo từ thumbnail 64x64px của Last.fm.
- **Cache**: Cực kỳ quan trọng để tránh tải lại ảnh cho mỗi lệnh `np`.

### Phân trang (`RowPaginator`)

- Tất cả các lệnh danh sách (`topartists`, `recent`, v.v.) sử dụng hệ thống Embed phân trang tùy chỉnh.

### Khoảng thời gian (`Period`)

Ánh xạ cho tham số `period` của API Last.fm:

- `7day` (Tuần)
- `1month` (Tháng)
- `3month` (Quý)
- `6month` (Nửa năm)
- `12month` (Năm)
- `overall` (Toàn thời gian)

---

## 6. Mẹo Migrate sang JavaScript

1.  **HTTP Client**: Sử dụng `axios` hoặc `undici`.
2.  **HTML Parsing**: Sử dụng `cheerio` hoặc `jsdom` để cào dữ liệu.
3.  **Xử lý Ảnh**: Sử dụng `sharp` hoặc `canvas` để tính toán màu sắc và xây dựng collage.
4.  **Bất đồng bộ**: Sử dụng `Promise.all` cho lệnh `whoknows` để lấy dữ liệu thành viên đồng thời (đảm bảo kiểm soát giới hạn rate limit).
5.  **Database**: Nếu dùng Prisma/TypeORM, hãy mô phỏng schema cẩn thận, đặc biệt là logic `ON DUPLICATE KEY UPDATE` được dùng trong Python.

---

## 7. Luồng Hoạt động Siêu Chi tiết (Step-by-Step)

### A. Đăng nhập & Xác thực (Bot Session)

Dùng để giả lập một người dùng thật trên trình duyệt nhằm thực hiện các thao tác cào dữ liệu (Web Scraping) ổn định hơn.

- **Mục đích**: Vượt qua rào cản truy cập của Last.fm đối với khách (Guest), lấy thông tin Metadata (ngày phát hành, ảnh HD) và tránh bị chặn IP/Captcha khi bot có lượng request lớn.
- **Khi nào sử dụng**: Được gọi bởi `lastfm_login_task` mỗi khi khởi động bot hoặc khi session hết hạn. Tất cả các hàm có tiền tố `scrape_` (như `scrape_page`, `scrape_album_metadata`) sẽ tận dụng session đã đăng nhập này.
- **Hàm thực thi**: `LastFmApi.login()` trong `modules/lastfm.py`.
- **Các bước chi tiết**:
  1.  Gửi GET request tới `https://www.last.fm/login`.
  2.  Sử dụng thư viện parse HTML (JS: `cheerio`) tìm `<input type="hidden" name="csrfmiddlewaretoken" ...>`. Lấy giá trị `value`.
  3.  Gửi POST request tới `https://www.last.fm/login` với:
      - **Headers**: `User-Agent` (giả lập trình duyệt) và `referer`.
      - **Body**: `csrfmiddlewaretoken`, `username_or_email`, `password`, `next="/user/_"`, `submit=""`.
  4.  Kiểm tra Response Header `X-PJAX-URL`. Nếu chứa username của bot -> Thành công. Session (Cookies) này được lưu lại trong `self.bot.session` của JS để dùng cho toàn bộ các request Scraping sau này.

### B. Luồng lệnh Now Playing (`>fm np`)

1.  **Trigger**: `LastFm.nowplaying()` trong `cogs/lastfm.py`.
2.  **Lấy Username**: Gọi `create_lastfm_context(ctx)` -> Truy vấn SQL: `SELECT lastfm_username FROM user_settings WHERE user_id = ?`.
3.  **Lấy Data Gốc**: Gọi `api.user_get_now_playing(username)`:
    - Thực chất gọi API `user.getrecenttracks` với `limit=1`.
    - Logic: Nếu phần tử đầu tiên có `@attr.nowplaying == "true"`, gán bài hát đó là bài đang phát. Nếu không, gán bài gần nhất.
4.  **Metadata (Scraping)**: Gọi `api.scrape_album_metadata(artist, album)`:
    - URL: `https://www.last.fm/music/<artist>/<album>` (đã encode URL).
    - Selectors: `.catalogue-metadata-heading` (tìm chữ "Release Date") và `.catalogue-metadata-description` để lấy ngày.
5.  **Cá nhân hóa**: Gọi `api.track_get_info(artist, track, username)`:
    - Lấy `userplaycount` để hiện "Bạn đã nghe X lần".
    - Lấy `toptags` để hiện thể loại bài hát ở footer của Embed.
6.  **Xử lý Hình ảnh**: Gọi `self.image_color(image)`:
    - Query SQL: `SELECT hex FROM image_color_cache WHERE image_hash = ?`.
    - Nếu không có: Tải ảnh 64px, dùng thư viện xử lý ảnh trích xuất màu dominant, lưu vào DB: `INSERT IGNORE image_color_cache ...`.
7.  **Phản hồi**: Gửi Embed + Kiểm tra `lastfm_vote_setting` để tự động thả reaction nếu user có cài đặt.

### C. Luồng Tổng quan Nghệ sĩ (`>fm artist <tên>`)

Đây là lệnh phức tạp nhất vì trộn nhiều nguồn dữ liệu:

1.  **API chính**: Gọi `artist.getinfo` lấy tiểu sử (bio) và các tag.
2.  **Cào Thư viện**: Gọi `api.scrape_page` tới `https://last.fm/user/<username>/library/music/<tên_nghệ_sĩ>?date_preset=...`.
3.  **Phân tích CSS**:
    - Tìm `.metadata-display` để lấy 3 thông số: Tổng lượt nghe nghệ sĩ, số Album đã nghe, số Track đã nghe.
    - Tìm `.chartlist` để lấy danh sách top tracks/albums của người dùng đó cho nghệ sĩ này.
4.  **So sánh Lịch sử**: Gọi 3 API cùng lúc (`Period.OVERALL`, `Period.MONTH`, `Period.WEEK`) để so sánh thứ hạng của nghệ sĩ này trong thư viện của người dùng qua các mốc thời gian.
5.  **Kiểm tra Vương miện (Crown)**: Query SQL: `SELECT user_id FROM artist_crown WHERE guild_id = ? AND artist_name = ?`. Nếu `user_id == ctx.author.id`, thêm emoji 👑 vào tên nghệ sĩ trên Discord.

### D. Luồng Who Knows (`>whoknows <nghệ sĩ>`)

1.  **SQL**: `SELECT user_id, lastfm_username FROM user_settings WHERE user_id IN (danh sách ID thành viên server)`.
2.  **Lọc Blacklist**: Loại bỏ các ID có trong `lastfm_blacklist`.
3.  **Request hàng loạt**: Duyệt qua danh sách, mỗi người gọi 1 hàm `user_playcount`:
    - Hàm này gọi API `artist.getinfo` truyền kèm `username` của người đó.
    - Lấy dữ liệu tại `data["stats"]["userplaycount"]`.
4.  **Xử lý Vương miện (Logic cướp ngôi)**:
    - Sau khi sắp xếp danh sách, nếu người đứng đầu (`hạng 1`) khác với người đang giữ crown trong DB (`bảng artist_crown`).
    - Gửi thông báo: `[User A] vừa cướp vương miện [Nghệ sĩ] từ [User B]`.
    - Cập nhật SQL: `INSERT INTO artist_crown ... ON DUPLICATE KEY UPDATE`.

### E. Luồng Render Collage/Chart (`>fm chart`)

1.  **Lấy Dữ liệu**: Gọi `user.gettopalbums` (hoặc artists) với số lượng `limit = chiều rộng * chiều cao`.
2.  **Xử lý HTML Context**:
    - Tạo danh sách các đối tượng `ALBUMS` (mỗi cái gồm `image_url` và nhãn hiển thị).
    - Tính toán kích cỡ font `FONT_SIZE` dựa trên số lượng cột.
3.  **Gửi yêu cầu Render**: Gửi POST tới server render ảnh:
    - Body: Chứa toàn bộ Context dữ liệu và tên template.
4.  **Nhận Buffer**: Server render (Node.js/Puppeteer) sẽ trả về Buffer ảnh JPG để bot gửi lên Discord.

---

## 8. Các Truy vấn Database (Tham khảo Logic)

- **Tìm Crown**: `artist_crown` (guild_id, user_id, artist_name, cached_playcount).
- **Thiết lập Vote**: `lastfm_vote_setting` (user_id, is_enabled, upvote_emoji, downvote_emoji).
- **Blacklist**: `lastfm_blacklist` (user_id, guild_id).
- **Cache màu**: `image_color_cache` (image_hash, r, g, b, hex).
- **Ảnh nghệ sĩ**: `artist_image_cache` (artist_name, image_hash, scrape_date).

# Hướng dẫn Migrate Module Last.fm (Từ Python sang JavaScript)

Tài liệu này chi tiết hóa logic, các lệnh gọi API và cơ chế cào dữ liệu (scraping) được sử dụng trong module Last.fm của Miso Bot để hỗ trợ việc chuyển đổi sang môi trường JavaScript/TypeScript.

## 1. Kiến trúc Cốt lõi

### Điều kiện tiên quyết

- **Last.fm API Key**: Cần thiết cho tất cả các lệnh gọi REST API.
- **Các bảng Database**:
  - `user_settings`: Lưu `user_id` và `lastfm_username`.
  - `lastfm_vote_setting`: Lưu tùy chỉnh bình chọn (`is_enabled`, `upvote_emoji`, `downvote_emoji`).
  - `lastfm_blacklist`: Danh sách người dùng bị loại khỏi bảng xếp hạng server.
  - `artist_image_cache`: Cache hash ảnh nghệ sĩ và ngày cào dữ liệu.
  - `image_color_cache`: Cache màu chủ đạo (RGB/Hex) của các hash ảnh.
  - `artist_crown`: Theo dõi thành viên có lượt nghe cao nhất cho một nghệ sĩ trong guild.

### Xử lý Context (`create_lastfm_context`)

Hầu hết các lệnh dựa vào `LastFmContext`, bao gồm:

1.  **Người dùng mục tiêu**: Người được nhắc tên (mention) hoặc người dùng thực hiện lệnh.
2.  **Username**: Lấy `lastfm_username` từ bảng `user_settings`.
3.  **Xác thực**: Đảm bảo người dùng đã liên kết tài khoản của họ.

---

## 2. Tham chiếu API (`modules/lastfm.py`)

Tất cả các lệnh gọi API được gửi tới `http://ws.audioscrobbler.com/2.0/` dưới định dạng `json`.

| Hàm                      | Method API Last.fm     | Mục đích                                                              |
| :----------------------- | :--------------------- | :-------------------------------------------------------------------- |
| `user_get_info`          | `user.getinfo`         | Lấy chỉ số profile (tổng lượt nghe, ngày đăng ký, quốc gia).          |
| `user_get_recent_tracks` | `user.getrecenttracks` | Lấy lịch sử nghe. Lưu ý xử lý thuộc tính `nowplaying`.                |
| `user_get_top_artists`   | `user.gettopartists`   | Top nghệ sĩ theo `Khoảng thời gian` (tuần, tháng, v.v.).              |
| `user_get_top_albums`    | `user.gettopalbums`    | Top album theo `Khoảng thời gian`.                                    |
| `user_get_top_tracks`    | `user.gettoptracks`    | Top bài hát theo `Khoảng thời gian`.                                  |
| `artist_get_info`        | `artist.getinfo`       | Lấy tiểu sử, tag nghệ sĩ và **lượt nghe của user** (nếu có username). |
| `album_get_info`         | `album.getinfo`        | Lấy thông tin metadata và danh sách bài hát của album.                |
| `track_get_info`         | `track.getinfo`        | Lấy thông tin bài hát và lượt nghe của user.                          |

---

## 3. Cào Dữ liệu (Web Scraping) & Cải thiện Metadata

API Last.fm thường thiếu dữ liệu. Bot cào trực tiếp từ trang `last.fm` cho các mục sau:

### Metadata của Album (`scrape_album_metadata`)

- **URL**: `https://www.last.fm/music/<nghệ_sĩ>/<album>`
- **Dữ liệu**: Ngày phát hành, Độ dài album.
- **Logic**: Chọn các class `.catalogue-metadata-heading` và `.catalogue-metadata-description`.

### Ảnh Nghệ sĩ (`scrape_artist_image`)

- **URL**: `https://www.last.fm/music/<nghệ_sĩ>/+images`
- **Dữ liệu**: Nguồn ảnh hàng đầu (top image).
- **Caching**: Lưu trong `artist_image_cache` trong 1 tuần.

### Lượt nghe trong Thư viện (`get_library_playcounts`)

Dùng cho lệnh `artist overview` và `album tracklist`.

- **URL**: `https://www.last.fm/user/<username>/library/music/<nghệ_sĩ>` (kèm tham số như `?date_preset=LAST_7_DAYS`).
- **Scraping**: Quét `.chartlist-row` để lấy lượt nghe chính xác cho các mục nhỏ (bài hát/album) trong một khoảng thời gian cụ thể.
- **Phân trang**: `get_additional_library_pages` xử lý kết quả thư viện nhiều trang.

---

## 4. Danh sách Lệnh & Mô tả Chi tiết

### Nhóm lệnh Cá nhân (`>fm`)

- **`>fm set <username>`**:
  - **Mô tả**: Lưu username Last.fm vào cơ sở dữ liệu.
  - **Logic**: Kiểm tra profile có tồn tại không trước khi lưu. Nếu tồn tại, hiển thị một Embed tóm tắt profile.
- **`>fm nowplaying` (Alias: `np`, `no`)**:
  - **Mô tả**: Hiển thị bài hát bạn đang nghe.
  - **Tính năng**: Hiển thị ảnh bìa, tên bài hát, nghệ sĩ, album, năm phát hành (từ scraping), lượt nghe cá nhân, và các tag (thể loại). Nếu đang nghe, hiện "Now Playing", nếu đã dừng, hiện thời gian bài cuối được phát.
- **`>fm profile`**:
  - **Mô tả**: Xem thẻ thông tin cá nhân.
  - **Dữ liệu**: Tổng scrobbles, số lượng nghệ sĩ/album/bài hát duy nhất đã nghe, ngày đăng ký, quốc gia.
- **`>fm topartists` | `topalbums` | `toptracks`**:
  - **Tham số**: `[timeframe]` (ví dụ: `weekly`, `overall`).
  - **Mô tả**: Danh sách 100 mục đứng đầu. Tự động phân trang (Pagination) 10 mục mỗi trang.
- **`>fm recent` (Alias: `re`)**:
  - **Mô tả**: 100 bài hát nghe gần đây nhất. Hiển thị thời gian nghe tương đối (ví dụ: 5 minutes ago) bằng cách sử dụng timestamp của Discord.
- **`>fm artist [timeframe] [toptracks|topalbums|overview] <tên_nghệ_sĩ>`**:
  - **Overview**: Hiển thị tổng quan lượt nghe của bạn cho nghệ sĩ đó, bao gồm cả top 10 bài hát và top 10 album của nghệ sĩ đó trong thư viện của bạn.
  - **Top Tracks/Albums**: Liệt kê toàn bộ danh sách bài hát/album của nghệ sĩ đó mà bạn đã nghe.
- **`>fm album [timeframe] [toptracks|tracklist] <tên_album | nghệ_sĩ>`**:
  - **Tracklist**: Hiển thị danh sách bài hát trong album đó cùng với lượt nghe của bạn cho từng bài (nếu có).
- **`>fm chart [timeframe] [size] [options]`**:
  - **Tham số size**: Định dạng `WxH` (ví dụ: `3x3`, `5x5`). Tối đa 12x12.
  - **Options**:
    - `artist`: Vẽ chart nghệ sĩ thay vì album.
    - `recent`: Vẽ chart dựa trên các bài nghe gần đây nhất.
    - `topster`: Hiển thị danh sách tên ở bên cạnh ảnh.
    - `notitle`: Ẩn tên bài hát đè lên ảnh.
    - `padded`: Thêm khoảng trắng giữa các ảnh cover.
- **`>fm colorchart [color|rainbow] [size]`**:
  - **Mô tả**: Tìm các album trong thư viện có màu chủ đạo gần nhất với màu yêu cầu.
  - **Logic**: Sử dụng thuật toán K-Nearest Neighbors (KNN) để tìm kiếm trong không gian màu RGB.
- **`>fm milestone <số_thứ_tự>`**:
  - **Mô tả**: "Lục lại quá khứ". Ví dụ: `>fm milestone 10000` sẽ tìm xem bài hát thứ 10.000 bạn nghe là bài gì.

### Nhóm lệnh Server (`>fm server` hoặc `>fm s`)

- **`>fm s nowplaying`**: Hiển thị danh sách tất cả những người trong server đang nghe nhạc ngay lúc này.
- **`>fm s recent`**: Tổng hợp các bài hát vừa được nghe bởi tất cả thành viên trong server, sắp xếp theo thời gian thực.
- **`>fm s topartists/topalbums/toptracks`**:
  - **Chế độ `scrobble`**: Xếp hạng theo tổng lượt nghe của cả server cộng lại.
  - **Chế độ `score`**: Xếp hạng dựa trên "điểm số" (vị trí trong top 100 của từng người). Cách này giúp tránh việc một người nghe quá nhiều (hardcore fan) làm lệch bảng xếp hạng.

### Nhóm lệnh Tương tác & Xếp hạng

- **`>whoknows <nghệ_sĩ>`**:
  - **Mô tả**: Bảng xếp hạng lượt nghe của các thành viên trong server cho một nghệ sĩ.
  - **Crown (Vương miện)**: Người đứng đầu sẽ nhận được 👑. Nếu có người vượt qua, bot sẽ thông báo việc cướp ngôi.
- **`>crowns [user]`**: Xem tất cả các nghệ sĩ mà bạn (hoặc người khác) đang đứng đầu lượt nghe trong server hiện tại.
- **`>fm voting`**:
  - **`enabled <yes|no>`**: Bật/tắt tự động thả reaction cho lệnh `np`.
  - **`upvote/downvote <emoji>`**: Tùy chỉnh emoji mà bot sẽ dùng để "vote".

---

## 5. Phân tích Luồng Lệnh Quan Trọng

## 5. UI & Tiện ích

### Xử lý Màu Ảnh

- **Công cụ**: Tính toán màu RGB trung bình/chủ đạo từ thumbnail 64x64px của Last.fm.
- **Cache**: Cực kỳ quan trọng để tránh tải lại ảnh cho mỗi lệnh `np`.

### Phân trang (`RowPaginator`)

- Tất cả các lệnh danh sách (`topartists`, `recent`, v.v.) sử dụng hệ thống Embed phân trang tùy chỉnh.

### Khoảng thời gian (`Period`)

Ánh xạ cho tham số `period` của API Last.fm:

- `7day` (Tuần)
- `1month` (Tháng)
- `3month` (Quý)
- `6month` (Nửa năm)
- `12month` (Năm)
- `overall` (Toàn thời gian)

---

## 6. Mẹo Migrate sang JavaScript

1.  **HTTP Client**: Sử dụng `axios` hoặc `undici`.
2.  **HTML Parsing**: Sử dụng `cheerio` hoặc `jsdom` để cào dữ liệu.
3.  **Xử lý Ảnh**: Sử dụng `sharp` hoặc `canvas` để tính toán màu sắc và xây dựng collage.
4.  **Bất đồng bộ**: Sử dụng `Promise.all` cho lệnh `whoknows` để lấy dữ liệu thành viên đồng thời (đảm bảo kiểm soát giới hạn rate limit).
5.  **Database**: Nếu dùng Prisma/TypeORM, hãy mô phỏng schema cẩn thận, đặc biệt là logic `ON DUPLICATE KEY UPDATE` được dùng trong Python.

---

## 7. Luồng Hoạt động Siêu Chi tiết (Step-by-Step)

### A. Đăng nhập & Xác thực (Bot Session)

Dùng để giả lập một người dùng thật trên trình duyệt nhằm thực hiện các thao tác cào dữ liệu (Web Scraping) ổn định hơn.

- **Mục đích**: Vượt qua rào cản truy cập của Last.fm đối với khách (Guest), lấy thông tin Metadata (ngày phát hành, ảnh HD) và tránh bị chặn IP/Captcha khi bot có lượng request lớn.
- **Khi nào sử dụng**: Được gọi bởi `lastfm_login_task` mỗi khi khởi động bot hoặc khi session hết hạn. Tất cả các hàm có tiền tố `scrape_` (như `scrape_page`, `scrape_album_metadata`) sẽ tận dụng session đã đăng nhập này.
- **Hàm thực thi**: `LastFmApi.login()` trong `modules/lastfm.py`.
- **Các bước chi tiết**:
  1.  Gửi GET request tới `https://www.last.fm/login`.
  2.  Sử dụng thư viện parse HTML (JS: `cheerio`) tìm `<input type="hidden" name="csrfmiddlewaretoken" ...>`. Lấy giá trị `value`.
  3.  Gửi POST request tới `https://www.last.fm/login` với:
      - **Headers**: `User-Agent` (giả lập trình duyệt) và `referer`.
      - **Body**: `csrfmiddlewaretoken`, `username_or_email`, `password`, `next="/user/_"`, `submit=""`.
  4.  Kiểm tra Response Header `X-PJAX-URL`. Nếu chứa username của bot -> Thành công. Session (Cookies) này được lưu lại trong `self.bot.session` của JS để dùng cho toàn bộ các request Scraping sau này.

### B. Luồng lệnh Now Playing (`>fm np`)

1.  **Trigger**: `LastFm.nowplaying()` trong `cogs/lastfm.py`.
2.  **Lấy Username**: Gọi `create_lastfm_context(ctx)` -> Truy vấn SQL: `SELECT lastfm_username FROM user_settings WHERE user_id = ?`.
3.  **Lấy Data Gốc**: Gọi `api.user_get_now_playing(username)`:
    - Thực chất gọi API `user.getrecenttracks` với `limit=1`.
    - Logic: Nếu phần tử đầu tiên có `@attr.nowplaying == "true"`, gán bài hát đó là bài đang phát. Nếu không, gán bài gần nhất.
4.  **Metadata (Scraping)**: Gọi `api.scrape_album_metadata(artist, album)`:
    - URL: `https://www.last.fm/music/<artist>/<album>` (đã encode URL).
    - Selectors: `.catalogue-metadata-heading` (tìm chữ "Release Date") và `.catalogue-metadata-description` để lấy ngày.
5.  **Cá nhân hóa**: Gọi `api.track_get_info(artist, track, username)`:
    - Lấy `userplaycount` để hiện "Bạn đã nghe X lần".
    - Lấy `toptags` để hiện thể loại bài hát ở footer của Embed.
6.  **Xử lý Hình ảnh**: Gọi `self.image_color(image)`:
    - Query SQL: `SELECT hex FROM image_color_cache WHERE image_hash = ?`.
    - Nếu không có: Tải ảnh 64px, dùng thư viện xử lý ảnh trích xuất màu dominant, lưu vào DB: `INSERT IGNORE image_color_cache ...`.
7.  **Phản hồi**: Gửi Embed + Kiểm tra `lastfm_vote_setting` để tự động thả reaction nếu user có cài đặt.

### C. Luồng Tổng quan Nghệ sĩ (`>fm artist <tên>`)

Đây là lệnh phức tạp nhất vì trộn nhiều nguồn dữ liệu:

1.  **API chính**: Gọi `artist.getinfo` lấy tiểu sử (bio) và các tag.
2.  **Cào Thư viện**: Gọi `api.scrape_page` tới `https://last.fm/user/<username>/library/music/<tên_nghệ_sĩ>?date_preset=...`.
3.  **Phân tích CSS**:
    - Tìm `.metadata-display` để lấy 3 thông số: Tổng lượt nghe nghệ sĩ, số Album đã nghe, số Track đã nghe.
    - Tìm `.chartlist` để lấy danh sách top tracks/albums của người dùng đó cho nghệ sĩ này.
4.  **So sánh Lịch sử**: Gọi 3 API cùng lúc (`Period.OVERALL`, `Period.MONTH`, `Period.WEEK`) để so sánh thứ hạng của nghệ sĩ này trong thư viện của người dùng qua các mốc thời gian.
5.  **Kiểm tra Vương miện (Crown)**: Query SQL: `SELECT user_id FROM artist_crown WHERE guild_id = ? AND artist_name = ?`. Nếu `user_id == ctx.author.id`, thêm emoji 👑 vào tên nghệ sĩ trên Discord.

### D. Luồng Who Knows (`>whoknows <nghệ sĩ>`)

1.  **SQL**: `SELECT user_id, lastfm_username FROM user_settings WHERE user_id IN (danh sách ID thành viên server)`.
2.  **Lọc Blacklist**: Loại bỏ các ID có trong `lastfm_blacklist`.
3.  **Request hàng loạt**: Duyệt qua danh sách, mỗi người gọi 1 hàm `user_playcount`:
    - Hàm này gọi API `artist.getinfo` truyền kèm `username` của người đó.
    - Lấy dữ liệu tại `data["stats"]["userplaycount"]`.
4.  **Xử lý Vương miện (Logic cướp ngôi)**:
    - Sau khi sắp xếp danh sách, nếu người đứng đầu (`hạng 1`) khác với người đang giữ crown trong DB (`bảng artist_crown`).
    - Gửi thông báo: `[User A] vừa cướp vương miện [Nghệ sĩ] từ [User B]`.
    - Cập nhật SQL: `INSERT INTO artist_crown ... ON DUPLICATE KEY UPDATE`.

### E. Luồng Render Collage/Chart (`>fm chart`)

1.  **Lấy Dữ liệu**: Gọi `user.gettopalbums` (hoặc artists) với số lượng `limit = chiều rộng * chiều cao`.
2.  **Xử lý HTML Context**:
    - Tạo danh sách các đối tượng `ALBUMS` (mỗi cái gồm `image_url` và nhãn hiển thị).
    - Tính toán kích cỡ font `FONT_SIZE` dựa trên số lượng cột.
3.  **Gửi yêu cầu Render**: Gửi POST tới server render ảnh:
    - Body: Chứa toàn bộ Context dữ liệu và tên template.
4.  **Nhận Buffer**: Server render (Node.js/Puppeteer) sẽ trả về Buffer ảnh JPG để bot gửi lên Discord.

---

## 8. Các Truy vấn Database (Tham khảo Logic)

- **Tìm Crown**: `artist_crown` (guild_id, user_id, artist_name, cached_playcount).
- **Thiết lập Vote**: `lastfm_vote_setting` (user_id, is_enabled, upvote_emoji, downvote_emoji).
- **Blacklist**: `lastfm_blacklist` (user_id, guild_id).
- **Cache màu**: `image_color_cache` (image_hash, r, g, b, hex).
- **Ảnh nghệ sĩ**: `artist_image_cache` (artist_name, image_hash, scrape_date).
