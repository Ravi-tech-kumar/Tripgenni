import { tripApi } from './api.config';
import toast from 'react-hot-toast';

export const tripService = {
  // Create trip
  async createTrip(tripData) {
    try {
      if (!tripData.userId) {
        throw new Error('Missing User ID. Please log in again.');
      }
      const response = await tripApi.post('/api/trips/ctrip', tripData);
      toast.success('Trip created successfully');
      return response.data;
    } catch (error) {
      const data = error.response?.data;
      const message = typeof data === 'string'
        ? data
        : data?.message || data?.error || error.message || 'Failed to create trip';
      toast.error(message);
      throw error;
    }
  },

  // Get all trips for user
  async getTripsByUser(userId) {
    try {
      const response = await tripApi.get(`/api/trips/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch trips:', error);
      toast.error('Could not load your trips');
      return [];
    }
  },

  // Get single trip
  async getTrip(tripId) {
    try {
      const response = await tripApi.get(`/api/trips/${tripId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch trip:', error);
      toast.error('Could not load trip details');
      return null;
    }
  },

  // Update trip
  async updateTrip(tripId, tripData) {
    try {
      const response = await tripApi.put(`/api/trips/${tripId}`, tripData);
      toast.success('Trip updated successfully');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to update trip';
      toast.error(message);
      throw error;
    }
  },

  // Update trip status
  async updateTripStatus(tripId, status) {
    try {
      const response = await tripApi.patch(`/api/trips/${tripId}/status?status=${status}`);
      toast.success(`Trip status updated to ${status}`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to update status';
      toast.error(message);
      throw error;
    }
  },

  // Delete trip
  async deleteTrip(tripId) {
    try {
      const response = await tripApi.delete(`/api/trips/${tripId}`);
      toast.success('Trip deleted successfully');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to delete trip';
      toast.error(message);
      throw error;
    }
  },

  // Itinerary methods
  async addItineraryDay(dayData) {
    try {
      const response = await tripApi.post('/api/trips/itinerary', dayData);
      toast.success('Itinerary day added');
      return response.data;
    } catch (error) {
      toast.error('Failed to add itinerary day');
      throw error;
    }
  },

  async getItinerary(tripId) {
    try {
      const response = await tripApi.get(`/api/trips/itinerary/${tripId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch itinerary:', error);
      return [];
    }
  },

  async addFullItinerary(tripId, itinerary) {
    try {
      const response = await tripApi.post(`/api/trips/itinerary/batch/${tripId}`, itinerary);
      toast.success('Itinerary saved successfully');
      return response.data;
    } catch (error) {
      toast.error('Failed to save itinerary');
      throw error;
    }
  },

  // Activity methods
  async addActivity(activityData) {
    try {
      const response = await tripApi.post('/api/trips/activity', activityData);
      toast.success('Activity added');
      return response.data;
    } catch (error) {
      toast.error('Failed to add activity');
      throw error;
    }
  },

  async getActivities(dayId) {
    try {
      const response = await tripApi.get(`/api/trips/activity/${dayId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      return [];
    }
  },

  // Expense methods
  async addExpense(expenseData) {
    try {
      const response = await tripApi.post('/api/trips/expense', expenseData);
      toast.success('Expense added');
      return response.data;
    } catch (error) {
      toast.error('Failed to add expense');
      throw error;
    }
  },

  async getExpenses(tripId) {
    try {
      const response = await tripApi.get(`/api/trips/expense/${tripId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
      return [];
    }
  },

  // AI trip creation
  async createTripWithAI(tripData, interests) {
    try {
      const interestQuery = Array.isArray(interests) ? interests.join(',') : '';
      const response = await tripApi.post(`/api/trips/ai?interests=${interestQuery}`, tripData);
      toast.success('AI trip created successfully');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to create AI trip';
      toast.error(message);
      throw error;
    }
  }
};

export default tripService;





// import { tripApi } from './api.config';
// import toast from 'react-hot-toast';

// export const tripService = {
//   async createTrip(tripData) {
//     try {
//       const response = await tripApi.post('/api/trips', tripData);
//       toast.success('Trip created successfully');
//       return response.data;
//     } catch (error) {
//       toast.error(error.response?.data || 'Failed to create trip');
//       throw error;
//     }
//   },

//   async getTripsByUser(userId) {
//     try {
//       const response = await tripApi.get(`/api/trips/user/${userId}`);
//       return response.data;
//     } catch (error) {
//       console.error('Failed to fetch trips:', error);
//       return [];
//     }
//   },

//   async getTrip(tripId) {
//     try {
//       const response = await tripApi.get(`/api/trips/${tripId}`);
//       return response.data;
//     } catch (error) {
//       console.error('Failed to fetch trip:', error);
//       return null;
//     }
//   },

//   async addItineraryDay(dayData) {
//     try {
//       const response = await tripApi.post('/api/trips/itinerary', dayData);
//       toast.success('Itinerary day added');
//       return response.data;
//     } catch (error) {
//       toast.error('Failed to add itinerary day');
//       throw error;
//     }
//   },

//   async getItinerary(tripId) {
//     try {
//       const response = await tripApi.get(`/api/trips/itinerary/${tripId}`);
//       return response.data;
//     } catch (error) {
//       console.error('Failed to fetch itinerary:', error);
//       return [];
//     }
//   },

//   async addActivity(activityData) {
//     try {
//       const response = await tripApi.post('/api/trips/activity', activityData);
//       toast.success('Activity added');
//       return response.data;
//     } catch (error) {
//       toast.error('Failed to add activity');
//       throw error;
//     }
//   },

//   async getActivities(dayId) {
//     try {
//       const response = await tripApi.get(`/api/trips/activity/${dayId}`);
//       return response.data;
//     } catch (error) {
//       console.error('Failed to fetch activities:', error);
//       return [];
//     }
//   },

//   async addExpense(expenseData) {
//     try {
//       const response = await tripApi.post('/api/trips/expense', expenseData);
//       toast.success('Expense added');
//       return response.data;
//     } catch (error) {
//       toast.error('Failed to add expense');
//       throw error;
//     }
//   },

//   async getExpenses(tripId) {
//     try {
//       const response = await tripApi.get(`/api/trips/expense/${tripId}`);
//       return response.data;
//     } catch (error) {
//       console.error('Failed to fetch expenses:', error);
//       return [];
//     }
//   },

//   async createTripWithAI(tripData, interests) {
//     try {
//       const response = await tripApi.post(`/api/trips/ai?interests=${interests.join(',')}`, tripData);
//       toast.success('AI trip created successfully');
//       return response.data;
//     } catch (error) {
//       toast.error('Failed to create AI trip');
//       throw error;
//     }
//   },
// };