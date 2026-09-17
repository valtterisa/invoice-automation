# Deploy

## Architecture

| Piece | Where |
| --- | --- |
| Frontend | **Vercel** (`apps/web`) |
| API + MySQL | **AWS EC2** via Docker Compose |

API listens on **:3001** (no nginx).

## Prerequisites

- AWS account + CLI (VPC, EC2, IAM, S3)
- EC2 key pair in the target region
- GitHub repo with Packages write access
- Repo secrets below (Settings → Secrets and variables → Actions)
- Vercel project linked to this repo

## 1. Terraform

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# set key_name, ssh_cidr_blocks, region
terraform init && terraform apply
```

Useful outputs: `ec2_public_ip`, `invoice_bucket_name`, `aws_region`, `ssh_hint`.

On the instance, create `/opt/invoice-agent/.env` (from `.env.example`). Minimum:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL`, `MYSQL_*` | MySQL in compose (`DATABASE_URL` host = `mysql`) |
| `AWS_REGION` | Terraform `aws_region` |
| `S3_BUCKET` | Terraform `invoice_bucket_name` |
| `ANTHROPIC_API_KEY` | or `ANTHROPIC_MOCK=true` |
| `CORS_ORIGIN` | Vercel URL(s), e.g. `https://your-app.vercel.app` |

Omit `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` on EC2 — the instance profile talks to the private invoice bucket. API issues short-lived presigned GET URLs for PDFs.

Security group: **3001 / 22**. MySQL stays on the Docker network (3306 published for local only; lock down if unused on EC2).

On EC2, set `DATABASE_URL=mysql://invoice:...@mysql:3306/invoice_agent`.

## 2. GitHub Actions → EC2 (API)

Workflow: `.github/workflows/deploy.yml` (push to `main` or manual).

| Secret | Purpose |
| --- | --- |
| `EC2_HOST` | Terraform `ec2_public_ip` (or DNS) |
| `EC2_USER` | `ec2-user` |
| `EC2_SSH_KEY` | Private key for `key_name` |

Flow: build/push `invoice-api` → SCP compose → SSH pull/up → poll `http://127.0.0.1:3001/health` and `/ready`.

`IMAGE_TAG` and `GHCR_OWNER` are injected by the workflow; do not put static image tags in `.env`.

## 3. Vercel (frontend)

1. Import the repo in Vercel (uses root `vercel.json`).
2. Set env **`VITE_API_URL`** to `http://<ec2_public_ip>:3001` (or your API domain; no trailing slash).
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

Optional API stack in Docker (frontend stays on Vite/Vercel):

```bash
docker compose up -d --build
pnpm db:migrate
```

## E2E

```bash
pnpm test:e2e
```

Needs API + web, healthy MySQL, migrations, `ANTHROPIC_MOCK=true`, and working S3 for `S3_BUCKET`.
