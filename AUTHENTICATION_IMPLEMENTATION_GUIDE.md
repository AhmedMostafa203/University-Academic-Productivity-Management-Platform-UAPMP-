# UAPMP Authentication Implementation Guide

## Overview

UAPMP implements a comprehensive authentication system supporting both:

1. **Email/Password Authentication** - Traditional signup/login with email verification
2. **Google OAuth Authentication** - Single sign-on with Google accounts
3. **Account Linking** - Link Google accounts to existing email/password accounts

## Architecture

### Backend Components

#### 1. User Model (`backend/models/User.js`)

```javascript
User Schema fields:
- fullName: User's display name
- email: University email (unique, lowercase)
- studentId: 7-digit student ID (students only, unique, sparse)
- password: Bcrypt-hashed password
- role: 'student' or 'instructor' (auto-detected from email)
- university: University name (extracted from email)
- college: Faculty/College name (extracted from email)
- googleId: Google's unique ID (unique, sparse, optional)
- authProvider: 'local' or 'google' (indicates signup method)
- isEmailVerified: Boolean (verified status)
- timestamps: createdAt, updatedAt (auto-managed)
```

#### 2. Authentication Routes (`backend/routes/auth.js`)

**Email/Password Flow:**

- `POST /api/auth/register` - Create account with email/password
  - Validates university email format
  - Extracts role, college, student ID from email
  - Hashes password with bcrypt
  - Sends verification email
  - Returns user data (email not verified yet)

- `POST /api/auth/login` - Login with email/password
  - Validates credentials
  - Requires email verification first
  - Generates JWT token on success
  - Returns JWT and user data

- `GET /api/auth/verify-email/:uid` - Clickable email verification link
  - Marks email as verified
  - Auto-logs in user
  - Redirects to dashboard with JWT in query param

- `POST /api/auth/verify-email` - API email verification
  - Marks email as verified
  - Returns user data

**Google OAuth Flow:**

- `POST /api/auth/google-login` - Google OAuth authentication
  - Receives Google ID token from frontend
  - Verifies token with Google's servers
  - Extracts email and user info from token
  - Validates university email
  - Creates new user OR links to existing account
  - Generates JWT token
  - Returns JWT and user data

**Protected Routes:**

- `GET /api/auth/me` - Get current user (requires valid JWT)
  - Validates JWT token
  - Returns authenticated user data

#### 3. Authentication Middleware (`backend/middleware/auth.js`)

```javascript
authenticateToken(req, res, next)
- Extracts JWT from Authorization header or query param
- Verifies token signature and expiration
- Fetches user data from database
- Attaches user to req.user
- Proceeds to next middleware

authorizeRole(role)
- Returns middleware that checks req.user.role
- Restricts endpoint to specific roles
- Usage: router.get('/admin', authorizeRole('admin'), handler)
```

#### 4. Helper Functions

**Email Data Extraction (`extractUserDataFromEmail`):**

- Parses university email format
- Supports Cairo University formats:
  - Student: `2024001@std.sci.cu.edu.eg` (7 or 9-digit student ID)
  - Instructor: `khan@sci.cu.edu.eg` (name@subdomain)
- Extracts: university, college/faculty, role, studentId
- Validates against supported universities in `constants/universities.js`

**Password Validation (`validatePasswordStrength`):**

- Minimum 6 characters
- Contains at least one letter
- Contains at least one digit
- Contains at least one special character

**Email Sending (`sendVerificationEmail`):**

- Uses Nodemailer with SMTP configuration
- Sends HTML email with verification link
- Link expires after 24 hours

### Frontend Components

#### 1. Signup Page (`frontend/html/signup.html`)

**Features:**

- Email/password signup form with validation
- Password strength indicator
- Real-time requirement checking
- Google OAuth button
- Redirect to signin after signup
- Auto-redirect if already logged in

**JavaScript Functions:**

