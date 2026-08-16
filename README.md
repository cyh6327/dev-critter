# Dev Critter

**English** | [한국어](README.ko.md)

Dev Critter turns a GitHub profile README into a small public workspace that reflects the developer's **most recently observed status**.

Choose either the local CLI or the optional Desktop Tray to update your status.

CLI:

```bash
dev-critter focus
dev-critter break
dev-critter offline
```

Desktop Tray:

- choose `Focus`, `Break`, or `Offline` from the tray/menu bar;
- configure the deployment URL and status token in `Settings...`;
- keep the last successful Tray status across restarts.

The current state is stored externally and rendered through a fixed SVG endpoint, so changing your status does **not** require committing or pushing changes to your GitHub profile repository.

```text
CLI or Desktop Tray
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

Both clients update the same remote state. The CLI is well suited for terminal and scripting workflows, while the Tray provides a persistent desktop control path on Windows and macOS. You can use either one independently or use both, but state changes made through another client are not automatically synchronized back to the Tray.

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

## Quick start

### 1. Prepare the Vercel project

After cloning the repository, run these commands from the project root:

```bash
npm install
npx vercel link
```

Create a **Private Vercel Blob** store in Vercel and connect it to the Dev Critter project.

### 2. Register the status token and deploy to Production

Generate a random `STATUS_TOKEN`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add the **same value** to Production and Development, pull the local environment, and deploy:

```bash
npx vercel env add STATUS_TOKEN production --sensitive
npx vercel env add STATUS_TOKEN development
npx vercel env pull .env.local
npx vercel deploy --prod
```

After deployment, note your Production domain:

```text
https://YOUR-PROJECT.vercel.app
```

### 3. Choose a status client

#### CLI

Add the Production domain to `.env.local`:

```env
DEV_CRITTER_URL=https://YOUR-PROJECT.vercel.app
```

Build and run it:

```bash
npm run build:cli
node --env-file=.env.local dist/src/cli.js focus
```

To use `dev-critter` from any directory, follow the detailed **CLI** setup below.

#### Desktop Tray

Windows:

```powershell
.\tray\package-windows.ps1
```

macOS:

```bash
bash tray/package-macos.sh
```

Launch the Tray, then enter these values in `Settings...`:

```text
Server URL   : https://YOUR-PROJECT.vercel.app
Status token : YOUR_TOKEN
```

### 4. Add the card to your GitHub README

```html
<img
  src="https://YOUR-PROJECT.vercel.app/specimen.svg"
  width="350"
  alt="developer status"
