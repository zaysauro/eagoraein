-- Agendaí: tenant lifecycle and CRM. Existing NexCal tables preserved.
ALTER TABLE organizations ADD COLUMN description text NOT NULL DEFAULT '', ADD COLUMN brand_color text NOT NULL DEFAULT '#0d9488', ADD COLUMN contact_phone text,
 ADD COLUMN plan text NOT NULL DEFAULT 'INDIVIDUAL' CHECK(plan IN ('INDIVIDUAL','PROFISSIONAL','EQUIPE')),
 ADD COLUMN subscription_status text NOT NULL DEFAULT 'TRIAL' CHECK(subscription_status IN ('TRIAL','ACTIVE','PAST_DUE','CANCELLED')),
 ADD COLUMN trial_ends_at timestamp(3) NOT NULL DEFAULT (now() + interval '14 days'), ADD COLUMN suspended boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN session_version integer NOT NULL DEFAULT 0, ADD COLUMN disabled boolean NOT NULL DEFAULT false;
CREATE TABLE customers(id text PRIMARY KEY, organization_id text NOT NULL REFERENCES organizations(id), name text NOT NULL, phone text NOT NULL, email text, notes text NOT NULL DEFAULT '', preferences text NOT NULL DEFAULT '', consent boolean NOT NULL DEFAULT false, opted_out boolean NOT NULL DEFAULT false, created_at timestamp(3) NOT NULL DEFAULT now(), updated_at timestamp(3) NOT NULL, UNIQUE(organization_id,phone));
CREATE TABLE access_tokens(id text PRIMARY KEY, token_hash text NOT NULL UNIQUE, kind text NOT NULL CHECK(kind IN ('RESET','INVITE')), email text NOT NULL, organization_id text REFERENCES organizations(id), expires_at timestamp(3) NOT NULL, used_at timestamp(3));
CREATE TABLE audit_events(id text PRIMARY KEY, organization_id text NOT NULL REFERENCES organizations(id), actor_id text, action text NOT NULL, entity_id text, created_at timestamp(3) NOT NULL DEFAULT now());
CREATE INDEX audit_events_tenant_date ON audit_events(organization_id,created_at);
ALTER TABLE service_types ADD CONSTRAINT valid_service CHECK(duration BETWEEN 5 AND 480 AND buffer_time BETWEEN 0 AND 60 AND price >= 0 AND dp_percentage BETWEEN 0 AND 100);
ALTER TABLE schedules ADD CONSTRAINT valid_schedule CHECK(day_of_week BETWEEN 0 AND 6 AND start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND start_time < end_time);
ALTER TABLE service_types ADD CONSTRAINT service_provider_unique UNIQUE(id,user_id);
ALTER TABLE bookings ADD CONSTRAINT booking_service_provider FOREIGN KEY(service_type_id,user_id) REFERENCES service_types(id,user_id);
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE bookings ADD COLUMN blocked_until timestamp(3);
UPDATE bookings b SET blocked_until=b.end_time + s.buffer_time * interval '1 minute' FROM service_types s WHERE s.id=b.service_type_id;
ALTER TABLE bookings ALTER COLUMN blocked_until SET NOT NULL;
ALTER TABLE bookings ADD CONSTRAINT valid_booking_range CHECK(start_time < end_time AND blocked_until >= end_time);
ALTER TABLE bookings ADD CONSTRAINT no_overlapping_bookings EXCLUDE USING gist(user_id WITH =, tsrange(start_time,blocked_until,'[)') WITH &&) WHERE(status IN ('PENDING','CONFIRMED'));
CREATE FUNCTION booking_buffer() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='INSERT' OR NEW.start_time IS DISTINCT FROM OLD.start_time OR NEW.end_time IS DISTINCT FROM OLD.end_time OR NEW.service_type_id IS DISTINCT FROM OLD.service_type_id THEN
  SELECT NEW.end_time + buffer_time * interval '1 minute' INTO NEW.blocked_until FROM service_types WHERE id=NEW.service_type_id;
 ELSE NEW.blocked_until := OLD.blocked_until; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER booking_buffer_before BEFORE INSERT OR UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION booking_buffer();
