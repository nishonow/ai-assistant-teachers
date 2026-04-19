# Mektep AI

Mektep is a legal and practical assistant for teachers and education workers in Kyrgyzstan.

This repository contains three main parts:
- `frontend/` - web app and admin panel
- `backend/` - API, authentication, conversations, documents, and RAG
- `bot/` - Telegram bot

## Main Routes

Public:
- `/` - landing page
- `/login` - shared login for web users and admins
- `/register` - web registration

Web app:
- `/app` - new chat / neutral state
- `/app/chat/:conversationId` - saved conversation

Admin:
- `/admin/*` - admin panel

## Project Structure

### `frontend/`
Contains:
- landing, login, and register pages
- protected web chat app
- protected admin UI

See:
- `frontend/README.md`

### `backend/`
Contains:
- auth and user handling
- document APIs
- conversation APIs
- RAG question answering
- admin APIs

See:
- `backend/README.md`

### `bot/`
Contains:
- Telegram user flow
- bot-side admin tools
- backend integration for answers and sources

See:
- `bot/README.md`

## Current Summary

- web users can register and chat
- admins can manage users and documents
- Telegram bot uses the same backend knowledge base
- web chat supports saved conversations and source downloads

For setup and implementation details, use the module-specific READMEs.
