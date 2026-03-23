# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Taskcafe is an open-source Kanban-based project management tool. It has a Go backend serving a GraphQL API and a React/TypeScript frontend. The final binary embeds the frontend and database migrations into a single self-contained executable.

## Build System (Mage)

The build tool is [Mage](https://magefile.org/), configured in `magefile.go`. Run via `go run cmd/mage/main.go <target>`.

```bash
# Full build (frontend → embed migrations → embed frontend → compile Go binary)
go run cmd/mage/main.go build        # Output: dist/taskcafe

# Frontend only
go run cmd/mage/main.go frontend:install   # yarn install
go run cmd/mage/main.go frontend:build     # vite build
go run cmd/mage/main.go frontend:lint      # eslint + tsc

# Backend only
go run cmd/mage/main.go backend:schema     # Merge .gql schemas + run gqlgen
go run cmd/mage/main.go backend:build      # Compile Go binary
go run cmd/mage/main.go backend:test       # go test ./...

# Docker
go run cmd/mage/main.go docker:up          # docker-compose up -d
go run cmd/mage/main.go dev:up             # dev docker-compose (postgres, redis, mailhog)
```

Alias: `backend:schema` can be invoked as `s`, `docker:up` as `up`.

## Running Locally

```bash
# Start dev services (PostgreSQL, Redis, Mailhog)
go run cmd/mage/main.go dev:up

# Frontend dev server (proxies API to localhost:3333)
cd frontend && yarn start

# Backend
./dist/taskcafe web
```

Configuration: `conf/taskcafe.example.toml`. Backend environment variables use `TASKCAFE_` prefix (e.g. `TASKCAFE_DATABASE_HOST`). Set `TASKCAFE_MIGRATE=true` for auto-migration on startup. Frontend environment variables use `VITE_` prefix (e.g. `VITE_ENABLE_POLLING`).

## Code Generation

Three code generators are used — always regenerate after modifying their inputs:

1. **GraphQL (gqlgen)**: Schema files live in `internal/graph/schema/<entity>/` subdirectories. `backend:schema` merges them into `.gql` files and runs `gqlgen`, producing `internal/graph/generated.go` and `models_gen.go`. Config: `gqlgen.yml`. Resolvers follow the pattern `internal/graph/{name}.resolvers.go`.

2. **SQL (sqlc)**: SQL queries in `internal/db/query/*.sql` generate Go code in `internal/db/*.sql.go`. Config: `sqlc.yaml`. Run with `sqlc generate`.

3. **Frontend GraphQL codegen**: Queries in `frontend/src/shared/graphql/` generate typed hooks in `frontend/src/shared/generated/graphql.tsx`. Config: `frontend/codegen.yml`. Run with `cd frontend && yarn generate`.

## Architecture

### Backend (`internal/`)
- **Entry point**: `cmd/taskcafe/main.go` → Cobra CLI commands in `internal/commands/`
- **HTTP routing**: Chi router in `internal/route/route.go` — serves GraphQL at `/graphql`, auth endpoints at `/auth`, file uploads at `/uploads/`
- **GraphQL**: gqlgen resolvers in `internal/graph/`. Schema split by entity in `internal/graph/schema/`. Auth via `@hasRole` directive (roles: OWNER, ADMIN, MEMBER, OBSERVER; levels: ORG, TEAM, PROJECT)
- **Database**: PostgreSQL accessed via sqlx. Repository pattern — `internal/db/repository.go` defines the interface, query implementations in `internal/db/*.sql.go`
- **Background jobs**: Machinery (Redis-backed) for due date notifications. Worker started via `taskcafe worker` command
- **Embedded assets**: `vfsgen` embeds frontend build and migrations into the Go binary

### Frontend (`frontend/src/`)
- React 18 + TypeScript 5 with Vite
- Apollo Client 3 for GraphQL state management (with global error link for toast notifications)
- Styled Components for styling
- React Beautiful DnD for drag-and-drop on Kanban boards
- Pages: `App/`, `Auth/`, `Dashboard/`, `Projects/`, `Teams/`, `MyTasks/`, `Admin/`, `Profile/`
- Shared code: `shared/components/`, `shared/hooks/`, `shared/graphql/`, `shared/generated/`

### Database
- PostgreSQL 12.3, migrations in `migrations/` (72 SQL files, golang-migrate v4)
- Key tables: `user_account`, `project`, `task_group`, `task`, `task_assigned`, `team`, `organization`, `notification`

## Linting

**Frontend**: ESLint (Airbnb + TypeScript + Prettier) — `cd frontend && yarn lint`. TypeScript check: `cd frontend && yarn tsc`.

**Backend**: `go fmt`, `go vet`, `go lint` via pre-commit hooks.

## Commit Conventions

Conventional commits enforced via commitizen pre-commit hook. Format: `<type>: <description>` where type is `feat`, `fix`, `chore`, `docs`, etc.
