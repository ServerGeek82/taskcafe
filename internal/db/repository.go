package db

import (
	"context"
	"database/sql"

	"github.com/jmoiron/sqlx"
)

// Repository contains methods for interacting with a database storage
type Repository struct {
	*Queries
	db *sqlx.DB
}

// NewRepository returns an implementation of the Repository interface.
func NewRepository(db *sqlx.DB) *Repository {
	return &Repository{
		Queries: New(db.DB),
		db:      db,
	}
}

// BeginTxx starts a new database transaction and returns the underlying *sql.Tx.
func (r *Repository) BeginTxx(ctx context.Context) (*sql.Tx, error) {
	return r.db.BeginTx(ctx, nil)
}
