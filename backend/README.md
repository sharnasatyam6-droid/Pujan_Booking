# Backend (planned)

This folder is reserved for the next phase. The current project is intentionally frontend-only.

Planned responsibilities:
- Validate and accept booking requests through an API.
- Store requests in a persistent database.
- Provide a private way for the pujari/admin to review and update booking status.
- Keep secrets and database credentials in environment variables, never in frontend JavaScript.
- Add rate limiting / spam protection and a privacy-conscious retention policy.

For Vercel, the API can later be implemented as serverless functions under `api/` or as a separately deployed backend service. The current demo form does not send or save personal information.
