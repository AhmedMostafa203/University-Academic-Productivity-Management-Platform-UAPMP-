# UAPMP Authentication Implementation - Quick Start Guide

## What Was Implemented

This document summarizes the complete OAuth and Email/Password authentication system implemented for UAPMP.

### ✅ Backend Implementation

#### 1. User Schema Updates (`backend/models/User.js`)

- Added `googleId` field (unique, sparse) for Google OAuth accounts
- Added `authProvider` field (enum: 'local' or 'google') to track signup method
- All other fields already present: fullName, email, studentId, password, role, university, college, isEmailVerified

#### 2. Authentication Routes (`backend/routes/auth.js`)

- **POST /api/auth/register** - Email/password signup with verification
- **POST /api/auth/login** - Email/password login (requires email verification)
- **GET /api/auth/verify-email/:uid** - Direct email verification link (auto-redirects to dashboard)
- **POST /api/auth/verify-email** - API email verification endpoint
- **POST /api/auth/google-login** - Google OAuth login/signup (NEW)
- **GET /api/auth/me** - Get current authenticated user

#### 3. Google OAuth Implementation

- Receives Google ID token from frontend
- Verifies token using `google-auth-library`
- Extracts email and user info from token
- Validates that email is from supported university
- Automatically extracts: role, college, student ID from email
- Creates new user if not exists
- Links Google account to existing email/password account if same email
- Generates JWT token after successful authentication

#### 4. Dependencies Added (`backend/package.json`)

- `google-auth-library` - For verifying Google ID tokens

### ✅ Frontend Implementation

#### 1. Signup Page (`frontend/html/signup.html`)

- Added Google SDK script import
- Added "Continue with Google" button
- Styled to match signup form design
- Added JavaScript handler for Google sign-in flow
- Redirects to dashboard after successful Google signup

#### 2. Signin Page (`frontend/html/signin.html`)

- Added Google SDK script import
- Added "Continue with Google" button
- Styled to match signin form design
- Added JavaScript handler for Google sign-in flow
- Redirects to dashboard after successful Google login

#### 3. Google OAuth JavaScript

- Initializes Google Sign-In SDK on page load
- Handles Google button clicks
- Processes ID tokens from Google
- Sends tokens to backend for verification
- Stores JWT and user data in localStorage
- Redirects to appropriate dashboard (student/instructor)

#### 4. Frontend Configuration (`frontend/config.js`)

- Added `GOOGLE_CLIENT_ID` configuration
- Added `GOOGLE_LOGIN` endpoint URL
- Added helper method `getGoogleLoginUrl()`

### ✅ Documentation Created

1. **GOOGLE_OAUTH_SETUP.md** - Complete Google OAuth setup guide
   - Step-by-step Google Cloud Console configuration
   - Environment variable setup
   - Frontend Client ID configuration
   - Testing checklist
   - Troubleshooting guide
   - Production deployment notes

2. **AUTHENTICATION_IMPLEMENTATION_GUIDE.md** - Comprehensive technical guide
   - Architecture overview
   - Component descriptions
   - Data flow diagrams
   - Authentication flows (email/password and Google OAuth)
   - Security implementation details
   - Error handling documentation
   - Testing checklist
   - Future enhancement suggestions

3. **backend/.env.example** - Environment configuration template
   - Google OAuth settings
   - JWT configuration
   - Email settings
   - Database configuration
   - Application settings

## How It Works

### Email/Password Flow

1. User signs up with university email and password
2. System validates email format and extracts role/college
3. Verification email is sent
4. User clicks verification link
5. Email is marked as verified
6. User is redirected to dashboard with JWT
7. User can now login with email/password

### Google OAuth Flow

1. User clicks "Continue with Google" button
2. Google sign-in dialog appears
3. User signs in with their Google account
4. Frontend receives Google ID token
5. Token is sent to backend for verification
6. Backend:
   - Verifies token with Google's servers
   - Extracts email from token
   - Validates university email
   - Creates account or links to existing account
   - Generates JWT token
7. User is redirected to dashboard
8. JWT is stored in localStorage

### Account Linking

- User can signup with email/password
- Later, user can also login with Google using the same email
- Backend automatically links the Google account to existing email account
- User can now use either method to login

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Google OAuth

1. Follow the detailed steps in [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)
2. Get Google Client ID and Secret
3. Add to backend `.env` file

### 3. Update Frontend

```javascript
// In frontend/config.js or in the HTML files:
const GOOGLE_CLIENT_ID = "YOUR_ACTUAL_CLIENT_ID_HERE";
```

### 4. Start Backend

```bash
cd backend
# Create .env file with required variables
# Then start the server:
npm start
```

### 5. Run Frontend

Open your browser to `http://localhost:5501/frontend/html/signup.html` or `signin.html`

## Testing

### Test Email/Password Authentication

1. Go to signup page
2. Enter university email (e.g., `2024001@std.sci.cu.edu.eg`)
3. Create password with all requirements
4. Click "Sign up"
5. Check email for verification link
6. Click verification link
7. Should be redirected to dashboard
8. Can now login with email/password

### Test Google OAuth

1. Go to signup or signin page
2. Click "Continue with Google"
3. Select your university Google account
4. Should be redirected to dashboard
5. Check localStorage for JWT token

### Test Account Linking

1. Signup with email/password (e.g., `student@uni.edu.eg`)
2. Verify email
3. Go to signin page
4. Click "Continue with Google"
5. Sign in with same email's Google account
6. Should authenticate and redirect to dashboard

