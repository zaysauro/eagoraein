CREATE TABLE rate_limits(key text PRIMARY KEY, attempts integer NOT NULL, reset_at timestamptz NOT NULL);
CREATE INDEX rate_limits_expiry ON rate_limits(reset_at);
