-- ============================================================
-- JALPAIGURI CITY PLATFORM - COMPLETE DATABASE DDL
-- PostgreSQL 15+ with PostGIS 3.x and TimescaleDB
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "timescaledb" CASCADE;

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'CITIZEN', 'FIELD_WORKER', 'DEPT_HEAD',
  'MUNICIPAL_OFFICER', 'CHAIRMAN', 'SUPER_ADMIN'
);

CREATE TYPE complaint_category AS ENUM (
  'GARBAGE', 'WATER_LEAKAGE', 'WATER_SUPPLY', 'DRAINAGE',
  'ROAD_DAMAGE', 'STREETLIGHT_FAILURE', 'ILLEGAL_DUMPING', 'OTHER'
);

CREATE TYPE complaint_status AS ENUM (
  'SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'
);

CREATE TYPE health_status AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DEAD');
CREATE TYPE canopy_status AS ENUM ('FULL', 'PARTIAL', 'SPARSE', 'NONE');

CREATE TYPE drain_status AS ENUM (
  'NORMAL', 'ELEVATED', 'HIGH', 'OVERFLOW_RISK', 'OVERFLOW', 'OFFLINE'
);

CREATE TYPE water_sensor_status AS ENUM (
  'NORMAL', 'ANOMALY', 'LEAK_SUSPECTED', 'LEAK_CONFIRMED', 'OFFLINE'
);

CREATE TYPE pipe_condition AS ENUM ('GOOD', 'FAIR', 'POOR', 'CRITICAL');

-- ============================================================
-- WARDS (must exist before users for FK)
-- ============================================================

