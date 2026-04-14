ALTER TABLE user_account
  ADD COLUMN timezone text NOT NULL DEFAULT 'UTC';
