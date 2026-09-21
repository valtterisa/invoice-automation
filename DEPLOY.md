# Deploy

## Architecture

| Piece | Where |
| --- | --- |
| Frontend | **Vercel** (`apps/web`) |
| API | **AWS EC2** via Docker Compose (API container only) |
| MySQL | **Managed** (RDS / Aurora / etc.) |

API listens on **:3001** (no nginx). Express runs as a normal Node process in the container — no Lambda adapter.

## Prerequisites

- AWS account (EC2, managed MySQL, IAM instance profile or keys for S3, S3 bucket)
- EC2 key pair in the target region
- GitHub repo with Packages write access
- Repo secrets below (Settings → Secrets and variables → Actions)
- Vercel project linked to this repo

## 1. One-time EC2 setup

1. Launch Amazon Linux 2023 (`t3.small` is fine).
2. Security group: **22** (your IP), **3001** (0.0.0.0/0 or tighter). Allow EC2 → managed MySQL (typically SG rule on the DB).
3. Install Docker + Compose plugin; create `/opt/invoice-agent`.
4. Attach an instance profile that can read/write the invoice S3 bucket (preferred), or put AWS keys in `.env`.
5. Create `/opt/invoice-agent/.env` (from `.env.example`). Minimum:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Managed MySQL connection string |
| `AWS_REGION` | bucket region |
| `S3_BUCKET` | private invoice bucket |
| `ANTHROPIC_API_KEY` | required for real Claude extraction |
| `CORS_ORIGIN` | Vercel URL(s), e.g. `https://your-app.vercel.app` |

Enable `event_scheduler=ON` on the managed MySQL parameter group (idempotency cleanup EVENT).

Omit `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` when using the instance profile.

**S3 CORS** (needed for browser presigned uploads) — allow your Vercel origin + `http://localhost:5173`:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedOrigins": ["http://localhost:5173", "https://YOUR_APP.vercel.app"],
    "ExposeHeaders": ["ETag", "Content-Type", "Content-Length"],
    "MaxAgeSeconds": 3000
  }
]
```

## 2. GitHub Actions → EC2 (API)

Workflow: `.github/workflows/deploy.yml` (push to `main` or manual).

| Secret | Purpose |
| --- | --- |
| `EC2_HOST` | Instance public IP or DNS |
| `EC2_USER` | `ec2-user` |
| `EC2_SSH_KEY` | Private key for the instance |

Flow: build/push `invoice-api` to GHCR → SCP `docker-compose.yml` → SSH pull/up → poll `/health` and `/ready`.

`IMAGE_TAG` and `GHCR_OWNER` are set by the workflow on the server (not in `.env`).

After first deploy, migrate once against managed MySQL:

```bash
pnpm db:migrate
```

## 3. Vercel (frontend)

1. Import the repo in Vercel (uses root `vercel.json`).
2. Set **`VITE_API_URL`** to `http://<ec2_public_ip>:3001` (or your API domain; no trailing slash).
3. Deploy. SPA fallback is configured via `rewrites`.

Match `CORS_ORIGIN` on EC2 to the Vercel deployment URL (and custom domain if any).

## 4. Local

```bash
cp .env.example .env
# Point DATABASE_URL at managed MySQL (or any reachable MySQL)
# ANTHROPIC_MOCK=true, AWS_REGION, S3_BUCKET, plus AWS creds/profile
# Leave VITE_API_URL empty — Vite proxies /api → :3001
pnpm install && pnpm db:migrate
pnpm dev:api
pnpm dev:web
```

- API: `http://localhost:3001` (`/health`, `/ready`)
- Web: `http://localhost:5173`

Uploads use **presigned S3 PUT**; the bucket needs CORS for your web origin.

## E2E

```bash
pnpm test:e2e
```

Needs API + web, reachable MySQL, migrations, `ANTHROPIC_MOCK=true`, and working S3 CORS for `S3_BUCKET`.
