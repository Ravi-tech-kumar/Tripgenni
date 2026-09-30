import { userApi } from './api.config';
import toast from 'react-hot-toast';

export const userService = {
  // ================= PROFILE METHODS =================
  async createProfile(profileData) {
    try {
      const response = await userApi.post('/api/users/profile', profileData);
      toast.success('Profile created successfully');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to create profile';
      toast.error(message);
      throw error;
    }
  },

  async updateProfile(authUserId, profileData) {
    try {
      const response = await userApi.put(`/api/users/profile/${authUserId}`, profileData);
      toast.success('Profile updated successfully');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to update profile';
      toast.error(message);
      throw error;
    }
  },

 async getProfile(authUserId) {
    try {
        const response = await userApi.get(`/api/users/profile/${authUserId}`);
        return response.data;
    } catch (error) {
        // Return null for 404 (profile not created yet) - this is expected
        if (error.response?.status === 404) {
            console.log('Profile not found for user:', authUserId);
            return null; // Graceful handling, no error thrown
        }
        console.error('Failed to fetch profile:', error);
        return null;
    }
},

  // ================= PREFERENCE METHODS =================
  async savePreference(preferenceData) {
    try {
      const response = await userApi.post('/api/users/preferences', preferenceData);
      toast.success('Preferences saved successfully');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to save preferences';
      toast.error(message);
      throw error;
    }
  },

  async updatePreference(userId, preferenceData) {
    try {
      const response = await userApi.put(`/api/users/preferences/${userId}`, preferenceData);
      toast.success('Preferences updated successfully');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to update preferences';
      toast.error(message);
      throw error;
    }
  },

  async getPreference(userId) {
    try {
      const response = await userApi.get(`/api/users/preferences/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
      return null;
    }
  },

  // ================= DESTINATION METHODS =================
  async addDestination(destinationData) {
    try {
      const response = await userApi.post('/api/users/destinations', destinationData);
      toast.success('Destination added to wishlist');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to add destination';
      toast.error(message);
      throw error;
    }
  },

  async getDestinations(userId) {
    try {
      const response = await userApi.get(`/api/users/destinations/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch destinations:', error);
      return [];
    }
  },

  async removeDestination(destinationId) {
    try {
      const response = await userApi.delete(`/api/users/destinations/${destinationId}`);
      toast.success('Destination removed from wishlist');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to remove destination';
      toast.error(message);
      throw error;
    }
  }
};

export default userService;




// import { userApi } from './api.config';
// import toast from 'react-hot-toast';

// export const userService = {
//   async createProfile(profileData) {
//     try {
//       const response = await userApi.post('/api/users/profile', profileData);
//       toast.success('Profile created successfully');
//       return response.data;
//     } catch (error) {
//       toast.error('Failed to create profile');
//       throw error;
//     }
//   },

//   async getProfile(authUserId) {
//     try {
//       const response = await userApi.get(`/api/users/profile/${authUserId}`);
//       return response.data;
//     } catch (error) {
//       console.error('Failed to fetch profile:', error);
//       return null;
//     }
//   },

//   async savePreference(preferenceData) {
//     try {
//       const response = await userApi.post('/api/users/preferences', preferenceData);
//       toast.success('Preferences saved successfully');
//       return response.data;
//     } catch (error) {
//       toast.error('Failed to save preferences');
//       throw error;
//     }
//   },

//   async getPreference(userId) {
//     try {
//       const response = await userApi.get(`/api/users/preferences/${userId}`);
//       return response.data;
//     } catch (error) {
//       console.error('Failed to fetch preferences:', error);
//       return null;
//     }
//   },

//   async addDestination(destinationData) {
//     try {
//       const response = await userApi.post('/api/users/destinations', destinationData);
//       toast.success('Destination added successfully');
//       return response.data;
//     } catch (error) {
//       toast.error('Failed to add destination');
//       throw error;
//     }
//   },

//   async getDestinations(userId) {
//     try {
//       const response = await userApi.get(`/api/users/destinations/${userId}`);
//       return response.data;
//     } catch (error) {
//       console.error('Failed to fetch destinations:', error);
//       return [];
//     }
//   },
// };