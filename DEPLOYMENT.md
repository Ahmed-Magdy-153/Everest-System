# Everest System — Deployment Guide

## Stack
| Layer    | Service  | Cost         |
|----------|----------|--------------|
| Frontend | Vercel   | Free         |
| Backend  | Railway  | ~$0–2 /month |
| Database | Supabase | Free tier    |

---

## Prerequisites
- GitHub account
- Vercel account (sign up with GitHub at vercel.com)
- Railway account (sign up with GitHub at railway.app)
- Supabase project already configured ✓

---

## Step 1 — Push to GitHub

```bash
# From the project root
cd D:\WoRk\Everest-System-project

git init
git add .
git commit -m "Initial commit — Everest System"
```

Create a **private** repo on GitHub named `everest-system`, then:

```bash
git remote add origin https://github.com/YOUR-USERNAME/everest-system.git
git branch -M main
git push -u origin main
```

---

## Step 2 — Deploy Backend to Railway

### 2a. Create the service
1. Go to **railway.app** → **New Project** → **Deploy from GitHub repo**
2. Select `everest-system`
3. When prompted for the root directory, type: `everest-backend`
4. Railway will auto-detect Node.js

### 2b. Set environment variables
In Railway dashboard → your service → **Variables**, add:

| Variable         | Value |
|-----------------|-------|
| `DATABASE_URL`  | Your Supabase pooler URL (from `.env`) |
| `DIRECT_URL`    | Your Supabase direct URL (from `.env`) |
| `JWT_SECRET`    | Run `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` and paste result |
| `JWT_EXPIRES_IN`| `7d` |
| `NODE_ENV`      | `production` |
| `CORS_ORIGIN`   | `https://YOUR-APP.vercel.app` ← fill after Step 3 |

### 2c. Deploy
Railway runs automatically. After deploy, copy your service URL:
```
https://everest-backend-production.up.railway.app
```

---

## Step 3 — Deploy Frontend to Vercel

### 3a. Create the project
1. Go to **vercel.com** → **New Project** → Import `everest-system` from GitHub
2. Set **Root Directory** to `everest-frontend`
3. Framework will auto-detect as **Next.js**

### 3b. Set environment variables
In Vercel → Project → **Settings** → **Environment Variables**:

| Variable               | Value |
|-----------------------|-------|
| `NEXT_PUBLIC_API_URL` | `https://everest-backend-production.up.railway.app/api` |

### 3c. Deploy
Click **Deploy**. Vercel gives you a URL:
```
https://everest-system.vercel.app
```

---

## Step 4 — Connect them

Go back to Railway → Variables, update `CORS_ORIGIN`:
```
CORS_ORIGIN=https://everest-system.vercel.app
```

Railway redeploys automatically. Done.

---

## Step 5 — Verify

Open `https://everest-system.vercel.app`, log in with:
- `admin@everest.com` / `admin123`
- `manager@everest.com` / `manager123`

Check the backend health endpoint directly:
```
https://everest-backend-production.up.railway.app/api/health
```
Should return:
```json
{ "status": "ok", "env": "production", "timestamp": "..." }
```

---

## Environment Variables Reference

### Backend (Railway)
| Variable         | Required | Description |
|-----------------|----------|-------------|
| `DATABASE_URL`  | ✅       | Supabase connection pooler URL |
| `DIRECT_URL`    | ✅       | Supabase direct connection URL |
| `JWT_SECRET`    | ✅       | Random secret ≥ 32 characters |
| `JWT_EXPIRES_IN`| Optional | Token lifetime (default: `7d`) |
| `NODE_ENV`      | ✅       | Must be `production` |
| `CORS_ORIGIN`   | ✅       | Vercel frontend URL (or comma-separated list) |
| `PORT`          | Auto     | Set automatically by Railway |

### Frontend (Vercel)
| Variable               | Required | Description |
|-----------------------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅       | Full backend URL including `/api` |

---

## Local Development

```bash
# Terminal 1 — backend
cd everest-backend
npm run dev          # starts on http://localhost:3001

# Terminal 2 — frontend
cd everest-frontend
npm run dev          # starts on http://localhost:3000
```

Make sure `everest-frontend/.env.local` has:
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

And `everest-backend/.env` has `CORS_ORIGIN=http://localhost:3000`.

---

## Re-deployment

Both services auto-deploy when you push to `main`:
```bash
git add .
git commit -m "Update: describe what changed"
git push
```

Vercel and Railway detect the push and redeploy automatically.

---

## Render (Alternative to Railway — fully free but has spindown)

If you prefer Render's free tier, the `render.yaml` file is already configured.
Import the repo on **render.com** and point root to `everest-backend`.

⚠️ **Render free tier** spins down after 15 min of inactivity.
The first request after spindown takes 30–60 seconds to respond.
For a business app, Railway ($5/month credit) is strongly preferred.
