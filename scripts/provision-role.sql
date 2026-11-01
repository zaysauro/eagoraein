-- Execute once as migration owner. Runtime user must be allowed to SET ROLE.
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='agendai_tenant') THEN
  CREATE ROLE agendai_tenant NOLOGIN NOSUPERUSER NOBYPASSRLS;
 END IF;
END $$;
GRANT USAGE ON SCHEMA public TO agendai_tenant;
GRANT SELECT, INSERT, UPDATE, DELETE ON users, service_types, schedules, date_overrides, bookings, customers TO agendai_tenant;
GRANT SELECT ON organizations, audit_events TO agendai_tenant;
GRANT UPDATE(name,description,brand_color,contact_phone,logo_url) ON organizations TO agendai_tenant;
GRANT INSERT ON audit_events TO agendai_tenant;
DO $$ BEGIN EXECUTE format('GRANT agendai_tenant TO %I', current_user); END $$;
