# Daily Email

## Purpose
One email per day. Gets the user to click and start practicing. Nothing more.

## Trigger
- Sent automatically after the daily board is generated (cron job)
- Can be triggered manually from admin dashboard
- Sent via Resend API

## Recipients
- All emails listed in the `recipients` setting
- Each recipient gets the same email but with their personal token link

## Content

### Subject Line
`Tu práctica de hoy está lista`

No variation needed. Same subject every day — it becomes a habit trigger.

### Body
Minimal HTML email. One CTA.

```
Hola {name},

Tus 5 ejercicios de hoy están listos.
Tema: {topic}

[Comenzar →]  (button linking to {BASE_URL}/s/{token})

— IELTS Daily
```

### Design
- White background, minimal styling
- Playfair Display for the greeting (or fall back to Georgia)
- One prominent button: red background (`#CC0000`), white text, rounded
- No images, no heavy HTML — fast loading, works everywhere
- Max width: 480px, centered
- Footer: small muted text with app name

## Error Handling
- If Resend fails, log error in email_log table with error message
- Do not retry automatically — admin can re-send manually
- Board generation should NOT fail if email fails (they're independent)
