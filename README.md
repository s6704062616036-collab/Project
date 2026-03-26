# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## DB / Mock Switch (No-DB Testing)

This project includes a `DB_SWITCH` layer for testing without a real database.

- Runtime toggle: click the floating switch at bottom-right (`DB` / `MOCK`).
- Default mode by env: set `VITE_DATA_MODE=api` or `VITE_DATA_MODE=mock`.
- Hide switch by env: set `VITE_HIDE_DATA_MODE_SWITCH=true`.
- Demo mock account: `demo@myweb.local` / `123456`.

### DB_SWITCH files (easy to find/remove)

- `src/services/dataMode/DataModeSwitch.jsx`
- `src/services/dataMode/MockDatabaseStore.jsx`
- `src/services/dataMode/MockApiRouter.jsx`
- `src/app/DataModeSwitchWidget.jsx`
Integration points:
- `src/services/HttpClient.jsx`
- `src/app/App.jsx`

Search keyword: `DB_SWITCH`
