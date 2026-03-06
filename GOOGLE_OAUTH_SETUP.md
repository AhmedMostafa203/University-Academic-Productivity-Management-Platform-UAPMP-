# Google OAuth Setup Guide for UAPMP

This guide explains how to set up Google OAuth authentication for the UAPMP platform.

## Prerequisites

- Google Cloud Console account
- Node.js backend running
- Frontend files updated with Google SDK

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project named "UAPMP" (or your preferred name)
3. Wait for the project to be created

## Step 2: Configure OAuth Consent Screen

1. In the Google Cloud Console, go to **APIs & Services > OAuth consent screen**
2. Select **External** for the user type
3. Fill in the required fields:
   - **App name**: UAPMP (University Academic Productivity Management Platform)
   - **User support email**: your-email@example.com
   - **Developer contact**: your-email@example.com
4. Add scopes:
   - `openid`
   - `email`
   - `profile`
5. Add test users (your Google account email) if needed
6. Save and continue

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services > Credentials**
2. Click **+ Create Credentials > OAuth client ID**
3. Choose **Web application**
4. Fill in the configuration:
   - **Name**: UAPMP Web Client
   - **Authorized JavaScript origins**: Add these:
     - `http://localhost:5501`
     - `http://localhost:3000`
     - `http://127.0.0.1:5501`
     - `http://localhost`
     - Your production domain (e.g., `https://yourdomain.com`)
   - **Authorized redirect URIs**: Add these:
     - `http://localhost:5501/frontend/html/signup.html`
     - `http://localhost:5501/frontend/html/signin.html`
     - `http://localhost:3000/signup`
     - `http://localhost:3000/signin`
     - Your production URLs
5. Click **Create**
6. Copy your **Client ID** and **Client Secret**

## Step 4: Update Backend Environment Variables

Add the following to your `.env` file in the backend directory:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE

# Backend Configuration
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
BACKEND_URL=http://localhost:5000

# Email Configuration (if using email verification)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM="UAPMP Support <noreply@uapmp.edu.eg>"

# Database
MONGO_URI=mongodb://localhost:27017/uapmp

# Environment
NODE_ENV=development
PORT=5000
```

## Step 5: Update Frontend Configuration

Update `frontend/config.js` with your Google Client ID:

```javascript
const API_CONFIG = {
  BASE_URL: "http://localhost:5000",
  GOOGLE_CLIENT_ID: "YOUR_ACTUAL_CLIENT_ID_HERE", // Replace with your Client ID
  // ... rest of config
};
```

Alternatively, add it directly in the HTML files:

### In `frontend/html/signup.html`:

```javascript
const GOOGLE_CLIENT_ID = "YOUR_ACTUAL_CLIENT_ID_HERE";
```

### In `frontend/html/signin.html`:

```javascript
const GOOGLE_CLIENT_ID = "YOUR_ACTUAL_CLIENT_ID_HERE";
```

## Step 6: Dependencies Installation

The backend now requires these additional packages:

- `google-auth-library` (for verifying Google ID tokens)

Install them:

```bash
cd backend
npm install
```

## Step 7: Testing Google OAuth Flow

### Frontend Flow:

1. Open `http://localhost:5501/frontend/html/signup.html` or `signin.html`
2. Click **Continue with Google** button
3. Sign in with your university Google account
4. The system will:
   - Extract your university email
   - Verify it's from a supported university
   - Extract college and role from email format
   - Create or link your account
   - Redirect to your dashboard

### Expected Email Formats:

- **Student**: `2024001@std.sci.cu.edu.eg` (7-digit or 9-digit student ID)
- **Instructor**: `khan@sci.cu.edu.eg` (name@subdomain.university.edu.eg)

### Testing Checklist:

- [ ] Click Google button on signup page
- [ ] Verify with Google account
- [ ] System extracts university email
- [ ] Account created with correct role/college
- [ ] Redirected to student/instructor dashboard
- [ ] JWT token stored in localStorage
- [ ] Can log in again without email verification
- [ ] Linking works: signup with email/password, then Google with same email
- [ ] Only university emails are accepted

## Step 8: Troubleshooting

### "Invalid Google token" error

- Verify `GOOGLE_CLIENT_ID` matches in `.env` and frontend
- Check that Client ID is from a Web Application, not Mobile
- Verify authorized origins and redirect URIs in Google Console

### User not found / Email not from supported university

- Ensure you're using a university email
- Check that domains are configured in `backend/constants/universities.js`
- Verify email format matches: `[id]@std.[subdomain].university.edu.eg` or `[name]@[subdomain].university.edu.eg`

### CORS errors

- Check that your domain is in the authorized origins in Google Console
- Verify CORS configuration in `backend/server.js`

### Token verification fails

- Ensure `google-auth-library` is installed: `npm ls google-auth-library`
- Check that `GOOGLE_CLIENT_ID` is correct
- Verify the ID token hasn't expired (should be fresh from Google)

## Step 9: Production Deployment

When deploying to production:

1. Add your production domain to Google Console:
   - **Authorized JavaScript origins**: `https://yourdomain.com`
   - **Authorized redirect URIs**: `https://yourdomain.com/frontend/html/signup.html`, etc.

2. Update environment variables:

   ```env
   BACKEND_URL=https://yourdomain.com
   NODE_ENV=production
   ```

3. Update frontend configuration with production URLs

4. Use HTTPS only (required by Google for security)

## Features Implemented

### User Authentication

- [x] Email/Password signup with validation
- [x] Email/Password login
- [x] Email verification
- [x] Google OAuth login
- [x] Google OAuth signup
- [x] Account linking (Google to Email/Password)

### User Data

- [x] Automatic role detection from email
- [x] College/Faculty extraction from email
- [x] Student ID extraction (7 or 9 digits)
- [x] JWT token generation
- [x] User profile storage

### Security

- [x] Password hashing with bcrypt
- [x] JWT token validation
- [x] Google token verification
- [x] University domain validation
- [x] Email verification

## API Endpoints

### Authentication

- `POST /api/auth/register` - Email/password signup
- `POST /api/auth/login` - Email/password login
- `GET /api/auth/verify-email/:uid` - Email verification (direct link)
- `POST /api/auth/verify-email` - Email verification (API)
- `POST /api/auth/google-login` - Google OAuth login/signup
- `GET /api/auth/me` - Get current user (requires JWT)

## Next Steps

1. [x] Implement email/password authentication
2. [x] Implement Google OAuth authentication
3. [ ] Create user profile pages (student-profile.html, instructor-profile.html)
4. [ ] Implement protected API routes
5. [ ] Add role-based access control
6. [ ] Create course management pages
7. [ ] Add assignment/grade tracking

## Security Notes

- Always use HTTPS in production
- Never commit `.env` files to version control
- Use strong JWT secrets
- Regularly update dependencies
- Test with real university emails before deployment
- Keep Google Client Secret secure (backend only)

## References

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Sign-In for Web](https://developers.google.com/identity/sign-in/web/sign-in)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
