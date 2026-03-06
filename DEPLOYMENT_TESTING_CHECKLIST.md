# UAPMP Authentication - Deployment & Testing Checklist

## Pre-Deployment Setup

### Backend Configuration

- [ ] Install Node.js dependencies

  ```bash
  cd backend
  npm install
  ```

- [ ] Create `.env` file in backend directory with:

  ```env
  GOOGLE_CLIENT_ID=your_client_id
  JWT_SECRET=your_secret_key_min_32_chars
  MONGO_URI=mongodb://localhost:27017/uapmp
  PORT=5000
  ```

- [ ] Google OAuth Setup Complete
  - [ ] Google Cloud project created
  - [ ] OAuth consent screen configured
  - [ ] OAuth 2.0 credentials generated
  - [ ] Client ID copied to backend `.env`
  - [ ] Client ID copied to frontend files

- [ ] Email Configuration (Optional but Recommended)
  - [ ] SMTP service configured (Gmail, SendGrid, etc.)
  - [ ] EMAIL_HOST configured
  - [ ] EMAIL_USER and EMAIL_PASS configured
  - [ ] EMAIL_FROM set to appropriate sender

- [ ] Database Setup
  - [ ] MongoDB running locally or connection string set
  - [ ] MONGO_URI points to correct database

### Frontend Configuration

- [ ] Update `frontend/config.js` with GOOGLE_CLIENT_ID

  ```javascript
  const API_CONFIG = {
    GOOGLE_CLIENT_ID: "YOUR_CLIENT_ID_HERE",
    // ... rest of config
  };
  ```

- [ ] Or update HTML files directly:
  - [ ] `frontend/html/signup.html` - Line with GOOGLE_CLIENT_ID
  - [ ] `frontend/html/signin.html` - Line with GOOGLE_CLIENT_ID

- [ ] Verify API URLs in frontend files point to correct backend
  - [ ] BASE_URL: `http://localhost:5000`
  - [ ] Signup URL: `http://localhost:5000/api/auth/register`
  - [ ] Login URL: `http://localhost:5000/api/auth/login`
  - [ ] Google Login URL: `http://localhost:5000/api/auth/google-login`

## Pre-Testing Verification

### Backend Startup

- [ ] Start MongoDB

  ```bash
  mongod
  ```

- [ ] Start backend server

  ```bash
  cd backend
  npm start
  ```

- [ ] Verify backend is running
  - [ ] Terminal shows: `[SUCCESS] Server initialized on port 5000`
  - [ ] Can access `http://localhost:5000/api/auth/me` (should get 401 - expected)

### Frontend Accessibility

- [ ] Can access signup page: `http://localhost:5501/frontend/html/signup.html`
- [ ] Can access signin page: `http://localhost:5501/frontend/html/signin.html`
- [ ] Google button visible on both pages
- [ ] Forms render correctly (styling applied)
- [ ] No console errors on page load

## Unit Testing - Email/Password Authentication

### Signup Flow

**Test Case 1: Valid Signup**

- [ ] Go to signup page
- [ ] Fill form with:
  - Name: `Ahmed Mohamed Khan`
  - Email: `2024001@std.sci.cu.edu.eg`
  - Password: `SecurePass123!`
  - Confirm: `SecurePass123!`
- [ ] Click "Sign up"
- [ ] Expected Results:
  - [ ] Success message appears
  - [ ] No form errors
  - [ ] Message indicates check email for verification
  - [ ] Redirects to signin after 1-2 seconds

**Test Case 2: Weak Password**

- [ ] On signup page, fill form
- [ ] Enter password: `weak` (fails complexity)
- [ ] Expected Results:
  - [ ] Password requirements shown in real-time
  - [ ] Requirements show what's missing (red X's)
  - [ ] Submit button should work but backend rejects it
  - [ ] Error message: "Password does not meet security requirements"

**Test Case 3: Password Mismatch**

- [ ] Enter password: `SecurePass123!`
- [ ] Enter confirm: `DifferentPass123!`
- [ ] Click "Sign up"
- [ ] Expected Results:
  - [ ] Frontend error: "Passwords do not match"
  - [ ] Form not submitted

**Test Case 4: Missing Fields**

- [ ] Leave one field empty
- [ ] Click "Sign up"
- [ ] Expected Results:
  - [ ] Frontend error: "All fields are required"
  - [ ] Form not submitted

**Test Case 5: Invalid Email Format**

- [ ] Use email: `abc@gmail.com` (not university email)
- [ ] Fill other fields correctly
- [ ] Click "Sign up"
- [ ] Expected Results:
  - [ ] Backend error: "Invalid email format"
  - [ ] Message: "Invalid Cairo University email format"

**Test Case 6: Duplicate Email**

- [ ] Register first time with valid email
- [ ] Verify email
- [ ] Try to register again with same email
- [ ] Expected Results:
  - [ ] Backend error: "Account with this email already exists"
  - [ ] Code: "DUPLICATE_ENTRY"

### Email Verification Flow

**Test Case 7: Email Verification Link**

