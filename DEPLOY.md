# Deploy

## Architecture

| Piece | Where |
| --- | --- |
| Frontend | **Vercel** (`apps/web`) |
| API | **AWS EC2** — `git clone` + Docker Compose |
| MySQL | **Managed** (RDS / Aurora / etc.) |

No GitHub Actions deploy for now. You run the API on the box yourself.

## One-time EC2 setup

1. Amazon Linux 2023, Docker + Compose plugin installed.
2. Security group: **22** (your IP), **3001** (as needed). EC2 can reach managed MySQL.
3. Instance profile for S3 (preferred), or AWS keys in `.env`.

```bash
sudo yum install -y git   # if needed
cd ~
git clone https://github.com/YOUR_ORG/invoice-automation.git
cd invoice-automation

cat > .env <<'EOF'
NODE_ENV=production
API_PORT=3001
API_HOST=0.0.0.0
DATABASE_URL=mysql://USER:PASSWORD@YOUR_RDS_HOST:3306/invoice_agent
ANTHROPIC_API_KEY=sk-ant-REPLACE_ME
CORS_ORIGIN=https://your-app.vercel.app
AWS_REGION=eu-north-1
S3_BUCKET=invoice-agent
IDEMPOTENCY_TTL_SECONDS=86400
EOF

chmod 600 .env
nano .env

docker compose up -d --build
curl -fsS http://127.0.0.1:3001/health
curl -fsS http://127.0.0.1:3001/ready
```

Migrate once (from a machine that can reach MySQL, or install Node/pnpm on the box):

```bash
pnpm install
pnpm db:migrate
```

Enable `event_scheduler=ON` on managed MySQL (idempotency cleanup EVENT).

## Updates later

```bash
cd ~/invoice-automation
git pull
docker compose up -d --build
```

## Vercel (frontend)

Set `VITE_API_URL` to `http://<ec2_public_ip>:3001` (no trailing slash). Match `CORS_ORIGIN` to your Vercel URL.

## Local

```bash
cp .env.example .env
pnpm install && pnpm db:migrate
pnpm dev:api
pnpm dev:web
```
