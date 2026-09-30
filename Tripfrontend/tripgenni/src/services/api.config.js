import axios from 'axios';

const API_CONFIG = {
  auth: import.meta.env.VITE_AUTH_SERVICE_URL || 'http://localhost:8085',
  user: import.meta.env.VITE_USER_SERVICE_URL || 'http://localhost:8082',
  trip: import.meta.env.VITE_TRIP_SERVICE_URL || 'http://localhost:8083',
  notification: import.meta.env.VITE_NOTIFICATION_SERVICE_URL || 'http://localhost:8084',
  ai: import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8089',
};

export const authApi = axios.create({ baseURL: API_CONFIG.auth });
export const userApi = axios.create({ baseURL: API_CONFIG.user });
export const tripApi = axios.create({ baseURL: API_CONFIG.trip });
export const notificationApi = axios.create({ baseURL: API_CONFIG.notification });
export const aiApi = axios.create({ baseURL: API_CONFIG.ai });

// Track if a refresh is already in progress to avoid parallel refresh calls
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const forceLogout = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userId');
  window.location.href = '/login';
};

const addInterceptors = (api) => {
  // Request: attach access token
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response: handle 401 with token refresh
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // Only attempt refresh on 401, and only once per request
      if (error.response?.status !== 401 || originalRequest._retry) {
        return Promise.reject(error);
      }

      // If a refresh is already happening, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');

        if (!refreshToken) {
          forceLogout();
          return Promise.reject(error);
        }

        // Call your auth service refresh endpoint
        const response = await axios.post(
          `${API_CONFIG.auth}/api/auth/refresh`,
          { refreshToken }
        );

        const { accessToken } = response.data;
        localStorage.setItem('accessToken', accessToken);

        // Retry all queued requests with new token
        processQueue(null, accessToken);

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        forceLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
  );
};

[authApi, userApi, tripApi, notificationApi, aiApi].forEach(addInterceptors);

export default {
  authApi,
  userApi,
  tripApi,
  notificationApi,
  aiApi
};
// import axios from 'axios';

// const BASE_URL = import.meta.env.VITE_API_GATEWAY_URL || "http://localhost:9090";

// export const authApi = axios.create({ baseURL: BASE_URL });
// export const userApi = axios.create({ baseURL: BASE_URL });
// export const tripApi = axios.create({ baseURL: BASE_URL });
// export const notificationApi = axios.create({ baseURL: BASE_URL });
// export const aiApi = axios.create({ baseURL: BASE_URL });

// // Token Interceptor
// const addTokenInterceptor = (api) => {
//   api.interceptors.request.use((config) => {
//     const token = localStorage.getItem('accessToken');
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   });
// };

// [authApi, userApi, tripApi, notificationApi, aiApi]
//   .forEach(api => addTokenInterceptor(api));

// import axios from 'axios';

// const API_CONFIG = {
//   // auth: import.meta.env.VITE_AUTH_SERVICE_URL || 'http://localhost:8085',
//   // user: import.meta.env.VITE_USER_SERVICE_URL || 'http://localhost:8082',
//   // trip: import.meta.env.VITE_TRIP_SERVICE_URL || 'http://localhost:8083',
//   // notification: import.meta.env.VITE_NOTIFICATION_SERVICE_URL || 'http://localhost:8084',
//   // ai: import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8085',
//   auth: import.meta.env.VITE_AUTH_SERVICE_URL || 'http://localhost:8085',
//   user: import.meta.env.VITE_USER_SERVICE_URL || 'http://localhost:8082',
  
//   // CHANGED: Match the 8083 port from your error logs
//   trip: import.meta.env.VITE_TRIP_SERVICE_URL || 'http://localhost:8083', 
  
//   notification: import.meta.env.VITE_NOTIFICATION_SERVICE_URL || 'http://localhost:8084',
//   ai: import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8089',
// };

// // Create axios instances for each service
// export const authApi = axios.create({ baseURL: API_CONFIG.auth });
// export const userApi = axios.create({ baseURL: API_CONFIG.user });
// export const tripApi = axios.create({ baseURL: API_CONFIG.trip });
// export const notificationApi = axios.create({ baseURL: API_CONFIG.notification });
// export const aiApi = axios.create({ baseURL: API_CONFIG.ai });

// // Add token to requests
// const addTokenInterceptor = (api) => {
//   api.interceptors.request.use((config) => {
//     // Ensure 'accessToken' is exactly what you see in LocalStorage
//     const token = localStorage.getItem('accessToken');
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   }, (error) => {
//     return Promise.reject(error);
//   });
// };

// // Apply to all instances
// [authApi, userApi, tripApi, notificationApi, aiApi].forEach(api => addTokenInterceptor(api));



// // import axios from 'axios';

// // const BASE_URL = import.meta.env.VITE_API_GATEWAY_URL || "http://localhost:9090";

// // export const authApi = axios.create({ baseURL: BASE_URL });
// // export const userApi = axios.create({ baseURL: BASE_URL });
// // export const tripApi = axios.create({ baseURL: BASE_URL });
// // export const notificationApi = axios.create({ baseURL: BASE_URL });
// // export const aiApi = axios.create({ baseURL: BASE_URL });

// // // Token Interceptor
// // const addTokenInterceptor = (api) => {
// //   api.interceptors.request.use((config) => {
// //     const token = localStorage.getItem('accessToken');
// //     if (token) {
// //       config.headers.Authorization = `Bearer ${token}`;
// //     }
// //     return config;
// //   });
// // };

// // [authApi, userApi, tripApi, notificationApi, aiApi]
// //   .forEach(api => addTokenInterceptor(api));

// import axios from 'axios';

// const API_CONFIG = {
//   // auth: import.meta.env.VITE_AUTH_SERVICE_URL || 'http://localhost:8085',
//   // user: import.meta.env.VITE_USER_SERVICE_URL || 'http://localhost:8082',
//   // trip: import.meta.env.VITE_TRIP_SERVICE_URL || 'http://localhost:8083',
//   // notification: import.meta.env.VITE_NOTIFICATION_SERVICE_URL || 'http://localhost:8084',
//   // ai: import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8085',
//     auth: import.meta.env.VITE_AUTH_SERVICE_URL || 'http://localhost:8085',
//   user: import.meta.env.VITE_USER_SERVICE_URL || 'http://localhost:8082',
//   trip: import.meta.env.VITE_TRIP_SERVICE_URL || 'http://localhost:8083',
//   //trip: import.meta.env.VITE_TRIP_SERVICE_URL || 'http://localhost:9090',
//   notification: import.meta.env.VITE_NOTIFICATION_SERVICE_URL || 'http://localhost:8084',
//   ai: import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8089',
// };

// // Create axios instances for each service
// export const authApi = axios.create({ baseURL: API_CONFIG.auth });
// export const userApi = axios.create({ baseURL: API_CONFIG.user });
// export const tripApi = axios.create({ baseURL: API_CONFIG.trip });
// export const notificationApi = axios.create({ baseURL: API_CONFIG.notification });
// export const aiApi = axios.create({ baseURL: API_CONFIG.ai });

// // Add token to requests
// const addTokenInterceptor = (api) => {
//   api.interceptors.request.use((config) => {
//     const token = localStorage.getItem('accessToken');
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   });
// };

// addTokenInterceptor(authApi);
// addTokenInterceptor(userApi);
// addTokenInterceptor(tripApi);
// addTokenInterceptor(notificationApi);
// addTokenInterceptor(aiApi);