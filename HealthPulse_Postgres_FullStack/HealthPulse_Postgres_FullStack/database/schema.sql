CREATE TABLE IF NOT EXISTS patients (
  id SERIAL PRIMARY KEY,
  patient_code VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 0),
  gender VARCHAR(20) NOT NULL DEFAULT 'Not specified',
  bed_number VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Stable',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sensors (
  id SERIAL PRIMARY KEY,
  sensor_code VARCHAR(30) UNIQUE NOT NULL,
  patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
  sensor_type VARCHAR(60) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Online',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS telemetry_readings (
  id BIGSERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
  sensor_id INTEGER REFERENCES sensors(id) ON DELETE SET NULL,
  heart_rate NUMERIC(6,2),
  spo2 NUMERIC(5,2),
  temperature NUMERIC(5,2),
  respiratory_rate NUMERIC(5,2),
  fall_detected BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_telemetry_created_at ON telemetry_readings(created_at DESC);

CREATE TABLE IF NOT EXISTS app_users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO patients (patient_code, full_name, age, gender, bed_number, status)
VALUES
 ('P001','John Doe',45,'Male','ICU-01','Stable'),
 ('P002','Sarah Smith',60,'Female','ICU-02','Monitoring'),
 ('P003','Robert Brown',52,'Male','ICU-03','Stable'),
 ('P004','Emily Davis',38,'Female','ICU-04','Monitoring')
ON CONFLICT (patient_code) DO NOTHING;

INSERT INTO sensors (sensor_code, patient_id, sensor_type, unit, status)
SELECT 'S-HR-001', id, 'Heart Rate', 'bpm', 'Online' FROM patients WHERE patient_code='P001'
ON CONFLICT (sensor_code) DO NOTHING;
INSERT INTO sensors (sensor_code, patient_id, sensor_type, unit, status)
SELECT 'S-SPO2-002', id, 'SpO₂', '%', 'Online' FROM patients WHERE patient_code='P001'
ON CONFLICT (sensor_code) DO NOTHING;
INSERT INTO sensors (sensor_code, patient_id, sensor_type, unit, status)
SELECT 'S-TEMP-003', id, 'Temperature', '°C', 'Online' FROM patients WHERE patient_code='P001'
ON CONFLICT (sensor_code) DO NOTHING;
INSERT INTO sensors (sensor_code, patient_id, sensor_type, unit, status)
SELECT 'S-RR-004', id, 'Respiratory Rate', 'breaths/min', 'Online' FROM patients WHERE patient_code='P001'
ON CONFLICT (sensor_code) DO NOTHING;
