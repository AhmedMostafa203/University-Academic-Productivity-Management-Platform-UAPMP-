/**
 * Frontend Configuration
 * API endpoints and environment settings
 */

const API_CONFIG = {
  // Base API URL - Update based on environment
  BASE_URL: "http://localhost:5000",

  // API Endpoints
  ENDPOINTS: {
    REGISTER: "/api/auth/register",
    LOGIN: "/api/auth/login",
    LOGOUT: "/api/auth/logout",
  },

  // Generated URLs for easy access
  getRegisterUrl() {
    return this.BASE_URL + this.ENDPOINTS.REGISTER;
  },
  getLoginUrl() {
    return this.BASE_URL + this.ENDPOINTS.LOGIN;
  },
  getLogoutUrl() {
    return this.BASE_URL + this.ENDPOINTS.LOGOUT;
  },
};
