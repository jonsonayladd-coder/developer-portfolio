# Developer Portfolio

A high-performance developer portfolio built with vanilla HTML, CSS, and JavaScript — deployed on Cloudflare Workers + R2 for edge delivery across 300+ global locations.

**Live site:** [portfolio-worker.allgoodnow.workers.dev](https://portfolio-worker.allgoodnow.workers.dev)

## Stack

- **HTML5 / CSS3 / Vanilla JS** — no frameworks, no build step, zero dependencies
- **GSAP** — scroll-triggered animations, spring physics, timeline sequences
- **Three.js** — WebGL particle system on the landing page
- **Cloudflare Workers** — edge-first serving with custom caching, security headers, and clean URLs
- **Cloudflare R2** — object storage for static assets

## Features

- WebGL animated particle background
- Smooth page transitions with GSAP
- Responsive design with mobile-first approach
- Dark theme with gold accent palette
- Interactive project showcases with live demos
- AI-powered contact system (separate Worker)
- Client questionnaire flow
- Downloadable resume

## Architecture

```
Browser → Cloudflare Worker → R2 Bucket
                ↓
         Content-Type routing
         Cache-Control headers
         Security headers
         Clean URL rewrites (/resume → resume.html)
```

The Worker handles all routing, serves files from R2 with correct MIME types, applies cache headers (5min HTML, 1 day CSS/JS), and adds security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy).

## Project Structure

```
├── index.html              # Landing page with WebGL canvas
├── resume.html             # Professional resume
├── skillset.html           # Technical skills breakdown
├── dtb-showcase.html       # Case study: Muay Thai gym platform
├── stix-pebbles-showcase.html  # Case study: E-commerce site
├── contact.html            # AI contact system
├── questionnaire.html      # Client project questionnaire
├── client-guide.html       # What to expect working together
├── css/
│   ├── v2.css              # Main stylesheet
│   └── contact.css         # Contact page styles
├── js/
│   ├── nav.js              # Navigation & mobile menu
│   ├── effects.js          # GSAP animations & WebGL
│   └── contact.js          # AI contact form logic
└── assets/                 # Images, fonts
```

## Live Production Sites

These are full platforms I built and maintain — not templates:

- **[daintreethaiboxing.com](https://daintreethaiboxing.com)** — Muay Thai gym with 3 AI chatbot personas, 6-panel admin dashboard, blog CMS, booking system. Astro 6 + Solid.js + Cloudflare D1 + Workers AI.

- **[stixandpebbles.pages.dev](https://stixandpebbles.pages.dev)** — Handmade crafts e-commerce with AI shopping assistant, Stripe checkout, product catalogue, order management. Astro 6 + Solid.js + Cloudflare D1 + Stripe.

## Author

**Marc** — Full-stack developer specialising in Astro, TypeScript, Solid.js, and the Cloudflare ecosystem. Based in Far North Queensland, Australia.
