# Setu backend

Express + MongoDB API for the Donation Management System.

## Setup

1. Install MongoDB Community Server locally, or create an Atlas cluster.
2. Copy `.env.example` to `.env`.
3. Set `MONGODB_URI`:
   - Local MongoDB: `mongodb://127.0.0.1:27017`
   - Atlas: paste the `mongodb+srv://...` connection string from Atlas.
4. Set `GOOGLE_CLIENT_ID` to your Google OAuth web client ID and configure the same client ID in `frontend/.env` as `VITE_GOOGLE_CLIENT_ID`.
5. Configure external notification providers in `backend/.env` if you want users to receive updates outside the app:
   - Email: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`, and `EMAIL_FROM`. For Gmail, use `smtp.gmail.com` and a Google App Password in `EMAIL_PASSWORD`.
   - Real WhatsApp Notifications: Messages are automatically and dynamically sent to each user's linked WhatsApp number (the phone number entered in their Profile).
   - Automated WhatsApp Delivery Gateways:
     * **Green-API (Recommended Free Instance - sends to ANY linked number)**: Set `GREEN_API_INSTANCE_ID` and `GREEN_API_TOKEN` after linking your instance via QR code.
     * **Meta WhatsApp Cloud API (Official - sends to ANY linked number)**: Set `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`.
     * **UltraMsg / Generic Gateway**: Set `WHATSAPP_API_URL` and `WHATSAPP_API_KEY`.
     * **CallMeBot (Personal Alerts)**: Set `CALLMEBOT_API_KEY`.
   - In-app fallback: If no gateway is configured, each notification row and the item card include direct WhatsApp buttons allowing 1-click delivery to that user's linked WhatsApp number via `wa.me`.
6. Install and seed:

```bash
npm install
npm run seed
```

7. Start the API:

```bash
npm run dev
```

The API runs at `http://localhost:5000`. It connects to MongoDB and completes a ping and index setup before reporting `MongoDB connected` or starting to serve requests. `/api/health` also verifies the live database connection.
If `/api/health` returns `503`, check that `MONGODB_URI` points to the intended server, the MongoDB host is reachable, and (for Atlas) this machine's IP is allowed in the cluster network-access settings.

## MongoDB Compass

Open MongoDB Compass and paste the same value used in `MONGODB_URI` into the connection field. For the local default, use `mongodb://127.0.0.1:27017`. The database is created as `setu_donations` after the first successful API connection. Collections are created automatically for users, resources, requests, tasks, notifications, and reward claims.

The seed command creates the development admin account:

- Username: `admin`
- Password: `Admin@123`

Change the seed admin credentials before deployment.

## Google sign-in

Create an OAuth 2.0 Client ID of type **Web application** in Google Cloud Console. Add the frontend's local URL (`http://localhost:5173`) and each deployed frontend origin to **Authorized JavaScript origins**. Put that client ID in both backend `.env` (`GOOGLE_CLIENT_ID`) and frontend `.env` (`VITE_GOOGLE_CLIENT_ID`). The backend verifies Google's signed ID token and verified email before creating a server-side session. Do not put a Google client secret in frontend variables.

Users choose a role before signing in. Google sign-in creates an account for the selected non-admin role on first use; an existing account keeps its role. Admin accounts must already exist and cannot be created through Google sign-up.

Center coordinator verification is sequential: an administrator must approve the institution's
registration document before the coordinator can submit personal ID (such as Aadhaar). The
coordinator's verification endpoint and admin decision endpoint both enforce this order.

Setu field-team employees can opt into field verification, pickup/delivery, or both.
Field-verification reports are written reports with an outcome; delivery assignments require
donor handoff, employee delivery, and recipient/center receipt confirmations before completion.

## API groups

- `POST /api/auth/register`, `POST /api/auth/login`
- `GET/PATCH /api/users`
- `GET/POST /api/donations`
- `POST /api/donations/:resourceId/requests`
- `POST /api/donations/requests/:requestId/confirm`
- `GET/POST /api/tasks`
- `POST /api/tasks/:taskId/accept`
- `POST /api/tasks/:taskId/deliver`
- `POST /api/tasks/:taskId/confirm`
- `GET /api/rewards`
- `POST /api/rewards/:badgeName/claim`

The frontend registration, password login, and Google sign-in flows use the MongoDB-backed authentication API. Authentication sessions are random opaque values stored as hashes in MongoDB, expire after seven days, and are revoked by `POST /api/auth/logout`; no JWT is used. Other dashboard data is still managed by the frontend's local demo data layer; wiring every donation, task, center, and notification screen to persistent API storage is a separate follow-up.
