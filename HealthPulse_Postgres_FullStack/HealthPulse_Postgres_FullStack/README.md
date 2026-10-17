# HealthPulse — React + Node.js + Express + PostgreSQL

A full-stack academic prototype for a real-time patient telemetry dashboard.

## Features
- React + Vite responsive dashboard
- Node.js + Express REST API
- PostgreSQL database for patients, sensors, telemetry readings and users
- Socket.IO live updates
- Recharts for heart-rate and SpO₂ trends
- Simulated telemetry written to PostgreSQL every 3 seconds
- Login/register endpoints (demo authentication)
- Health, patients, sensors, history and alerts endpoints

> This is an academic software prototype. The simulated values and alerts are not medical advice and this is not a certified clinical monitoring device.

## Requirements
- Node.js 20 LTS or newer
- PostgreSQL 14+ (local installation or a PostgreSQL service)
- VS Code

## 1. Create the database
Open pgAdmin Query Tool or the PostgreSQL SQL Shell (`psql`) and run:

```sql
CREATE DATABASE healthpulse;
```

Then open the `healthpulse` database and run the script in `database/schema.sql`.
You can run the schema using pgAdmin Query Tool, or from a terminal if `psql` is on PATH:

```cmd
psql -U postgres -d healthpulse -f database/schema.sql
```

The server also creates the tables and sample patient/sensor records at startup, so applying `schema.sql` is optional but recommended.

## 2. Configure backend
Copy `server/.env.example` to `server/.env`, then edit the PostgreSQL username/password.

Example for a local PostgreSQL installation:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/healthpulse
JWT_SECRET=replace_this_with_a_long_random_secret
CLIENT_ORIGIN=http://localhost:5173
SIMULATOR_ENABLED=true
```

If your PostgreSQL user is not `postgres`, use your actual PostgreSQL username. Do not include angle brackets in the password. If your password contains special URL characters such as `@`, `#`, `/`, or `:`, URL-encode them or use a simpler local demo password.

## 3. Install packages
In VS Code, open the **HealthPulse_Postgres_FullStack** folder itself (the folder containing `package.json`, `client`, `server`, and `database`).

Choose **Terminal → New Terminal → Command Prompt** (not PowerShell if you previously saw the `npm.ps1` execution-policy error).

Verify the folder:
```cmd
dir
```
You should see `client`, `server`, `database`, and `package.json`.

Install root tools:
```cmd
npm install
```

Install frontend and backend dependencies:
```cmd
npm run install-all
```

## 4. Run the project
Keep PostgreSQL service running, then run:
```cmd
npm run dev
```

Open the exact `Local:` URL printed by Vite (normally `http://localhost:5173`).
Backend health check:
- `http://localhost:5000/api/health`
- `http://localhost:5000/api/patients`
- `http://localhost:5000/api/sensors`
- `http://localhost:5000/api/history`

If Vite says port 5173 is occupied, use the alternative URL printed in the terminal.

## Troubleshooting
- **`npm` cannot find `package.json`:** you are in the wrong directory. `cd` into the extracted project root and run `dir`.
- **`npm.ps1 cannot be loaded`:** switch the VS Code terminal profile to Command Prompt.
- **Database password authentication failed:** edit `server/.env` and verify your PostgreSQL password.
- **ECONNREFUSED 5432:** start the PostgreSQL Windows service and verify the port.
- **Port 5000 is occupied:** change `PORT=5001` in `server/.env` and update `client/src/api.js` to `http://localhost:5001`.
- **Missing database/table:** create database `healthpulse`; run `database/schema.sql`; restart the server.

## API summary
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | API and database status |
| GET | `/api/patients` | List patients |
| GET | `/api/sensors` | List sensors |
| GET | `/api/sensors/:id` | Sensor details |
| POST | `/api/sensors` | Create sensor |
| PUT | `/api/sensors/:id` | Update sensor |
| DELETE | `/api/sensors/:id` | Delete sensor |
| GET | `/api/history?limit=60` | Recent telemetry history |
| GET | `/api/alerts` | Recent abnormal readings |
| POST | `/api/auth/register` | Register a demo user |
| POST | `/api/auth/login` | Login |
| GET | `/api/stream` | Server-Sent Events stream |

Socket.IO event: `telemetry`

## PostgreSQL note
The backend expects PostgreSQL to be configured in `server/.env`. It does not silently switch to in-memory mode, so you can demonstrate the real database integration. The simulator inserts sample telemetry into PostgreSQL and the dashboard reads it back through the API.
