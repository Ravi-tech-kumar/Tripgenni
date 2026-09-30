import { authApi } from './api.config';
import toast from 'react-hot-toast';

export const authService = {
  async register(email, password) {
    try {
      const response = await authApi.post('/api/auth/register', { email, password });
      toast.success('Registration successful! Please login.');
      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
      throw error;
    }
  },

  async login(email, password) {
    try {
      const response = await authApi.post('/api/auth/login', { email, password });
      const { accessToken, refreshToken, userId } = response.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('userId', userId);
      localStorage.setItem('userEmail', email); // Store email for display
      
      toast.success('Login successful!');
      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
      throw error;
    }
  },

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    toast.success('Logged out successfully');
    window.location.href = '/login';
  },

  getCurrentUser() {
    return {
      userId: localStorage.getItem('userId'),
      accessToken: localStorage.getItem('accessToken'),
      email: localStorage.getItem('userEmail'),
    };
  },

  isAuthenticated() {
    return !!localStorage.getItem('accessToken');
  },
};

export default authService;



// import { authApi } from './api.config';
// import toast from 'react-hot-toast';

// export const authService = {
//   async register(email, password) {
//     try {
//       const response = await authApi.post('/api/auth/register', { email, password });
//       toast.success('Registration successful! Please login.');
//       return response.data;
//     } catch (error) {
//       toast.error(error.response?.data?.message || 'Registration failed');
//       throw error;
//     }
//   },

//   async login(email, password) {
//     try {
//       const response = await authApi.post('/api/auth/login', { email, password });
//       const { accessToken, refreshToken, userId } = response.data;
      
//       localStorage.setItem('accessToken', accessToken);
//       localStorage.setItem('refreshToken', refreshToken);
//       localStorage.setItem('userId', userId);
      
//       toast.success('Login successful!');
//       return response.data;
//     } catch (error) {
//       toast.error(error.response?.data?.message || 'Login failed');
//       throw error;
//     }
//   },

//   logout() {
//     localStorage.removeItem('accessToken');
//     localStorage.removeItem('refreshToken');
//     localStorage.removeItem('userId');
//     toast.success('Logged out successfully');
//   },

//   getCurrentUser() {
//     return {
//       userId: localStorage.getItem('userId'),
//       accessToken: localStorage.getItem('accessToken'),
//     };
//   },

//   isAuthenticated() {
//     return !!localStorage.getItem('accessToken');
//   },
// };