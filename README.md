# 🏥 HealthPulse — Real-Time Patient Telemetry & ICU Monitoring Platform

A full-stack web application for visualizing patient vital signs, telemetry trends, sensor status, and alerts through a responsive dashboard.

## 📌 Project Overview

**HealthPulse** is an academic Full Stack Web Development project that demonstrates how patient telemetry can be displayed and monitored through a centralized web interface.

The application displays vital-sign information such as heart rate, oxygen saturation (SpO₂), body temperature, and respiratory rate. It combines a React frontend, a Node.js and Express backend, real-time communication, and PostgreSQL database support.

The default demonstration uses simulated telemetry readings, allowing the application to be tested without connecting physical medical sensors.

> **Disclaimer:** HealthPulse is an academic prototype for educational and demonstration purposes. It is not a certified medical device and must not be used for clinical diagnosis or treatment decisions.

## ✨ Features

- 📊 **Patient Monitoring Dashboard** — Displays vital-sign readings in one place.
- ❤️ **Vital-Sign Cards** — Shows heart rate, SpO₂, temperature, and respiratory rate.
- 📈 **Telemetry Visualization** — Displays trends and ECG-style visualizations.
- ⚡ **Real-Time Updates** — Uses Socket.IO to deliver telemetry events to connected clients.
- 👥 **Patient Management** — Provides patient-related API endpoints.
- 🔌 **Sensor Management** — Supports retrieving and managing sensor records through APIs.
- 🚨 **Alerts and Events** — Provides a dashboard area for monitoring events.
- 🔐 **Authentication Interface** — Includes registration and login functionality.
- 🗄️ **Database Support** — Includes PostgreSQL integration support and SQL schemas.
- 📱 **Responsive Interface** — Designed to work across different screen sizes.
- 🧪 **Simulated Telemetry** — Supports demonstrations without physical sensor hardware.

## 🛠️ Technologies Used

| Technology | Purpose |
|---|---|
| HTML5 | Webpage structure |
| CSS | Styling and responsive layout |
| React | Component-based frontend |
| TypeScript | Typed JavaScript development |
| Vite | Frontend development server |
| Recharts | Telemetry trend visualization |
| Node.js | Server-side JavaScript runtime |
| Express.js | Backend routing and REST APIs |
| Socket.IO | Real-time communication |
| Server-Sent Events (SSE) | Server-to-browser event streaming |
| PostgreSQL | Relational database support |
| `pg` | PostgreSQL client for Node.js |
| JWT and bcrypt | Authentication support |
| npm | Dependency management |
| Git and GitHub | Version control and source-code hosting |

**Optional integrations:** MQTT for broker-based telemetry and TimescaleDB for time-series data storage. These require appropriate configuration and should not be assumed to be active in the default demonstration.

## 🏗️ System Architecture

```text
Simulated Telemetry
        |
        v
Node.js + Express Backend
        |
        +------ REST APIs
        |
        v
Socket.IO / SSE
        |
        v
React + TypeScript Frontend
        |
        +------ Vital-Sign Cards
        +------ Telemetry Charts
        +------ Patient Information
        +------ Sensor Status and Alerts

Optional Persistence:
PostgreSQL / TimescaleDB
```

## 📁 Project Structure

```text
HealthPulse_Postgres_FullStack/
│
├── client/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── server/
│   ├── src/
│   ├── .env.example
│   └── package.json
│
├── database/
│   └── SQL schema files
│
├── package.json
├── package-lock.json
└── README.md
```

*Note: The exact files inside each folder may vary with the project version.*

## ⚙️ Prerequisites

Install the following before running the project:

