# 🚀 SkillForge LMS - FREE Production Deployment Guide

Complete step-by-step guide to deploy your MERN stack LMS to the cloud **100% FREE**.

---

## 📊 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┴────────────────────┐
         │                                         │
         ▼                                         ▼
┌─────────────────────┐                 ┌─────────────────────┐
│   VERCEL (Free)     │                 │   RENDER (Free)     │
│   Frontend React    │◄───API────────►│   Backend Node.js   │
│   skillforge.vercel │  Requests       │   api.skillforge... │
│        .app         │                 │                     │
└─────────────────────┘                 └──────────┬──────────┘
                                                   │
                    ┌──────────────────────────────┼──────────────────────────────┐
                    │                              │                              │
                    ▼                              ▼                              ▼
         ┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
         │  MongoDB Atlas      │      │  Cloudinary         │      │  Gmail SMTP         │
         │  (Free 512MB)       │      │  (Free 25GB)        │      │  (Free Email)       │
         │  Database           │      │  File Storage       │      │  Password Reset     │
         └─────────────────────┘      └─────────────────────┘      └─────────────────────┘
```

---

## 🆓 Free Services We'll Use

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| **MongoDB Atlas** | Database | 512MB storage, forever free |
| **Render** | Backend hosting | 750 hours/month free |
| **Vercel** | Frontend hosting | Unlimited, forever free |
| **Cloudinary** | File/image storage | 25GB storage free |
| **Gmail SMTP** | Email service | Free with Google account |

---

# 📖 STEP-BY-STEP DEPLOYMENT

---

## 🗄️ STEP 1: Setup MongoDB Atlas (Database)

### 1.1 Create MongoDB Atlas Account
1. Go to [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Click **"Try Free"** → Sign up with Google or email
3. Choose **"Build a Database"**

### 1.2 Create Free Cluster
1. Select **"M0 Sandbox"** (FREE tier)
2. Choose cloud provider: **AWS** (recommended)
3. Choose region: Select closest to your users (e.g., Mumbai for India)
4. Cluster name: `SkillForge-Cluster`
5. Click **"Create Cluster"** (takes 1-3 minutes)

### 1.3 Setup Database Access
1. Go to **"Database Access"** in left sidebar
2. Click **"Add New Database User"**
3. Authentication: **Password**
4. Username: `skillforge_admin`
5. Password: Click **"Autogenerate Secure Password"** → **COPY THIS!**
6. Database User Privileges: **"Read and write to any database"**
7. Click **"Add User"**

### 1.4 Setup Network Access
1. Go to **"Network Access"** in left sidebar
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (adds `0.0.0.0/0`)
4. Click **"Confirm"**

> ⚠️ Note: For production, you should whitelist specific IPs. "Anywhere" is OK for learning.

### 1.5 Get Connection String
1. Go to **"Database"** → Click **"Connect"** on your cluster
2. Choose **"Connect your application"**
3. Driver: **Node.js**, Version: **5.5 or later**
4. Copy the connection string:
```
mongodb+srv://skillforge_admin:<password>@skillforge-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
```
5. Replace `<password>` with your actual password
6. Add database name before `?`:
```
mongodb+srv://skillforge_admin:YOUR_PASSWORD@skillforge-cluster.xxxxx.mongodb.net/skillforge?retryWrites=true&w=majority
```

### ✅ Save this connection string - you'll need it for backend deployment!

---

## ☁️ STEP 2: Setup Cloudinary (File Storage)

### 2.1 Create Account
1. Go to [https://cloudinary.com](https://cloudinary.com)
2. Click **"Sign Up for Free"**
3. Fill in details or sign up with Google

### 2.2 Get API Credentials
1. After login, you're on the **Dashboard**
2. Find your credentials:
   - **Cloud Name**: `dxxxxxxxxx`
   - **API Key**: `123456789012345`
   - **API Secret**: `xxxxxxxxxxxxxxxxxxx`

### ✅ Save these 3 values - you'll need them for backend deployment!

---

## 📧 STEP 3: Setup Gmail SMTP (Email Service)

### 3.1 Enable 2-Factor Authentication
1. Go to [https://myaccount.google.com](https://myaccount.google.com)
2. Click **"Security"** in left sidebar
3. Under "Signing in to Google", enable **2-Step Verification**

### 3.2 Create App Password
1. After enabling 2FA, go back to Security
2. Click **"2-Step Verification"**
3. Scroll down, click **"App passwords"**
4. Select app: **"Mail"**
5. Select device: **"Other"** → Name it "SkillForge"
6. Click **"Generate"**
7. **COPY THE 16-CHARACTER PASSWORD** (e.g., `abcd efgh ijkl mnop`)

### ✅ Save your email and app password:
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=abcdefghijklmnop (without spaces)
```

