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

Copy `backend/.env.example` to `backend/.env` and fill it in. The important values:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=nexted_advisors

# REQUIRED — at least 32 random characters. The server refuses to start without it.
# node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_SECRET=
JWT_EXPIRES_IN_SECONDS=43200          # login lasts 12 hours

SEED_ADMIN_USERNAME=youradmin         # first admin (see step 6)
SEED_ADMIN_PASSWORD=a-strong-password-12+

CORS_ORIGINS=http://localhost:3000    # comma-separated frontend URLs
STORAGE_DIR=storage/documents         # student documents are stored here, not in the DB
PDF_STORAGE_PATH=storage/invoices
```

> **Never commit `.env`.** It is listed in `.gitignore`. If a `.env` was ever shared (zip, chat, git),
> change the database password and `JWT_SECRET`.

`EXCHANGE_RATE_API_KEY` is optional. If left as `free_or_empty` or blank, the app falls back to
`open.er-api.com` for live exchange rates.

---

## 3. Frontend Configuration

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 4. Install Dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

---

## 5. Database schema — migrations

`synchronize` is **off**. The schema is managed by versioned migrations in
`backend/src/migrations/`:

| Migration | What it does |
|---|---|
| `InitialSchema` | Creates the original tables on a fresh database. On an existing database it does nothing. |
| `CrmFoundation` | Roles on users, ID links (counselor / employee / collected-by), leads, documents, applications, linked accounts. Back-fills the new ID columns from the old name columns. |

Pending migrations run **automatically when the backend starts** (`DB_MIGRATIONS_RUN=true`).
Manual commands:

```bash
npm run migration:show       # what has run
npm run migration:run        # run pending migrations
npm run migration:revert     # undo the last one
npm run migration:generate -- src/migrations/MyChange   # after changing an entity
```

After generating a migration, add its class to `src/migrations/index.ts`.

> Take a database backup before the first start with the new code:
> `pg_dump -U postgres nexted_advisors > backup.sql`

---

## 6. Users, roles and the first admin

| Role | Can do |
|---|---|
| `admin` | Everything, incl. Salary, IO, Balance, Collections, user management |
| `accounts` | Daily work + Balance sheet and Collections report |
| `counselor` | Students, leads, applications, documents, invoices |
| `telecaller` | Leads and collecting student info |

Roles are checked **on the server** for every request (the confidential APIs can no longer be
called by any logged-in user). Existing users become `counselor` after the migration.

Create or promote the first admin:

```bash
cd backend
npm run seed            # uses SEED_ADMIN_USERNAME / SEED_ADMIN_PASSWORD from .env
# or
npm run user -- set-role Nawrose admin
```

Other user commands: `npm run user -- list | reset-password <user> <pw> | create <user> <pw> <role> [name] | deactivate <user>`.
After that, admins manage users in the app: **Dashboard → Users & Roles**.

`npm run seed` is now safe: it only adds missing countries / employees / counselors and never
deletes students, invoices or other data.

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

## 9. Login

Each person logs in with their own account. Tokens expire (default 12 hours); changing a
password, changing a role or deactivating a user logs that user out everywhere.
Users change their own password from the key icon on the dashboard.
After 5 wrong passwords the login is blocked for 15 minutes (per IP + username).

---

## 10. Key Features

- **Role-based access** — admin / accounts / counselor / telecaller, enforced by the API
- **Leads (CRM)** — add leads by hand, import CSV/XLSX (Meta / Google Sheet export), or receive them
  live from **Meta Lead Ads**; status pipeline, assignment, call log & notes, follow-up dates,
  duplicate detection by phone, conversion to a student; source and campaign reports
- **Student Registration** — Auto-generated Student ID; automatically linked to the matching lead
- **Applications** — per university / course / intake with a status pipeline and full history
- **Documents** — request, upload, approve / reject with notes; files kept on disk, not in Postgres
- **Linked accounts** — link a student to their account in other nextED systems
- **Invoices** — PDF invoices, live due amount, **Collected by** employee, collections report
- **Live Currency Conversion** — Real-time BDT conversion

### Meta Lead Ads setup

1. In `backend/.env` set `META_VERIFY_TOKEN` (any random text), `META_APP_SECRET` and a long-lived
   `META_PAGE_ACCESS_TOKEN` with the `leads_retrieval` permission.
2. In the Meta App dashboard → Webhooks → Page → subscribe to `leadgen` with callback URL
   `https://<your-backend-domain>/webhooks/meta` and the same verify token.
   (Meta needs a public HTTPS URL — it will not reach `localhost`.)
3. Optional: set `META_FORM_IDS` so admins can press **Sync from Meta** on the Leads page to pull
   leads the webhook missed.
4. The Meta App must have the required permissions and access to the Page. Meta App Review /
   Live-mode approval may be required before real production leads can be retrieved.
5. Meta lead events are signature-verified using the raw request body. If Graph API retrieval
   fails, the webhook responds with a retryable error instead of acknowledging and dropping the lead.
   The CRM records the Facebook/Instagram platform, form, campaign, ad and Meta lead IDs when supplied.

Without the webhook you can still download leads from Ads Manager (or your Google Sheet) as CSV
or Excel `.xlsx` and use **Leads → Import leads** as a backup.

### Linking to other nextED systems

`EXTERNAL_SYSTEMS=nexted_platform:NextEd Platform,ielts_ai:IELTS AI by nextED` controls which
systems appear on a student's **Linked accounts** tab. Staff can link an account ID by hand.
For the **Check other systems** button, that system must offer a lookup endpoint and you set
`EXTERNAL_<KEY>_LOOKUP_URL` (+ `_API_KEY`); it is called as `GET ?phone=...&email=...` and must
answer `{ "found": true, "id": "...", "email": "..." }`.

---

## 11. Storage / Firebase Notes

Code comments throughout the backend mark exactly where to swap:
- **Student documents**: `backend/src/storage/storage.service.ts` — keep `save / createReadStream / delete` and swap the body for S3, Cloudflare R2 or Firebase Storage
- **Invoice PDFs**: `backend/src/invoices/pdf.service.ts` — swap `fs.writeFileSync` with a storage upload
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
| GET | `/auth/me` | Logged-in user and role |
| POST | `/auth/change-password` | Change own password |
| GET/POST/PATCH | `/users` | User management (admin) |
| GET | `/invoices/balance` | Balance sheet (admin, accounts) |
| GET | `/invoices/collections?month=YYYY-MM` | Collected per employee (admin, accounts) |
| GET/POST | `/leads` | List (filters, paging) / create lead |
| GET | `/leads/stats` | Counts by status, source, campaign |
| POST | `/leads/import` | CSV / TSV / Excel `.xlsx` import (multipart `file`) |
| POST | `/leads/:id/activities` | Call log / note |
| POST | `/leads/:id/convert` | Lead → collected student info |
| GET/POST | `/webhooks/meta` | Meta Lead Ads webhook (public, signed) |
| GET/POST | `/students/:id/applications` | Applications of a student |
| POST | `/applications/:id/status` | Move application in the pipeline |
| GET | `/documents?status=uploaded` | Document review queue |
| POST | `/students/:id/documents/request` | Request documents |
| POST | `/students/:id/documents` | Upload a document (multipart `file`) |
| PATCH | `/documents/:id/review` | Approve / reject |
| GET/POST | `/students/:id/external-accounts` | Linked accounts in other systems |
