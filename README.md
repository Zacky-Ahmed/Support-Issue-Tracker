# Support Issue Tracker

Project foundation using Express 5 and React with Vite. Use Node.js 22.12+ (Node 24 recommended) and npm. Backend uses CommonJS; frontend uses ES modules.

## Structure

```text
Backend/
  src/
    config/          Environment configuration
    controllers/     Presentation layer: HTTP request handlers
    middleware/      404 and centralized error handling
    models/          Future database models
    routes/          API route definitions
    services/        Business layer: validation and issue rules
    repositories/    Data layer: MongoDB operations
    validators/      Input validation used by services
    errors/          Application error types
    app.js           Express application
    server.js        Server entry point
  .env.example
  package.json
frontend/
  src/
    assets/          Images and static imports
    components/      Reusable UI components
    hooks/           Shared React hooks
    pages/           Page components
    services/        API requests
    utils/           Shared utilities
    App.jsx
    main.jsx
  .env.example
  vite.config.js
```

## Run locally

Open two terminals in this project folder.

Terminal 1:

```powershell
cd Backend
npm install
Copy-Item .env.example .env
npm run dev
```

Terminal 2:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Copy environment files only on first setup; preserve any existing local settings.
Open http://localhost:5173. The page should say **Backend connected**.
The API is available at http://localhost:5000/api/health:

```json
{ "status": "ok", "service": "Support Issue Tracker API", "database": "connected" }
```

Both development processes reload on changes. Stop them with Ctrl+C.

## Configuration

Backend PORT defaults to 5000 and CLIENT_ORIGIN defaults to http://localhost:5173.
The frontend development proxy forwards /api to port 5000. If changing the backend port, also change API_PROXY_TARGET in frontend/.env.
VITE_API_URL defaults to /api. Variables prefixed VITE_ are public and must never contain secrets.
Environment files and node_modules are excluded from Git; commit package-lock.json files.

## Checks and production

```powershell
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix Backend start
```

The frontend build produces frontend/dist. Deploy it using static hosting, with /api forwarded to the backend, or set VITE_API_URL to your deployed API URL before building. Set CLIENT_ORIGIN to the frontend origin for cross-origin requests. The Vite development proxy does not configure production hosting.

## Next implementation steps

The assessment backend is implemented: CRUD, status updates, search, filters, and overdue calculation. The frontend includes forms, table/mobile cards, deletion confirmation, and periodic overdue recalculation. Authentication is outside this assessment scope.

## GitHub

Repository: https://github.com/Zacky-Ahmed/Support-Issue-Tracker

Environment files, dependencies, and build output are excluded from version control.

## References

- Express error handling: https://expressjs.com/en/5x/guide/error-handling/
- Vite server and proxy configuration: https://vite.dev/config/server-options

## MongoDB connection

Set MONGODB_URI and MONGODB_DB_NAME in Backend/.env before starting. Keep credentials private; .env is ignored by Git. For a new setup, replace the local example URI with your MongoDB connection string if using Atlas.

Run `npm --prefix Backend run db:check` from the project root to connect and ping the configured database without writing data. The API starts only after a successful connection. GET /api/health pings MongoDB and returns HTTP 200 with database: connected, or HTTP 503 with database: unavailable. The connection closes on shutdown.

A successful ping verifies connectivity, not collection write permissions. This setup creates no collections or records.

## Create an issue

POST /api/issues with Content-Type: application/json:

```json
{
  "clientName": "Nova Tech",
  "title": "Payment gateway failing",
  "description": "Fictional example: customers cannot complete payments.",
  "priority": "High"
}
```

Success: HTTP 201 with an issue object containing the saved fields, MongoDB _id, status Open, and an ISO reportedAt timestamp. MongoDB stores the timestamp as a Date. Each POST creates a new issue.

Client name, title, and description must be non-empty strings after trimming, with maximum lengths of 120, 200, and 5000 characters respectively. Priority must be exactly Low, Medium, or High. Extra fields (including _id, status, and reportedAt) are rejected. Validation errors return HTTP 400 with a message and field errors. Malformed JSON returns 400, oversized requests return 413, and unsupported content types return 415. Unexpected server errors return a generic 500 response.

### Backend tests

Run from the repository root:

```powershell
npm --prefix Backend test
npm --prefix Backend run test:integration
```

The first command tests HTTP validation, field boundaries, generated values, and database failure handling with a stubbed database. It needs no MongoDB credentials.

The integration command uses Backend/.env and requires MongoDB read/write/delete access. It creates a fictional record with a unique test marker, reads it back to verify storage, checks invalid input is not saved, and removes only records bearing that marker in cleanup. An interrupted test may leave its temporary record behind.

## Three-layer backend architecture