>
```

Then change `focus`, `break`, or `offline` through the CLI or Tray.

---

## Requirements

Common self-hosting requirements:

- Node.js 24.x and npm
- A Vercel account
- A Vercel project
- A Private Vercel Blob store connected to the project

Dev Critter uses Vercel OIDC authentication for Blob access.
A separate `STATUS_TOKEN` authorizes status updates from either client.

Client-specific requirements:

- **CLI:** Node.js 24.x and npm on the machine where the command runs
- **Desktop Tray builder:** JDK 17 or later on the target operating system
- **Desktop Tray end user:** no Java or JDK installation; the packaged app includes its runtime

Self-contained Tray packages are supported for Windows and macOS.

## Detailed setup

### Vercel / Blob setup

#### 1. Install dependencies

```bash
npm install
```

The Vercel CLI is installed as a project development dependency, so the commands below use `npx vercel` rather than requiring a global installation.

#### 2. Link the local project to Vercel

```bash
npx vercel link
```

Select the Vercel project that will host Dev Critter.

#### 3. Create and connect a Private Vercel Blob store

Create a **Private Vercel Blob** store in Vercel and connect it to the Dev Critter project.

Dev Critter uses Vercel's OIDC-based authentication for Blob access. A long-lived `BLOB_READ_WRITE_TOKEN` is not required for the default setup.

When running locally, Vercel provides a temporary `VERCEL_OIDC_TOKEN` through the linked project environment. Do not create or commit this token manually.

#### 4. Generate a status token

`POST /api/status` is protected by a separate `STATUS_TOKEN` so that only an authorized CLI or Tray client can update the displayed status.

Generate a random token:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Keep the generated value secret.

#### 5. Add `STATUS_TOKEN` to Vercel

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

#### 6. Pull the local development environment

Download the Development environment variables used for local development and verification:

```bash
npx vercel env pull .env.local
```

This stores the Development environment values configured in Vercel in a local `.env.local` file.

Make sure `.env.local` is excluded from Git.

```gitignore
.env.local
```

#### 7. Deploy to Production

Deploy the project to its Production environment:

```bash
npx vercel deploy --prod
```

Use the stable Production domain assigned to your project, for example:

```text
https://YOUR-PROJECT.vercel.app
```

This domain will be used by the selected status client and the GitHub README card.

### CLI

The CLI and Desktop Tray update the same remote Dev Critter state:

```text
POST https://YOUR-PROJECT.vercel.app/api/status
```

Choose the client that fits your workflow. They may also be used together, although the Tray does not automatically synchronize status changes made through the CLI or another client.

The CLI can be used in two ways.

**Run it from the repository**

Add your Production domain to the `.env.local` file created earlier:

```env
DEV_CRITTER_URL=https://YOUR-PROJECT.vercel.app
```

Then explicitly load `.env.local` with Node.js `--env-file` when running the CLI:

```bash
npm run build:cli
node --env-file=.env.local dist/src/cli.js focus
```

Replace `focus` with `break` or `offline` as needed.

**Run it as a global command**

To make `dev-critter` available from any directory, build and link it:

```bash
npm run build:cli
npm link
```

The global `dev-critter` command does not automatically read `.env.local`. Instead, it uses `STATUS_TOKEN` and `DEV_CRITTER_URL` from the process environment.

Windows PowerShell:

```powershell
[Environment]::SetEnvironmentVariable("STATUS_TOKEN", "YOUR_TOKEN", "User")
[Environment]::SetEnvironmentVariable("DEV_CRITTER_URL", "https://YOUR-PROJECT.vercel.app", "User")
```

Open a new terminal after setting them.

macOS or Linux shell profile:

```bash
export STATUS_TOKEN="YOUR_TOKEN"
export DEV_CRITTER_URL="https://YOUR-PROJECT.vercel.app"
```

After configuration, run:

```bash
dev-critter focus
dev-critter break
dev-critter offline
```

### Desktop Tray

The Tray is implemented with the standard Java `SystemTray` API and has no external Tray dependency. Packages must be built on their target operating system.

Windows PowerShell:

```powershell
.\tray\package-windows.ps1
```

The Windows app image is created at `tray/build/package/Dev Critter`. Run `Dev Critter.exe` from that directory.

macOS:

```bash
bash tray/package-macos.sh
```

The macOS app image is created at `tray/build/package/Dev Critter.app`. The `Package macOS tray` GitHub Actions workflow also compiles and verifies the app image on `macos-latest`.

Both app images include the required Java runtime, including HTTPS crypto support, so end users do not need Java or a JDK.

After launching the Tray, open `Settings...` and enter:

- **Server URL:** `https://YOUR-PROJECT.vercel.app`
- **Status token:** the same `STATUS_TOKEN` configured in Vercel

The settings are stored locally. A status selection updates the Tray only after the API request succeeds; authentication, network, and API failures keep the previous displayed status. The last successful Tray status is restored when the app starts again.

The current packages are unsigned and not notarized. Linux packaging, automatic startup, automatic updates, and external status synchronization are outside the current scope.

Never commit `.env.local`, a real `STATUS_TOKEN`, or any shell profile containing secrets.

### GitHub README card

Embed the Production SVG endpoint in your GitHub profile README:

```html
<img
  src="https://YOUR-PROJECT.vercel.app/specimen.svg"
  width="350"
  alt="developer status"
>
```

The SVG URL stays the same when the status changes. The selected client updates only the externally stored state; the GitHub profile repository does not need a new commit for each status change.

GitHub may cache external images, so a newly updated status may not appear immediately in the README.

### Environment variables

Dev Critter requires the following authentication paths:

```text
CLI or Desktop Tray
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
| `STATUS_TOKEN` | Authorizes status updates from the CLI or Desktop Tray | User |
| `DEV_CRITTER_URL` | API origin used by the selected client; set this to your own Production deployment when self-hosting | User |
| `VERCEL_OIDC_TOKEN` | Authenticates the Vercel project when accessing Blob | Vercel |

`VERCEL_OIDC_TOKEN` is temporary and managed by Vercel. The CLI reads the two user-managed values from its environment; the Tray stores them locally through `Settings...`.
Never commit `.env.local` or any real token value to the repository.
