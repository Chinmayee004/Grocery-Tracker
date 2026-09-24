# 🛒 Shared Grocery List

Production-ready realtime grocery list: **React (Vite) + Socket.io + Express + Supabase (PostgreSQL + Auth)**, deployed on **Netlify** (frontend) + **Railway** (backend).

```
.
├── backend/                      Express + Socket.io API  → Railway
│   ├── src/
│   │   ├── server.js             HTTP wrapper + Express app + Socket.io + CORS + boot
│   │   ├── config/supabase.js    Service-role Supabase client (fails fast if env missing)
│   │   ├── middleware/auth.js    JWT validation: Express middleware + Socket.io handshake
│   │   ├── routes/items.js       GET /api/items — authenticated, user-scoped
│   │   └── sockets/groceryHandlers.js   add_item / toggle_item / delete_item
│   ├── supabase/migrations/001_init.sql   ← run this in the Supabase SQL editor
│   └── .env.example
├── frontend/                     React (Vite) SPA  → Netlify
│   ├── src/
│   │   ├── App.jsx               Auth gate — blocks the list until signed in
│   │   ├── context/AuthContext.jsx      Session bootstrap + signIn/signUp/signOut
│   │   ├── hooks/useGrocerySocket.js    REST bootstrap + live socket + strict cleanup
│   │   ├── components/           AuthModal, Navbar, StatsBar, ItemInput, GroceryList, GroceryItem
│   │   ├── lib/supabaseClient.js        Browser Supabase client (anon key only)
│   │   └── styles.css            Dark glass design system
│   └── .env.example
└── netlify.toml                  Build config (base=frontend, publish=dist)
```

**Features:** login/registration toggle · realtime multi-device sync via per-user socket rooms · live connection badge · progress bar · all/pending/done filters · search · custom animated checkboxes with strike-through + `#999` fade on completion · trash-icon delete.

---

## 1. Hook up Supabase (database + auth)

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. **Run the schema migration:** open **SQL Editor → New query**, paste the full contents of
   [`backend/supabase/migrations/001_init.sql`](backend/supabase/migrations/001_init.sql), and click **Run**.
   It creates the `grocery_items` table (`id`, `user_id → auth.users(id) on delete cascade`,
   `name`, `is_completed default false`, `created_at`), a `(user_id, created_at)` index,
   RLS policies, and adds the table to the `supabase_realtime` publication.
3. **Collect credentials** from **Project Settings → API**:
   - `Project URL` → `SUPABASE_URL` (backend) and `VITE_SUPABASE_URL` (frontend)
   - `anon public` key → `VITE_SUPABASE_ANON_KEY` (frontend only — safe for the browser, RLS enforced)
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (backend only — **secret**, bypasses RLS)
4. **Auth settings** (Authentication → Providers → Email): disable **"Confirm email"** for the
   smoothest first run. With it enabled, signups must click the inbox link first — the UI shows
   a "check your email" notice and handles it.

> Users live in Supabase's managed `auth.users` table — no manual user table needed.

---

## 2. Local development

```bash
# Terminal 1 — backend (http://localhost:5000)
cd backend
cp .env.example .env        # fill SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLIENT_URL
npm install
npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd frontend
cp .env.example .env        # VITE_API_URL=http://localhost:5000
npm install
npm run dev
```

Health check: `curl http://localhost:5000/api/health`

---

## 3. Deploy the backend to Railway

1. Push this repo to GitHub, then in [Railway](https://railway.app):
   **New Project → Deploy from GitHub repo**.
2. In the service's **Settings → Root Directory**, enter `backend`. Railway auto-detects
   `backend/package.json` and runs `npm start` → `node src/server.js`.
3. **Settings → Networking → Generate Domain** to get a public URL
   (e.g. `https://shared-grocery-api.up.railway.app`). WebSocket upgrades are handled natively.
4. Add **Variables** (exact names read from `process.env` by the code):

   | Variable | Value |
   |---|---|
   | `SUPABASE_URL` | `https://your-project-ref.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key from Supabase |
   | `CLIENT_URL` | `https://your-site.netlify.app` (comma-separate extra origins; local `http://localhost:5173` is always allowed for dev) |
   | `PORT` | leave unset — Railway injects it and `server.js` reads it |

   CORS is a function allow-list: explicit `CLIENT_URL` origins, localhost, and
   `*.netlify.app` (incl. deploy previews) pass; everything else is blocked.
5. Verify after deploy: `curl https://<railway-domain>/api/health`.

### Realtime event contract (Socket.io)

Clients connect with `io(SOCKET_URL, { auth: { token: <supabase-jwt> } })`. The handshake
middleware validates the JWT with `supabase.auth.getUser` and joins the socket to room
`user:<userId>` — all broadcasts are scoped to that room, so devices/tabs of the same
account sync live and users never see each other's data.

| Client emits | Server action | Broadcast to `user:<id>` room |
|---|---|---|
| `add_item {name}` | insert row | `item_added` (full DB-generated row) |
| `toggle_item {id, is_completed}` | update `is_completed` | `item_toggled` (full row) |
| `delete_item {id}` | delete row | `item_deleted {id}` |

Every event supports an acknowledgement callback: `{ success: true, data | id }` or
`{ success: false, error }`. Every mutation is filtered by `.eq('user_id', …)` server-side,
so one user can never touch another user's rows even with a valid JWT.

---

## 4. Deploy the frontend to Netlify

1. In [Netlify](https://app.netlify.com): **Add new site → Import an existing project** → pick the repo.
   Build settings are pre-configured in [`netlify.toml`](netlify.toml):
   - **Base directory:** `frontend` · **Build command:** `npm run build` · **Publish directory:** `frontend/dist`
2. Add **Environment variables** (Site configuration → Environment variables):

   | Variable | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | same Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | anon public key (never the service_role key) |
   | `VITE_API_URL` | `https://<your-railway-domain>` — the Railway server URL, no trailing slash |
   | `VITE_SOCKET_URL` | optional; defaults to `VITE_API_URL` |

3. **Deploy.** Register an account, add items, and confirm the green **Live Sync** badge in
   the navbar — that's your WebSocket connected.
4. Vite inlines `VITE_*` variables at build time: after changing them, trigger
   **Deploys → Trigger deploy → Clear cache and deploy site**.

---

## 5. Security model

- **Frontend** holds only the anon key; Supabase RLS policies are the last line of defense.
- **Backend** holds the service_role key (RLS-bypassing), so it re-validates the JWT on every
  REST request (`Authorization: Bearer …`) *and* on every Socket.io handshake, then scopes
  every query by the authenticated `user_id`.
- Express and Socket.io CORS both derive from `CLIENT_URL`; unknown origins are rejected.
- Sockets without a valid token are rejected in the handshake; the list view is unreachable
  without an authenticated session.
