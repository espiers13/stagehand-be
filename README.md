# Stage Hand BE

A RESTful API for the Stage Hand rehearsal scheduling app, built with Node.js, Express, and PostgreSQL. Allows theatre companies to create productions, manage company members, schedule rehearsals, and track attendance.

## Getting Started

### Prerequisites

- Node.js v18+
- PostgreSQL

### Installation

1. Clone the repo:

```bash
git clone https://github.com/espiers13/stagehand-be.git
cd stagehand-be
```

2. Install dependencies:

```bash
npm install
```

3. Create the following environment files in the root directory:

**.env**
```
PGDATABASE=stagehand
JWT_SECRET=your_jwt_secret
```

**.env.test**
```
PGDATABASE=stagehand_test
JWT_SECRET=your_jwt_secret
```

4. Set up the databases:

```bash
psql postgres -c "CREATE DATABASE stagehand;"
psql postgres -c "CREATE DATABASE stagehand_test;"
```

5. Seed the development database:

```bash
npm run seed
```

## Running Tests

```bash
npm test
```

Tests use a separate test database that is re-seeded before each test.

## API Endpoints

### Auth

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/login` | Authenticate user, returns JWT token | No |
| POST | `/api/register` | Create a new user | No |

### Productions

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/productions` | Get all productions for authenticated user | Yes |
| POST | `/api/productions` | Create a new production | Yes |
| GET | `/api/productions/:production_id` | Get a production by ID | Yes |
| PATCH | `/api/productions/:production_id` | Edit production details | Yes |
| DELETE | `/api/productions/:production_id` | Delete a production | Yes |

### Company Members

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/productions/:production_id/company` | Get all company members for a production | Yes |
| POST | `/api/productions/:production_id/company` | Add a company member by email | Yes |
| DELETE | `/api/company/:member_id` | Remove a company member | Yes |

### Rehearsals

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/productions/:production_id/rehearsals` | Get all rehearsals for a production | Yes |
| POST | `/api/productions/:production_id/rehearsals` | Add a rehearsal to a production | Yes |
| PATCH | `/api/rehearsals/:rehearsal_id` | Edit rehearsal details | Yes |
| DELETE | `/api/rehearsals/:rehearsal_id` | Delete a rehearsal | Yes |
| GET | `/api/users/:user_id/rehearsals` | Get all rehearsals for a user | Yes |

### Calls

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/rehearsals/:rehearsal_id/calls` | Get all calls for a rehearsal | Yes |
| POST | `/api/rehearsals/:rehearsal_id/calls` | Add a user to a rehearsal call | Yes |
| DELETE | `/api/rehearsals/:rehearsal_id/calls/:user_id` | Remove a user from a rehearsal call | Yes |
| PATCH | `/api/rehearsals/:rehearsal_id/calls/:user_id` | Confirm or unconfirm attendance | Yes |

### Authentication

Protected routes require a Bearer token in the request header:

```
Authorization: Bearer <token>
```

## Request & Response Examples

### POST /api/login

**Request body:**
```json
{
  "email": "your@email.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "username": "sarah_director",
    "email": "your@email.com"
  },
  "token": "eyJhbGci..."
}
```

### POST /api/register

**Request body:**
```json
{
  "username": "your_username",
  "email": "your@email.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "username": "your_username",
    "email": "your@email.com"
  },
  "token": "eyJhbGci..."
}
```

### POST /api/productions

**Request body:**
```json
{
  "title": "A Midsummer Night's Dream",
  "venue": "The Lowry Studio, Salford",
  "start_date": "2026-09-01",
  "end_date": "2026-09-14"
}
```

**Response:**
```json
{
  "production": {
    "id": 1,
    "title": "A Midsummer Night's Dream",
    "created_by": 1,
    "venue": "The Lowry Studio, Salford",
    "start_date": "2026-09-01",
    "end_date": "2026-09-14"
  }
}
```

### PATCH /api/rehearsals/:rehearsal_id/calls/:user_id

**Request body:**
```json
{
  "confirmed": true
}
```

**Response:**
```json
{
  "attendance": {
    "rehearsal_id": 1,
    "user_id": 2,
    "confirmed": true
  }
}
```

## Tech Stack

- **Node.js** & **Express** — server and routing
- **PostgreSQL** & **node-postgres (pg)** — database
- **bcrypt** — password hashing
- **jsonwebtoken** — authentication
- **pg-format** — safe SQL query formatting
- **dotenv** — environment variable management
- **Jest**, **jest-sorted** & **Supertest** — testing

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Start | `node listen.js` | Start the server |
| Dev | `npm run dev` | Start with nodemon |
| Seed | `npm run seed` | Seed the development database |
| Test | `npm test` | Run the test suite |

## Project Structure

```
.
├── app.js                          # Express app: middleware and route definitions
├── listen.js                       # Starts the server
├── db/
│   ├── connection.js               # Database connection
│   ├── controllers/
│   │   └── user-controllers.js     # Auth controllers
│   ├── models/
│   │   └── user-models.js          # Database queries
│   ├── middleware/
│   │   └── auth.js                 # JWT verification for protected routes
│   ├── data/                       # Seed data
│   └── seeds/                      # Seeding scripts
└── __tests__/
    └── app.test.js                 # Endpoint tests (Jest + Supertest)
```

## Frontend

The frontend for this project can be found at: https://github.com/espiers13/stage-hand-app
