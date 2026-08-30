# PiControl - Lightweight Raspberry Pi 3B Management Dashboard

PiControl is an ultra-lightweight, high-performance, and secure web-based dashboard designed specifically for **Raspberry Pi 3B** boards running Raspberry Pi OS or Debian-based Linux. 

It provides real-time telemetry, system metrics, hardware audits, service configuration toggles, sandboxed file management, and restricted command execution interfaces—operating smoothly within resource-constrained environments (e.g. 1GB RAM).

---

## 📖 Table of Contents
1. [Key Features](#-key-features)
2. [Technology Stack](#-technology-stack)
3. [Architecture Overview](#-architecture-overview)
4. [Security Guidelines](#-security-guidelines)
5. [API Documentation](#-api-documentation)
6. [Development Setup (Windows/macOS/Linux)](#-development-setup)
7. [Production Deployment on Raspberry Pi](#-production-deployment-on-raspberry-pi)
8. [Configuration Guide](#-configuration-guide)
9. [Uninstall Instructions](#-uninstall-instructions)

---

## 🌟 Key Features

* **Real-Time Telemetry Grid**: Displays CPU load, temperature, throttling codes, RAM allocation, storage partitions, WiFi signal, and traffic throughput.
* **Customizable Layout**: Drag, order, resize, and hide widgets dynamically. Layouts persist in SQLite.
* **SD Card Protection Policy**: Telemetry charting histories are stored in rolling memory-based arrays to prevent persistent disk wear and micro SD card degradation.
* **Service Manager**: Direct systemd unit operations (Start/Stop/Restart/Enable/Disable) under secure privilege separation rules.
* **Processes Monitor**: Sort, filter, and terminate processes using confirmations.
* **Sandboxed File Explorer**: Files upload, download, and renaming restricted under `/home/pi` with path traversal protection blocks.
* **Secure Console Terminal**: Run authorized commands (`df`, `free`, `ip`, `ping`, etc.) filtered through strict character escape regexes.
* **GPIO Interface Board**: Interactive physical 40-pin mapping representing Broadcom pins. Toggle outputs and set mode directions live.
* **Docker Workloads Monitor**: View logs, run container operations, and monitor memory footprints.
* **APT Package Manager**: List upgrades, upgrade all packages, and manage installations from a safe command queue.

---

## 🛠️ Technology Stack

* **Frontend**: Next.js (App Router, Tailwind CSS, TypeScript, Lucide Icons, Recharts). Statically compiled to 100% client-side HTML/JS assets to eliminate NodeJS rendering threads in production.
* **Backend**: Express + WebSockets (TypeScript) serving as the API and static file web server.
* **Database**: SQLite (managed via SQLite3 callbacks wrapped in Promises).
* **System Poller**: Direct `/sys` and `/proc` file parsing on Linux; simulated metrics provider (Mock Mode) on non-Linux platforms.

---

## 📐 Architecture Overview

```
Client Browser (UI)
       │ (JSON REST APIs & WS Telemetry Stream)
       ▼
┌──────────────────────────────────────────────┐
│ Express Static Web Server & Socket Broker    │ <-- PiControl Backend (NodeJS)
└──────────────────┬───────────┬───────────────┘
                   │           │
                   ▼           ▼
┌─────────────────────┐     ┌─────────────────────────────────┐
│ SQLite Database     │     │ System Provider Interfaces      │
│ (Layout, Audits,    │     └──────┬───────────────────┬──────┘
│  Settings, Users)   │            │ (Linux platform)  │ (Other OS / Dev)
└─────────────────────┘            ▼                   ▼
                            ┌──────────────┐    ┌──────────────┐
                            │ RaspberryPi  │    │ Simulated    │
                            │ Provider     │    │ Mock         │
                            │ (sysfs/shell)│    │ Provider     │
                            └──────────────┘    └──────────────┘
```

---

## 🔒 Security Guidelines

1. **Privilege Separation (No arbitrary root runtime)**: The web server runs under a dedicated, low-privilege system user `picontrol` in the `gpio` and `dialout` groups. 
2. **Authorized Sudo Execution**: Administrative operations (like service restarts, package upgrades, and power actions) are delegated using a strict sudoers allowlist template (`/etc/sudoers.d/picontrol`) targeting specific commands without password requirements, avoiding root-level shell access.
3. **Shell Injection Prevention**: The terminal console validates input command parameters against a strict characters regex limit `/[;&|$`><\n\r()]/` and checks input against a command whitelist.
4. **Path Traversal Shield**: The File Manager checks resolved directory roots to verify they reside strictly inside the configured safe folder (`/home/pi`). Any attempt to traverse out (e.g. `../../etc/shadow`) returns a `403 Access Denied` response.
5. **Session Safety**: All management endpoints require JWT validation. Default password changes are recommended on first login. Failed login alerts are logged to the dashboard database.

---

## 🔌 API Documentation

All API requests (except `/api/auth/login`) require the HTTP header: `Authorization: Bearer <JWT_Token>`.

### Authentication
* `POST /api/auth/login`
  * Request: `{ "username": "admin", "password": "..." }`
  * Response: `{ "success": true, "token": "...", "user": { "username": "admin", "role": "admin" } }`
* `POST /api/auth/change-password`
  * Request: `{ "oldPassword": "...", "newPassword": "..." }`
  * Response: `{ "success": true, "message": "Password changed successfully" }`

### System Metrics & Telemetry
* `GET /api/system` - Returns hostname, OS version, kernel release, uptime, and Pi model structure.
* `GET /api/metrics/history?range=1m|5m|15m|1h|6h|24h` - Yields historical memory-based telemetry arrays for chart plotters.

### Processes
* `GET /api/processes` - List running processes.
* `POST /api/processes/kill` - Terminates a process PID. `{ "pid": 1205 }`

### Services
* `GET /api/services` - Returns unit states for monitored units (`nginx`, `ssh`, `docker`, etc.).
* `POST /api/services/control` - Triggers systemd commands. `{ "name": "nginx", "action": "restart" }`

### Hardware Interfaces
* `GET /api/gpio` - Active 40-pin layout states.
* `POST /api/gpio/toggle` - Sets pin output state. `{ "pin": 12, "value": 1 }`
* `POST /api/gpio/mode` - Set pin mode. `{ "pin": 12, "mode": "out" }`
* `GET /api/display` - Query screen resolutions and connections.

### Docker Containers
* `GET /api/docker` - List containers and stats (CPU, RAM).
* `POST /api/docker/control` - Starts/Stops containers. `{ "id": "d1a2b", "action": "stop" }`
* `GET /api/docker/logs?id=<containerId>` - Queries container log tails.

### Package Manager
* `GET /api/packages` - Query counts and upgrade lists.
* `POST /api/packages/action` - Runs package installation queues. `{ "action": "install", "packageName": "htop" }`

### File Manager
* `GET /api/files?path=<dir>` - List directories.
* `POST /api/files/create` - Creates a folder. `{ "path": "dir", "folderName": "assets" }`
* `POST /api/files/upload` - Base64 binary file uploads. `{ "path": "dir", "filename": "setup.sh", "content": "<base64>" }`
* `GET /api/files/download?path=<filePath>` - Download file.
* `POST /api/files/rename` - Rename items. `{ "path": "dir", "oldName": "x", "newName": "y" }`

### Configuration
* `GET /api/settings` - Layout arrangements and threshold configs.
* `POST /api/settings` - Saves customizable layouts.

---

## 💻 Development Setup

To run and debug the dashboard locally on Windows, macOS, or generic Linux environments (Mock Telemetry active):

1. **Clone project**:
   ```bash
   git clone <repo-url> picontrol
   cd picontrol
   ```
2. **Install dependencies**:
   ```bash
   npm run install:all
   ```
3. **Configure environments**:
   Create a `.env` file inside `backend/` directory:
   ```text
   PORT=3000
   BIND_ADDRESS=127.0.0.1
   SAFE_DIR=C:\Users\username\Documents (or desired sandbox)
   NODE_ENV=development
   ```
4. **Boot Servers**:
   * Run backend API: `npm run dev:backend` (Starts Express and Mock WebSocket poller on port 3000)
   * Run frontend: `npm run dev:frontend` (Starts Next.js dev server on port 3001)
5. **Open Browser**:
   * Navigate to `http://localhost:3001`
   * Authenticate with credentials: `admin` / `admin`

---

## 🍓 Production Deployment on Raspberry Pi

1. **Clone the repository**:
   ```bash
   git clone <repo-url> picontrol
   cd picontrol
   ```
2. **Run the Installer**:
   ```bash
   chmod +x install.sh
   ./install.sh
   ```
   *The installer automatically evaluates dependency parameters, builds backend and static frontend folders, registers a secure `picontrol` user, sets up passwordless sudo delegation configurations, copies the built system to `/opt/picontrol`, and registers and starts the systemd service.*

3. **Access Panel**:
   * Open `http://<Raspberry_Pi_IP>:3000`
   * Login using default credentials: `admin` / `admin`
   * **Important: Reset your admin credentials immediately in the settings panel.**

---

## ⚙️ Configuration Guide

Configuration parameter files can be customized in `/opt/picontrol/backend/.env`:
* `PORT`: Listening HTTP Port (default `3000`).
* `BIND_ADDRESS`: Bind interface. Use `127.0.0.1` for proxy setups or `0.0.0.0` for direct LAN networking.
* `SAFE_DIR`: Safe sandbox directory for the File Explorer (default `/home/pi`).
* `DATA_DIR`: SQLite database folder storage (default `/opt/picontrol/backend/data`).
* `CPU_THRESHOLD`, `RAM_THRESHOLD`, `TEMP_THRESHOLD`, `DISK_THRESHOLD`: Threshold configurations triggering alarm indicators.

---

## 🗑️ Uninstall Instructions

To remove all packages, service configurations, and folders:
```bash
chmod +x uninstall.sh
./uninstall.sh
```
Follow the interactive prompts to drop settings files and users.
