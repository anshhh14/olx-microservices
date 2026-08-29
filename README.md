# OLX-style Classifieds App — Microservices on Docker (+ AWS S3)

A simplified classifieds marketplace (like OLX) built as 3 independent microservices,
each with its own database, running via Docker Compose. Listing photos are stored in
AWS S3.

## Services

| Service | Port | Database | Responsibility |
|---|---|---|---|
| **user-service** | 3001 | PostgreSQL (`users_db`) | Register, login (JWT), profile |
| **listing-service** | 3002 | PostgreSQL (`listings_db`) + AWS S3 | Post/browse/search classified ads, photo upload |
| **chat-service** | 3003 | MongoDB (`chat_db`) | Buyer ↔ seller messaging per listing |

## Prerequisites

- Docker Desktop installed and running (includes `docker compose`)
- An AWS account (free tier is enough) if you want image upload to work
- VS Code (optional, just to browse/edit the code)

## 1. Set up AWS S3 + IAM (for listing photo uploads)

You only need two AWS services: **S3** (file storage) and **IAM** (a restricted user
that's allowed to write to that one bucket).

### Create the S3 bucket
1. Go to the AWS Console → S3 → **Create bucket**
2. Give it a globally unique name, e.g. `olx-clone-listings-yourname`
3. Region: pick one close to you, e.g. `us-east-1` — remember it, you'll need it below
4. Leave "Block all public access" ON (we don't need public objects for this project)
5. Create the bucket

### Create an IAM user with S3-only access
1. Go to IAM → Users → **Create user** (e.g. `olx-app-user`)
2. Attach a policy — easiest is to create a small custom policy instead of using a broad
   managed one:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
         "Resource": "arn:aws:s3:::your-bucket-name/*"
       }
     ]
   }
   ```
   Replace `your-bucket-name` with the bucket you created.
3. After creating the user, go to **Security credentials** → **Create access key**
   (choose "Application running outside AWS" as the use case)
4. Copy the **Access key ID** and **Secret access key** — you'll only see the secret once

### Configure your project
1. In the project root, copy `.env.example` to `.env`:
   ```powershell
   copy .env.example .env
   ```
2. Fill in `.env` with your real values:
   ```
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=<your access key>
   AWS_SECRET_ACCESS_KEY=<your secret key>
   S3_BUCKET_NAME=<your bucket name>
   ```

If you skip this step, everything still works — listings just won't have photos
(`image_url` will be `null`).

## 2. Run everything

From the project root, in PowerShell:

```powershell
docker compose up --build
```

This builds and starts all 3 services plus PostgreSQL and MongoDB. First run takes a
few minutes (downloading base images, installing dependencies).

Check each service is healthy:
- http://localhost:3001/health → user-service
- http://localhost:3002/health → listing-service
- http://localhost:3003/health → chat-service

To stop everything: `Ctrl+C`, then `docker compose down` (add `-v` to also wipe the databases).

## 3. Try it out

### Register and log in (user-service)

```powershell
curl -X POST http://localhost:3001/api/users/register `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"alice@example.com\",\"password\":\"secret123\",\"name\":\"Alice\"}'

curl -X POST http://localhost:3001/api/users/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"alice@example.com\",\"password\":\"secret123\"}'
```

Copy the `token` from the login response for the next steps if you protect routes further.

### Post a listing (listing-service)

Without a photo:
```powershell
curl -X POST http://localhost:3002/api/listings `
  -H "Content-Type: application/json" `
  -d '{\"userId\":1,\"title\":\"iPhone 12\",\"description\":\"Good condition\",\"price\":250,\"category\":\"electronics\",\"location\":\"Mumbai\"}'
```

With a photo (multipart form, so use `-F` instead of `-d`):
```powershell
curl -X POST http://localhost:3002/api/listings `
  -F "userId=1" -F "title=iPhone 12" -F "price=250" -F "category=electronics" -F "location=Mumbai" `
  -F "image=@C:\path\to\photo.jpg"
```

### Search / browse listings

```powershell
curl "http://localhost:3002/api/listings?category=electronics&location=Mumbai&minPrice=100&maxPrice=300"
```

### Send a chat message (chat-service)

```powershell
curl -X POST http://localhost:3003/api/chat/messages `
  -H "Content-Type: application/json" `
  -d '{\"listingId\":\"1\",\"senderId\":\"2\",\"receiverId\":\"1\",\"text\":\"Is this still available?\"}'
```

