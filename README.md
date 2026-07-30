# Service digest — waitlist landing page

A single-page marketing landing page to validate one idea: a service that texts
home-service / trades business owners a short daily digest of their key numbers
— revenue, jobs booked, and what their lead spend is actually producing —
pulled from the tools they already use.

**This is not the product.** There is no app behind it, and that's intentional.
The page has two jobs: state the promise clearly enough to find out whether
these owners care, and capture a qualified waitlist we can talk to.

Explicitly out of scope: real digests, SMS/Twilio, tool integrations, accounts,
dashboards.

## Stack

- Next.js 16 (App Router) + React 19
- Tailwind CSS v4 (via `@tailwindcss/postcss`)
- TypeScript
- Deployed on Vercel

## Local development

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts:

```bash
npm run build    # production build
npm start        # serve the production build
npm run lint     # eslint
```

To open the dev server on your phone while on the same Wi-Fi, use the
`Network:` URL that `npm run dev` prints.

## Deploying to Vercel

1. Push this branch to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Leave every build setting at its default — Vercel detects Next.js and needs
   no environment variables. Under **Git Branch**, pick the branch you pushed.
4. Click **Deploy**.

After the first deploy, every push to that branch redeploys automatically.

## Build order

- [x] **Step 1** — scaffold, running locally, deployable to Vercel
- [ ] **Step 2** — hero + sample-text phone mockup
- [ ] **Step 3** — problem / how it works / who it's for
- [ ] **Step 4** — waitlist form + signup storage
- [ ] **Step 5** — polish, tighten copy, redeploy
