# Dashflo

Dashflo is a Laravel + Inertia (React) performance dashboard for lead-generation analytics: KPIs, daily metrics, buyer/supplier/state performance, disposition and breakdown tables, and CSV exports driven by the same filters as the UI.

## Requirements

- PHP 8.2+
- Composer
- Node.js 18+ and npm
- MySQL (see [XAMPP](#xampp-mysql) below)

## Install

1. Clone the repository and enter the project directory.

2. Install PHP dependencies:

   ```bash
   composer install
   ```

3. Install JavaScript dependencies:

   ```bash
   npm install
   ```

4. Environment file:

   ```bash
   copy .env.example .env
   ```

   On macOS/Linux use `cp .env.example .env`.

5. Generate the application key:

   ```bash
   php artisan key:generate
   ```

6. Configure the database in `.env` (see [XAMPP](#xampp-mysql)).

7. Run migrations (no demo data by default):

   ```bash
   php artisan migrate
   ```

   Register your first account at `/register`, or create an administrator from the CLI:

   ```bash
   php artisan dashflo:make-admin your@email.com 'YourSecurePassword123!'
   ```

   The default Overview dashboard is created when you open the app.

   **Optional — local demo dataset** (~1k sample leads): `php artisan db:seed --class=DashfloSeeder`  
   **Optional — pre-built Overview widgets** (runs for the first user): `php artisan db:seed --class=DashboardSeeder`

   **Wipe everything and start over** (drops all tables and reruns migrations):

   ```bash
   php artisan migrate:fresh
   ```

## Run (development)

Use **two** terminals from the project root:

1. **Vite** (frontend dev server + HMR):

   ```bash
   npm run dev
   ```

2. **Laravel** (PHP application):

   ```bash
   php artisan serve
   ```

   Open the URL shown (typically `http://127.0.0.1:8000`) and register a user.

**Production assets:**

```bash
npm run build
```

## Project structure (high level)

| Path | Role |
|------|------|
| `app/Http/Controllers/DashboardController.php` | Inertia entry for the main dashboard; passes filters, metrics arrays, and sparklines. |
| `app/Http/Controllers/DashboardExportController.php` | `GET /api/export/{table}` — streams CSV using the same query string filters as the dashboard. |
| `app/Services/MetricsService.php` | **Where to add new metrics**: aggregations, daily series, sparklines, and export row shapes. |
| `app/Dashboards/Registry.php` | Singleton catalog of widget types + metrics (code-defined; tenants pick from registry, not SQL). |
| `app/Dashboards/Widgets/` | Widget type definitions (`WidgetType` subclasses). |
| `app/Dashboards/Metrics/` | Metric definitions (`Metric` subclasses wrapping `MetricsService`). |
| `app/Providers/DashboardRegistryServiceProvider.php` | Registers all widgets/metrics with the registry (see `bootstrap/providers.php` in Laravel 11). |
| `app/DTO/FilterRequest.php` | Dashboard filter state from the query string (defaults to current calendar month). |
| `resources/js/Pages/Dashboard.tsx` | Main dashboard page: KPIs, `FilterBar`, and table sections. |
| `resources/js/Components/dashboard/DataTable.tsx` | Shared TanStack table (sorting, heatmaps, optional total row). |
| `resources/js/Components/dashboard/tables/` | **Where to add new tables**: thin wrappers with column defs + `DataTable` props. |
| `resources/js/Components/dashboard/FilterBar.tsx` | Dashboard filters synced to the URL; partial Inertia reloads. |
| `resources/js/types/dashboard.ts` | TypeScript types for Inertia props and partial-reload keys. |
| `routes/web.php` | Dashboard route (`/`) and export route (`/api/export/{table}`). |

## Adding features

### New metrics (backend)

1. Extend `MetricsService` with a new method (follow existing patterns: `baseQuery()`, `FilterRequest`, caching via `remember()`).
2. Return the shape you need (array of rows for tables, scalars for KPIs).
3. Register the prop in `DashboardController@index`.
4. Add the key to `DASHBOARD_PARTIAL_RELOAD_KEYS` in `resources/js/types/dashboard.ts` if the UI should refresh it on filter change.

### New dashboard tables (frontend)

1. Add a component under `resources/js/Components/dashboard/tables/` (column defs, `DataTable`, optional `heatmapColumns` / `totalRow`).
2. Import it in `Dashboard.tsx` and pass the matching Inertia prop.
3. For CSV export, add the table slug to `DashboardExportController::TABLES` and the `match` arms, and add a `TableExportButton` with the same slug.

## XAMPP (MySQL)

Typical local setup:

- **Database name:** `dashflo`
- **User:** `root`
- **Password:** *(empty)*

In `.env`, set for example:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=dashflo
DB_USERNAME=root
DB_PASSWORD=
```

Ensure MySQL is running in XAMPP before `php artisan migrate`.

## Local -> GitHub -> Plesk workflow

This repository includes helper scripts under `scripts/deploy` to make deployments repeatable.

### 1) Local: push code to GitHub (Windows/PowerShell)

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy\local-to-github.ps1 -CommitMessage "feat: your update"
```

- Stages changes
- Creates a commit (unless there is nothing new)
- Pushes current branch to `origin`

Use `-SkipCommit` if you already committed manually.

### 2) Local: export your database dump

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy\local-db-export.ps1
```

By default this reads DB settings from `.env` and writes to `database/dumps/<db>-<timestamp>.sql`.

### 3) Plesk/VPS: deploy application code

From your Laravel root on the server (where `artisan` exists, usually `httpdocs`):

```bash
bash ./scripts/deploy/plesk-deploy.sh
```

This script will:

- Pull latest code from `origin/master` (fast-forward only)
- Install Composer dependencies
- Ensure `.env` exists
- Generate `APP_KEY` if missing
- Run `php artisan migrate --force`
- Rebuild Laravel caches
- Build frontend assets if `npm` is available

### 4) Plesk/VPS: import database dump

Upload your SQL dump to the server, then run:

```bash
bash ./scripts/deploy/plesk-db-import.sh /path/to/dump.sql
```

The import script reads DB credentials from `.env`.

### 5) Plesk hosting settings checklist

- Set domain document root to `httpdocs/public`
- Confirm `.env` is in `httpdocs/.env` (not inside `public`)
- Ensure `storage` and `bootstrap/cache` are writable

## License

MIT (see repository `LICENSE` if present).