```javascript
handleRegister(event)
- Validates form inputs
- Checks password strength
- Submits to /api/auth/register
- Stores user data in localStorage
- Redirects to signin page

initGoogleSignUp()
- Initializes Google Sign-In SDK
- Sets up button click handler
- Configures OAuth callback

handleGoogleResponse(response)
- Receives Google ID token
- Sends token to /api/auth/google-login
- Stores JWT and user data
- Redirects to dashboard
```

#### 2. Signin Page (`frontend/html/signin.html`)

**Features:**

- Email/password login form
- Google OAuth button
- "Forgot Password" link placeholder
- Redirect to signup
- Auto-redirect if already logged in

**JavaScript Functions:**

```javascript
handleLogin(event)
- Validates email and password
- Submits to /api/auth/login
- Stores JWT and user data
- Redirects to appropriate dashboard

initGoogleSignIn()
- Initializes Google Sign-In SDK
- Sets up button click handler

handleGoogleResponse(response)
- Receives Google ID token
- Sends token to /api/auth/google-login
- Stores JWT and user data
- Redirects to dashboard
```

#### 3. Frontend Configuration (`frontend/config.js`)

```javascript
API_CONFIG = {
  BASE_URL: "http://localhost:5000",
  GOOGLE_CLIENT_ID: "YOUR_CLIENT_ID",
  ENDPOINTS: {
    REGISTER: "/api/auth/register",
    LOGIN: "/api/auth/login",
    GOOGLE_LOGIN: "/api/auth/google-login",
    VERIFY_EMAIL: "/api/auth/verify-email",
  },
};
```

## Authentication Flows

### Email/Password Signup Flow

```
1. User visits /frontend/html/signup.html
2. Fills signup form (name, email, password)
3. Clicks "Sign up"
4. Frontend validates inputs and password strength
5. Frontend sends POST /api/auth/register
   {
     fullName: "Ahmed Khan",
     email: "2024001@std.sci.cu.edu.eg",
     password: "MyPassword123!",
     confirmPassword: "MyPassword123!"
   }
6. Backend:
   - Validates university email
   - Extracts role, college, student ID from email
   - Hashes password with bcrypt
   - Creates user record (isEmailVerified: false)
   - Sends verification email
7. Backend returns:
   {
     code: "REGISTRATION_SUCCESS_VERIFY_EMAIL",
     user: { id, fullName, email, role, ... }
   }
8. Frontend shows success message
9. User receives verification email
10. User clicks verification link
11. Backend marks email as verified
12. User is redirected to dashboard with JWT
13. Frontend stores JWT and redirects to dashboard
```

### Email/Password Login Flow

```
1. User visits /frontend/html/signin.html
2. Fills login form (email, password)
3. Clicks "Log In"
4. Frontend sends POST /api/auth/login
   {
     email: "2024001@std.sci.cu.edu.eg",
     password: "MyPassword123!"
   }
5. Backend:
   - Finds user by email
   - Checks if email is verified (rejects if not)
   - Compares password with bcrypt
   - Generates JWT token
6. Backend returns:
   {
     token: "eyJhbGc...",
     user: { id, fullName, email, role, ... }
   }
7. Frontend stores JWT and user data in localStorage
8. Frontend redirects to appropriate dashboard (student/instructor)
```

### Google OAuth Signup/Login Flow

```
1. User visits signup.html or signin.html
2. Clicks "Continue with Google" button
3. Frontend initializes Google Sign-In SDK
4. Google sign-in dialog appears
5. User selects Google account and authenticates
6. Google returns ID token to frontend
7. Frontend sends POST /api/auth/google-login
   {
     token: "eyJhbGciOiJSUzI1NiIs..." (Google ID token)
   }
8. Backend:
   - Verifies Google ID token with Google's servers
   - Extracts email from token payload
   - Validates university email
   - Extracts role, college, student ID from email

   IF new user:
     - Generates random password (for security)
     - Creates user record
     - Sets authProvider: 'google'
     - Sets isEmailVerified: true (Google verified it)

   IF existing user:
     - Links googleId to existing account
     - Updates authProvider if needed

   - Generates JWT token
9. Backend returns:
   {
     token: "eyJhbGc...",
     user: { id, fullName, email, role, googleId, ... }
   }
10. Frontend stores JWT and user data
11. Frontend redirects to dashboard
```

