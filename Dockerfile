FROM node:20-alpine AS frontend
RUN apk --no-cache add curl
WORKDIR /usr/src/app
COPY frontend .
RUN yarn install --frozen-lockfile
RUN yarn build

FROM golang:1.22-alpine AS backend
RUN apk --no-cache add git gcc musl-dev
WORKDIR /usr/src/app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=frontend /usr/src/app/build ./frontend/build
# Regenerate GraphQL schema from .gql sources, embed migrations + frontend, build binary
RUN go run cmd/mage/main.go backend:schema backend:genFrontend backend:genMigrations backend:build

FROM alpine:3.19
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /root/
COPY --from=backend /usr/src/app/dist/taskcafe .
EXPOSE 3333
CMD ["./taskcafe", "web"]
