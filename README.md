# Hypeform Composite Generator

Hypeform Composite Generator is a Vite + React web app for building model or actor composite cards (zed cards) in the browser.

You can:

- edit profile text and measurements
- upload and crop one main image plus four supporting images
- switch between English and Japanese UI labels
- export the final layout as A4 PDF or JPEG

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- `react-easy-crop` for image cropping
- `html-to-image` and `jspdf` for export

## Local Setup

Prerequisites:

- Node.js 20 or later

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

GitHub Pages deployment target:

- `https://shingoviva.github.io/hypeform-composite-generator/`

## Optional Password Gate

By default, the app opens directly into the editor.

If you want a simple password gate for a local or private deployment, create a `.env.local` file and set:

```bash
VITE_APP_PASSWORD="your-password"
```

This value is baked into the client build at build time, so it should not be treated as secure authentication for a public production deployment.

## Build

Create a production build:

```bash
npm run build
```

## Notes

- Export is optimized for A4 landscape output.
- Uploaded images stay in the browser and are not sent to a backend service.
