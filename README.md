# PulseAPI - Multi-Tenant API Hit Monitoring System

A resilient, event-driven API monitoring platform built with Node.js, Express, MongoDB, PostgreSQL, RabbitMQ, and Docker.

---

## Architecture Overview

```
                      +-------------------+
                      |   Client Request  |
                      +---------+---------+
                                |
                                v
                      +-------------------+
                      |  Ingestion API    |
                      |   (Rate Limited)  |
                      +---------+---------+
                                |
                                v
                      +-------------------+
                      |  Circuit Breaker  |
                      |  & Retry Producer |
                      +---------+---------+
                                |
                                v
                      +-------------------+
                      |  RabbitMQ Queue   |
                      |   (api_hits)      |
                      +---------+---------+
                                |
               +----------------+----------------+
               |                                 |
               v                                 v
     +-------------------+             +-------------------+
     | Dead Letter Queue |             | Consumer Worker   |
     | (api_hits.dlq)    |             | (Event Processor) |
     +-------------------+             +--------+----------+
                                                |
                               +----------------+----------------+
                               |                                 |
                               v                                 v
                      +-------------------+             +-------------------+
                      |     MongoDB       |             |    PostgreSQL     |
                      |  (Raw Hit Logs)   |             | (Aggregated Stats)|
                      +-------------------+             +-------------------+
                                                                 ^
                                                                 |
                                                        +--------+----------+
                                                        |  Analytics API    |
                                                        |  (/api/analytics) |
                                                        +-------------------+
```

---

## Key Features

- **Multi-Tenant Architecture**: Support for isolated client organizations with tenant-scoped users and API keys.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions (`SUPER_ADMIN`, `ADMIN`, `MEMBER`) enforced via JWT middleware.
- **High-Throughput Ingestion**: Asynchronous hit collection decoupled from database writes via RabbitMQ message queues.
- **Fault Tolerance & Reliability**:
  - **Circuit Breaker** pattern to protect downstream messaging brokers during outages.
  - **Exponential Backoff with Jitter** retry strategy.
  - **Dead Letter Queue (DLQ)** for unprocessable poison messages.
  - **Idempotent processing** with in-memory message deduplication.
- **Dual-Database Storage**:
  - **MongoDB**: Schema-flexible, high-volume raw request logs and user management.
  - **PostgreSQL**: Relational, indexed storage for aggregated traffic analytics and time-series metrics.
- **Full Docker Support**: Dockerized infrastructure (PostgreSQL, MongoDB, RabbitMQ, pgAdmin) for fast, reproducible local setup.

---

## Tech Stack

| Component | Technology |
|---|---|
| **Runtime** | Node.js (ES Modules) |
| **Framework** | Express.js |
| **Message Broker** | RabbitMQ (amqplib) |
| **Databases** | MongoDB (Mongoose), PostgreSQL (pg) |
| **Authentication** | JWT, bcryptjs, HTTP-only Cookies |
| **Validation** | Zod schemas |
| **Security** | Helmet, CORS, Express Rate Limit, Crypto (SHA-256) |
| **Containerization** | Docker, Docker Compose |

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (must be running)
- [Node.js](https://nodejs.org/) (v18+)

### 1. Clone & Configure

```bash
git clone https://github.com/Garvgang/PulseAPI.git
cd PulseAPI/server
cp .env.example .env
```

Review and adjust variables in `.env` if necessary.

### 2. Start Supporting Infrastructure

```bash
docker compose up -d
```

This spins up:
- **MongoDB** on `localhost:27017`
- **PostgreSQL** on `localhost:5433`
- **RabbitMQ** on `localhost:5672` (Management UI: `http://localhost:15672`)
- **pgAdmin** on `http://localhost:8080`

### 3. Start the API Server

```bash
npm install
npm run dev
```

The server will be available at `http://localhost:3000`.

### 4. Start the Background Event Consumer

In a separate terminal:

```bash
node src/services/processor/consumer.js
```

---

## API Endpoints

### Health & Info
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/health` | Service health status | Public |
| `GET` | `/` | API overview & version | Public |

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/auth/onboard-super-admin` | Onboard system super admin | Public (First run) |
| `POST` | `/api/auth/login` | Authenticate user & issue JWT | Public |
| `POST` | `/api/auth/register` | Register client member | Super Admin |
| `GET` | `/api/auth/profile` | Fetch active user profile | Bearer Token / Cookie |
| `GET` | `/api/auth/logout` | Clear auth session | Public |

### Client Administration (`/api/admin`)
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/admin/clients/onboard` | Register client organization | Authenticated |
| `POST` | `/api/admin/clients/:clientId/users` | Add user to client | Authenticated |
| `POST` | `/api/admin/clients/:clientId/api/keys`| Issue API key | Authenticated |
| `GET` | `/api/admin/clients/:clientId/api/keys` | List client API keys | Authenticated |

### Ingestion (`/api/hit`)
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/hit` | Ingest API hit metric | API Key (`x-api-key`) |

### Analytics (`/api/analytics`)
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/analytics/stats` | Aggregated traffic stats | Authenticated |
| `GET` | `/api/analytics/dashboard` | Dashboard metrics | Authenticated |

---

## License

ISC License
