# OW Routines Portal

A Next.js-based corporate dashboard for managing and executing operational routines (shell scripts) with a secure job runner system.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Components](#components)
- [API Routes](#api-routes)
- [Job Runner System](#job-runner-system)
- [Security](#security)
- [Development](#development)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js App (web/)                       │
├─────────────────────────────────────────────────────────────────┤
│  UI Layer                                                       │
│  ├── app/page.tsx          → Home dashboard                     │
│  ├── app/routines/         → Routine listing & execution        │
│  ├── app/jobs/             → Job monitoring & logs              │
│  └── app/settings/         → Configuration UI                   │
├─────────────────────────────────────────────────────────────────┤
│  API Layer                                                      │
│  ├── app/api/jobs/         → Job CRUD & execution               │
│  ├── app/api/routines/     → Routine catalog access             │
│  └── app/api/settings/     → Settings persistence               │
├─────────────────────────────────────────────────────────────────┤
│  Core Libraries                                                 │
│  ├── lib/jobs.ts           → Job runner, security, execution    │
│  └── lib/catalog.ts        → Routine catalog loader             │
├─────────────────────────────────────────────────────────────────┤
│  Data Layer (filesystem)                                        │
│  ├── data/settings.json    → User settings                      │
│  ├── data/catalog.json     → Routine definitions                │
│  └── data/jobs/<jobId>/    → Job artifacts, logs, uploads       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
ow-routines-portal/
├── routines/
│   └── catalog.json         # Original catalog (backup)
├── scripts/
│   ├── addfaultname.sh      # Shell scripts executed by jobs
│   ├── grav_batch3.sh
│   ├── load_pts2grid.sh
│   └── renfiles2.sh
└── web/                     # Next.js application
    ├── app/
    │   ├── api/
    │   │   ├── jobs/
    │   │   │   ├── route.ts              # GET/POST /api/jobs
    │   │   │   └── [id]/
    │   │   │       ├── route.ts          # GET /api/jobs/[id]
    │   │   │       ├── logs/route.ts     # GET /api/jobs/[id]/logs
    │   │   │       └── artifacts/route.ts # GET /api/jobs/[id]/artifacts
    │   │   ├── routines/
    │   │   │   └── [id]/route.ts         # GET /api/routines/[id]
    │   │   └── settings/route.ts         # GET/POST /api/settings
    │   ├── jobs/
    │   │   ├── page.tsx                  # Jobs list page
    │   │   └── [id]/page.tsx             # Job detail page
    │   ├── routines/
    │   │   ├── page.tsx                  # Routines list page
    │   │   └── [id]/page.tsx             # Run routine form
    │   ├── settings/page.tsx             # Settings form
    │   ├── page.tsx                      # Home dashboard
    │   ├── layout.tsx                    # Root layout with shell
    │   └── globals.css                   # Global styles
    ├── components/
    │   ├── Header.tsx                    # Top header bar
    │   ├── Sidebar.tsx                   # Left navigation
    │   └── LayoutShell.tsx               # Layout wrapper
    ├── lib/
    │   ├── jobs.ts                       # Job runner core
    │   └── catalog.ts                    # Catalog loader
    └── data/
        ├── catalog.json                  # Routine definitions
        ├── settings.json                 # User settings (created on save)
        └── jobs/                         # Job data (created per job)
            └── <jobId>/
                ├── job.json              # Job metadata
                ├── uploads/              # Uploaded files
                ├── outputs/              # Script outputs (artifacts)
                └── logs/
                    ├── stdout.log
                    └── stderr.log
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MOCK_MODE` | `undefined` | Set to `"1"` to simulate job execution without running scripts |

Example:
```bash
MOCK_MODE=1 npm run dev
```

### Security Constants (`lib/jobs.ts`)

| Constant | Value | Description |
|----------|-------|-------------|
| `MAX_RUNNING_JOBS` | `2` | Maximum concurrent jobs (returns 429 when exceeded) |
| `MAX_PARAM_LENGTH` | `200` | Maximum character length for parameter values |
| `MAX_FILENAME_LENGTH` | `120` | Maximum character length for sanitized filenames |
| `ALLOWED_PARAM_CHARS` | `[A-Za-z0-9_\-. ]` | Regex pattern for allowed parameter characters |
| `ALLOWED_FILENAME_CHARS` | `[A-Za-z0-9._-]` | Regex pattern for allowed filename characters |

### Settings (`data/settings.json`)

| Field | Required | Description |
|-------|----------|-------------|
| `OW_HOME` | Yes | Path to OW installation directory |
| `WORKSPACE_ROOT` | Yes | Path to workspace root directory |
| `OW_ENV_SCRIPT` | No | Path to environment setup script (sourced before execution) |
| `DEFAULT_DIST` | No | Default value for DIST parameter |
| `DEFAULT_PD_OW` | No | Default value for PD_OW parameter |
| `DEFAULT_IP_OW` | No | Default value for IP_OW parameter |
| `DEFAULT_INTERP_ID` | No | Default value for INTERP_ID parameter |

---

## Components

### UI Components (`components/`)

#### `LayoutShell.tsx`
Wrapper component that provides the dashboard layout structure.

```tsx
<LayoutShell>
  {children}  // Page content rendered here
</LayoutShell>
```

#### `Sidebar.tsx`
Left navigation panel with route links.

- Uses `usePathname()` for active state highlighting
- Navigation items: Home, Routines, Jobs, Settings

#### `Header.tsx`
Top header bar displaying:
- App title: "OW Routines Portal"
- User info placeholder

### Page Components (`app/`)

#### Home (`page.tsx`)
- Displays first 4 routines from catalog as cards
- Shows recent jobs (last 5)
- Links to routines and jobs pages

#### Routines List (`routines/page.tsx`)
- Server component loading routines from catalog
- Displays routines as clickable cards
- Shows param count and file input count

#### Run Routine (`routines/[id]/page.tsx`)
- Client component with form for routine execution
- Dynamic parameter inputs based on catalog definition
- File upload inputs with multiple file support
- Inline validation errors
- Redirects to job detail on success

#### Jobs List (`jobs/page.tsx`)
- Client component with auto-refresh (3s interval)
- Table view with status badges
- Polling stops when component unmounts

#### Job Detail (`jobs/[id]/page.tsx`)
- Displays job metadata and parameters
- Tabbed log viewer (stdout/stderr)
- Auto-scrolling logs
- 2-second polling while job is running
- Artifact download links

#### Settings (`settings/page.tsx`)
- Form for all settings fields
- Loads current settings on mount
- Client-side and server-side validation
- Success/error feedback

---

## API Routes

### Jobs API

#### `GET /api/jobs`
Returns array of all jobs, sorted by `createdAt` descending.

**Response:**
```json
[
  {
    "id": "uuid",
    "routineId": "load_pts2grid",
    "params": { "DIST": "2.5" },
    "files": ["gridlist.csv"],
    "status": "succeeded",
    "createdAt": "2026-01-30T10:00:00.000Z",
    "startedAt": "2026-01-30T10:00:01.000Z",
    "finishedAt": "2026-01-30T10:00:05.000Z"
  }
]
```

#### `POST /api/jobs`
Creates and executes a new job.

**Request:** `multipart/form-data`
- `routineId` (string, required): ID from catalog
- `params` (JSON string): Parameter key-value pairs
- `<fileInputName>` (File): Uploaded files

**Response:** `201 Created`
```json
{
  "id": "new-job-uuid",
  "routineId": "load_pts2grid",
  "status": "queued",
  ...
}
```

**Error Responses:**
- `400`: Validation error (missing params, invalid routine, etc.)
- `429`: Too many jobs running (concurrency limit)
- `500`: Server error

#### `GET /api/jobs/[id]`
Returns single job details.

#### `GET /api/jobs/[id]/logs`
Returns job logs.

**Response:**
```json
{
  "stdout": "...",
  "stderr": "..."
}
```

**Query Parameters:**
- `tail` (number): Return only last N lines

#### `GET /api/jobs/[id]/artifacts`
Lists output files or downloads a specific file.

**List artifacts:**
```json
{
  "artifacts": ["result.txt", "output.csv"]
}
```

**Download file:** `?file=result.txt`
Returns file with `Content-Disposition: attachment`

### Routines API

#### `GET /api/routines/[id]`
Returns single routine definition from catalog.

### Settings API

#### `GET /api/settings`
Returns current settings or defaults.

#### `POST /api/settings`
Saves settings to `data/settings.json`.

**Request:**
```json
{
  "OW_HOME": "/path/to/ow",
  "WORKSPACE_ROOT": "/path/to/workspace"
}
```

---

## Job Runner System

### Core Library (`lib/jobs.ts`)

#### Exported Functions

| Function | Description |
|----------|-------------|
| `createJob(routineId, params, files)` | Validates and creates a new job |
| `getJob(jobId)` | Retrieves job metadata |
| `listJobs()` | Lists all jobs (newest first) |
| `updateJobStatus(jobId, updates)` | Updates job.json |
| `getJobDir(jobId)` | Returns path to job directory |
| `getJobLogs(jobId, type, tail?)` | Reads log files |
| `listArtifacts(jobId)` | Lists output files |
| `getArtifactPath(jobId, fileName)` | Gets validated artifact path |
| `canStartJob()` | Checks concurrency limit |
| `getRunningJobCount()` | Returns current running count |
| `safeFilename(name)` | Sanitizes filename |
| `validateParamValue(key, value)` | Validates parameter value |

#### Job Lifecycle

```
1. POST /api/jobs
   ↓
2. createJob() validates:
   - Concurrency limit (MAX_RUNNING_JOBS)
   - Routine exists in catalog (whitelist)
   - Parameters match catalog definition
   - Filenames are safe
   ↓
3. Job created with status: "queued"
   ↓
4. executeJob() called asynchronously
   ↓
5. Status updated to: "running"
   ↓
6. Script executed via child_process.spawn
   - Working directory: job/uploads/
   - Params passed as env vars
   - stdout/stderr captured to logs/
   ↓
7. Status updated to: "succeeded" or "failed"
```

#### Environment Variables Passed to Scripts

| Variable | Source | Description |
|----------|--------|-------------|
| `OW_HOME` | settings.json | OW installation path |
| `WORKSPACE_ROOT` | settings.json | Workspace root path |
| `JOB_DIR` | Generated | Full path to job directory |
| `JOB_UPLOADS` | Generated | Path to uploads/ subdirectory |
| `JOB_OUTPUTS` | Generated | Path to outputs/ subdirectory |
| `<PARAM_KEY>` | User input | Each validated parameter |

---

## Security

### Whitelist Enforcement

1. **Routine ID**: Must exist in `data/catalog.json`
2. **Script Path**: Derived from catalog entry, never from user input
3. **Parameter Keys**: Must match keys defined in routine's `params` array

### Input Validation

#### Parameters
- Only allowed keys from catalog
- Max length: 200 characters
- Allowed chars: `A-Za-z0-9_\-. ` (alphanumeric, underscore, hyphen, period, space)

#### Filenames
- Rejects path traversal (`..`)
- Rejects path separators (`/`, `\`)
- Sanitizes to: `A-Za-z0-9._-`
- Max length: 120 characters

### Directory Isolation

```
data/jobs/<jobId>/
├── uploads/    # ONLY uploaded files go here
├── outputs/    # ONLY script outputs go here
└── logs/       # ONLY logs go here
```

### Concurrency Control

- In-memory Set tracks running jobs
- Default limit: 2 concurrent jobs
- Returns HTTP 429 when exceeded

### Command Injection Prevention

- Parameters passed via environment variables (not shell interpolation)
- Script paths come from catalog (not user input)
- All user strings validated before use

---

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
cd web
npm install
```

### Running

```bash
# Development mode
npm run dev

# Mock mode (no script execution)
MOCK_MODE=1 npm run dev

# Production build
npm run build
npm start
```

### Adding a New Routine

1. Add script to `scripts/` directory
2. Add entry to `web/data/catalog.json`:

```json
{
  "id": "my_routine",
  "name": "My Routine",
  "description": "Does something useful",
  "script": "scripts/my_script.sh",
  "params": [
    { "key": "PARAM1", "label": "Parameter 1", "required": true }
  ],
  "fileInputs": [
    { "name": "input", "label": "Input File", "accept": ".csv", "multiple": false }
  ]
}
```

### Catalog Schema

```typescript
interface Routine {
  id: string;           // Unique identifier (URL-safe)
  name: string;         // Display name
  description: string;  // Short description
  script: string;       // Path relative to project root
  params: Param[];      // Parameter definitions
  fileInputs: FileInput[]; // File upload definitions
}

interface Param {
  key: string;          // Environment variable name
  label: string;        // Display label
  required?: boolean;   // Is this param required?
}

interface FileInput {
  name: string;         // Form field name
  label: string;        // Display label
  accept?: string;      // File type filter (e.g., ".csv")
  multiple?: boolean;   // Allow multiple files?
}
```

### Modifying Security Limits

Edit constants in `web/lib/jobs.ts`:

```typescript
const MAX_RUNNING_JOBS = 2;      // Increase for higher concurrency
const MAX_PARAM_LENGTH = 200;    // Increase for longer params
const MAX_FILENAME_LENGTH = 120; // Increase for longer filenames
```

---

## License

Internal use only.
