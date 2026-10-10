# Setu — Need-Based Resource Distribution System

A React (Vite + Tailwind CSS) frontend for a donation management platform that
connects donors, recipients, registered donation centers, and Setu platform field-team employees.

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL in your browser (typically http://localhost:5173).

To build for production:

```bash
npm run build
npm run preview
```

## New in this version — trust & verification features

**1. Taking a Setu field-team assignment shows full contact details.**
Clicking "Take assignment" (and later "View details" on an accepted task) opens a modal
showing the donor's name/phone/email/city and the recipient's or center coordinator's
same details, plus the route (`fromLabel → toLabel`). See `TaskContactModal.jsx`.

**2. Recipients cannot request until verified — and there's a real verification pipeline.**
- Step 1: user submits an ID document (type + number) from **Profile**
  (`verificationStatus` → `pending`).
- Step 2: it appears in **Admin → Manage Users → Pending verification**, with the
  submitted document shown.
- Step 3: admin **Approves** (`verified: true`) or **Rejects** with a required reason.
- Step 4: the user is notified either way; a rejected user sees the reason on their
  Profile and can resubmit.
- Recipients whose `verificationStatus !== 'verified'`, or whose account is
  `restricted` by an admin, are blocked from submitting a request
  (`DataContext.submitRequest`), with the reason shown inline on the resource page.

**Center coordinators complete verification in sequence.**
- On registration, the coordinator creates an account and enters the institution profile.
- From **Center Profile**, they submit the institution's registration record first. An admin
  approves or rejects it in **Admin → Verify & approve centers**.
- Only after institution approval can the coordinator submit a personal identity document
  (for example, Aadhaar). An admin reviews that second submission in **Admin → Manage Users**.
- The center dashboard and center requests remain gated until both approvals are complete.

**3. Setu field-team verification and delivery assignments.**
Setu platform employees can select field verification, pickup/delivery, or both during registration and
change those choices later from **Setu Field Team Employee Profile**.
- Field-verification tasks are requested by a donor before deciding on a recipient request.
  A verified Setu employee visits the recipient, checks identity documents in person without
  recording ID numbers, assesses the stated need, and submits a written report with the
  outcome **Verified**, **Rejected**, or **Needs More Information**. The donor reviews the
  report and decides whether to approve the donation. Report attachments are not supported.
- Delivery tasks flow `open → accepted → delivered → completed`. The donor confirms handoff
  to the assigned Setu employee, the employee marks delivery, and the recipient (`MyRequests`) or center
  coordinator (`CenterDashboard`) confirms receipt. All three confirmations are required.

**4. Ratings notify the donor.**
When a recipient rates a completed donation and leaves a thank-you note
(`MyRequests → RatingForm`), the donor gets an in-app notification immediately
(`DataContext.addRating`), visible on their **Notifications** page.

**5. Admin verification is documented step-by-step in the UI.**
`Admin → Manage Users` opens with a 4-step explainer card (submit → queue → decide →
notify) directly above the pending-verification queue, so the process is visible, not
just implemented.

**6. Item visibility & "claimed once" guarantee.**
- Posting a resource makes it visible to **every** recipient account and to center
  coordinator accounts (Browse is reachable from the Center dashboard nav too).
- The moment *any* recipient submits a request, the resource status flips to `pending`
  and it disappears from Browse for everyone else — preventing double-claims even
  before the donor decides.
- If the donor rejects the request (or the recipient cancels), it flips back to
  `available` and reappears for others.
- Once a handover is confirmed complete, the resource status becomes `completed` and
  is labeled **"Donated"** everywhere (Browse, resource detail, Manage Donations) —
  it can never be requested again.

**7. Full recipient claiming flow, with a real verification pipeline.**
A recipient no longer just "requests" a resource in the abstract — clicking a card in
Browse opens the resource detail page, which shows the item, donor details, and drop-off
info *first*. Only after reviewing that does a **"Claim this donation"** button reveal
the claim form. Submitting sends the claim into a verification step before the donor ever
sees it:
- **Mobile & email verification at registration** — `Register.jsx` is now a two-step
  wizard. Step 2 sends a (simulated) 6-digit OTP to the email and phone the user entered;
  both must be verified before the account is created. `AuthContext.register` stores
  `emailVerified` / `mobileVerified` on the user, and `DataContext.submitRequest` blocks
  claiming until both are true — separate from the existing ID-document verification.
- **Need Request Form** — reason, beneficiary, quantity, and urgency, shown inline in the
  claim step (`ResourceDetail.jsx`).
- **Active Request Limit** — unchanged at 3 concurrent active claims
  (`DataContext.MAX_ACTIVE_REQUESTS`), shown live on the claim screen and My Requests.
- **Bundle Handling** — a bundle resource is still exactly one request row (so it only
  ever counts once against the active-request limit), but the claim keeps its own
  `bundleItems` and total bundle quantity/value for tracking and admin review.
- **Value-Based Limit** — `DataContext.valueClaimedInPeriod` sums a recipient's claimed
  value over a rolling 30-day window (`VALUE_LIMIT_PERIOD_DAYS`); exceeding
  ₹15,000 (`VALUE_LIMIT_AMOUNT`) requires a supporting document and automatically flags
  the claim for admin review rather than blocking it outright.
- **Request History** — My Requests now has status tabs (All / Requested / Approved /
  Received / Rejected / Cancelled) so a recipient's full history is browsable, not just
  the active ones.
- **Behavior Monitoring** — `submitRequest` detects repeated high-value claims (2nd+
  high-value claim), excessive cancellations (3+), and value-limit breaches, and flags
  both the specific claim and the account (`flagAccountForReview` in `AuthContext`) —
  never an immediate ban.
- **Account Flagging → Admin Review** — a flagged account shows a banner on My Requests;
  the flagged claim shows "Under verification" instead of going straight to the donor.
- **High-Value Verification** — unchanged: claims ≥ ₹5,000 require a supporting document.
- **Admin Review & Decision** — `Admin → Manage Users` now opens with a **"Flagged
  claims — behavior review"** queue above the identity-verification queue. Each flagged
  claim shows the recipient, resource, claimed value, and the specific flag reason(s), with
  four decisions (`DataContext.adminReviewRequest`): **Approve** (clears the flag, claim
  proceeds to the donor normally), **Request More Information** (recipient gets a reply
  box on My Requests that resubmits back into this queue), **Restrict** (suspends the
  account and rejects the claim), or **Reject** (rejects just the claim). Every decision
  sends an in-app notification immediately.

## Backend and MongoDB

The project now includes a Node/Express backend in `../backend/`. It stores users,
donations, requests, field-team assignments, and donor rewards in MongoDB. The Vite
development server proxies `/api` requests to `http://localhost:5000`, and a
reusable client is available at `src/lib/api.js` for context-level integration.

Start the backend from the project root:

```bash
cd ..
npm --prefix backend install
Copy-Item backend/.env.example backend/.env
npm --prefix backend run seed
npm --prefix backend run dev
```

Use the same `MONGODB_URI` from `../backend/.env` in MongoDB Compass. The default
local connection is `mongodb://127.0.0.1:27017`, with database name
`setu_donations`. Full API details are in `../backend/README.md`.

## How this demo works

The original frontend still has its localStorage fallback so the existing UI
continues to work while pages are migrated context by context to the API. New
backend data is persisted in MongoDB through the Express service.

Go to **/login** and pick any of the demo accounts to explore each role — no
password is required in this demo. You can also register a brand-new account
(including a new Center Coordinator, which creates a center pending admin
approval) from **/register**.

## Feature map

**Landing page** — hero, featured categories, "How it works" lifecycle,
platform statistics, FAQ, and a contact section.

**Auth** — Login (demo accounts), Register with role selection (Donor,
Recipient, Setu Field Team Employee, Center Coordinator), Forgot Password.

**Donor** (sidebar: Overview, Post New Donation, Manage Donations, Approve/
Reject Requests, Donation History, Impact Tracker, Certificates & Receipts)
— post a resource (direct or center drop-off, single or bundle), review and
approve/reject incoming requests, confirm handover, withdraw a listing, see
category-wise impact, and download certificates for completed donations.

**Recipient** (Browse Donations, My Requests) — search/filter by category and
locality, open an item to review its details and donor info, then claim it
through a verification step (active-request cap, value-based period limit,
high-value supporting-document rule, and behavior-monitoring flags all
enforced), track status across a full request history, respond if an admin
asks for more info, confirm pickup, and leave a rating/thank-you note once
completed.

**Setu Field Team Employee** (Task Board, Profile & Availability) — take
nearby field-verification or pickup/delivery assignments, complete them on
Setu's behalf, and manage availability and service area. Volunteer points,
rewards, certificates, and leaderboards are not part of this employee workflow.

**Center Coordinator** (Incoming Donations, Center Profile, Urgent Needs,
Donation Statistics) — manage the center's public listing, confirm receipt of
donations, post/remove urgent needs, and view a stats breakdown.

**Admin** (Platform Overview, Verify Centers, Manage Categories, Moderate
Listings, Reports & Disputes, Manage Users, System Notifications) — platform-
wide analytics, center approvals, master category list, flag/remove listings,
review flagged high-value requests and user reports (approve / request more
info / restrict / reject), manage all user accounts, and broadcast system
notifications to any role.

**Cross-cutting** — sidebar navigation per role, toast success/error
messages, confirmation dialogs before destructive or high-stakes actions,
empty states throughout, and a shared notifications panel (including admin
broadcasts).

## Project structure

```
src/
  context/    AuthContext (mock auth), DataContext (all app data + actions),
              ToastContext (success/error toasts)
  data/       seed.js — initial demo data
  components/ Navbar, Footer, DashboardLayout (role sidebar), ConfirmDialog,
              cards, badges, route guard
  pages/      one file per screen/route
```

## Connecting a real backend

This frontend is intentionally backend-agnostic. To wire it to a real MERN
API, replace the `localStorage`-backed logic inside `src/context/AuthContext.jsx`
and `src/context/DataContext.jsx` with calls to your Express/MongoDB endpoints
— the page components don't need to change since they only consume these two
contexts (plus `ToastContext`, which needs no backend).

## Auth-gated navigation

Only the landing page, Login, Register, and Forgot Password are public. Every
other screen — Browse, Centers, and every dashboard — requires being logged
in as one of the 5 roles (Donor, Recipient, Volunteer, Center Coordinator,
Admin); visiting a gated URL while logged out redirects to Login.

Login is a two-step flow: **Step 1** — choose which of the 5 roles you want
to continue as; **Step 2** — pick (or in a real build, sign in as) an account
with that role. You're then dropped straight into that role's dashboard, with
the sidebar for every feature available to that role.