Get the conversation:
```powershell
curl http://localhost:3003/api/chat/messages/1/2/1
```

## Why this counts as "microservices"

- Each service has **its own database** (no shared tables) — user-service and
  listing-service don't even share the same Postgres *database*, just the same
  container for convenience
- Each service is **independently deployable** — you could redeploy listing-service
  without touching the other two
- Services communicate only over HTTP APIs — no direct database access across
  service boundaries
- Each has its own `Dockerfile` and can be scaled independently in Kubernetes later

## Running on Kubernetes (Docker Desktop's built-in cluster)

This project also includes Kubernetes manifests in the `k8s/` folder — no Minikube
or Kind needed, since Docker Desktop ships its own single-node Kubernetes cluster.
Kept intentionally simple: each file is just a Deployment + Service, with config
values written directly inline (no ConfigMap/Secret/Namespace objects).

### 1. Enable Kubernetes

Docker Desktop → Settings → **Kubernetes** tab → check **Enable Kubernetes** →
Apply & Restart. Verify with:

```powershell
kubectl get nodes
```

If this errors out or hangs, Kubernetes isn't actually enabled/ready yet — fix
that before anything else, since `kubectl apply` will silently do nothing useful
against a cluster that isn't there.

### 2. Point the frontend at the right URLs *before* building its image

