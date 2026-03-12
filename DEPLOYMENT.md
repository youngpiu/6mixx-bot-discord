# Deployment Guide (Debian VPS)

Tai lieu nay huong dan deploy du an len VPS Debian bang Docker Compose, va cau hinh CI/CD voi GitHub Actions.

## 1. Tong quan luong deploy

1. Push code len `main`.
2. GitHub Actions chay CI (`lint`, `prettier --check`, `build`, `docker build`).
3. Neu CI pass, workflow `deploy.yml` SSH vao VPS:
4. `git pull origin main`
5. `docker compose --profile prod build --no-cache bot migrate`
6. `docker compose --profile prod run --rm migrate`
7. `docker compose --profile prod up -d bot`
8. Health check container `bot`.

## 2. Chuan bi VPS Debian

### 2.1 Cai Docker + Compose plugin

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg jq git

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

### 2.2 Cho phep user hien tai dung Docker

```bash
sudo usermod -aG docker $USER
newgrp docker
docker --version
docker compose version
```

## 3. Chuan bi source tren VPS

```bash
mkdir -p ~/6mixx-bot-discord
cd ~/6mixx-bot-discord
git clone https://github.com/yngpiu/6mixx-bot-discord.git .
```

Neu la private repo, dung deploy key hoac PAT de server co quyen `git pull`.

## 4. Cau hinh bien moi truong

1. Tao file `.env` trong `~/6mixx-bot-discord` (tham khao `.env.example`).
2. Cac bien bat buoc:
3. `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
4. `DISCORD_TOKEN`, `TEST_GUILDS_ID`, `OWNER_BOT_ID`
5. `BANK_ACCOUNT_NUMBER`, `BANK_NAME`, `BANK_ACCOUNT_NAME`
6. `DEFAULT_PREFIX` (neu khong co se mac dinh `.`)

## 5. Khoi dong lan dau (manual)

### 5.1 Chay database va redis

```bash
cd ~/6mixx-bot-discord
docker compose up -d postgres redis
```

### 5.2 Build va migrate

```bash
docker compose --profile prod build --no-cache bot migrate
docker compose --profile prod run --rm migrate
```

### 5.3 Chay bot

```bash
docker compose --profile prod up -d bot
docker compose --profile prod ps
docker compose --profile prod logs -f bot
```

## 6. Seed du lieu `data/` (chay 1 lan)

`prisma/seed.ts` doc file tu `/app/data`, vi vay can mount thu muc `data` cua host vao container khi seed.

```bash
cd ~/6mixx-bot-discord
docker compose --profile prod run --rm \
  -v ~/6mixx-bot-discord/data:/app/data \
  migrate pnpm exec prisma db seed --config ./prisma.config.ts
```

Ghi chu:

1. Script seed dang dung `skipDuplicates: true`, nen chay lai se khong insert trung.
2. Van nen coi seed la thao tac thu cong co kiem soat.

## 7. Cau hinh GitHub Actions CI/CD

Repository da co:

1. `.github/workflows/ci.yml`
2. `.github/workflows/deploy.yml`

Can set cac GitHub Secrets:

1. `SSH_HOST`
2. `SSH_PORT`
3. `SSH_USERNAME`
4. `SSH_PRIVATE_KEY`

Khuyen nghi:

1. Tao user rieng cho deploy (vi du `deploy`).
2. Chi mo SSH key auth, tat password auth neu co the.
3. Gan workflow deploy vao GitHub Environment `production` de co approval rule neu can.

## 8. Van hanh thuong ngay

### 8.1 Deploy thu cong tren VPS

```bash
cd ~/6mixx-bot-discord
git pull origin main
docker compose --profile prod build --no-cache bot migrate
docker compose --profile prod run --rm migrate
docker compose --profile prod up -d bot
docker image prune -f
```

### 8.2 Kiem tra trang thai

```bash
docker compose --profile prod ps
docker compose --profile prod logs --tail 100 bot
docker compose --profile prod logs --tail 100 postgres
docker compose --profile prod logs --tail 100 redis
```

## 9. Troubleshooting nhanh

1. Bot khong len sau deploy:
2. Kiem tra `docker compose --profile prod logs --tail 200 bot`.
3. Neu loi DB schema, chay lai `docker compose --profile prod run --rm migrate`.

4. Loi seed khong tim thay file data:
5. Dam bao mount `-v ~/6mixx-bot-discord/data:/app/data`.

6. CI pass nhung deploy fail SSH:
7. Kiem tra IP whitelist, port SSH, va format private key trong GitHub Secrets.

## 10. Bao mat co ban

1. Khong commit file `.env`.
2. Dung SSH key rieng cho CI/CD, co passphrase neu he thong ho tro.
3. Han che quyen user deploy tren VPS.
4. Cap nhat image va package dinh ky.