CREATE FUNCTION enforce_plan() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE org organizations; tenant text; n integer; cap integer;
BEGIN
 IF TG_TABLE_NAME='users' THEN tenant:=NEW.organization_id; ELSE SELECT organization_id INTO tenant FROM users WHERE id=NEW.user_id; END IF;
 SELECT * INTO org FROM organizations WHERE id=tenant FOR UPDATE;
 IF NOT FOUND OR org.suspended OR NOT (org.subscription_status='ACTIVE' OR (org.subscription_status='TRIAL' AND org.trial_ends_at>now())) THEN RAISE EXCEPTION 'Empresa indisponível ou assinatura expirada'; END IF;
 IF TG_TABLE_NAME='users' THEN
 SELECT count(*) INTO n FROM users WHERE organization_id=tenant AND NOT disabled;
 cap:= CASE org.plan WHEN 'INDIVIDUAL' THEN 1 WHEN 'PROFISSIONAL' THEN 3 ELSE 10 END;
 ELSIF TG_TABLE_NAME='service_types' THEN
 SELECT count(*) INTO n FROM service_types s JOIN users u ON u.id=s.user_id WHERE u.organization_id=tenant;
 cap:=CASE org.plan WHEN 'INDIVIDUAL' THEN 10 WHEN 'PROFISSIONAL' THEN 30 ELSE 100 END;
 ELSE
 SELECT count(*) INTO n FROM bookings b JOIN users u ON u.id=b.user_id WHERE u.organization_id=tenant AND b.created_at>=date_trunc('month',now());
 cap:=CASE org.plan WHEN 'INDIVIDUAL' THEN 200 WHEN 'PROFISSIONAL' THEN 1000 ELSE 5000 END;
 END IF;
 IF n>=cap THEN RAISE EXCEPTION 'Limite do plano atingido'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER enforce_users_plan BEFORE INSERT ON users FOR EACH ROW EXECUTE FUNCTION enforce_plan();
CREATE TRIGGER enforce_services_plan BEFORE INSERT ON service_types FOR EACH ROW EXECUTE FUNCTION enforce_plan();
CREATE TRIGGER enforce_bookings_plan BEFORE INSERT ON bookings FOR EACH ROW EXECUTE FUNCTION enforce_plan();
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON organizations USING (id=current_setting('app.organization_id',true)) WITH CHECK (id=current_setting('app.organization_id',true));
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON users USING (organization_id=current_setting('app.organization_id',true) AND (current_setting('app.role',true)='OWNER' OR id=current_setting('app.user_id',true))) WITH CHECK (organization_id=current_setting('app.organization_id',true) AND (current_setting('app.role',true)='OWNER' OR id=current_setting('app.user_id',true)));
ALTER TABLE service_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON service_types USING (user_id IN (SELECT id FROM users WHERE organization_id=current_setting('app.organization_id',true))) WITH CHECK (user_id IN (SELECT id FROM users WHERE organization_id=current_setting('app.organization_id',true)));
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON schedules USING (user_id IN (SELECT id FROM users WHERE organization_id=current_setting('app.organization_id',true))) WITH CHECK (user_id IN (SELECT id FROM users WHERE organization_id=current_setting('app.organization_id',true)));
ALTER TABLE date_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON date_overrides USING (user_id IN (SELECT id FROM users WHERE organization_id=current_setting('app.organization_id',true))) WITH CHECK (user_id IN (SELECT id FROM users WHERE organization_id=current_setting('app.organization_id',true)));
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON bookings USING (user_id IN (SELECT id FROM users WHERE organization_id=current_setting('app.organization_id',true))) WITH CHECK (user_id IN (SELECT id FROM users WHERE organization_id=current_setting('app.organization_id',true)));
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON customers USING (organization_id=current_setting('app.organization_id',true) AND current_setting('app.role',true)='OWNER') WITH CHECK (organization_id=current_setting('app.organization_id',true) AND current_setting('app.role',true)='OWNER');
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON audit_events USING (organization_id=current_setting('app.organization_id',true) AND current_setting('app.role',true)='OWNER') WITH CHECK (organization_id=current_setting('app.organization_id',true) AND current_setting('app.role',true)='OWNER');
