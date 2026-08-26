import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
});

// ==========================================================
// REQUEST INTERCEPTOR
// ==========================================================

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("tv_access_token");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);


// ==========================================================
// TOKEN REFRESH STATE
// ==========================================================

let refreshPromise = null;


// ==========================================================
// REFRESH ACCESS TOKEN
// ==========================================================

async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken =
    localStorage.getItem("tv_refresh_token");

  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  refreshPromise = axios
    .post(
      "/api/auth/refresh",
      {},
      {
        headers: {
          Authorization: `Bearer ${refreshToken}`,
        },
      }
    )
    .then((response) => {
      const accessToken =
        response?.data?.accessToken;

      if (!accessToken) {
        throw new Error(
          "Refresh response did not contain an access token"
        );
      }

      localStorage.setItem(
        "tv_access_token",
        accessToken
      );

      return accessToken;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}


// ==========================================================
// RESPONSE INTERCEPTOR
// ==========================================================

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest =
      error.config;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const accessToken =
        await refreshAccessToken();

      originalRequest.headers =
        originalRequest.headers || {};

      originalRequest.headers.Authorization =
        `Bearer ${accessToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      localStorage.removeItem(
        "tv_access_token"
      );

      localStorage.removeItem(
        "tv_refresh_token"
      );

      window.location.href = "/login";

      return Promise.reject(
        refreshError
      );
    }
  }
);


export default api;

