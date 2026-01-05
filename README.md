# report.nexen

A mobile-first civic reporting system with a Go report management API, Keycloak authentication, Kafka events, and MinIO-backed image uploads.

## Live Overview

- Citizens submit reports with categories, visibility, and optional images.
- Department staff can view all non-private reports and update status.
- Keycloak provides role-based access control (CITIZEN, DEPARTMENT_STAFF).
- Images upload through presigned URLs to MinIO/S3-compatible storage.
- Kafka events are emitted on report creation and status changes.

## Architecture

- `mobile-client/`: Expo Router mobile app using Keycloak OIDC and the report API.
- `services/report-management-service/`: Go (Gin + Gorm) API with Postgres persistence.
- `infra/`: Local infrastructure for Postgres, Kafka, Keycloak, MinIO via Docker Compose.

## Services

API endpoints (authenticated):

- `GET /health`
- `GET /api/profile`
- `GET /api/reports`
- `GET /api/reports/:id`
- `POST /api/reports` (CITIZEN)
- `POST /api/reports/upload-url` (CITIZEN)
- `PUT /api/reports/:id/status` (DEPARTMENT_STAFF)

Infrastructure services and default ports:

- Postgres: `localhost:9920`
- Kafka: `localhost:9092` (UI at `localhost:9000`)
- Keycloak: `localhost:8080`
- MinIO: API `localhost:9001`, console `localhost:9002`
- Report API: `localhost:8081`

## Setup

Prerequisites:

- Docker + Docker Compose
- Go 1.25+
- Bun or Node.js (for Expo)

Start local infrastructure:

```bash
cd infra
docker compose up -d
```

Initialize Keycloak realm, client, and test users:

```bash
bash keycloak-setup.sh
```

## Development

Run the report management service:

```bash
cd services/report-management-service
export KAFKA_BROKER_URL=localhost:9092
export KEYCLOAK_URL=http://localhost:8080
export KEYCLOAK_REALM=reportmaxxing
export S3_ENDPOINT=http://localhost:9001
export S3_PUBLIC_BASE_URL=http://localhost:9001
export S3_ACCESS_KEY=minioadmin
export S3_SECRET_KEY=minioadmin
export S3_BUCKET=report-images

go run .
```

Run the mobile client:

```bash
cd mobile-client
bun install
export EXPO_PUBLIC_API_BASE_URL=http://localhost:8081
export EXPO_PUBLIC_KEYCLOAK_URL=http://localhost:8080

bun run start
```