---

## 🔨 STEP 4: Prepare Backend for Deployment

### 4.1 Create Production Environment File
In your `backend` folder, the `.env` should have:

```env
# Server
NODE_ENV=production
PORT=5000

# MongoDB Atlas
MONGODB_URI=mongodb+srv://skillforge_admin:YOUR_PASSWORD@cluster.xxxxx.mongodb.net/skillforge?retryWrites=true&w=majority

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Client URL (will update after Vercel deployment)
CLIENT_URL=https://your-app.vercel.app

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Google Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM="SkillForge <your-email@gmail.com>"
```

### 4.2 Update CORS Settings
In `backend/server.js`, update CORS for production:

```javascript
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.CLIENT_URL,  // Vercel URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
};
app.use(cors(corsOptions));
```

### 4.3 Add Health Check Endpoint
Add this to `backend/server.js` for Render to check if server is running:

```javascript
// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});
```

### 4.4 Update package.json Scripts
In `backend/package.json`:
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

---

## 🌐 STEP 5: Deploy Backend on Render

### 5.1 Push to GitHub
If not already on GitHub:
```bash
# In your project root
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/skillforge-lms.git
git push -u origin main
```

### 5.2 Create Render Account
1. Go to [https://render.com](https://render.com)
2. Click **"Get Started for Free"**
3. Sign up with **GitHub** (recommended for easy repo access)

### 5.3 Create Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Find and select your `skillforge-lms` repo
4. Configure:
   - **Name**: `skillforge-api`
   - **Region**: Oregon or Singapore (closest to you)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: **Free**

### 5.4 Add Environment Variables
Scroll down to **"Environment Variables"** → **"Add from .env"** or add manually:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | A strong random string |
| `CLIENT_URL` | `https://skillforge.vercel.app` (update later) |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Your Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Your Cloudinary API secret |
| `GEMINI_API_KEY` | Your Google Gemini API key |
| `EMAIL_HOST` | `smtp.gmail.com` |
| `EMAIL_PORT` | `587` |
| `EMAIL_USER` | Your Gmail address |
| `EMAIL_PASS` | Your Gmail App Password |

### 5.5 Deploy
1. Click **"Create Web Service"**
2. Wait for deployment (5-10 minutes first time)
3. You'll get a URL like: `https://skillforge-api.onrender.com`

### 5.6 Test Backend
Visit: `https://skillforge-api.onrender.com/health`
Should return: `{"status":"OK","timestamp":"2026-01-09T..."}`

### ✅ Copy your Render URL - you'll need it for frontend!

> ⚠️ **Free Tier Note**: Render free tier sleeps after 15 minutes of inactivity. First request after sleep takes 30-60 seconds.

---

## 🎨 STEP 6: Prepare Frontend for Deployment

### 6.1 Update Environment Variables
Create `.env.production` in your frontend root:

```env
VITE_API_URL=https://skillforge-api.onrender.com/api
```

### 6.2 Update vite.config.ts (if needed)
Make sure your `vite.config.ts` doesn't have hardcoded localhost:

```typescript
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 6.3 Build Locally to Test
```bash
npm run build
```
Should create a `dist` folder without errors.

---

## ▲ STEP 7: Deploy Frontend on Vercel

### 7.1 Create Vercel Account
1. Go to [https://vercel.com](https://vercel.com)
2. Click **"Start Deploying"**
3. Sign up with **GitHub**

### 7.2 Import Project
1. Click **"Add New..."** → **"Project"**
2. Click **"Import"** next to your `skillforge-lms` repository
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (leave empty if frontend is at root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 7.3 Add Environment Variables
Click **"Environment Variables"** and add:

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://skillforge-api.onrender.com/api` |

### 7.4 Deploy
1. Click **"Deploy"**
2. Wait 2-3 minutes
3. You'll get a URL like: `https://skillforge-xxx.vercel.app`

### 7.5 Custom Domain (Optional)
1. Go to **Settings** → **Domains**
2. Add your custom domain (e.g., `skillforge.yourdomain.com`)
3. Follow DNS configuration instructions

---

## 🔄 STEP 8: Update Backend with Frontend URL

### 8.1 Update Render Environment Variable
1. Go to Render Dashboard → Your service
2. Go to **"Environment"**
3. Update `CLIENT_URL` to your Vercel URL:
   - `https://skillforge-xxx.vercel.app`
4. Click **"Save Changes"**
5. Service will auto-redeploy

---

## ✅ STEP 9: Final Testing

### Test Each Feature:

| Feature | Test |
|---------|------|
| ✅ Register | Create new account |
| ✅ Login | Login with new account |
| ✅ Create Course | Upload thumbnail, save course |
| ✅ Add Lesson | Upload video/files |
| ✅ Enroll | Student enrolls in course |
| ✅ Take Quiz | Generate AI quiz, submit |
| ✅ Certificate | Complete course, get PDF |
| ✅ Password Reset | Test forgot password email |
| ✅ Profile | Upload avatar |

---

## 🔧 TROUBLESHOOTING

### Backend Not Starting on Render
```
Error: Cannot find module 'xyz'
```
**Fix**: Make sure all dependencies are in `dependencies` (not `devDependencies`) in `backend/package.json`

### MongoDB Connection Failed
```
MongoNetworkError: connection timed out
```
**Fix**: Check Network Access in MongoDB Atlas - ensure `0.0.0.0/0` is allowed

### CORS Errors
```
Access-Control-Allow-Origin error
```
**Fix**: Make sure `CLIENT_URL` in Render matches your Vercel URL exactly

### Images Not Loading
```
403 Forbidden from Cloudinary
```
**Fix**: Check Cloudinary credentials are correct in Render environment variables

### Emails Not Sending
```
Error: Invalid login
```
**Fix**: Make sure you're using Gmail App Password (16 chars), not regular password

---

## 📊 COST BREAKDOWN

| Service | Monthly Cost | Limit |
|---------|-------------|-------|
| MongoDB Atlas | $0 | 512MB storage |
| Render | $0 | 750 hours/month |
| Vercel | $0 | 100GB bandwidth |
| Cloudinary | $0 | 25GB storage |
| Gmail SMTP | $0 | 500 emails/day |
| **TOTAL** | **$0** | Perfect for portfolio/demo |

---

## 🚀 PRODUCTION UPGRADES (When You Scale)

When you get more users, consider:

| Upgrade | Cost | Why |
|---------|------|-----|
| MongoDB Atlas M10 | $57/month | More storage, dedicated resources |
| Render Starter | $7/month | No sleep, faster cold starts |
| Vercel Pro | $20/month | More bandwidth, analytics |
| Cloudinary Plus | $89/month | More storage, transformations |

---

## 📁 FINAL FOLDER STRUCTURE FOR DEPLOYMENT

```
skillforge-lms/
├── backend/                    # Deploy to Render
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── server.js
│   ├── package.json
│   └── .env                   # DON'T commit - add to Render
│
├── src/                       # Deploy to Vercel
├── public/
├── index.html
├── package.json
├── vite.config.ts
├── .env.production           # Add VITE_API_URL
└── vercel.json               # Optional config
```

---

## ✨ YOUR LIVE URLS

After deployment, you'll have:

| Service | URL |
|---------|-----|
| **Frontend** | `https://skillforge-xxx.vercel.app` |
| **Backend API** | `https://skillforge-api.onrender.com/api` |
| **Health Check** | `https://skillforge-api.onrender.com/health` |

---

## 🎓 YOU'RE DONE!

Congratulations! Your SkillForge LMS is now live on the internet! 🎉

Share your project URL with:
- ✅ Your internship supervisor
- ✅ Put on your resume/portfolio
- ✅ Add to LinkedIn profile
- ✅ Include in GitHub profile README

---

*Deployment guide created for SkillForge LMS - January 2026*
