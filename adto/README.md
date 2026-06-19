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

## Project Structure

The current workspace is a Next.js App Router application under `src/`. Routes live in `src/app`, shared infrastructure lives in `src/lib`, and production feature logic lives in `src/features`.

```txt
adto/
  docs/
    adms-excel-source-map.md
    user-guide/
      how-to-navigate-adto.md
      user-guide-index.md
  legacy/
    Colegio de la Immaculada Concepcion - Gorordo - ACE Sessions 2025 -2026.xlsx
  prisma/
    migrations/
    schema.prisma
    seed.ts
  public/
  scripts/
    import-adms-workbook.ts
  src/
    app/
      (auth)/
        login/
          page.tsx
      (protected)/
        calendar/
          page.tsx
        dashboard/
          page.tsx
          _actions/
          _components/
          _services/
            _dto/
            _mappers/
            _validators/
          store/
        facilitators/
          page.tsx
          _actions/
          _components/
          _services/
            _dto/
            _mappers/
            _validators/
          store/
        inventory/
          page.tsx
          _actions/
          _components/
          _services/
            _dto/
            _mappers/
            _validators/
          store/
        media/
          page.tsx
          _actions/
          _components/
          _services/
            _dto/
            _mappers/
            _validators/
          store/
        reports/
          page.tsx
          _actions/
          _components/
          _services/
            _dto/
            _mappers/
            _validators/
          store/
          download/
            route.ts
          official/
            route.ts
        schools/
          page.tsx
          _actions/
          _components/
          _services/
            _dto/
            _mappers/
            _validators/
          store/
        sessions/
          page.tsx
          _actions/
          _components/
          _services/
            _dto/
            _mappers/
            _validators/
          store/
        settings/
          page.tsx
          _actions/
          _components/
          _services/
            _dto/
            _mappers/
            _validators/
          store/
        error.tsx
        layout.tsx
        loading.tsx
      globals.css
      layout.tsx
      page.tsx
    components/
      brand/
      common/
      dashboard/
      forms/
      layout/
      sessions/
      ui/
    constants/
      navigation.ts
    features/
      admin/
        actions/
        schemas/
      auth/
        actions/
        schemas/
      dashboard/
        services/
      facilitator/
        actions/
        schemas/
        services/
      import-export/
        services/
      inventory/
        services/
      reports/
        services/
      schools/
        services/
      sessions/
        services/
    lib/
      supabase/
      auth.ts
      mock-adms-data.ts
      prisma.ts
      runtime-mode.ts
      test-auth.ts
      utils.ts
    types/
      database.ts
```

Feature work must follow this feature-owned layout under `src/features`:

```txt
src/features/<feature-name>/
  actions/       # server actions and mutation entry points
  components/    # feature UI only
  constants/     # feature-specific constants
  dto/           # input/output contracts
  hooks/         # feature-specific hooks
  schemas/       # Zod schemas
  services/      # business logic and Prisma access
  types/         # feature-specific types
  utils/         # feature-only helpers
  validators/    # validation functions when separate from schemas
  index.ts       # public exports when useful
```

Implementation rules:

- Put feature services, server actions, DTOs, schemas, validators, and feature-specific business logic inside `src/features/<feature-name>/`.
- Keep `page.tsx` as composition only.
- Use `src/lib/*` only for true cross-feature infrastructure such as Prisma, Supabase, auth, runtime mode, utilities, or temporary mock data.
- When replacing mock/shared implementation, migrate the relevant logic into the owning feature folder instead of adding more feature code to broad shared folders.
- Do not create parallel routes, services, validators, DTOs, or UI components when an existing feature-local module can be extended safely.

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
