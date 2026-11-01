-- The NexCal 2.1 schema includes fields absent from its committed migrations.
ALTER TABLE organizations ADD COLUMN multiwa_url text, ADD COLUMN multiwa_api_key text, ADD COLUMN multiwa_session_id text,
 ADD COLUMN gcal_client_id text, ADD COLUMN gcal_client_secret text,
 ADD COLUMN midtrans_server_key text, ADD COLUMN midtrans_client_key text, ADD COLUMN midtrans_is_prod boolean NOT NULL DEFAULT false;
ALTER TABLE service_types ADD COLUMN is_virtual boolean NOT NULL DEFAULT false;
ALTER TABLE bookings ADD COLUMN management_token text NOT NULL DEFAULT gen_random_uuid()::text, ADD COLUMN meeting_url text, ADD COLUMN reschedule_count integer NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX bookings_management_token_key ON bookings(management_token);
-- Partial exclusion constraint replaces the upstream unconditional start uniqueness.
DROP INDEX bookings_user_id_start_time_key;