## API Endpoints

### Authentication

- `POST /api/auth/register` - Signup with email/password
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/google-login` - Authenticate with Google token
- `GET /api/auth/verify-email/:uid` - Verify email (direct link)
- `POST /api/auth/verify-email` - Verify email (API)
- `GET /api/auth/me` - Get authenticated user details

### Request/Response Examples

#### Register

```bash
POST /api/auth/register
Content-Type: application/json

{
  "fullName": "Ahmed Khan",
  "email": "2024001@std.sci.cu.edu.eg",
  "password": "MyPassword123!",
  "confirmPassword": "MyPassword123!"
}

Response (201):
{
  "code": "REGISTRATION_SUCCESS_VERIFY_EMAIL",
  "message": "Account created successfully...",
  "user": {
    "id": "...",
    "fullName": "Ahmed Khan",
    "email": "2024001@std.sci.cu.edu.eg",
    "role": "student",
    "university": "Cairo University",
    "college": "Faculty of Science",
    "studentId": "2024001",
    "isEmailVerified": false
  }
}
```

#### Google Login

```bash
POST /api/auth/google-login
Content-Type: application/json

{
  "token": "eyJhbGciOiJSUzI1NiIs..." // Google ID Token
}

Response (200):
{
  "code": "GOOGLE_LOGIN_SUCCESS",
  "message": "Google login successful",
  "token": "eyJhbGc...", // JWT Token
  "user": {
    "id": "...",
    "fullName": "Ahmed Khan",
    "email": "2024001@std.sci.cu.edu.eg",
    "role": "student",
    "university": "Cairo University",
    "college": "Faculty of Science",
    "studentId": "2024001",
    "authProvider": "google"
  }
}
```

#### Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "2024001@std.sci.cu.edu.eg",
  "password": "MyPassword123!"
}

Response (200):
{
  "message": "Login successful",
  "token": "eyJhbGc...",
  "user": { ... }
}
```

#### Get Current User

```bash
GET /api/auth/me
Authorization: Bearer eyJhbGc...

Response (200):
{
  "code": "AUTH_VERIFIED",
  "message": "User authenticated successfully",
  "user": { ... }
}
```

## Security Features

✅ **Password Security**

- Bcrypt hashing with 10 salt rounds
- Password strength validation
- Timing-safe comparison

✅ **JWT Security**

- HMAC-SHA256 signing
- Configurable expiration (default 7 days)
- Token extraction from headers or query params

✅ **Google OAuth Security**

- Google token verification via official library
- Client ID audience validation
- Email domain validation

✅ **Database Security**

- Unique indexes on email, studentId, googleId
- Passwords never returned in API responses
- Sparse indexes for optional fields

✅ **Email Security**

- 24-hour verification link expiration
- Automatic deletion of expired unverified accounts
- Timestamp-based validation

## Configuration Checklist

- [ ] Google Cloud project created
- [ ] OAuth consent screen configured
- [ ] OAuth credentials generated (Client ID & Secret)
- [ ] Backend `.env` file created with GOOGLE_CLIENT_ID
- [ ] Frontend config.js or HTML files updated with GOOGLE_CLIENT_ID
- [ ] Dependencies installed (`npm install`)
- [ ] Email service configured for verification emails (if needed)
- [ ] Database MongoDB connection string set
- [ ] Backend server started and running on port 5000
- [ ] Frontend accessible at localhost:5501

## Troubleshooting

### Google Button Not Working

- Check that GOOGLE_CLIENT_ID is set correctly in frontend
- Verify Client ID is from Web Application type
- Check browser console for errors

### "Invalid Google Token" Error

- Ensure GOOGLE_CLIENT_ID in backend `.env` matches frontend
- Check that Client ID is correct
- Verify token is not expired

### Email Not Being Verified

- Check EMAIL_HOST and EMAIL_PORT in `.env`
- Verify EMAIL_USER and EMAIL_PASS credentials
- Check that email service (Gmail, custom SMTP, etc.) is configured

### Issue: Unsupported University Email

- Verify email domain is in `backend/constants/universities.js`
- Check email format matches expected pattern
- Test with a different university email if available

## Next Steps

1. **User Profile Pages** - Create student-profile.html and instructor-profile.html
2. **Dashboard** - Build the main dashboard after login
3. **Course Management** - Add course listing and management
4. **Protected Routes** - Create API routes that require authentication
5. **Role-Based Access** - Use `authorizeRole()` middleware for different user types

## File Summary

### Modified Files

- `backend/models/User.js` - Added googleId and authProvider fields
- `backend/routes/auth.js` - Added Google OAuth route
- `backend/package.json` - Added google-auth-library dependency
- `frontend/config.js` - Added Google OAuth configuration
- `frontend/html/signup.html` - Added Google sign-up button and handler
- `frontend/html/signin.html` - Added Google sign-in button and handler

### New Files

- `GOOGLE_OAUTH_SETUP.md` - Setup guide for Google OAuth
- `AUTHENTICATION_IMPLEMENTATION_GUIDE.md` - Technical documentation
- `backend/.env.example` - Environment configuration template

## Support & References

- [Google Identity Services Documentation](https://developers.google.com/identity)
- [google-auth-library (Node.js)](https://github.com/googleapis/google-auth-library-nodejs)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

**Implementation Status**: ✅ COMPLETE

All authentication features (Email/Password and Google OAuth) have been fully implemented and documented. The system is ready for testing and deployment.
