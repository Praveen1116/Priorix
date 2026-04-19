# 🚀 Priorix

> A full-stack, queue-driven task reminder platform built with **Next.js**, **Express**, **TypeScript**, **Prisma**, **PostgreSQL**, **Redis**, and **BullMQ**.

---

## 📚 Table of Contents

* [Overview](#-overview)
* [Why This Project Matters](#-why-this-project-matters)
* [Core Features](#-core-features)
* [System Architecture](#-system-architecture)
* [Engineering Highlights](#-engineering-highlights)
* [Monorepo Structure](#-monorepo-structure)
* [Tech Stack](#-tech-stack)
* [Product Flow](#-product-flow)
* [Priority Scheduling Strategy](#-priority-scheduling-strategy)
* [Task Lifecycle](#-task-lifecycle)
* [API Overview](#-api-overview)
* [Data Model](#-data-model)
* [Frontend Overview](#-frontend-overview)
* [Queue & Worker Design](#-queue--worker-design)
* [Security Notes](#-security-notes)
* [Environment Variables](#-environment-variables)
* [Local Development](#-local-development)
* [Observability & Debugging](#-observability--debugging)
* [Production-Relevant Design Signals](#-production-relevant-design-signals)
* [Current Limitations](#-current-limitations)
* [Roadmap](#-roadmap)
* [Author](#-author)

---

## ✨ Overview

**Priorix** is designed as a **backend-centric, asynchronous scheduling system** that turns user-created tasks into delayed reminder jobs, processes them through a worker pipeline, and records delivery outcomes for observability.

It combines a clean web interface with a production-style backend architecture that demonstrates **authentication**, **job scheduling**, **background processing**, **state transitions**, **database design**, and **monorepo-based full-stack development**.

---

## 🎯 Why This Project Matters

Most task apps stop at CRUD. Priorix goes further by handling the harder engineering problem: **reliable reminder execution outside the request-response cycle**.

This project demonstrates:

* Full-stack product thinking
* Asynchronous system design
* Queue-backed background job processing
* Secure authentication with JWT
* Prisma-based relational data modeling
* Time-aware reminder scheduling
* Monorepo organization for shared backend infrastructure
* Local-first development with separately running web, API, and worker services

From a hiring and engineering perspective, Priorix showcases skills relevant to:

* Backend engineering
* Full-stack development
* Distributed systems fundamentals
* Event-driven and queue-driven architecture
* System design for delayed execution workflows
* API design and authorization
* Infrastructure-aware development

---

## 🧱 Core Features

* User registration and login with password hashing
* JWT-protected API routes
* Task creation with priority, timezone, optional link, and schedule
* Priority-based reminder scheduling logic
* Redis-backed delayed job execution using BullMQ
* Background worker for email delivery
* Reminder logging with success/failure tracking
* Task completion flow that cancels queued reminders
* Task deletion flow that removes related reminder jobs
* Dashboard UI for task management and lifecycle visibility
* Local development workflow with decoupled services

---

## 🏗 System Architecture

```text
Next.js Web App
       |
       v
Express API
       |
       +------------------------+
       |                        |
       v                        v
PostgreSQL (Prisma)       Redis / BullMQ
                                |
                                v
                           Background Worker
                                |
                                v
                            Email Delivery
```

---

## ⚙️ Engineering Highlights

* **Asynchronous processing**: reminder delivery is offloaded to a worker rather than handled inline during API requests
* **Queue-based architecture**: delayed jobs are scheduled in Redis and processed when they become due
* **Separation of concerns**: frontend, API, worker, and database logic are isolated
* **Timezone-aware scheduling**: local input normalized into UTC
* **Lifecycle-aware task management**: PENDING → AWAITING_CONFIRMATION → COMPLETED/MISSED
* **Operational visibility**: execution outcomes persisted
* **Scalable design**: worker can scale independently

---

## 📦 Monorepo Structure

```text
apps/
  api/        Express API for auth, tasks, and reminder scheduling
  web/        Next.js frontend for login, signup, and dashboard
  worker/     BullMQ worker for reminder execution and email delivery

packages/
  db/         Shared Prisma schema and Prisma client
```

---

## 🧰 Tech Stack

### Frontend

* Next.js 16
* React 19
* TypeScript
* Tailwind CSS

### Backend

* Node.js
* Express 5
* TypeScript
* JWT
* bcrypt
* Luxon

### Data & Infrastructure

* PostgreSQL
* Prisma ORM
* Redis
* BullMQ
* Nodemailer

### Tooling

* pnpm workspaces
* ts-node-dev

---

## 🔄 Product Flow

1. User signs up or logs in
2. JWT token stored on frontend
3. Task created with priority & schedule
4. API converts local time → UTC
5. Reminder times generated
6. Jobs added to BullMQ queue
7. Worker processes jobs
8. Email sent + logs stored
9. Task completion/deletion removes jobs

---

## ⏱ Priority Scheduling Strategy

* **P1**: 120, 60, 30, 10, 5, 1 mins before
* **P2**: 60, 30, 10, 5 mins before
* **P3**: 30, 10 mins before
* **P4**: 10 mins before
* **P5**: 5 mins before

Only future reminders are scheduled.

---

## 🔁 Task Lifecycle

**Statuses:**

* PENDING
* AWAITING_CONFIRMATION
* COMPLETED
* MISSED

**Flow:**

* Starts → PENDING
* Reminder → AWAITING_CONFIRMATION
* Done → COMPLETED
* Timeout → MISSED

---

## 🌐 API Overview

**Base URL:**

```
http://localhost:4000
```

**Auth Header:**

```
Authorization: Bearer <token>
```

---

## 🗄 Data Model

### User

* id
* email
* password
* createdAt

### Task

* id, title, link, priority, type
* dateTime, endTime, timeZone
* status, userId
* createdAt, updatedAt

### ReminderJob

* id, taskId, scheduledTime, jobId, createdAt

### ReminderLog

* id, taskId, seenAt, status

---

## 🎨 Frontend Overview

* Landing page
* Signup page
* Login page
* Dashboard

Supports:

* Task creation
* Priority & timezone selection
* Status tracking
* Completion & deletion
* Optional links

---

## 🧵 Queue & Worker Design

* Queue: `reminder-queue`
* Worker pulls jobs from Redis
* Sends emails via Nodemailer
* Logs SUCCESS / FAILED

---

## 🔐 Security Notes

* Passwords hashed with bcrypt
* JWT authentication
* Secure env variables
* No plaintext credentials

---

## ⚙️ Environment Variables

### apps/api/.env

```
PORT=4000
JWT_SECRET=your-jwt-secret
DATABASE_URL=your-postgres-connection-string
REDIS_URL=redis://127.0.0.1:6379
```

### apps/worker/.env

```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
DATABASE_URL=your-postgres-connection-string
REDIS_URL=redis://127.0.0.1:6379
```

### apps/web/.env.local

```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## 🧪 Local Development

### Prerequisites

* Node.js 18+
* pnpm
* Redis
* PostgreSQL

### Setup

```bash
pnpm install
```

```bash
docker run -d --name priorix-redis -p 6379:6379 redis
```

```bash
pnpm --dir packages/db prisma generate
pnpm --dir packages/db prisma migrate dev
```

```bash
pnpm --filter api dev
pnpm --filter worker dev
pnpm --filter web dev
```

Open:

```
http://localhost:3000
```

---

## 🔍 Observability & Debugging

* API logs
* Worker logs
* ReminderJob table
* ReminderLog table
* Browser network tab

---

## 🧠 Production-Relevant Design Signals

* Stateless APIs
* Async job processing
* Delayed execution
* Worker isolation
* Audit logs
* Secure config

---

## ⚠️ Current Limitations

* No one-command startup
* Client-side auth state
* No refresh tokens
* No test suite
* No retry/backoff
* Minimal UI

---

## 🗺 Roadmap

* Add Zod validation
* Improve auth handling
* Retry/backoff logic
* Automated testing
* Docker Compose
* Logging & metrics
* Deployment docs
* Better UI/UX
* Multi-channel notifications

---

## 👤 Author

**Praveen Kumar**

If you found this project interesting, feel free to explore the codebase, review the architecture, or connect for discussions around backend systems, full-stack engineering, and asynchronous application design.