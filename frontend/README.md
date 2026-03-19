# Frontend

React + Vite + TypeScript frontend for Mugallim AI.

It includes two main UI areas:
- public web app for users
- protected admin panel

## Main Routes

Public:
- `/`
- `/login`
- `/register`

Protected user app:
- `/app`
- `/app/chat/:conversationId`

Protected admin app:
- `/admin/*`

## Features

- shared login for web users and admins
- saved conversations
- rename chat
- delete one chat
- delete all history
- sources panel
- source download from cited results
- responsive web chat and admin UI

## Environment

Create `.env` in `frontend/` if needed:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Run

```bash
cd frontend
npm install
npm run dev
```

## Check

```bash
npx tsc --noEmit
npm run build
```
