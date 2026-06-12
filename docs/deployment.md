# Deployment Guide — Jalpaiguri Smart City Platform

## Quick Start (Local Development)

```bash
# 1. Clone and install
git clone https://github.com/your-org/jalpaiguri-platform
cd jalpaiguri-platform

# 2. Start infrastructure
cd docker
cp ../apps/api/.env.example ../apps/api/.env
# Edit .env — set ANTHROPIC_API_KEY and MAPBOX token
docker-compose up -d postgres redis minio

# 3. Setup database
cd apps/api
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate deploy
npx ts-node ../../packages/seed/index.ts

# 4. Create MinIO bucket
# Open http://localhost:9001 (minioadmin/minioadmin)
# Create bucket: jalpaiguri-platform  — set policy: public read

# 5. Start API
npm run dev

# 6. Start frontend (new terminal)
cd ../web
npm install
npm run dev
```

Open: http://localhost:3000
Login: admin@jalpaigurimunicipality.gov.in / Demo@1234

---

## Production Deployment (Docker)

```bash
# 1. Set secrets
export ANTHROPIC_API_KEY="sk-ant-..."
export NEXT_PUBLIC_MAPBOX_TOKEN="pk.eyJ..."

# Edit docker/docker-compose.yml JWT secrets (never use defaults in prod)

# 2. Build and start everything
cd docker
docker-compose up -d --build

# 3. Run migrations + seed
docker exec jalpaiguri_api npx prisma migrate deploy
docker exec jalpaiguri_api npx ts-node ../../packages/seed/index.ts

# 4. Verify
curl http://localhost/api/health
```

Services:
- Frontend:   http://localhost:3000
- API:        http://localhost:4000
- MinIO:      http://localhost:9001
- PostgreSQL: localhost:5432

---

## Environment Variables

### API (apps/api/.env)
| Variable              | Required | Description                           |
|-----------------------|----------|---------------------------------------|
| DATABASE_URL          | Yes      | PostgreSQL connection string          |
| JWT_SECRET            | Yes      | Min 32 chars, random string           |
| JWT_REFRESH_SECRET    | Yes      | Min 32 chars, different from above    |
| ANTHROPIC_API_KEY     | Optional | Claude API key for AI triage          |
| AWS_ACCESS_KEY_ID     | Yes      | MinIO or S3 access key                |
| AWS_SECRET_ACCESS_KEY | Yes      | MinIO or S3 secret                    |
| S3_BUCKET             | Yes      | Bucket name for file uploads          |
| S3_ENDPOINT           | Optional | Set for MinIO (omit for real AWS S3)  |
| PORT                  | No       | API port (default 4000)               |
| FRONTEND_URL          | Yes      | For CORS (e.g. https://your-domain.com) |

### Frontend (apps/web/.env.local)
| Variable                    | Required | Description              |
|-----------------------------|----------|--------------------------|
| NEXT_PUBLIC_API_URL         | Yes      | Backend API base URL     |
| NEXT_PUBLIC_WS_URL          | Yes      | WebSocket server URL     |
| NEXT_PUBLIC_MAPBOX_TOKEN    | Yes      | Mapbox public token      |

---

## Database Migrations

```bash
# New migration
cd apps/api
npx prisma migrate dev --name "your_migration_name"

# Deploy to production
npx prisma migrate deploy

# Reset (DEV ONLY — destroys data)
npx prisma migrate reset
```

---

## Demo Credentials

| Role               | Email                                            | Password  |
|--------------------|--------------------------------------------------|-----------|
| Super Admin        | admin@jalpaigurimunicipality.gov.in              | Demo@1234 |
| Chairman           | chairman@jalpaigurimunicipality.gov.in           | Demo@1234 |
| Municipal Officer  | officer.north@jalpaigurimunicipality.gov.in      | Demo@1234 |
| Dept Head (Water)  | depthead.water@jalpaigurimunicipality.gov.in     | Demo@1234 |
| Field Worker       | worker.01@jalpaiguri.gov.in                      | Demo@1234 |
| Citizen            | citizen.demo1@example.com                        | Demo@1234 |

---

## Architecture Notes

- **PostGIS**: Ward boundaries stored as POLYGON geometries. GPS-to-ward resolution uses ST_Distance.
- **TimescaleDB**: drain_readings is a hypertable partitioned by recorded_at (7-day chunks). If TimescaleDB is not available, the table works as a regular PostgreSQL table.
- **AI Triage**: Falls back to rule-based triage if ANTHROPIC_API_KEY is not set. Set the key for production-quality categorisation.
- **WebSocket**: Sensor data simulated every 30s. In production, replace updateSimulatedSensors() with real IoT ingestion.
- **File Storage**: MinIO in dev. Replace S3_ENDPOINT with real S3 endpoint for production (remove the forcePathStyle option).
