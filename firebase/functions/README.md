# Daily Email Backup (Firebase Functions)

This function sends a daily CSV backup email of submitted user progress from Firestore.

## 1) Prerequisites

- Firebase project already created (`sambhavnatharpan`)
- Firestore enabled
- Billing enabled in Firebase project (required for scheduled functions)
- SMTP credentials (Gmail app password or another SMTP provider)

## 2) Install

Run in `firebase/functions`:

```bash
npm install
```

## 3) Configure env

Copy `.env.example` to `.env` and fill values:

- `ADMIN_BACKUP_EMAIL` = admin email receiving backup
- SMTP keys:
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_SECURE`
  - `SMTP_USER`
  - `SMTP_PASS`
  - `SMTP_FROM`
- Optional schedule:
  - `DAILY_BACKUP_CRON` (default `0 22 * * *`)
  - `DAILY_BACKUP_TIMEZONE` (default `Asia/Kolkata`)

## 4) Deploy

From `firebase/functions`:

```bash
npm run deploy
```

Or from repo root:

```bash
firebase deploy --only functions
```

## 5) What it sends

- Looks for docs in `progress` where:
  - `dateKey == today`
  - `submitted == true`
- Joins matching account info from `accounts`
- Sends CSV attachment:
  - `daily-niyam-backup-YYYY-MM-DD.csv`

## 6) Function name

- `sendDailySubmissionBackup`
