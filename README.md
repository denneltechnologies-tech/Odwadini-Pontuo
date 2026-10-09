# Odwadini Mpuntuo — Market Women Wellness & Fun Day

> A 360 Group Ltd Initiative • Workers' Day Edition • 1st May 2026 • Makola Market, Accra

Official web platform and registration management system for **Odwadini Mpuntuo**, celebrating and supporting the market women who form the economic heartbeat of Ghana's informal sector.

---

## 🌟 Features

- **Master Portal (`index.html`)**: 8-section Single-Page Application (Programme, Packages, Partnership, Dual Individual/Association Membership, Donations, Partners, Contact).
- **Campaign Landing Page (`landing.html`)**: Streamlined social media and ad lead-capture page.
- **Admin Management Portal (`admin.html`)**: Secure dashboard for monitoring registrations, approving inquiries, and exporting CSV records.
- **Pure Node.js Backend (`server.js`)**: Fast, lightweight, zero-dependency REST API and static file server.
- **Automated VPS Deployment**: Configured for Dokploy on Docker Swarm with auto-deploy webhook on every push.

---

## 🚀 Local Development

1. Ensure Node.js (v18+) is installed.
2. Start the server:
   ```bash
   node server.js
   ```
3. Open your browser:
   - **Main Website**: http://localhost:3000/
   - **Landing Page**: http://localhost:3000/landing
   - **Admin Portal**: http://localhost:3000/admin (Default password: `odw-admin-2026`)

---

## 🚢 VPS Deployment (Dokploy)

- **Host**: `69.62.106.189`
- **Port**: `3000`
- **Auto-Deploy Webhook**: `http://69.62.106.189:3000/api/deploy/odw_deploy_webhook_m7k2x9`
- **Live Preview Domain**: `http://odwadini-69-62-106-189.sslip.io`

Pushing commits to the `master` branch automatically triggers deployment via GitHub Actions and the Dokploy webhook.
