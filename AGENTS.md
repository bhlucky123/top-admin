# Top-admin app: Codex instructions

## Context

This independent Git repository is the Lucky BH / Alfarah super-admin mobile app. The backend is `../Backend/`; the dealer/agent/vendor-admin app is `../FE  vendor-app/` (two spaces). Read `../AGENTS.md` for cross-project context when available.

Stack: Expo 53.0.20, expo-router 5, React Native 0.79.5, React 19, TypeScript, NativeWind, Zustand and React Query. `@/*` maps to the repository root. Keep dependency installation and lockfile changes local to this repository.

## Architecture and contracts

- `app/index.tsx` and `store/auth.ts`: username/password administrator login. The store rejects responses without `user_details.superuser`; preserve that restriction. Its user role is `ADMINISTRATOR`, unlike the vendor app's `ADMIN` alias.
- `app/_layout.tsx` and `app/(tabs)/_layout.tsx`: providers, stack and tabs. Tabs cover vendors, draws and settings.
- `app/vendor/[id].tsx`, `app/vendor-config/[id].tsx`, `hooks/use-vendor.ts`, `use-vendor-draw.ts`, `use-vendor-feature.ts`, `use-staff.ts`: vendor lifecycle, draw assignments, configuration/features and staff.
- `app/draw/[id]/`: draw details, results, winnings, reports and global limits. `hooks/use-draw.ts` provides shared draw access.
- Dashboard, extra-counts, monitoring-history, transfer-log, booking-deletion and payment screens expose cross-vendor operations. Monitoring hooks handle extra counts and actions.
- `components/`: vendor/admin/result forms, vendor filters and keyboard handling. Reuse these before introducing equivalent components.
- `utils/axios.ts`: authenticated data client with JWT injection, timing/file logging, native 204/2xx recovery, 401/503 navigation and 403 error handling. Preserve response behavior; do not introduce automatic mutation retries. Auth uses its existing direct-fetch path.
- Zustand stores the session; `providers/react-query-provider.tsx` owns React Query state. Preserve isolation/invalidation when switching accounts or vendor selection. Use NativeWind conventions from `global.css` and `tailwind.config.js`.

Feature checks use `hasFeature(codename)` with superuser bypass. UI access is not backend authorization: vendor CRUD and draw assignment require matching super-admin permissions. Verify each endpoint's supported vendor filters; do not assume all API calls are globally scoped merely because this app is for superusers.

`MULTI_VENDOR_FE_GUIDE.md` is useful for vendor concepts, role matrix and endpoint intent, but its statements about removal of calculator verification/pre-login and `?type=new` are stale relative to the backend and vendor app. Check current backend URLs/views/serializers before changing contracts. Do not propagate these stale removal instructions into the sibling client.

## Commands and tests

Run commands here:

```text
npm ci
npm start
npm run android
npm run web
npm run lint
npx tsc --noEmit
npm test -- --runInBand
npm test -- --runInBand __tests__/store/auth.test.ts
npm run test:coverage -- --runInBand
```

`npm run test:watch` is available for interactive work. `npm run ios` needs macOS/iOS tooling; Android requires SDK/JDK/device or emulator. Avoid `reset-project`, which replaces application structure.

Tests live under `__tests__/store`, `__tests__/hooks`, `__tests__/screens`. `jest.config.js` actually uses the `react-native` preset despite a jest-expo dependency. Keep the `@/` alias, transform allowlist and `jest.setup.js` native mocks aligned with imports; use `utils/__mocks__/axios.ts` for existing API mocking patterns. Start with tests covering changed behavior, then lint/type checks and broader relevant tests. Report pre-existing failures rather than changing unrelated code to hide them. Native flows still need device/emulator validation.

## Operational boundaries

`utils/config.ts` targets the live `https://alfarah.in` backend. Use a development endpoint before network-backed manual testing; vendor, result, payment and monitoring actions can alter real data. Inspect `app.json`, `eas.json` and Android settings before native/build work. Never print/commit tokens, `.env` secrets or signing credentials. Preserve existing changes and avoid generated dependencies/build output. Maintain this file as the project changes.
