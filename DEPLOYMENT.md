# Deploy Enhix (Vercel + Render + MongoDB)

## Why you see "Connection error"

The Vercel frontend must know your **Render backend URL**. If `VITE_API_BASE_URL` is missing, the app tries `http://localhost:4000` in the browser, which always fails in production.

---

## 1. Render (backend)

1. Create a **Web Service** from `backend-nodejs/`
2. **Build command:** `npm install`
3. **Start command:** `npm start`
4. **Environment variables:**

| Key | Value |
|-----|--------|
| `MONGO_URI` | Your MongoDB Atlas connection string |
| `PORT` | `4000` (Render often sets `PORT` automatically—use their value if shown) |
| `FRONTEND_URL` | Your Vercel URL, e.g. `https://your-app.vercel.app` |

5. After deploy, copy your public URL, e.g. `https://enhix-api.onrender.com`

6. **Test:** open `https://YOUR-RENDER-URL.onrender.com/api/health`  
   You should see: `{"ok":true,"mongo":"connected",...}`

> Free Render services **sleep** after inactivity. The first login may take 30–60 seconds.

---

## 2. MongoDB Atlas

1. Create a cluster and database user
2. **Network Access:** allow `0.0.0.0/0` (or Render’s IPs) so Render can connect
3. Copy connection string into Render as `MONGO_URI`

---

## 3. Vercel (frontend)

1. Import the `frontend/` folder as the project root (or monorepo path `frontend`)
2. **Environment variables** (Production + Preview):

| Key | Value |
|-----|--------|
| `VITE_API_BASE_URL` | `https://YOUR-RENDER-URL.onrender.com` (no trailing slash) |

3. **Redeploy** after saving env vars (required—Vite bakes env at build time)

4. **Test:** open your Vercel site → login  
   In browser DevTools → Network, login request should go to **Render**, not `localhost`.

---

## 4. Quick checklist

- [ ] Render `/api/health` returns `ok: true`
- [ ] `VITE_API_BASE_URL` set on Vercel = exact Render URL
- [ ] Vercel redeployed after env change
- [ ] MongoDB Atlas allows connections from Render
- [ ] `MONGO_URI` set on Render

---

## Local development

```bash
# Terminal 1 – backend
cd backend-nodejs
cp .env.example .env   # fill MONGO_URI
npm install
npm start

# Terminal 2 – frontend
cd frontend
npm install
npm run dev
```

Leave `VITE_API_BASE_URL` empty locally; Vite proxies `/api` → `http://localhost:4000`.
