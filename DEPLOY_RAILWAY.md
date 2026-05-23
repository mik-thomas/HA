# Railway deploy troubleshooting

## Error: "Failed to fetch repository files"

This happens **before** the build — Railway cannot read your GitHub repo. The repo itself is fine (public, clones normally). Fix the Railway ↔ GitHub link:

### 1. Reconnect GitHub (most common fix)

1. Railway → your **project** → **service** → **Settings** → **Source**
2. **Disconnect** the repository
3. **Connect** again → choose `mik-thomas/HA`
4. Set **Root Directory** to `ha-device-manager` (or use branch `railway-deploy` below with root `/`)
5. **Deploy**

### 2. Railway GitHub App permissions

1. GitHub → **Settings** → **Applications** → **Railway**
2. **Configure** → Repository access → ensure **HA** is allowed (or "All repositories")
3. If GitHub shows **Update available** for the Railway app, accept it
4. Wait 2–3 minutes, redeploy

### 3. Use the `railway-deploy` branch (simplest layout)

A branch exists with **only** the Next.js app at the repo root (no monorepo):

| Setting | Value |
|---------|--------|
| Branch | `railway-deploy` |
| Root Directory | *(leave empty)* |

Variables: `HA_URL`, `HA_TOKEN` (see below).

### 4. Deploy from your Mac (bypasses GitHub fetch)

```bash
cd ha-device-manager
npm i -g @railway/cli
railway login
railway link
railway up
```

Set variables in the Railway dashboard first.

### 5. New service / project

If one service is stuck, create a **new empty service** → **GitHub Repo** → `mik-thomas/HA` → root `ha-device-manager`.

---

## Required environment variables

| Variable | Notes |
|----------|--------|
| `HA_URL` | Must be reachable from the cloud (Nabu Casa URL, tunnel, etc.) — **not** `homeassistant.local` |
| `HA_TOKEN` | Long-lived token from HA Profile → Security |

Test after deploy: `https://YOUR-APP.up.railway.app/api/ping` → `{"ok":true}`

---

## If build fails (after fetch works)

- **Root Directory** must be `ha-device-manager` when using branch `main`
- Build command (auto): `npm run build`
- Start command: `npm start` (uses `PORT` from Railway)
