# Support Issue Tracker

Project foundation using Express 5 and React with Vite. Use Node.js 22.12+ (Node 24 recommended) and npm. Backend uses CommonJS; frontend uses ES modules.

## Structure

```text
Backend/
  src/
    config/          Environment configuration
    controllers/     HTTP request handlers
    middleware/      404 and centralized error handling
    models/          Future database models
    routes/          API route definitions
    services/        Future business logic
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

MongoDB is connected using the official Node.js driver. Add issue models/services/controllers/routes and build issue list and creation pages next. Issue creation is implemented. Listing, editing, deleting, and authentication are not implemented yet.

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
