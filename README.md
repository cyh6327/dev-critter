# Dev Critter

Dev Critter turns a GitHub profile README into a small public workspace that reflects the developer's **most recently observed status**.

Update your status from a local CLI:

```bash
dev-critter focus
dev-critter break
dev-critter offline
```

The current state is stored externally and rendered through a fixed SVG endpoint, so changing your status does **not** require committing or pushing changes to your GitHub profile repository.

```text
Local CLI
    ↓
Status update API
    ↓
Private state storage
    ↓
Dynamic SVG
    ↓
GitHub README
```

Rather than claiming real-time presence, Dev Critter presents the latest observation together with its UTC timestamp.

```text
status            : FOCUS
last observation  : 07 Aug 2026 · 04:08 UTC
```

The status card is styled as a small specimen observation log featuring an ASCII critter, dry clinical notes, and state-specific observations.

## Requirements

- Node.js and npm
- A Vercel account
- A Vercel project
- A Private Vercel Blob store connected to the project

Dev Critter uses Vercel OIDC authentication for Blob access.
A separate `STATUS_TOKEN` is used to authorize status updates from the local CLI.

## Setup

### 1. Install dependencies

```bash
npm install
```

The Vercel CLI is installed as a project development dependency, so the commands below use `npx vercel` rather than requiring a global installation.

### 2. Link the local project to Vercel

```bash
npx vercel link
```

Select the Vercel project that will host Dev Critter.

### 3. Create and connect a Private Vercel Blob store

Create a **Private Vercel Blob** store in Vercel and connect it to the Dev Critter project.

Dev Critter uses Vercel's OIDC-based authentication for Blob access. A long-lived `BLOB_READ_WRITE_TOKEN` is not required for the default setup.

When running locally, Vercel provides a temporary `VERCEL_OIDC_TOKEN` through the linked project environment. Do not create or commit this token manually.

### 4. Generate a status token

`POST /status` is protected by a separate `STATUS_TOKEN` so that only an authorized local CLI can update the displayed status.

Generate a random token:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Keep the generated value secret.

### 5. Add `STATUS_TOKEN` to Vercel

Add the generated token to the Production environment:

```bash
npx vercel env add STATUS_TOKEN production --sensitive
```

For local development, add the **same value** to the Development environment:

```bash
npx vercel env add STATUS_TOKEN development
```

Preview configuration is only necessary if Preview deployments are used.

You can verify the configured variables with:

```bash
npx vercel env ls
```

### 6. Pull the local environment

Download the Development environment variables:

```bash
npx vercel env pull .env.local
```

This creates a local `.env.local` containing the environment values required for development, including the Vercel-managed OIDC token and the configured `STATUS_TOKEN`.

Make sure `.env.local` is excluded from Git.

```gitignore
.env.local
```

### Environment variables

Dev Critter requires the following authentication paths:

```text
Local CLI
    │
    │ STATUS_TOKEN
    ▼
POST /status
    │
    │ Vercel OIDC
    ▼
Private Vercel Blob
```

| Variable | Purpose | Managed by |
|---|---|---|
| `STATUS_TOKEN` | Authorizes status updates from the local CLI | User |
| `VERCEL_OIDC_TOKEN` | Authenticates the Vercel project when accessing Blob | Vercel |

`VERCEL_OIDC_TOKEN` is temporary and managed by Vercel.
Never commit `.env.local` or any real token value to the repository.