### Account Linking Flow (Google to Email/Password)

```
Scenario: User signed up with email/password, later tries Google login with same email

1. User completes email/password signup and verifies email
2. User clicks "Continue with Google"
3. User signs in with same Google account
4. Backend receives Google token with same email
5. Backend finds existing user with that email
6. Backend checks authProvider:
   - If 'local': Links googleId and keeps authProvider as 'local'
   - If 'google': Updates googleId if different
7. Backend generates and returns JWT
8. User can now login via both methods

Result: User has one account with both auth methods linked
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (HTML/JS)                      │
├────────────────────────┬──────────────────────────────────┤
│   signup.html          │       signin.html                │
│  • Email form          │     • Email form                 │
│  • Google btn          │     • Google btn                 │
└────────┬───────────────┴──────────────┬────────────────────┘
         │                              │
         ├─────────POST /register       │
         │                              │
         ├─────────POST /login──────────┤
         │                              │
         ├─────────POST /google-login───┤
         │                              │
         ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Google OAuth Servers                        │
│  • Token verification            (via google-auth-library)  │
│  • User info extraction                                     │
└──────────────────────────────────────────────────────────────┘
         ▲
         │
         └─────────Token verification API

         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend (Express.js + Node)                    │
├────────────────────────────────────────────────────────────┤
│  API Routes (auth.js)                                      │
│  • POST /register        - Email signup                    │
│  • POST /login          - Email login                      │
│  • POST /google-login   - Google OAuth                     │
│  • GET /verify-email/:id - Email verification             │
│  • GET /me              - Get current user                │
│                                                            │
│  Helper Functions                                          │
│  • extractUserDataFromEmail()                             │
│  • validatePasswordStrength()                             │
│  • sendVerificationEmail()                                │
│                                                            │
│  Middleware (auth.js)                                      │
│  • authenticateToken()  - JWT verification               │
│  • authorizeRole()      - Role-based access              │
└──────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                   MongoDB Database                          │
├────────────────────────────────────────────────────────────┤
│  Collections:                                              │
│  • users (User model with auth data)                      │
│  • (future: sessions, tokens, audit logs)                 │
└──────────────────────────────────────────────────────────────┘
         ▲
         │
         └─────────CRUD operations via Mongoose
```

## Security Implementation

### Password Security

- **Hashing**: bcryptjs with salt rounds: 10
- **Comparison**: bcrypt.compare() for timing-safe comparison
- **Storage**: Only hashed passwords stored in database
- **Validation**:
  - Minimum 6 characters
  - Must contain letters, digits, special characters

### JWT Security

- **Signing**: HS256 algorithm (configurable in backend)
- **Secret**: Environment variable (minimum 32 chars recommended)
- **Expiration**: Configurable (default: 7 days)
- **Extraction**: From Authorization header or query parameter
- **Verification**: Signature and expiration checked on protected routes

### Email Security

- **Verification**: 24-hour expiration on verification links
- **User Deletion**: Expired unverified accounts are automatically removed
- **Timestamps**: Uses account createdAt to validate link age

### Google OAuth Security

- **Token Verification**: Verified with Google's servers using google-auth-library
- **Audience Check**: Client ID validated during verification
- **Email Validation**: Only university emails accepted
- **New Account Creation**: Random strong password generated for google-created accounts

### Database Security

- **Unique Indexes**: Email, studentId, googleId prevent duplicates
- **Sparse Indexes**: Optional fields (googleId, studentId) don't affect uniqueness
- **Password Field**: Never selected or returned in API responses

## Error Handling

### Registration Errors

