/**
 * Frontend Configuration
 * API endpoints and environment settings
 */

const API_CONFIG = {
  // Base API URL - Update based on environment
  BASE_URL: "http://localhost:5000",

  // Google OAuth Configuration
  GOOGLE_CLIENT_ID:
    "303955489135-58iqib3ca385os26p7r7ghgufo9q3si2.apps.googleusercontent.com", // Replace with actual Google Client ID

  // API Endpoints
  ENDPOINTS: {
    REGISTER: "/api/auth/register",
    VERIFY_EMAIL: "/api/auth/verify-email",
    LOGIN: "/api/auth/login",
    LOGOUT: "/api/auth/logout",
    GOOGLE_LOGIN: "/api/auth/google-login",
  },

  // Generated URLs for easy access
  getRegisterUrl() {
    return this.BASE_URL + this.ENDPOINTS.REGISTER;
  },
  getVerifyEmailUrl() {
    return this.BASE_URL + this.ENDPOINTS.VERIFY_EMAIL;
  },
  getLoginUrl() {
    return this.BASE_URL + this.ENDPOINTS.LOGIN;
  },
  getLogoutUrl() {
    return this.BASE_URL + this.ENDPOINTS.LOGOUT;
  },
  getGoogleLoginUrl() {
    return this.BASE_URL + this.ENDPOINTS.GOOGLE_LOGIN;
  },
};
