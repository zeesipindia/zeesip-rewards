# Zee Sip Rewards 🥤

Temporary "coming soon" landing page and foundation for the **Zee Sip Rewards** platform (Kerala's ₹20 packaged beverage brand featuring Mango Kulki 🥭 and Pineapple Kulki 🍍). Built for ultra-fast performance on mobile data when scanned via bottle QR codes.

---

## 🛠️ Local Development

### Prerequisites
- **Node.js**: `20.x` or newer LTS

### Commands

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

3. **Build for Production**
   ```bash
   npm run build
   ```

4. **Start Production Server**
   ```bash
   npm start
   ```

---

## 🚀 Deploying to Render

This project is configured as a Node.js Web Service on Render using standard configuration or Blueprint (`render.yaml`).

### Option A: Deploy via Blueprint (`render.yaml`)
1. Push your repository to GitHub.
2. Go to the [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Blueprint**.
3. Connect your GitHub repository `zeesip-rewards`.
4. Render will automatically detect `render.yaml` and provision the `zeesip-rewards` Web Service.

### Option B: Manual Web Service Setup
1. On the Render Dashboard, click **New +** -> **Web Service**.
2. Connect your GitHub repository `zeesip-rewards`.
3. Set the following details:
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Add Environment Variable:
   - `NODE_VERSION`: `20.18.0`

> ⚠️ **IMPORTANT DNS NOTE**  
> **The `zeesip.com` DNS records must NOT be pointed to Render until the real Spin & Win rewards experience is live.**  
> Pointing DNS early will cause `zeesip.com` visitors to be temporarily redirected via status `307` to `rewards.zeesip.com` before the main brand website is ready.

---

## 📁 Project Structure

Ready for future features:
- `app/page.tsx`: Coming soon mobile-first landing page with decorative spin wheel.
- `middleware.ts`: Temporary host-based redirect (`zeesip.com` -> `rewards.zeesip.com?src=bottle_qr`).
- Future route structure (`/play`, `/verify`, `/rewards`, `/profile`) can be cleanly added directly inside `app/`.