- `MISSING_FIELDS` - Required fields not provided
- `PASSWORD_MISMATCH` - Passwords don't match
- `WEAK_PASSWORD` - Password doesn't meet requirements
- `INVALID_EMAIL_FORMAT` - Not a university email or unsupported format
- `DUPLICATE_ENTRY` - Email or studentId already exists
- `VALIDATION_ERROR` - Schema validation failed

### Login Errors

- `MISSING_FIELDS` - Email or password not provided
- `INVALID_CREDENTIALS` - Email not found or password incorrect
- `EMAIL_NOT_VERIFIED` - Email not verified yet
- `INVALID_TOKEN` - JWT token is invalid or expired
- `USER_NOT_FOUND` - User no longer exists in database

### Google OAuth Errors

- `MISSING_TOKEN` - No Google token provided
- `INVALID_GOOGLE_TOKEN` - Token failed verification
- `NO_EMAIL_IN_GOOGLE` - Google account has no email
- `UNSUPPORTED_UNIVERSITY_EMAIL` - Not a supported university email
- `GOOGLE_LOGIN_ERROR` - Generic Google login error

## Testing Checklist

### Email/Password Authentication

- [ ] User can signup with valid university email
- [ ] User receives verification email
- [ ] User can verify email via link
- [ ] User is redirected to dashboard with JWT after verification
- [ ] User cannot login before email verification
- [ ] User can login after verification
- [ ] JWT is stored in localStorage
- [ ] Expired unverified accounts are deleted
- [ ] Weak passwords are rejected
- [ ] Duplicate emails are rejected
- [ ] Role is correctly extracted from email

### Google OAuth

- [ ] Google button appears on signup page
- [ ] Google button appears on signin page
- [ ] Click Google button opens Google sign-in dialog
- [ ] User can sign in with Google account
- [ ] User is created with correct role and college
- [ ] JWT is generated and stored
- [ ] User is redirected to correct dashboard
- [ ] Student role works (7-digit email)
- [ ] Instructor role works (name email)
- [ ] Non-university email is rejected
- [ ] Same account can be accessed via both methods

### Protected Routes

- [ ] GET /api/auth/me works with valid JWT
- [ ] GET /api/auth/me fails without JWT
- [ ] GET /api/auth/me fails with invalid JWT
- [ ] User data returned doesn't include password

### Session Management

- [ ] localStorage tokens are properly set
- [ ] Tokens are cleared on logout
- [ ] Already logged in users are redirected to dashboard
- [ ] JWT expiration works correctly

## Supported Universities

Currently configured universities in `backend/constants/universities.js`:

- **Cairo University** (cu.edu.eg)
  - Subdomains: sci, eng, med, dentistry, pharma, law, foc, edu, agr, vet, pt, fci, nursing, masscomm, feps, dar, arch, rup, sca

### Email Format Examples

**Students:**

- New format: `202400123@std.sci.cu.edu.eg` (9 digits, last 7 extracted)
- Legacy format: `2024001@std.sci.cu.edu.eg` (7 digits)
- Role: `student`
- Student ID: `2024001`

**Instructors:**

- Format: `ahmed@sci.cu.edu.eg`
- Role: `instructor`
- Student ID: `null`

## Future Enhancements

1. **Two-Factor Authentication (2FA)** - Add OTP via email or SMS
2. **Social Login Expansion** - Add Microsoft, GitHub OAuth
3. **Session Management** - Track active sessions, device info
4. **Login History** - Audit log of login attempts
5. **Password Reset** - Forgot password flow with email verification
6. **Rate Limiting** - Prevent brute force attacks on login
7. **Email Confirmation** - Additional email confirmation on login
8. **Biometric Auth** - WebAuthn for fingerprint/face recognition
9. **Account Recovery** - Recovery codes and phone verification
10. **API Tokens** - Long-lived tokens for API access

## References

- [JWT Documentation](https://jwt.io/)
- [bcryptjs Documentation](https://github.com/dcodeIO/bcrypt.js)
- [Google Identity Services](https://developers.google.com/identity)
- [Express.js Authentication Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