CREATE TABLE wards (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ward_number    INTEGER UNIQUE NOT NULL,
  name           VARCHAR(150) NOT NULL,
  boundary       GEOMETRY(POLYGON, 4326),
  population     INTEGER DEFAULT 0,
  area_hectares  FLOAT,
  officer_id     UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wards_boundary ON wards USING GIST(boundary);

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email          VARCHAR(255) UNIQUE NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  name           VARCHAR(150) NOT NULL,
  phone          VARCHAR(20),
  role           user_role NOT NULL DEFAULT 'CITIZEN',
  ward_id        UUID REFERENCES wards(id) ON DELETE SET NULL,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  avatar_url     VARCHAR(500),
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_ward_id ON users(ward_id);
CREATE INDEX idx_users_email ON users(email);

-- Add officer FK to wards now that users table exists
ALTER TABLE wards ADD CONSTRAINT fk_wards_officer
  FOREIGN KEY (officer_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- COMPLAINTS
-- ============================================================

CREATE TABLE complaints (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_number VARCHAR(30) UNIQUE NOT NULL,
  reporter_id      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  ward_id          UUID NOT NULL REFERENCES wards(id) ON DELETE RESTRICT,
  category         complaint_category NOT NULL,
  status           complaint_status NOT NULL DEFAULT 'SUBMITTED',
  priority_score   INTEGER NOT NULL DEFAULT 50 CHECK (priority_score BETWEEN 0 AND 100),
  description      TEXT NOT NULL,
  location         GEOMETRY(POINT, 4326),
  location_lat     FLOAT,
  location_lng     FLOAT,
  address          VARCHAR(500),
  ai_category      VARCHAR(100),
  ai_confidence    FLOAT CHECK (ai_confidence BETWEEN 0 AND 1),
  ai_notes         TEXT,
  is_duplicate     BOOLEAN NOT NULL DEFAULT FALSE,
  duplicate_of     UUID REFERENCES complaints(id) ON DELETE SET NULL,
  submitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at  TIMESTAMPTZ,
  resolved_at      TIMESTAMPTZ,
  closed_at        TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_category ON complaints(category);
CREATE INDEX idx_complaints_ward_id ON complaints(ward_id);
CREATE INDEX idx_complaints_reporter_id ON complaints(reporter_id);
CREATE INDEX idx_complaints_submitted_at ON complaints(submitted_at DESC);
CREATE INDEX idx_complaints_priority ON complaints(priority_score DESC);
CREATE INDEX idx_complaints_location ON complaints USING GIST(location);
CREATE INDEX idx_complaints_desc_trgm ON complaints USING GIN(description gin_trgm_ops);

-- ============================================================
-- COMPLAINT ATTACHMENTS
-- ============================================================

CREATE TABLE complaint_attachments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  s3_key       VARCHAR(500) NOT NULL,
  s3_url       VARCHAR(1000) NOT NULL,
  mime_type    VARCHAR(100) NOT NULL,
  size_bytes   INTEGER,
  captured_at  TIMESTAMPTZ,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attachments_complaint_id ON complaint_attachments(complaint_id);

-- ============================================================
-- ASSIGNMENTS
-- ============================================================

CREATE TABLE assignments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id        UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  worker_id           UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_by         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_at              TIMESTAMPTZ,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  completion_notes    TEXT,
  completion_photo_url VARCHAR(1000),
  is_active           BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_assignments_complaint_id ON assignments(complaint_id);
CREATE INDEX idx_assignments_worker_id ON assignments(worker_id);
CREATE INDEX idx_assignments_is_active ON assignments(is_active) WHERE is_active = TRUE;

-- ============================================================
-- SLA CONFIG
-- ============================================================

CREATE TABLE sla_config (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category         complaint_category UNIQUE NOT NULL,
  target_hours     INTEGER NOT NULL,
  escalation_hours INTEGER NOT NULL,
  critical_hours   INTEGER NOT NULL,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default SLA values
INSERT INTO sla_config (category, target_hours, escalation_hours, critical_hours) VALUES
  ('GARBAGE',             24,  36,  72),
  ('WATER_LEAKAGE',        8,  16,  24),
  ('WATER_SUPPLY',        12,  24,  48),
  ('DRAINAGE',            24,  48,  72),
  ('ROAD_DAMAGE',         72, 120, 168),
  ('STREETLIGHT_FAILURE', 48,  72, 120),
  ('ILLEGAL_DUMPING',     48,  72, 168),
  ('OTHER',               72, 120, 240);

-- ============================================================
-- TREES
-- ============================================================

CREATE TABLE trees (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tree_code           VARCHAR(20) UNIQUE NOT NULL,
  ward_id             UUID NOT NULL REFERENCES wards(id) ON DELETE RESTRICT,
  species_common      VARCHAR(150) NOT NULL,
  species_scientific  VARCHAR(200),
  location            GEOMETRY(POINT, 4326) NOT NULL,
  location_lat        FLOAT NOT NULL,
  location_lng        FLOAT NOT NULL,
  height_m            FLOAT,
  crown_dia_m         FLOAT,
  trunk_dia_cm        FLOAT,
  health_status       health_status NOT NULL DEFAULT 'GOOD',
  canopy_status       canopy_status NOT NULL DEFAULT 'FULL',
  carbon_kg           FLOAT,
  planted_at          DATE,
  last_surveyed       DATE,
  surveyed_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trees_ward_id ON trees(ward_id);
CREATE INDEX idx_trees_health_status ON trees(health_status);
CREATE INDEX idx_trees_species ON trees(species_common);
CREATE INDEX idx_trees_location ON trees USING GIST(location);

-- ============================================================
-- DRAIN SENSORS
-- ============================================================

CREATE TABLE drain_sensors (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sensor_code         VARCHAR(20) UNIQUE NOT NULL,
  ward_id             UUID NOT NULL REFERENCES wards(id) ON DELETE RESTRICT,
  location            GEOMETRY(POINT, 4326) NOT NULL,
  location_lat        FLOAT NOT NULL,
  location_lng        FLOAT NOT NULL,
  drain_name          VARCHAR(200) NOT NULL,
  capacity_cm         FLOAT NOT NULL,
  current_level_cm    FLOAT NOT NULL DEFAULT 0,
  alert_threshold     FLOAT NOT NULL,
  critical_threshold  FLOAT NOT NULL,
  status              drain_status NOT NULL DEFAULT 'NORMAL',
  last_reading        TIMESTAMPTZ,
  installed_at        DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drain_sensors_ward_id ON drain_sensors(ward_id);
CREATE INDEX idx_drain_sensors_status ON drain_sensors(status);
CREATE INDEX idx_drain_sensors_location ON drain_sensors USING GIST(location);

-- ============================================================
-- DRAIN READINGS (TimescaleDB hypertable)
-- ============================================================

CREATE TABLE drain_readings (
  id           UUID NOT NULL DEFAULT uuid_generate_v4(),
  sensor_id    UUID NOT NULL REFERENCES drain_sensors(id) ON DELETE CASCADE,
  level_cm     FLOAT NOT NULL,
  rainfall_mm  FLOAT,
  status       drain_status NOT NULL,
  recorded_at  TIMESTAMPTZ NOT NULL
);

SELECT create_hypertable('drain_readings', 'recorded_at',
  chunk_time_interval => INTERVAL '7 days',
  if_not_exists => TRUE
);

CREATE INDEX idx_drain_readings_sensor_time ON drain_readings(sensor_id, recorded_at DESC);
CREATE INDEX idx_drain_readings_status ON drain_readings(status, recorded_at DESC);

-- ============================================================
-- WATER PIPES
-- ============================================================

CREATE TABLE water_pipes (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipe_code             VARCHAR(20) UNIQUE NOT NULL,
  ward_id               UUID NOT NULL REFERENCES wards(id) ON DELETE RESTRICT,
  route                 GEOMETRY(LINESTRING, 4326),
  start_lat             FLOAT NOT NULL,
  start_lng             FLOAT NOT NULL,
  end_lat               FLOAT NOT NULL,
  end_lng               FLOAT NOT NULL,
  diameter_mm           FLOAT NOT NULL,
  material              VARCHAR(100) NOT NULL,
  installation_year     INTEGER,
  pressure_bar_nominal  FLOAT NOT NULL DEFAULT 3.5,
  condition             pipe_condition NOT NULL DEFAULT 'GOOD',
  length_m              FLOAT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_water_pipes_ward_id ON water_pipes(ward_id);
CREATE INDEX idx_water_pipes_condition ON water_pipes(condition);
CREATE INDEX idx_water_pipes_route ON water_pipes USING GIST(route);

-- ============================================================
-- WATER SENSORS
-- ============================================================

CREATE TABLE water_sensors (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sensor_code         VARCHAR(20) UNIQUE NOT NULL,
  pipe_id             UUID NOT NULL REFERENCES water_pipes(id) ON DELETE CASCADE,
  location            GEOMETRY(POINT, 4326) NOT NULL,
  location_lat        FLOAT NOT NULL,
  location_lng        FLOAT NOT NULL,
  pressure_bar        FLOAT NOT NULL DEFAULT 0,
  flow_lpm            FLOAT NOT NULL DEFAULT 0,
  leak_probability    FLOAT NOT NULL DEFAULT 0 CHECK (leak_probability BETWEEN 0 AND 1),
  estimated_loss_lph  FLOAT,
  status              water_sensor_status NOT NULL DEFAULT 'NORMAL',
  last_reading        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_water_sensors_pipe_id ON water_sensors(pipe_id);
CREATE INDEX idx_water_sensors_status ON water_sensors(status);
CREATE INDEX idx_water_sensors_leak_prob ON water_sensors(leak_probability DESC);
CREATE INDEX idx_water_sensors_location ON water_sensors USING GIST(location);

-- ============================================================
-- AUDIT LOG
-- ============================================================

CREATE TABLE audit_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action       VARCHAR(100) NOT NULL,
  entity_type  VARCHAR(100) NOT NULL,
  entity_id    UUID,
  old_values   JSONB,
  new_values   JSONB,
  ip_address   VARCHAR(45),
  user_agent   VARCHAR(500),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- ============================================================
-- VIEWS
-- ============================================================

-- Complaint summary with SLA breach flag
CREATE OR REPLACE VIEW v_complaint_sla AS
SELECT
  c.id,
  c.complaint_number,
  c.category,
  c.status,
  c.priority_score,
  c.ward_id,
  w.name AS ward_name,
  c.submitted_at,
  c.resolved_at,
  s.target_hours,
  s.escalation_hours,
  EXTRACT(EPOCH FROM (COALESCE(c.resolved_at, NOW()) - c.submitted_at))/3600 AS hours_elapsed,
  CASE
    WHEN c.resolved_at IS NOT NULL THEN 'RESOLVED'
    WHEN EXTRACT(EPOCH FROM (NOW() - c.submitted_at))/3600 > s.critical_hours THEN 'CRITICAL_BREACH'
    WHEN EXTRACT(EPOCH FROM (NOW() - c.submitted_at))/3600 > s.escalation_hours THEN 'ESCALATION_BREACH'
    WHEN EXTRACT(EPOCH FROM (NOW() - c.submitted_at))/3600 > s.target_hours THEN 'SLA_BREACH'
    ELSE 'ON_TRACK'
  END AS sla_status
FROM complaints c
JOIN wards w ON c.ward_id = w.id
JOIN sla_config s ON c.category = s.category;

-- Ward dashboard summary
CREATE OR REPLACE VIEW v_ward_stats AS
SELECT
  w.id AS ward_id,
  w.ward_number,
  w.name AS ward_name,
  COUNT(c.id) AS total_complaints,
  COUNT(c.id) FILTER (WHERE c.status NOT IN ('RESOLVED','CLOSED')) AS open_complaints,
  COUNT(c.id) FILTER (WHERE c.status IN ('RESOLVED','CLOSED')) AS resolved_complaints,
  ROUND(
    100.0 * COUNT(c.id) FILTER (WHERE c.status IN ('RESOLVED','CLOSED')) /
    NULLIF(COUNT(c.id), 0), 1
  ) AS resolution_rate,
  AVG(
    EXTRACT(EPOCH FROM (c.resolved_at - c.submitted_at))/3600
  ) FILTER (WHERE c.resolved_at IS NOT NULL) AS avg_resolution_hours,
  COUNT(t.id) AS total_trees,
  COUNT(t.id) FILTER (WHERE t.health_status IN ('EXCELLENT','GOOD')) AS healthy_trees
FROM wards w
LEFT JOIN complaints c ON c.ward_id = w.id
  AND c.submitted_at >= NOW() - INTERVAL '90 days'
LEFT JOIN trees t ON t.ward_id = w.id
GROUP BY w.id, w.ward_number, w.name
ORDER BY w.ward_number;

-- Active drain alerts
CREATE OR REPLACE VIEW v_drain_alerts AS
SELECT
  ds.id,
  ds.sensor_code,
  ds.drain_name,
  ds.ward_id,
  w.name AS ward_name,
  ds.current_level_cm,
  ds.capacity_cm,
  ROUND((ds.current_level_cm / ds.capacity_cm * 100)::numeric, 1) AS fill_pct,
  ds.status,
  ds.last_reading
FROM drain_sensors ds
JOIN wards w ON ds.ward_id = w.id
WHERE ds.status NOT IN ('NORMAL', 'OFFLINE')
ORDER BY ds.current_level_cm / ds.capacity_cm DESC;

-- Water leak summary
CREATE OR REPLACE VIEW v_water_leaks AS
SELECT
  ws.id,
  ws.sensor_code,
  wp.pipe_code,
  ws.ward_id_from_pipe,
  ws.location_lat,
  ws.location_lng,
  ws.pressure_bar,
  ws.flow_lpm,
  ws.leak_probability,
  ws.estimated_loss_lph,
  ws.status,
  ws.last_reading
FROM water_sensors ws
JOIN water_pipes wp ON ws.pipe_id = wp.id
WHERE ws.leak_probability > 0.5
ORDER BY ws.leak_probability DESC;

-- (view helper sub-select for ward from pipe)
DROP VIEW IF EXISTS v_water_leaks;
CREATE OR REPLACE VIEW v_water_leaks AS
SELECT
  ws.id,
  ws.sensor_code,
  wp.pipe_code,
  wp.ward_id,
  ws.location_lat,
  ws.location_lng,
  ws.pressure_bar,
  ws.flow_lpm,
  ws.leak_probability,
  ws.estimated_loss_lph,
  ws.status,
  ws.last_reading,
  w.name AS ward_name
FROM water_sensors ws
JOIN water_pipes wp ON ws.pipe_id = wp.id
JOIN wards w ON wp.ward_id = w.id
WHERE ws.leak_probability > 0.5
ORDER BY ws.leak_probability DESC;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_complaints_updated_at
  BEFORE UPDATE ON complaints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_trees_updated_at
  BEFORE UPDATE ON trees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-generate complaint number: CJPL-YYYYMMDD-NNNN
CREATE OR REPLACE FUNCTION generate_complaint_number()
RETURNS TRIGGER AS $$
DECLARE
  today_str TEXT;
  seq_num   INTEGER;
BEGIN
  today_str := TO_CHAR(NOW(), 'YYYYMMDD');
  SELECT COUNT(*) + 1 INTO seq_num
  FROM complaints
  WHERE DATE(submitted_at) = CURRENT_DATE;
  NEW.complaint_number := 'CJPL-' || today_str || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_complaint_number
  BEFORE INSERT ON complaints
  FOR EACH ROW
  WHEN (NEW.complaint_number IS NULL OR NEW.complaint_number = '')
  EXECUTE FUNCTION generate_complaint_number();

-- Auto-compute carbon from tree dimensions
CREATE OR REPLACE FUNCTION compute_tree_carbon()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trunk_dia_cm IS NOT NULL AND NEW.height_m IS NOT NULL THEN
    -- Simplified allometric equation (kg): 0.0673 * (ρ * D² * H)^0.976
    -- Using average wood density ρ=0.5 g/cm³, D in cm, H in m
    NEW.carbon_kg := ROUND((0.0673 * (0.5 * POWER(NEW.trunk_dia_cm, 2) * NEW.height_m) ^ 0.976)::numeric, 2);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tree_carbon
  BEFORE INSERT OR UPDATE ON trees
  FOR EACH ROW EXECUTE FUNCTION compute_tree_carbon();

-- Sync geometry from lat/lng on complaints
CREATE OR REPLACE FUNCTION sync_complaint_geometry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.location_lat IS NOT NULL AND NEW.location_lng IS NOT NULL THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.location_lng, NEW.location_lat), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_complaint_geometry
  BEFORE INSERT OR UPDATE ON complaints
  FOR EACH ROW EXECUTE FUNCTION sync_complaint_geometry();

-- Sync geometry from lat/lng on trees
CREATE OR REPLACE FUNCTION sync_tree_geometry()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location := ST_SetSRID(ST_MakePoint(NEW.location_lng, NEW.location_lat), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tree_geometry
  BEFORE INSERT OR UPDATE ON trees
  FOR EACH ROW EXECUTE FUNCTION sync_tree_geometry();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Citizens can only see their own complaints (enforced at app layer too)
-- Officers/admins bypass RLS via app-level role checks
-- RLS policies left permissive here; app middleware enforces RBAC

CREATE POLICY complaints_all ON complaints USING (TRUE);
CREATE POLICY users_all ON users USING (TRUE);