- [Node.js](https://nodejs.org/) — preferably an LTS release
- npm — included with Node.js
- [PostgreSQL](https://www.postgresql.org/download/) — if using the configured database integration
- [Visual Studio Code](https://code.visualstudio.com/) — recommended editor
- Git — for GitHub version control

## 🚀 Installation and Setup

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd HealthPulse_Postgres_FullStack
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with your actual repository URL.

### 2. Install dependencies

Open a terminal in the project root directory and run:

```bash
npm install
npm run install-all
```

If you already installed the dependencies, you do not need to repeat these commands unless required.

### 3. Configure environment variables

Create the server environment file from the example if it does not already exist.

On Windows Command Prompt:

```cmd
copy server\.env.example server\.env
```

Open `server/.env` and configure the required values:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/healthpulse
JWT_SECRET=replace_with_a_long_random_secret
CLIENT_ORIGIN=http://localhost:5173
SIMULATOR_ENABLED=true
```

Replace `YOUR_POSTGRES_PASSWORD` with your local PostgreSQL password.

**Important:** Do not upload your real `.env` file, database password, or authentication secrets to GitHub. Commit `.env.example` with placeholder values instead.

### 4. Create the database

If PostgreSQL is configured for your local setup:

1. Open pgAdmin.
2. Connect to your local PostgreSQL server.
3. Create a database named `healthpulse`.
4. Confirm that the `DATABASE_URL` in `server/.env` uses the correct username, password, host, port, and database name.

Follow any additional schema instructions supplied in the `database` folder or project README.

### 5. Start the application

From the project root, run:

```bash
npm run dev
```

Keep the terminal open while using the application. The terminal should show the frontend and backend startup messages.

Open the frontend URL printed in the terminal. It will typically be:

- Frontend: `http://localhost:5173` or another Vite port if 5173 is occupied
- Backend health check: `http://localhost:5000/api/health`

If port 5000 is already in use, stop the duplicate backend process before starting the project again.

## 🔗 API Endpoints

The backend provides endpoints for health checks, patients, sensors, history, and authentication.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check backend status |
| GET | `/api/patients` | Retrieve patient records |
| GET | `/api/sensors` | Retrieve sensor records |
| GET | `/api/sensors/:id` | Retrieve a sensor by ID |
| POST | `/api/sensors` | Create a sensor record |
| PUT | `/api/sensors/:id` | Update a sensor record |
| DELETE | `/api/sensors/:id` | Delete a sensor record |
| GET | `/api/history` | Retrieve telemetry history |
| GET | `/api/stream` | Stream updates using SSE |
| POST | `/api/auth/register` | Register a demo user |
| POST | `/api/auth/login` | Log in a demo user |

Authentication, database persistence, and individual endpoints should be verified against the actual local configuration before deployment.

## 🔄 Real-Time Telemetry

HealthPulse uses Socket.IO for event-based communication between the backend and connected frontend clients.

In the default demonstration:

1. The backend generates simulated telemetry readings.
2. The backend emits telemetry events.
3. The frontend listens for the events.
4. The dashboard updates the displayed readings and recent trends.

MQTT-based telemetry can be added as an optional integration when a suitable broker and configuration are available.

## 🎓 Course Outcome Mapping

| Course Outcome | Implementation in HealthPulse |
|---|---|
| CO1 | HTML5, CSS, page structure, and responsive interface |
| CO2 | JavaScript/TypeScript logic and asynchronous data handling |
| CO3 | React components, hooks, and Recharts visualizations |
| CO4 | Node.js, Express, REST APIs, and request/response handling |
| CO5 | Socket.IO, SSE, and real-time telemetry delivery |
| CO6 | PostgreSQL support, environment configuration, and development workflow |

## 🔮 Future Enhancements

- Integration with physical sensors such as MAX30102 and ECG modules.
- Validated long-term telemetry storage using PostgreSQL and TimescaleDB.
- Configurable alert thresholds and notification mechanisms.
- Improved role-based access control and audit logging.
- Historical analytics and downloadable reports.
- Deployment of the frontend and backend.
- Automated testing and CI/CD integration.

## 👨‍💻 Project Information

**Project Name:** HealthPulse — Real-Time Patient Telemetry & ICU Monitoring Platform

**Course:** Full Stack Web Development — Project-Based Learning

**Academic Purpose:** Demonstration of frontend, backend, database, and real-time web technologies.

## 📄 License

This project was developed for academic and educational purposes. Add a license such as the MIT License only if you intend to release the project under those terms.

---

**HealthPulse — Connecting patient telemetry with a clear, real-time dashboard.**
