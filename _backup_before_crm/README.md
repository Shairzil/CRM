# NextEd Advisors — Internal Management System

A full-stack internal management platform for **NextEd Advisors** study abroad consultancy.  
Built with **NestJS** (backend) + **Next.js** (frontend) + **PostgreSQL** + **TypeORM**.

---

## Project Structure

```
nexted-advisors/
├── backend/      → NestJS REST API (Port 3001)
└── frontend/     → Next.js App Router UI (Port 3000)
```

---

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | ≥ 18.x |
| npm | ≥ 9.x |
| PostgreSQL | ≥ 14 |
| Puppeteer dependencies | See below |

### Puppeteer on Windows
Puppeteer downloads a bundled Chromium browser automatically on `npm install`. No extra setup is needed on Windows.

---

## 1. Database Setup

Ensure PostgreSQL is running. Create the database:

```sql
CREATE DATABASE nexted_advisors;
```

---

## 2. Backend Configuration

Create `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=nexted_advisors
JWT_SECRET=supersecret_nexted_advisors_key_2026_jwt_token
EXCHANGE_RATE_API_KEY=free_or_empty
PDF_STORAGE_PATH=d:/NEXTED/nexted-advisors/backend/storage/invoices
```

> **Note:** `EXCHANGE_RATE_API_KEY` is optional. If left as `free_or_empty` or blank, the app
> automatically falls back to `open.er-api.com` for live exchange rates.

---

## 3. Frontend Configuration

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 4. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

---

## 5. Database Tables (Auto-sync)

The backend uses TypeORM with `synchronize: true`. Tables are created automatically when the
server starts for the first time. No migration commands are needed.

---

## 6. Seed the Database

Seed the admin user, 6 countries, and 3 default employees:

```bash
cd backend
npm run seed
```

Expected output:
```
✓ Seeding User: admin / Admin@123 completed
✓ Country: USA seeded
✓ Country: Canada seeded
... (6 countries total)
✓ Employee: Nipa seeded
✓ Employee: Fahad seeded
✓ Employee: Ritu seeded
✓ Database Seeding completed successfully!
```

---

## 7. Start the Backend

```bash
cd backend
npm run start:dev
```

Server starts on **http://localhost:3001**

---

## 8. Start the Frontend

```bash
cd frontend
npm run dev
```

Frontend starts on **http://localhost:3000**

---

## 9. Login Credentials

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `Admin@123` |

> Passwords are bcrypt-hashed in the database. Additional users must be added directly via database insertion with a hashed password.

---

## 10. Key Features

- **JWT Authentication** — All routes protected, token stored in `sessionStorage`
- **Student Registration** — Auto-generated Student ID (`NextEd/{source}/{counselor}/{seq}`)
- **Invoice Creation** — Auto-generated Invoice ID, live Due Amount calculation
- **PDF Invoices** — Puppeteer-rendered PDFs, stored locally, streamable from `/invoices/:id/pdf`
- **Live Currency Conversion** — Real-time BDT conversion via ExchangeRate-API with open fallback
- **Search & Filter** — Student search by name and invoice number; invoice search by invoice ID

---

## 11. Firebase Migration Notes

Code comments throughout the backend mark exactly where to swap:
- **File Storage**: `backend/src/invoices/pdf.service.ts` — swap `fs.writeFileSync` with Firebase Storage upload
- **Authentication**: `backend/src/auth/auth.service.ts` — swap NestJS JWT with Firebase Admin SDK token verification

---

## 12. API Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/login` | Login (public) |
| GET | `/employees` | List employees |
| POST | `/employees` | Add employee |
| DELETE | `/employees/:id` | Remove employee |
| GET | `/countries` | List countries |
| GET | `/currency/convert` | Live currency to BDT |
| POST | `/students` | Register student |
| GET | `/students` | List students (with filters) |
| GET | `/students/:id` | Student full details |
| PATCH | `/students/:id` | Update name/phone/email |
| POST | `/invoices` | Create invoice + generate PDF |
| GET | `/invoices` | List invoices (with filter) |
| GET | `/invoices/:id` | Invoice details |
| GET | `/invoices/:id/pdf` | Stream PDF inline |
