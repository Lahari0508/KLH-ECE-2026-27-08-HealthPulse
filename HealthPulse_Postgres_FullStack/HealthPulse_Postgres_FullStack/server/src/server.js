import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import http from "http";
import { Server as SocketIOServer } from "socket.io";

dotenv.config();
const { Pool } = pg;
const PORT = Number(process.env.PORT || 5000);
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || "development_only_change_me";
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL. Copy server/.env.example to server/.env and configure PostgreSQL.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined
});

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: CLIENT_ORIGIN.split(","), methods: ["GET", "POST", "PUT", "DELETE"] }
});
const sseClients = new Set();

app.use(cors({ origin: CLIENT_ORIGIN.split(",") }));
app.use(express.json({ limit: "1mb" }));

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS patients (
      id SERIAL PRIMARY KEY, patient_code VARCHAR(20) UNIQUE NOT NULL,
      full_name VARCHAR(120) NOT NULL, age INTEGER NOT NULL CHECK(age >= 0),
      gender VARCHAR(20) NOT NULL DEFAULT 'Not specified', bed_number VARCHAR(30) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Stable', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS sensors (
      id SERIAL PRIMARY KEY, sensor_code VARCHAR(30) UNIQUE NOT NULL,
      patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
      sensor_type VARCHAR(60) NOT NULL, unit VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Online', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS telemetry_readings (
      id BIGSERIAL PRIMARY KEY, patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
      sensor_id INTEGER REFERENCES sensors(id) ON DELETE SET NULL,
      heart_rate NUMERIC(6,2), spo2 NUMERIC(5,2), temperature NUMERIC(5,2),
      respiratory_rate NUMERIC(5,2), fall_detected BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_telemetry_created_at ON telemetry_readings(created_at DESC);
    CREATE TABLE IF NOT EXISTS app_users (
      id SERIAL PRIMARY KEY, full_name VARCHAR(120) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL, password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const patients = [
    ["P001","John Doe",45,"Male","ICU-01","Stable"],
    ["P002","Sarah Smith",60,"Female","ICU-02","Monitoring"],
    ["P003","Robert Brown",52,"Male","ICU-03","Stable"],
    ["P004","Emily Davis",38,"Female","ICU-04","Monitoring"]
  ];
  for (const p of patients) {
    await pool.query(
      `INSERT INTO patients(patient_code,full_name,age,gender,bed_number,status)
       VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(patient_code) DO NOTHING`, p
    );
  }

  const sensorSeeds = [
    ["S-HR-001","P001","Heart Rate","bpm"],
    ["S-SPO2-002","P001","SpO₂","%"],
    ["S-TEMP-003","P001","Temperature","°C"],
    ["S-RR-004","P001","Respiratory Rate","breaths/min"]
  ];
  for (const [code, patientCode, type, unit] of sensorSeeds) {
    await pool.query(
      `INSERT INTO sensors(sensor_code,patient_id,sensor_type,unit,status)
       SELECT $1,id,$3,$4,'Online' FROM patients WHERE patient_code=$2
       ON CONFLICT(sensor_code) DO NOTHING`, [code, patientCode, type, unit]
    );
  }
  console.log("PostgreSQL tables and seed records are ready.");
}

const asyncRoute = (fn) => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);

app.get("/api/health", asyncRoute(async (_req,res) => {
  const db = await pool.query("SELECT NOW() AS database_time");
  res.json({ status:"ok", service:"HealthPulse API", database:"connected", databaseTime:db.rows[0].database_time });
}));

app.get("/api/patients", asyncRoute(async (_req,res) => {
  const result = await pool.query("SELECT * FROM patients ORDER BY id");
  res.json(result.rows);
}));

app.get("/api/sensors", asyncRoute(async (_req,res) => {
  const result = await pool.query(`
    SELECT s.*, p.patient_code, p.full_name AS patient_name
    FROM sensors s LEFT JOIN patients p ON p.id=s.patient_id ORDER BY s.id
  `);
  res.json(result.rows);
}));

app.get("/api/sensors/:id", asyncRoute(async (req,res) => {
  const result = await pool.query("SELECT * FROM sensors WHERE id=$1", [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error:"Sensor not found" });
  res.json(result.rows[0]);
}));

app.post("/api/sensors", asyncRoute(async (req,res) => {
  const { sensor_code, patient_id=null, sensor_type, unit, status="Online" } = req.body;
  if (!sensor_code || !sensor_type || !unit) return res.status(400).json({ error:"sensor_code, sensor_type and unit are required" });
  const result = await pool.query(
    `INSERT INTO sensors(sensor_code,patient_id,sensor_type,unit,status)
     VALUES($1,$2,$3,$4,$5) RETURNING *`,
    [sensor_code,patient_id,sensor_type,unit,status]
  );
  res.status(201).json(result.rows[0]);
}));

app.put("/api/sensors/:id", asyncRoute(async (req,res) => {
  const { sensor_code, patient_id, sensor_type, unit, status } = req.body;
  const result = await pool.query(
    `UPDATE sensors SET sensor_code=COALESCE($1,sensor_code),
     patient_id=COALESCE($2,patient_id), sensor_type=COALESCE($3,sensor_type),
     unit=COALESCE($4,unit), status=COALESCE($5,status)
     WHERE id=$6 RETURNING *`,
    [sensor_code ?? null, patient_id ?? null, sensor_type ?? null, unit ?? null, status ?? null, req.params.id]
  );
  if (!result.rowCount) return res.status(404).json({ error:"Sensor not found" });
  res.json(result.rows[0]);
}));