- [ ] After successful signup, check email inbox
- [ ] Expected Results:
  - [ ] Email received with subject "Verify Your Email - UAPMP"
  - [ ] Email contains verification link
  - [ ] Email contains both link and text version of link
- [ ] Click verification link
- [ ] Expected Results:
  - [ ] Redirected to dashboard
  - [ ] URL parameters contain token and user data
  - [ ] User is logged in (token in localStorage)
  - [ ] Can see user's role-appropriate dashboard

**Test Case 8: Expired Verification Link**

- [ ] Sign up with email
- [ ] Wait 24+ hours (or manually test in DB)
- [ ] Try to verify email after 24 hours
- [ ] Expected Results:
  - [ ] Error message: "Verification link has expired"
  - [ ] Message: "unverified account has been removed"
  - [ ] Old user record deleted from database

**Test Case 9: Already Verified Link**

- [ ] Verify email once
- [ ] Try to verify same user again
- [ ] Expected Results:
  - [ ] Message: "Email is already verified"
  - [ ] Redirected to dashboard
  - [ ] No errors or data corruption

### Login Flow

**Test Case 10: Successful Login (After Verification)**

- [ ] Sign up and verify email
- [ ] Open signin page
- [ ] Enter verified email and password
- [ ] Click "Log In"
- [ ] Expected Results:
  - [ ] Success message
  - [ ] Redirected to dashboard
  - [ ] JWT token in localStorage
  - [ ] User data in localStorage

**Test Case 11: Wrong Password**

- [ ] Enter correct email, wrong password
- [ ] Click "Log In"
- [ ] Expected Results:
  - [ ] Error: "Invalid email or password"
  - [ ] Stay on signin page
  - [ ] No tokens stored

**Test Case 12: Unverified Email Login**

- [ ] Create account but don't verify email
- [ ] Try to login
- [ ] Expected Results:
  - [ ] Error: "Please verify your email first"
  - [ ] Code: "EMAIL_NOT_VERIFIED"
  - [ ] Stay on signin page

**Test Case 13: Non-existent Email**

- [ ] Enter random email that was never registered
- [ ] Click "Log In"
- [ ] Expected Results:
  - [ ] Error: "Invalid email or password"
  - [ ] Stay on signin page

## Google OAuth Testing

### Google Button Display

- [ ] Signup page has "Continue with Google" button
- [ ] Signin page has "Continue with Google" button
- [ ] Both buttons are styled consistently
- [ ] Button text and Google logo are visible
- [ ] Buttons are clickable

### Google Signup Flow

**Test Case 14: New User Google Signup**

- [ ] Go to signup page
- [ ] Click "Continue with Google"
- [ ] Expected Results:
  - [ ] Google sign-in dialog appears
  - [ ] Can select Google account

- [ ] Sign in with Google account containing university email
- [ ] Expected Results:
  - [ ] Dialog closes
  - [ ] "Authenticating with Google..." message shown
  - [ ] Redirected to correct dashboard
  - [ ] JWT token in localStorage
  - [ ] User data in localStorage with `authProvider: "google"`

- [ ] Verify user created in database
  - [ ] User has googleId field populated
  - [ ] User has authProvider: "google"
  - [ ] User has role correctly set
  - [ ] User has isEmailVerified: true

**Test Case 15: Google Login Process**

- [ ] Go to signin page
- [ ] Click "Continue with Google"
- [ ] Sign in with registered Google account
- [ ] Expected Results:
  - [ ] Successful authentication
  - [ ] Redirected to dashboard
  - [ ] Same JWT-based authentication

**Test Case 16: Non-University Email**

- [ ] Use personal Gmail account (not university email)
- [ ] Try Google OAuth
- [ ] Expected Results:
  - [ ] Error: "Google account email must be from supported university"
  - [ ] Stay on signup/signin page
  - [ ] No account created

**Test Case 17: Account Linking**

- [ ] Sign up with email/password (e.g., `student@uni.edu.eg`)
- [ ] Verify email
- [ ] Go to signin page
- [ ] Click "Continue with Google"
- [ ] Sign in with same email's Google account
- [ ] Expected Results:
  - [ ] Successful authentication
  - [ ] Redirected to dashboard
  - [ ] User now has both password and googleId
  - [ ] Can login via either method

## Protected Routes Testing

### Test Case 18: JWT Validation

**Valid Token:**

- [ ] After login, get JWT from localStorage
- [ ] Call `GET /api/auth/me` with token in Authorization header
- [ ] Expected Results:
  - [ ] Returns user data (200 OK)
  - [ ] Response includes all user fields

**Missing Token:**

- [ ] Call `GET /api/auth/me` without token
- [ ] Expected Results:
  - [ ] Error: "Authentication token required" (401)
  - [ ] Code: "NO_TOKEN"

**Invalid Token:**

- [ ] Use random string as token
- [ ] Call `GET /api/auth/me`
- [ ] Expected Results:
  - [ ] Error: "Invalid or expired token" (401)
  - [ ] Code: "INVALID_TOKEN"

**Expired Token:**

