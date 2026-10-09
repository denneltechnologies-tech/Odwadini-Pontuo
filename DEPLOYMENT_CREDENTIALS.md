# Deployment Reference & Server Credentials

## VPS Host Information
- **VPS Host / IP**: `69.62.106.189`
- **SSH User**: `root`
- **SSH Password**: `Kissinger2026@`
- **Dokploy Control Panel**: `http://69.62.106.189:3000`

---

## Project 1: Odwadini Pontuo
- **GitHub Repository**: https://github.com/denneltechnologies-tech/Odwadini-Pontuo
- **Live Preview URL**: http://odwadini-69-62-106-189.sslip.io
- **Admin Portal**: http://odwadini-69-62-106-189.sslip.io/admin
- **Project Name in Dokploy**: Odwadini Pontuo
- **Environment**: production
- **Auto-Deploy Webhook URL**: `http://69.62.106.189:3000/api/deploy/odw_deploy_webhook_m7k2x9`
- **GitHub Webhook ID**: `694619108` (Status: Active, 200 OK)
- **Persistent Data Volume**: `odwadini-pontuo-data` mounted at `/app/data` (protects `submissions.json` across deploys)

---

## Project 2: Ai Master
- **GitHub Repository**: https://github.com/Aggrey444/aipromptmaster
- **VPS Hosted on**: Dokploy (`69.62.106.189`)
- **Project Name in Dokploy**: Ai Master
- **SSH Login**: `ssh root@69.62.106.189` (Password: `Kissinger2026@`)
- **Auto-Deploy Note**: Configure Dokploy GitHub Webhook so any git push automatically deploys.