The frontend is now a React (Vite) app — see [Frontend](#frontend) below. Vite
bakes `VITE_*` env vars into the JS bundle at **build time**, so the NodePort
URLs have to be passed as `--build-arg`s to `docker build`, not edited into a
file. That happens in the build command in step 3 — nothing to edit here first,
just don't forget the `--build-arg`s when you get there.

### 3. Build the images locally

Docker Desktop's Kubernetes uses the same local Docker image store, so you just
build the images with matching tags — no registry or push needed:

```powershell
docker build -t user-service:local ./services/user-service
docker build -t listing-service:local ./services/listing-service
docker build -t chat-service:local ./services/chat-service
docker build `
  --build-arg VITE_USERS_API=http://localhost:30001/api/users `
  --build-arg VITE_LISTINGS_API=http://localhost:30002/api/listings `
  --build-arg VITE_CHAT_API=http://localhost:30003/api/chat `
  -t frontend:local ./frontend
```

### 4. Fill in your real AWS + Stripe values

Open `k8s/listing-service-deployment.yaml` and replace the placeholder
`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`, and
`STRIPE_SECRET_KEY` values with your real ones. Unlike Docker Compose (which
pulls these from your root `.env` automatically), the K8s manifests have these
written directly as literal values in the YAML — nothing reads `.env` here, so
editing the file is the only way to set them.

### 5. Apply the manifests

```powershell
kubectl apply -f k8s/
```

### 6. Check everything is running

```powershell
kubectl get pods
kubectl get services
```

Wait until all pods show `STATUS: Running` and `READY: 1/1`. If nothing shows up
at all here, the apply didn't actually happen (or was run against the wrong
context) — re-run step 5 and check the command's own output for errors. If a pod
is stuck in `CrashLoopBackOff` or `Error`, check its logs:

```powershell
kubectl logs deployment/user-service
```

### 7. Access the site

```
http://localhost:30080
```

Individual services are also reachable directly if you want to hit them with
curl/Postman:
- User service: http://localhost:30001/health
- Listing service: http://localhost:30002/health
- Chat service: http://localhost:30003/health

### 8. Tear down

```powershell
kubectl delete -f k8s/
```

### What's in each manifest

| File | Purpose |
|---|---|
| `postgres-deployment.yaml` / `postgres-service.yaml` | Postgres Deployment + Service (with a small inline ConfigMap for the init script that creates both databases) |
| `mongo-deployment.yaml` / `mongo-service.yaml` | MongoDB Deployment + Service |
| `user-service-deployment.yaml` / `user-service-service.yaml` | Deployment + NodePort Service, DB/JWT config inline |
| `listing-service-deployment.yaml` / `listing-service-service.yaml` | Deployment + NodePort Service, DB/AWS/Stripe config inline — **edit these values before applying** |
| `chat-service-deployment.yaml` / `chat-service-service.yaml` | Deployment + NodePort Service, Mongo URI inline |
| `frontend-deployment.yaml` / `frontend-service.yaml` | Nginx serving the built React frontend, NodePort 30080 |

Two honest tradeoffs worth knowing about for your writeup, since this was
simplified on purpose:
- Secrets (DB password, JWT secret, AWS keys, Stripe key) are written directly
  in the Deployment YAML instead of a Kubernetes `Secret` object — fine for a
  coursework demo, but not how you'd do it in production
- No PersistentVolumes, so Postgres/Mongo data is lost if a pod restarts

## Frontend

The frontend ("Mercato") is a React (Vite) + Tailwind app in `frontend/` — dark
glass/gradient theme, talking directly to the three services over `fetch`.
It's wired into `docker-compose.yaml` as its own `frontend` service (built
with a multi-stage Dockerfile: `npm run build` → served by nginx, with an
SPA fallback so client-side routes survive a hard refresh), so it comes up
together with everything else.

The original plain HTML/CSS/JS frontend still exists, unchanged, in
`legacy/frontend-vanilla/` for reference — it's no longer wired into
`docker-compose.yaml` or `k8s/`.

### Run it

```powershell
docker compose up --build
```

That's it — this now starts Postgres, MongoDB, all 3 backend services, **and**
the frontend, in the right order. Once containers are up, open:

```
http://localhost:8080
```

and the whole site is live and working end to end (register, browse, post a
listing, chat) against the real backend.

For local frontend development without Docker (hot reload, etc.):

```powershell
cd frontend
npm install
cp .env.example .env   # defaults already match docker-compose ports
npm run dev
```

If you're running the backend on Kubernetes instead of Docker Compose, the
NodePort URLs (30001/30002/30003) have to be baked in at *image build time*
via `--build-arg` — see step 3 in the [Kubernetes](#running-on-kubernetes-docker-desktop)
section above. (The `frontend` container isn't part of the Kubernetes
manifests in `k8s/` yet for a from-source dev loop — for that, run
`npm run dev` locally against `.env` pointed at the NodePort URLs.)

### What it does

- Register / log in (JWT stored in the browser, nothing server-side to set up)
- **Pick a role after login** — Buyer or Seller — the site adapts around it (see below)
- Browse and filter listings by category, location, price, and keyword
- Post a listing, with optional photo upload straight to S3 via listing-service
- View a single listing and message the seller — polls for new messages
- **Buy a listing** — real payment via Stripe Checkout (test mode)
- A Messages tab listing your open conversations
- An Orders tab listing what you've bought and sold

## Buyer / Seller mode

One account, two modes — chosen right after logging in, switchable anytime
from the "Switch" pill in the top bar (no need to log out).

- **Buyer mode** — nav shows Browse, Messages, Orders (your purchases). No
  Sell link, and posting a listing is blocked if you type `#/sell` directly.
- **Seller mode** — nav shows Sell, Browse, Messages, Orders (your sales).
  You can still browse and open other listings to see what's out there, but
  the **Buy now** button is hidden while in seller mode — buying only
  happens in buyer mode.

Managing your own listings (mark sold / delete) always works regardless of
mode, since that's tied to actual ownership, not the mode you're currently
browsing in.

## Buyer features: cart, wishlist, new arrivals

In buyer mode, the nav bar gets a **Cart** link (with a live item-count badge).
That page is split in two, side by side:

- **Cart (left)** — items you're ready to buy. Shows a running total and a
  **Checkout with Stripe** button that pays for everything in the cart in a
  single Stripe Checkout session (one line item per listing).
- **Save for later (right)** — a wishlist. Items here don't count toward
  checkout; each has a **Move to cart** button to bring it over when you're
  ready, and a **Remove** button.

Cart/wishlist state is stored client-side (per logged-in user, in
`localStorage`), and re-validated against the listing-service on every visit
to the Cart page — anything sold or deleted elsewhere quietly drops out.

You can add to cart / save for later / message the seller straight from:
- **A listing card** — hover-style quick-action buttons (🛒 / ☆ / 💬) appear
  on every card you don't own, in Browse and the New Arrivals strip.
- **A listing's detail page** — "Add to cart" and "Save for later" sit next
  to "Buy now".

**New arrivals**: the unfiltered Browse view shows a horizontally-scrolling
strip of listings posted in the last 48 hours (also flagged with a small
"NEW" tag on the card itself), so freshly uploaded products are easy to spot
without having to hunt through the full grid.

Messaging a seller about a specific listing works the same way it always
has — the chat panel lives right on that listing's detail page — but the
💬 quick-action on a card now jumps straight there and scrolls the chat
into view.

### How cart checkout works (backend)

`POST /api/listings/checkout/cart` takes `{ buyerId, listingIds: [...], buyerName,
buyerPhone, buyerAddress }`, validates none of the listings are
sold/deleted/owned by the buyer, and creates one Stripe Checkout Session with
one line item per listing plus one `pending` row per listing in `orders` —
all sharing that session's id, and all stamped with the same delivery
details. `GET /api/listings/orders/confirm?session_id=...` resolves *every*
order row tied to a session (one for a "Buy now" purchase, several for a cart
checkout), marks them `paid`, and marks each listing sold. The
`orders.stripe_session_id` column is no longer unique for this reason — a
migration in `db.js` drops that constraint on startup if it finds it left
over from an older version of this project.

## Payments (Stripe Checkout, test mode)

Buying a listing goes through a real Stripe Checkout session — no fake "mark
as bought" button, an actual test-mode payment happens.

### Set up your Stripe test key

1. Sign up / log in at [stripe.com](https://stripe.com) — the dashboard opens
   in **Test mode** by default (toggle top-right if not).
2. Go to **Developers → API keys** and copy the **Secret key** (starts with
   `sk_test_...`).
3. Add it to your root `.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_your-real-test-key
   ```
4. Restart: `docker compose up --build`

### How the flow works

1. Buyer clicks **Buy now** on a listing (or **Checkout with Stripe** from
   the cart) → they're taken to a **delivery details** page first, asking
   for name, phone number, and delivery address
2. On submit, `listing-service` creates a Stripe Checkout Session for the
   effective price (in INR) and a `pending` row in the `orders` table,
   stamped with that delivery info (`buyer_name`, `buyer_phone`,
   `buyer_address` columns)
3. Buyer is redirected to Stripe's hosted checkout page
4. Use a [Stripe test card](https://docs.stripe.com/testing#cards) —
   `4242 4242 4242 4242`, any future expiry, any CVC, any postal code
5. On success, Stripe redirects back to `/#/checkout-success` with the
   session ID. The frontend calls a confirm endpoint, which verifies the
   session with Stripe, flips the order to `paid`, and marks the listing sold
6. The purchase now shows up under **Orders** for both the buyer and
   seller — the seller's "Sold" rows show exactly who to ship to and how to
   reach them

### A note on how payment is confirmed

This confirms payment via the **redirect back from Stripe** (checking the
session's `payment_status` when the buyer lands on the success page), not
via a Stripe **webhook**. That's a deliberate simplification for local dev —
webhooks need a public URL (or the Stripe CLI forwarding to your machine),
which is extra setup for a coursework project. The tradeoff: if a buyer pays
but closes the tab before being redirected back, the order stays `pending`
forever even though Stripe did charge the card. For a production app, you'd
add a webhook endpoint (`checkout.session.completed`) as the source of truth
instead of relying on the redirect.

Notes on what changed to make this work smoothly:
- CORS middleware (`app.use(cors())`) was added to all three backend services,
  since they'd previously only ever been called from `curl`/Postman and the
  frontend runs on its own origin/port.
- All services (including the new `frontend` one) got `restart: unless-stopped`
  in `docker-compose.yaml`. Postgres/Mongo take a moment to become ready, and
  `user-service`/`listing-service` don't retry their DB connection on startup —
  without a restart policy they could crash before the database is ready and
  stay down. With it, Compose just brings them back up until the DB is
  reachable.
- Both checkout endpoints (`/:id/checkout` and `/checkout/cart`) now require
  `buyerName`, `buyerPhone`, and `buyerAddress` and reject the request with a
  400 if any are missing. The frontend enforces this with a delivery-details
  form shown right after "Buy now" / cart checkout, before the redirect to
  Stripe — so a seller always has somewhere to ship the item. Existing
  databases pick up the new `orders.buyer_name` / `buyer_phone` /
  `buyer_address` columns automatically via an `ADD COLUMN IF NOT EXISTS`
  migration in `db.js`, no manual migration needed.

## Next steps (if you want to extend this for extra credit)

1. Move secrets into a proper Kubernetes `Secret` object instead of inline env values
2. Add a simple API Gateway (nginx reverse proxy) so the frontend only talks to one URL
3. Deploy to AWS EKS instead of running locally
4. Add PersistentVolumeClaims so Postgres/Mongo data survives pod restarts
