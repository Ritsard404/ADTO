# ADTO

ACE Database and Tracking Operations for ADMS school implementation workflows.

## Data Modes

ADTO supports a reusable data-mode switch:

```env
ADTO_DATA_MODE=production
```

Use `production` for real database reads and writes.

```env
ADTO_DATA_MODE=mock
```

Use `mock` for UI testing with reusable sample schools, sessions, projects, inventory, reports, users, and report history. Mock mode is read-only and is automatically disabled in `NODE_ENV=production`.

## Local UI Testing With Mock Data

On Windows:

```powershell
npm run dev:mock
```

This enables:

- `ADTO_DATA_MODE=mock`
- `ADTO_AUTH_BYPASS=true`
- role switching in the app header

Mock mode lets testers inspect Admin, Facilitator, and School Admin screens without depending on seeded database records or writing to production data.

## Production Development

```powershell
npm run dev
```

Production-like mode reads from the configured database and allows writes based on RBAC.

## Database

Apply migrations:

```powershell
npm run prisma:deploy
```

Inspect migration status:

```powershell
npx prisma migrate status
```
