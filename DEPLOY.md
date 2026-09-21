# Deploy

## Architecture

| Piece | Where |
| --- | --- |
| Frontend | **Vercel** (`apps/web`) |
| API | **AWS EC2** via Docker Compose (API container only) |
| MySQL | **Managed** (RDS / Aurora / etc.) |

API listens on **:3001** (no nginx). Express runs as a normal Node process in the container — no Lambda adapter.

GitHub Actions only **builds and pushes** the API image to GHCR. You SSH to EC2 yourself for `.env` and restarts.

## Prerequisites

- AWS account (EC2, managed MySQL, IAM instance profile or keys for S3, S3 bucket)
- EC2 key pair in the target region
- GitHub repo with Packages write access (Packages write via `GITHUB_TOKEN`)
- Vercel project linked to this repo

## 1. One-time EC2 setup

1. Launch Amazon Linux 2023 (`t3.small` is fine).
2. Security group: **22** (your IP), **3001** (0.0.0.0/0 or tighter). Allow EC2 → managed MySQL.
3. Install Docker + Compose plugin.
4. Attach an instance profile that can read/write the invoice S3 bucket (preferred).
5. Create the deploy dir + env file:

```bash
ssh -i your-key.pem ec2-user@YOUR_HOST
sudo mkdir -p /opt/invoice-agent
sudo chown ec2-user:ec2-user /opt/invoice-agent
cd /opt/invoice-agent
nano .env   # copy from .env.example, fill real values
chmod 600 .env
```

Minimum in `.env`:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Managed MySQL connection string |
| `ANTHROPIC_API_KEY` | Claude API key |
| `CORS_ORIGIN` | Vercel URL(s), comma-separated |
| `AWS_REGION` | e.g. `eu-north-1` |
| `S3_BUCKET` | Private invoice bucket |

Also copy `docker-compose.yml` to `/opt/invoice-agent/` (from the repo).

Enable `event_scheduler=ON` on the managed MySQL parameter group (idempotency cleanup EVENT).

Log in to GHCR once on the box (needs a PAT with `read:packages`, or pull via a logged-in user):

```bash
echo YOUR_GHCR_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USER --password-stdin
```

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

## 2. GitHub Actions (build only)

Workflow: `.github/workflows/deploy.yml` (push to `main` or manual).

Pushes:

- `ghcr.io/<owner>/invoice-api:<git-sha>`
- `ghcr.io/<owner>/invoice-api:latest`

No EC2 secrets needed in GitHub.

## 3. Manual deploy on EC2

After Actions finishes:

```bash
ssh -i your-key.pem ec2-user@YOUR_HOST
cd /opt/invoice-agent
export GHCR_OWNER=your-github-username-lowercase
export IMAGE_TAG=latest   # or a specific sha from the workflow
set -a && . ./.env && set +a
docker compose pull api
docker compose up -d
curl -fsS http://127.0.0.1:3001/health
curl -fsS http://127.0.0.1:3001/ready
```

After first bring-up, migrate once against managed MySQL:

```bash
pnpm db:migrate
```

## 4. Vercel (frontend)

1. Import the repo in Vercel (uses root `vercel.json`).
2. Set **`VITE_API_URL`** to `http://<ec2_public_ip>:3001` (or your API domain; no trailing slash).
3. Deploy. SPA fallback is configured via `rewrites`.

Match `CORS_ORIGIN` on EC2 to the Vercel deployment URL (and custom domain if any).

## 5. Local

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
