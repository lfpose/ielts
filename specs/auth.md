# Authentication

## Principle
No passwords, no sign-up forms. The user arrives and the site knows who they are. Two entry points: email link or direct visit (bookmark/typing the URL).

## How It Works

### Entry Point 1: Email Link
- Daily email contains a personalized URL: `{BASE_URL}/s/{token}`
- Token is a UUID assigned to each user at creation time
- Token never changes (same link works every day)
- On first visit via token URL, server sets an HTTP-only cookie (`session_token={token}`, long-lived: 1 year)

### Entry Point 2: Direct Visit (Bookmark / URL)
- User goes to `{BASE_URL}` directly (no token in URL)
- Server reads the `session_token` cookie
- If valid → redirect to `/s/{token}` (their dashboard)
- If no cookie → show landing page with "Enter your email" form

### Session Persistence
- **Primary**: HTTP-only cookie set by the server (survives browser restarts, works across tabs)
- **Fallback**: localStorage stores the token client-side (for redirect on `/`)
- Cookie is set on first token-URL visit AND on email login
- User never has to think about this — they just go to the site and it works

### Email Login (Fallback)
- Landing page at `/` shows a simple "Enter your email" form
- User enters email → server looks up token → sets cookie → redirects to dashboard
- No password needed

### Security Model
- Tokens are UUIDs — unguessable but not cryptographically signed
- Cookie: HTTP-only, SameSite=Lax, Secure in production
- Good enough for a personal practice tool
- No sensitive data beyond exercise answers
- If the user clears cookies, they just click the email link again or enter their email

## User Management
- Users are created by the admin (from the admin dashboard or settings)
- Each user has: name, email, token
- Subscription/payment model is out of scope for now — admin manually adds users

## Routes
- `GET /` — Landing page. If cookie present, redirect to dashboard. Otherwise show email form.
- `GET /s/:token` — Dashboard (validates token, sets cookie if not set, shows daily board)
- `POST /login` — Email lookup → set cookie → redirect to dashboard
- All exercise routes use the token for identification (from URL path, validated against cookie)
