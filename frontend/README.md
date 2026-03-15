# Frontend Admin Panel

Responsive dark-mode admin panel built with React + Vite + Tailwind CSS + TypeScript (TSX).

## Features

- JWT login (`POST /api/v1/auth/login`)
- Sidebar navigation with icons: Overview, Users, Documents, Upload Document
- Users management:
  - Block / Unblock user
  - Make Admin popup (asks for login and password)
  - Revoke Admin
- Documents management:
  - List documents
  - Download file
  - Reindex document
  - Delete document
- Upload document (`pdf`, `txt`, `docx`)
- Logout confirmation modal

## Configure API

Create `.env` in `frontend/` if needed:

```bash
VITE_API_BASE_URL=https://api2.nishonow.com
```

## Run

```bash
cd frontend
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```