app.delete("/api/sensors/:id", asyncRoute(async (req,res) => {
  const result = await pool.query("DELETE FROM sensors WHERE id=$1 RETURNING id", [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error:"Sensor not found" });
  res.json({ message:"Sensor deleted", id:result.rows[0].id });
}));

app.get("/api/history", asyncRoute(async (req,res) => {
  const requested = Number.parseInt(req.query.limit || "60", 10);
  const limit = Math.min(500, Math.max(1, Number.isFinite(requested) ? requested : 60));
  const result = await pool.query(
    `SELECT id, patient_id, heart_rate, spo2, temperature, respiratory_rate, fall_detected, created_at
     FROM telemetry_readings ORDER BY created_at DESC LIMIT $1`, [limit]
  );
  res.json(result.rows.reverse());
}));

app.get("/api/alerts", asyncRoute(async (_req,res) => {
  const result = await pool.query(`
    SELECT r.*, p.patient_code, p.full_name AS patient_name
    FROM telemetry_readings r LEFT JOIN patients p ON p.id=r.patient_id
    WHERE r.heart_rate > 100 OR r.spo2 < 94 OR r.temperature > 38 OR r.fall_detected=TRUE
    ORDER BY r.created_at DESC LIMIT 50
  `);
  res.json(result.rows);
}));

app.get("/api/stream", asyncRoute(async (req,res) => {
  res.setHeader("Content-Type","text/event-stream");
  res.setHeader("Cache-Control","no-cache");
  res.setHeader("Connection","keep-alive");
  res.flushHeaders?.();
  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  const result = await pool.query("SELECT * FROM telemetry_readings ORDER BY created_at DESC LIMIT 1");
  if (result.rows[0]) send(result.rows[0]);
  const listener = (data) => send(data);
  sseClients.add(listener);
  req.on("close", () => sseClients.delete(listener));
}));

app.post("/api/auth/register", asyncRoute(async (req,res) => {
  const { fullName, email, password } = req.body;
  if (!fullName?.trim() || !email?.trim() || !password || password.length < 6) {
    return res.status(400).json({ error:"Enter your name, a valid email, and a password of at least 6 characters." });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const result = await pool.query(
      "INSERT INTO app_users(full_name,email,password_hash) VALUES($1,$2,$3) RETURNING id,full_name,email",
      [fullName.trim(),email.trim().toLowerCase(),passwordHash]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id:user.id,email:user.email }, JWT_SECRET, { expiresIn:"8h" });
    res.status(201).json({ user, token });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error:"This email is already registered. Please log in." });
    throw err;
  }
}));

app.post("/api/auth/login", asyncRoute(async (req,res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error:"Email and password are required." });
  const result = await pool.query("SELECT * FROM app_users WHERE email=$1", [email.trim().toLowerCase()]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password,user.password_hash))) {
    return res.status(401).json({ error:"Incorrect email or password." });
  }
  const token = jwt.sign({ id:user.id,email:user.email }, JWT_SECRET, { expiresIn:"8h" });
  res.json({ user:{id:user.id,full_name:user.full_name,email:user.email}, token });
}));

app.use((err,_req,res,_next) => {
  console.error(err);
  res.status(500).json({ error:"Server error. Check the backend terminal and PostgreSQL configuration." });
});

io.on("connection", (socket) => {
  console.log("Dashboard connected:", socket.id);
});

let simulatorTimer;
async function writeSimulatedReading() {
  try {
    const patientResult = await pool.query("SELECT id FROM patients WHERE patient_code='P001' LIMIT 1");
    const sensorResult = await pool.query("SELECT id FROM sensors WHERE sensor_code='S-HR-001' LIMIT 1");
    if (!patientResult.rows[0]) return;
    const jitter = (base, spread) => Number((base + (Math.random()-0.5)*spread).toFixed(1));
    const reading = {
      patient_id: patientResult.rows[0].id,
      sensor_id: sensorResult.rows[0]?.id ?? null,
      heart_rate: jitter(76,22),
      spo2: jitter(97,4),
      temperature: jitter(36.8,1.0),
      respiratory_rate: jitter(16,5),
      fall_detected: Math.random() > 0.985,
      created_at: new Date().toISOString()
    };
    const inserted = await pool.query(
      `INSERT INTO telemetry_readings(patient_id,sensor_id,heart_rate,spo2,temperature,respiratory_rate,fall_detected)
       VALUES($1,$2,$3,$4,$5,$6,$7)
       RETURNING id,patient_id,heart_rate,spo2,temperature,respiratory_rate,fall_detected,created_at`,
      [reading.patient_id,reading.sensor_id,reading.heart_rate,reading.spo2,reading.temperature,reading.respiratory_rate,reading.fall_detected]
    );
    io.emit("telemetry", inserted.rows[0]);
    for (const sendSse of sseClients) sendSse(inserted.rows[0]);
  } catch (err) {
    console.error("Telemetry insert failed:", err.message);
  }
}

async function start() {
  try {
    await pool.query("SELECT 1");
    await initDatabase();
    if ((process.env.SIMULATOR_ENABLED || "true").toLowerCase() === "true") {
      await writeSimulatedReading();
      simulatorTimer = setInterval(writeSimulatedReading, 3000);
    }
    server.listen(PORT, () => console.log(`HealthPulse API running at http://localhost:${PORT}`));
  } catch (err) {
    console.error("Could not connect to PostgreSQL.");
    console.error("Check server/.env DATABASE_URL, database name, username, password and PostgreSQL service.");
    console.error(err.message);
    process.exit(1);
  }
}
start();

process.on("SIGINT", async () => {
  if (simulatorTimer) clearInterval(simulatorTimer);
  await pool.end();
  process.exit(0);
});
