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

---

## Security Fix Initiative (April 2026)

A multi-agent audit identified critical security and logic bugs. Fixes applied in three waves. Status tracked below.

### Wave 1 — Schema ✅ COMPLETE
| Fix | File | Status |
|-----|------|--------|
| C2: Add `@hasRole` to `updateUserPassword` mutation | `internal/graph/schema/user/user.gql` | ✅ Done |

**Manual gate required:** After Wave 1, run `go run cmd/mage/main.go backend:schema` to regenerate `generated.go`. This was not run automatically (Go not in shell PATH during fix session).

### Wave 2 — Backend ✅ COMPLETE
| Fix | File | Finding | Status |
|-----|------|---------|--------|
| C1: Token expiry check in middleware | `internal/route/middleware.go` | Expired tokens were accepted forever | ✅ Done |
| H2: Cookie `Secure`+`SameSite` flags | `internal/route/auth.go` | CSRF/MITM risk | ✅ Done |
| M4: `ConvertToRoleCode` — add `"owner"` case | `internal/graph/graph.go` | "owner" was falling through to Observer | ✅ Done |
| H5: Redis subscription panic → recover+restart | `internal/graph/resolver.go` | Malformed message crashed server | ✅ Done |
| H1: Auth guard on `users`/`organizations`/`invitedUsers` queries | `internal/graph/schema.resolvers.go` | Unauthenticated user enumeration | ✅ Done |
| C6: `Me` query — use real roles not hardcoded `"admin"` | `internal/graph/schema.resolvers.go` | All users appeared as admin to frontend | ✅ Done |
| C3: `logoutUser` — use context userID not input | `internal/graph/user.resolvers.go` | Any user could log out any user | ✅ Done |
| C2: `updateUserPassword` — use context userID not input | `internal/graph/user.resolvers.go` | Any user could change any password | ✅ Done |
| C4: `findProject` — auth check for logged-in users | `internal/graph/project.resolvers.go` | Authenticated users could read any private project | ✅ Done |
| M7: `Project.Permission` — replace panic with stub | `internal/graph/project.resolvers.go` | Field crashed server with 500 | ✅ Done |
| M8: `inviteProjectMembers` — fix `Ok: false` on success | `internal/graph/project.resolvers.go` | Success path always returned failure | ✅ Done |
| C5: `findTask` — add project membership check | `internal/graph/task.resolvers.go` | Any user could read any task by ID | ✅ Done |
| H4: `SendTask()` — capture and propagate error | `internal/graph/task.resolvers.go` | Redis enqueue failures silently swallowed | ✅ Done |
| H6: `notificationToggleRead` — ownership check | `internal/graph/notification.resolvers.go` | IDOR: user could toggle others' notifications | ✅ Done |
| C8: `updateTeamMemberRole` — privilege hierarchy check | `internal/graph/team.resolvers.go` | Admin could promote to owner | ✅ Done |
| C7: `deleteTeamMember` — last-owner guard | `internal/graph/team.resolvers.go` | Teams could be left ownerless | ✅ Done |
| M3: `deleteTeam` — block if projects exist | `internal/graph/team.resolvers.go` | Silent cascade-delete of all team projects | ✅ Done |
| M2: `createTeam` — creator role `"owner"` not `"admin"` | `internal/graph/team.resolvers.go` | Creators never had owner role | ✅ Done |
| Team.Permission — replace panic with stub | `internal/graph/team.resolvers.go` | Field crashed server with 500 | ✅ Done |

### Wave 3 — Frontend ✅ COMPLETE
| Fix | File | Finding | Status |
|-----|------|---------|--------|
| M1: Admin route guard — uncomment role check | `frontend/src/Admin/index.tsx` | Non-admins could access admin UI | ✅ Done |

### Additional Fixes (Session 2) ✅ COMPLETE
| Fix | File(s) | Finding | Status |
|-----|---------|---------|--------|
| H3: Rate limiting on `/auth/login` | `internal/route/ratelimit.go` (new), `route.go` | Brute force possible; 20 req/min per IP, no external dep | ✅ Done |
| M9: `sortTaskGroup` — wrap in DB transaction | `internal/graph/task.resolvers.go`, `internal/db/repository.go` | Partial sort left board inconsistent on failure | ✅ Done |
| M10: DnD optimistic update rollback | `frontend/src/Projects/Project/Board/index.tsx` | UI diverged from server on mutation failure | ✅ Done |

### Session 3 Fixes ✅ COMPLETE
| Fix | File(s) | Finding | Status |
|-----|---------|---------|--------|
| M6: Job idempotency | `migrations/0073_*`, `internal/db/task.sql.go`, `internal/db/models.go`, `internal/jobs/jobs.go` | Duplicate notifications on worker crash/retry | ✅ Done |
| M5: Timezone-aware due-date reminders | `migrations/0074_*`, `internal/db/user_accounts.sql.go`, `internal/db/models.go`, `internal/graph/task.resolvers.go`, `internal/graph/user.resolvers.go`, `internal/graph/schema/user/user.gql` | Reminders fired at wrong local time | ✅ Done |

### All Findings Resolved ✅
All 22 findings from the April 2026 audit have been fixed across 3 sessions.

### Infrastructure Fixes (Session 3) ✅ COMPLETE
| Fix | File | Issue |
|-----|------|-------|
| Add Redis service + worker service | `docker-compose.yml` | Redis missing; Machinery worker never started; due-date jobs would never fire |
| Fix all missing env vars | `docker-compose.yml` | DB credentials, Redis URIs, security secret all absent |
| Update PostgreSQL 12.3 → 15 | `docker-compose.yml`, `docker-compose.dev.yml` | 12.3 is EOL |
| Update Redis 6.2 → 7 | `docker-compose.yml`, `docker-compose.dev.yml` | Minor version bump |
| Update Go 1.14.5 → 1.22 | `Dockerfile` | Go 1.14.5 is EOL; security patches missing |
| Update Node 18 → 20 | `Dockerfile` | Node 20 is current LTS |
| Add `backend:schema` to Dockerfile build | `Dockerfile` | Schema changes were not regenerated during Docker build |
| Add `ca-certificates` + `tzdata` to runtime image | `Dockerfile` | tzdata required for M5 timezone fix (`time.LoadLocation`) |
| Declare `go 1.22` in module | `go.mod` | Was set to `go 1.13` |
| Fix `docker-compose.migrate.yml` | `docker-compose.migrate.yml` | Referenced undefined network; clarified usage |
| Rename network to `taskcafe-net` | All compose files | Consistent naming |

### Cleanup Fixes (Final Session)
| Fix | File | Issue |
|-----|------|-------|
| H7: `projects(teamID)` — team membership check | `internal/graph/schema.resolvers.go` | Any authenticated user could list all projects in any team |
| `searchMembers` — add auth guard | `internal/graph/user.resolvers.go` | Unauthenticated access to member search |
| `canInviteUser` hardcoded `true` | `frontend/src/Admin/index.tsx` | Invite button always shown regardless of role |
| `querier.go` interface — add 3 missing methods | `internal/db/querier.go` | Compile-time interface check would fail at build |

### One Remaining Manual Step (needs Go in PATH)
New install — all 74 migrations run automatically on first boot via `TASKCAFE_MIGRATE=true`. No manual migration needed.

**Schema regeneration** — `go run cmd/mage/main.go backend:schema`
Required because `user.gql` was changed twice (added `@hasRole` to `updateUserPassword`; added `updateUserTimezone` mutation). The Dockerfile now runs this automatically during `docker build`, so a fresh Docker build handles it. For local development without Docker, run this manually before `backend:build`.
