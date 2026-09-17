# Deploy

## Architecture

| Piece | Where |
| --- | --- |
| Frontend | **Vercel** (`apps/web`) |
| API + MySQL | **AWS EC2** via Docker Compose |

API listens on **:3001** (no nginx). Express runs as a normal Node process in the container — no Lambda adapter.

## Prerequisites

- AWS account (EC2, IAM instance profile or keys for S3, S3 bucket)
- EC2 key pair in the target region
- GitHub repo with Packages write access
- Repo secrets below (Settings → Secrets and variables → Actions)
- Vercel project linked to this repo

## 1. One-time EC2 setup

1. Launch Amazon Linux 2023 (`t3.small` is fine).
2. Security group: **22** (your IP), **3001** (0.0.0.0/0 or tighter).
3. Install Docker + Compose plugin; create `/opt/invoice-agent`.
4. Attach an instance profile that can read/write the invoice S3 bucket (preferred), or put AWS keys in `.env`.
5. Create `/opt/invoice-agent/.env` (from `.env.example`). Minimum:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL`, `MYSQL_*` | MySQL in compose (`DATABASE_URL` host = `mysql`) |
| `AWS_REGION` | bucket region |
| `S3_BUCKET` | private invoice bucket |
| `ANTHROPIC_API_KEY` | or `ANTHROPIC_MOCK=true` |
| `CORS_ORIGIN` | Vercel URL(s), e.g. `https://your-app.vercel.app` |

On EC2, set `DATABASE_URL=mysql://invoice:...@mysql:3306/invoice_agent`.

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

Flow: build/push `invoice-api` to GHCR → SCP compose → SSH pull/up → poll `http://127.0.0.1:3001/health` and `/ready`.

`IMAGE_TAG` and `GHCR_OWNER` are injected by the workflow; do not put static image tags in `.env`.

After first deploy, migrate once on the box (or from a machine that can reach MySQL):

```bash
# from repo, with DATABASE_URL pointing at the compose MySQL if exposed,
# or ssh in and run against the api container / local migrate with host mysql
pnpm db:migrate
```

Easiest on EC2 after stack is up: copy the repo or run migrate via a one-off container using the same `DATABASE_URL` as compose.

## 3. Vercel (frontend)

1. Import the repo in Vercel (uses root `vercel.json`).
2. Set **`VITE_API_URL`** to `http://<ec2_public_ip>:3001` (or your API domain; no trailing slash).
3. Deploy. SPA fallback is configured via `rewrites`.

Match `CORS_ORIGIN` on EC2 to the Vercel deployment URL (and custom domain if any).

## 4. Local

```bash
cp .env.example .env
# ANTHROPIC_MOCK=true, AWS_REGION, S3_BUCKET, plus AWS creds/profile
# Leave VITE_API_URL empty — Vite proxies /api → :3001
docker compose up -d mysql
pnpm install && pnpm db:migrate
pnpm dev:api
pnpm dev:web
```

- API: `http://localhost:3001` (`/health`, `/ready`)
- Web: `http://localhost:5173`

Uploads use **presigned S3 PUT**; the bucket needs CORS for your web origin.

Optional API stack in Docker (frontend stays on Vite/Vercel):

```bash
docker compose up -d --build
pnpm db:migrate
```

## E2E

```bash
pnpm test:e2e
```

Needs API + web, healthy MySQL, migrations, `ANTHROPIC_MOCK=true`, and working S3 CORS for `S3_BUCKET`.