Request flow: route -> controller -> service -> repository -> MongoDB. Responses return through these layers.

1. Presentation layer: routes select controllers; controllers read HTTP input and send responses. Middleware translates application errors into HTTP status codes.
2. Business layer: services validate inputs, enforce rules, and assign default status and report time. Services have no Express request/response objects and no MongoDB queries.
3. Data access layer: repositories perform MongoDB operations using the shared connection configuration. They have no HTTP responsibilities.

Validators and application errors support the business layer. Connection setup in server.js is application startup infrastructure. The health endpoint follows the same controller/service/repository flow. These are logical layers within one Express application, not separate deployed servers.

Service tests call the business layer directly to verify validation cannot be bypassed by a future non-HTTP caller. Existing HTTP and live MongoDB tests verify the entire request flow.

## Complete issue API

| Method | Endpoint | Response |
| --- | --- | --- |
| POST | /api/issues | 201, { issue } |
| GET | /api/issues | 200, { issues: [...] } |
| GET | /api/issues/:id | 200, { issue } |
| PATCH | /api/issues/:id | 200, { issue } |
| DELETE | /api/issues/:id | 204, empty body |

List results are sorted by report time descending, then ID descending. No pagination is used for this small local assessment app. Optional query parameters: search (case-insensitive literal substring in clientName OR title, maximum 200 characters), priority (Low/Medium/High), status (Open/In Progress/Resolved). Combine parameters with AND; omit a filter for All. Empty search matches everything. Unsupported, repeated, or invalid parameters return 400.

Example: GET /api/issues?search=Nova&priority=High&status=Open

PATCH accepts one or more of clientName, title, description, priority, status. The same text limits apply as creation. Status may move between any of the three allowed values, including reopening a resolved issue. Fields omitted from PATCH remain unchanged. ID, reportedAt, and isOverdue cannot be supplied or modified. Invalid IDs return 400; valid IDs with no matching issue return 404. Invalid updates do not modify the document. Concurrent edits use last-write-wins for fields included in each update.

All returned issues include isOverdue. It is true only for High priority, a status other than Resolved, and a report time strictly more than 24 hours before the server's current time. It is calculated on each request and never stored. Resolving an issue or lowering its priority removes the overdue flag. Frontend clients should refetch periodically (for example every minute) or recalculate from reportedAt so highlighting updates while a page remains open. Display UTC timestamps in the user's local timezone.

The frontend must ask for confirmation before calling DELETE; cancellation should send no request. This API performs a permanent deletion after receiving DELETE. No confirmation dialog can be displayed by the backend itself.

Tests cover create-to-delete persistence, status transitions, immutable fields, invalid IDs, missing records, combined filters, literal special-character search, ordering, validation failures, and overdue boundaries. Integration tests clean up their uniquely marked fictional records.

This backend is intended for the local assessment. It has no authentication, role permissions, or audit history, and should not be exposed as a public production service as-is.

## Frontend design and behavior

The Mouse Soft support desk uses a warm paper palette, serif headlines, a compact issue ledger, and an orange attention accent. It is fully connected to the API; demo records are not injected. Search and filters operate together on the loaded list. Use Refresh to see changes from other sessions. See frontend/README.md for browser verification details.
## Assigned Engineer

The fictional engineer roster is defined in Backend/src/config/engineers.js and exposed by GET /api/engineers. The UI loads its choices from this endpoint.

POST and PATCH /api/issues accept assignedEngineer: a roster name or an empty string for Unassigned. Creation defaults to Unassigned. Existing records without this field remain readable and appear as Unassigned; no historical records are silently changed.

An issue cannot become or remain Resolved through an update unless its resulting assignedEngineer is a valid roster member. Assigning and resolving in one PATCH is supported. Clearing the assignment on a resolved issue is rejected with HTTP 400 and an assignedEngineer field error. Reopening and clearing the assignment together is allowed. Updates compare the stored status and assignment atomically; conflicting changes return 409 and require a refresh.

GET /api/issues supports assignedEngineer=Alex%20Morgan (or another roster name) and assignedEngineer=Unassigned. This filter combines with search, priority, and status. The UI includes assignment in create/edit forms, a list column, and a combined engineer filter. Attempting to resolve an unassigned issue from the row opens its editor with guidance; no status change is sent.

Verification: 55 automated tests and 3 live MongoDB integration tests passed, including assignment persistence, invalid names/types, unassigned resolution rejection, reassignment, resolved-assignment removal rejection, legacy missing fields, combined filters, and concurrent resolve/unassign operations. Previous CRUD, timestamp, overdue, validation, and error tests also passed. Temporary integration records were cleaned up. Frontend lint and production build passed. Final browser interaction verification for this requirement was unavailable because browser control was disabled in Work settings.