- [ ] Get valid JWT
- [ ] Wait for expiration (or manually set short expiration)
- [ ] Call `GET /api/auth/me`
- [ ] Expected Results:
  - [ ] Error: "Invalid or expired token" (401)

## Integration Testing

### Test Case 19: User Dashboard Access

**After Login:**

- [ ] Student user logs in
- [ ] Expected Results:
  - [ ] Redirected to student-profile.html
  - [ ] Can access protected resources

- [ ] Instructor user logs in
- [ ] Expected Results:
  - [ ] Redirected to instructor-profile.html
  - [ ] Can access protected resources

### Test Case 20: Session Management

- [ ] Login and get JWT
- [ ] Close browser and reopen
- [ ] Check localStorage for token and user data
- [ ] Expected Results:
  - [ ] User remains logged in if token not expired
  - [ ] User redirected to dashboard automatically
  - [ ] Can access authenticated routes

### Test Case 21: Logout Flow

- [ ] When logout endpoint is implemented:
  - [ ] Click logout button
  - [ ] Expected Results:
    - [ ] JWT removed from localStorage
    - [ ] User data removed from localStorage
    - [ ] Redirected to signin page
    - [ ] Cannot access protected routes

## Browser Compatibility Testing

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Security Testing

### Test Case 22: Password Security

- [ ] Signup with weak password - rejected
- [ ] Password not shown in plain text in database
- [ ] Password not returned in API responses
- [ ] Password comparison uses bcrypt

### Test Case 23: CORS Testing

- [ ] Frontend can communicate with backend
- [ ] Requests from other origins are blocked
- [ ] Credentials are properly handled

### Test Case 24: SQL/NoSQL Injection

- [ ] Try special characters in email field
- [ ] Try script tags in name field
- [ ] Try database commands in password
- [ ] Expected Results:
  - [ ] All handled safely by Mongoose/Express
  - [ ] No data corruption
  - [ ] No errors exposed to user

### Test Case 25: Email Verification Security

- [ ] Can't bypass email verification
- [ ] Can't access account before verification
- [ ] Verification link expires correctly
- [ ] Multiple verification attempts work correctly

## Error Handling Testing

### Test Case 26: Network Errors

- [ ] Shutdown backend server
- [ ] Try to signup/login
- [ ] Expected Results:
  - [ ] Error message displayed
  - [ ] Message: "ensure backend is running"
  - [ ] User can retry when backend is back

### Test Case 27: Invalid Responses

- [ ] Backend returns unexpected format
- [ ] Frontend handles gracefully
- [ ] User sees meaningful error

## Performance Testing

- [ ] Signup completes within 2-3 seconds
- [ ] Login completes within 1-2 seconds
- [ ] Google OAuth completes within 2-3 seconds
- [ ] Email verification within 5 seconds
- [ ] JWT validation instant (<100ms)
- [ ] No memory leaks on repeated logins

## Database Testing

### Test Case 28: Data Integrity

- [ ] Check User collection after signup
  - [ ] Document has all required fields
  - [ ] No extra fields stored
  - [ ] Timestamps are correct
- [ ] Check indexes exist
  - [ ] Email index is unique
  - [ ] StudentId index is unique and sparse
  - [ ] GoogleId index is unique and sparse

### Test Case 29: Concurrent Operations

- [ ] Multiple users signup simultaneously
- [ ] Multiple users login simultaneously
- [ ] No data corruption
- [ ] All requests complete successfully

## Production Readiness Checklist

- [ ] All tests pass
- [ ] No console errors
- [ ] No network errors
- [ ] Error messages user-friendly
- [ ] Security measures in place
- [ ] Database backups configured
- [ ] Logging implemented
- [ ] Rate limiting configured
- [ ] HTTPS configured for production
- [ ] Environment variables properly set
- [ ] Dependencies updated and secure
- [ ] Documentation complete
- [ ] Code commented where necessary

## Post-Deployment Verification

- [ ] Login to production instance
- [ ] Test email signup/verification
- [ ] Test Google OAuth
- [ ] Test email sending(if applicable)
- [ ] Check database in production
- [ ] Monitor error logs
- [ ] Verify HTTPS is working
- [ ] Test on multiple devices/browsers

## Performance Metrics Target

| Operation          | Target  | Status |
| ------------------ | ------- | ------ |
| Signup             | < 3s    | ✓      |
| Login              | < 2s    | ✓      |
| Email Verification | < 5s    | ✓      |
| Google OAuth       | < 3s    | ✓      |
| JWT Validation     | < 100ms | ✓      |
| API Response       | < 500ms | ✓      |

## Sign-Off

- [ ] Backend Developer Sign-Off
- [ ] Frontend Developer Sign-Off
- [ ] QA Sign-Off
- [ ] DevOps/Infrastructure Sign-Off
- [ ] Product Manager Sign-Off

---

**Deployment Date**: ******\_\_\_******
**Tester Name**: ******\_\_\_******
**Build Version**: ******\_\_\_******
**Notes**: ******\_\_\_******

All checklist items should be completed and verified before deploying to production.
