# Dev Critter

**English** | [한국어](README.ko.md)

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

## Example

<a href="https://github.com/cyh6327">
  <img
    src="./preview/focus-task-replication-preview.svg"
    width="350"
    alt="Dev Critter example"
  >
</a>

The display size can be adjusted with the `width` attribute to fit your README layout.

Live usage example: [GitHub profile](https://github.com/cyh6327)

## Requirements

- Node.js 24.x and npm
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

`POST /api/status` is protected by a separate `STATUS_TOKEN` so that only an authorized local CLI can update the displayed status.

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

The CLI reads `STATUS_TOKEN` from its process environment and does not load `.env.local` automatically. For repository-local execution, load the file through Node.js:

```bash
npm run build:cli
node --env-file=.env.local dist/src/cli.js focus
```

Make sure `.env.local` is excluded from Git.

```gitignore
.env.local
```

### 7. Deploy to Production

Deploy the project to its Production environment:

```bash
npx vercel deploy --prod
```

Use the stable Production domain assigned to your project, for example:

```text
https://YOUR-PROJECT.vercel.app
```

This domain will be used by both the local CLI and the GitHub README card.

### 8. Point the local CLI to your deployment

When self-hosting, set `DEV_CRITTER_URL` to your own Production domain.

Add it to `.env.local`:

```env
DEV_CRITTER_URL=https://YOUR-PROJECT.vercel.app
```

Then build and run the CLI:

```bash
npm run build:cli
node --env-file=.env.local dist/src/cli.js focus
```

The CLI will send the status update to:

```text
POST https://YOUR-PROJECT.vercel.app/api/status
```

You can replace `focus` with `break` or `offline`.

### 9. Make `dev-critter` available as a command

After confirming that the repository-local CLI works, build and link it so `dev-critter` can be used from any directory:

```bash
npm run build:cli
npm link
```

`npm link` exposes the package's CLI command through your local npm installation.

The CLI also needs `STATUS_TOKEN` and `DEV_CRITTER_URL` in its process environment. Configure them once for your operating system.

#### Windows (PowerShell)

Store the variables for the current Windows user:

```powershell
[Environment]::SetEnvironmentVariable("STATUS_TOKEN", "YOUR_TOKEN", "User")
[Environment]::SetEnvironmentVariable("DEV_CRITTER_URL", "https://YOUR-PROJECT.vercel.app", "User")
```

Open a new terminal after setting them.

#### macOS / Linux

Add the variables to your shell profile so they are available in new terminal sessions.

For the default macOS `zsh`, add these lines to `~/.zshrc`:

```bash
export STATUS_TOKEN="YOUR_TOKEN"
export DEV_CRITTER_URL="https://YOUR-PROJECT.vercel.app"
```

Then reload the profile:

```bash
source ~/.zshrc
```

If you use Bash instead, place the same `export` lines in the appropriate Bash startup file for your environment.

Do not commit your real `STATUS_TOKEN` or shell profile containing secrets to this repository.

After configuration, the same commands work from any directory:

```bash
dev-critter focus
dev-critter break
dev-critter offline
```

### 10. Add the card to your GitHub README

Embed the Production SVG endpoint in your GitHub profile README:

```html
<img
  src="https://YOUR-PROJECT.vercel.app/specimen.svg"
  width="350"
  alt="developer status"
>
```

The SVG URL stays the same when the status changes. The CLI updates only the externally stored state; the GitHub profile repository does not need a new commit for each status change.

GitHub may cache external images, so a newly updated status may not appear immediately in the README.

### Environment variables

Dev Critter requires the following authentication paths:

```text
Local CLI
    │
    │ STATUS_TOKEN
    ▼
POST /api/status
    │
    │ Vercel OIDC
    ▼
Private Vercel Blob
```

| Variable | Purpose | Managed by |
|---|---|---|
| `STATUS_TOKEN` | Authorizes status updates from the local CLI | User |
| `DEV_CRITTER_URL` | API origin used by the CLI; set this to your own Production deployment when self-hosting | User |
| `VERCEL_OIDC_TOKEN` | Authenticates the Vercel project when accessing Blob | Vercel |

`VERCEL_OIDC_TOKEN` is temporary and managed by Vercel.
Never commit `.env.local` or any real token value to the repository.
