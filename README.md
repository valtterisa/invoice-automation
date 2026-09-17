# Invoice Agent

Upload PDF invoices → Claude extracts fields → the app validates → a human reviews and approves → payment tasks are created.

## Stack

| Path | Role |
| --- | --- |
| `apps/api` | Express, MySQL (Drizzle), AWS S3, Anthropic extraction |
| `apps/web` | React review UI (Vite) — deploy to Vercel |
| `packages/shared` | Zod schemas, money helpers, REST types |
| `e2e` | Playwright (needs API + web + MySQL + real S3) |

Package manager: **pnpm** (`pnpm-workspace.yaml`). Sample PDFs: `demo/invoices/`.

## Local run

### 1. Env

```bash
cp .env.example .env
```

Set at least:

| Variable | Notes |
| --- | --- |
| `ANTHROPIC_MOCK` | `true` — deterministic extraction, no Claude key |
| `AWS_REGION` | bucket region (e.g. `eu-north-1`) |
| `S3_BUCKET` | real private S3 bucket |
| AWS credentials | uncomment keys, or use `AWS_PROFILE` / `~/.aws/credentials` |

`dev:api`, `db:migrate`, and `test:e2e` load root `.env` via Node `--env-file`.

### 2. MySQL

```bash
docker compose up -d mysql
docker compose ps   # wait until mysql is healthy
```

### 3. Install + migrate

```bash
pnpm install
pnpm db:migrate
```

### 4. API + web

```bash
pnpm dev:api
pnpm dev:web
```

- Web: http://localhost:5173 (Vite proxies `/api`; leave `VITE_API_URL` empty)
- API: http://localhost:3001 (`/health`, `/ready`)

Upload and E2E need working S3; `/health` can succeed without it.

### Optional: API in Compose

```bash
docker compose up -d --build
pnpm db:migrate
```

API on :3001; web still via `pnpm dev:web` or Vercel.

## Tests

```bash
pnpm test        # unit / workspace tests
pnpm test:e2e    # Playwright — MySQL up, migrated, API+web running, ANTHROPIC_MOCK=true, S3 configured
pnpm typecheck
pnpm build
```

## Scripts

```bash
pnpm dev:api
pnpm dev:web
pnpm db:migrate
pnpm db:generate
```

Deploy notes: [DEPLOY.md](./DEPLOY.md).
