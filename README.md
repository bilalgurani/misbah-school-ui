# MisbahSchool

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.1.6.

## Adding a school

One codebase serves every school. A school's name, logo, banner, login background, attendance cut-off and API address live in a folder under `schools/<name>/` (copy `schools/_template/`):

```
schools/iqra/
  school.config.json   name, titles, apiUrl, lowAttendancePct, and the image file names
  logo.jpeg            sidebar and login
  banner.jpeg          top bar (about 4:1 wide, it is shown at most 44px tall on phones)
  login-bg.jpg         login page background
  icon.png             browser tab and phone home-screen icon (square, 192x192 or larger)
```

Images can be PNG, JPEG or WebP (WebP is smallest), for all four, including the icon. The file names are set in `school.config.json` (`logo`, `banner`, `loginBackground`, `icon`, each starting with `school/`), and the build reads the real format from the file, not the extension. The icon must be square and at least 192x192; older iPhones may ignore a WebP icon on the home screen, so use PNG there if it matters.

Build that school with `SCHOOL=iqra npm run build` (set `SCHOOL` as a build variable on the host). The build stops and lists the problem if an image is missing or not a real image, or the icon is not square and large enough. It creates the home-screen manifest from the config. Without `SCHOOL`, the default school in `public/school/` is used.

Each school also needs its own backend and database. Set these on its backend: `SCHOOL_NAME` (printed on receipts and report cards, and its words are refused in passwords), `CORS_ALLOWED_ORIGINS` (that school's frontend URL), `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, and a new `JWT_SECRET`. Optional: `EXAM_GRADE_SCALE` and `TRACKING_START_DATE`. `apiUrl` in the school's config must point at that backend. The page security policy in `src/index.html` allows `https://*.up.railway.app`; add a school's own domain to `connect-src` if it uses one.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

### Local UI with the production backend

`npm run dev` (or `npm start`) serves the UI on localhost and forwards `/api` to the production backend through the dev
server proxy ([proxy.conf.js](proxy.conf.js)), so no backend or CORS change is needed. Open
[http://localhost:4200/login](http://localhost:4200/login) and sign in with your production account.
This affects real data: anything saved on pages other than the dashboard changes live records.

To use a backend on your own machine instead, set `apiUrl` in `src/environments/environment.ts` to
`http://localhost:8080/api`. Production builds are not affected by any of this.

### Dashboard screenshots

In local development, `/dashboard` shows sample data in all six cards, all four charts, the
academic-year strip, and the pending attendance details. Only dashboard data is mocked. Set
`mockDashboard` to `false` in `src/environments/environment.ts` to see live numbers.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
