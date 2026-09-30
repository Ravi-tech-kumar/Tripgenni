import { notificationApi } from './api.config';
import toast from 'react-hot-toast';

export const notificationService = {
  async sendEmail(emailData) {
    try {
      const response = await notificationApi.post('/api/v1/notifications/email', {
        to: emailData.to,
        subject: emailData.subject,
        body: emailData.body,
        templateName: emailData.templateName,
        variables: emailData.variables
      });
      toast.success('Email sent successfully!');
      return response.data;
    } catch (error) {
      console.error('Send email error:', error);
      // Don't show error toast for email failures to avoid confusion
      if (error.code !== 'ERR_NETWORK') {
        toast.error('Email service unavailable');
      }
      throw error;
    }
  },

  async sendNotification(notificationData) {
    try {
      const response = await notificationApi.post('/api/v1/notifications/email', {
        to: notificationData.userEmail,
        subject: notificationData.title || 'Trip Update',
        body: notificationData.message,
        templateName: 'trip-update',
        variables: {
          tripId: notificationData.tripId,
          userName: notificationData.userName,
          destination: notificationData.destination,
          status: notificationData.status,
          ...notificationData.variables
        }
      });
      return response.data;
    } catch (error) {
      console.error('Send notification error:', error);
      return null;
    }
  },

  async getEvents(status = null, page = 0, size = 10) {
    try {
      let url = `/api/v1/notifications/events/paged?page=${page}&size=${size}`;
      if (status) {
        url += `&status=${status}`;
      }
      const response = await notificationApi.get(url);
      return response.data;
    } catch (error) {
      console.error('Get events error:', error);
      return { content: [], totalElements: 0 };
    }
  },

  async getEventById(eventId) {
    try {
      const response = await notificationApi.get(`/api/v1/notifications/events/${eventId}`);
      return response.data;
    } catch (error) {
      console.error('Get event error:', error);
      return null;
    }
  },

  async getStats() {
    try {
      const response = await notificationApi.get('/api/v1/notifications/stats');
      return response.data;
    } catch (error) {
      console.error('Get stats error:', error);
      return null;
    }
  }
};

export default notificationService;

// import { notificationApi } from './api.config';
// import toast from 'react-hot-toast';

// export const notificationService = {
//   async sendEmail(emailData) {
//     try {
//       const response = await notificationApi.post('/api/v1/notifications/email', {
//         to: emailData.to,
//         subject: emailData.subject,
//         body: emailData.body,
//         templateName: emailData.templateName,
//         variables: emailData.variables
//       });
//       toast.success('Email sent successfully');
//       return response.data;
//     } catch (error) {
//       const message = error.response?.data?.message || error.message || 'Failed to send email';
//       toast.error(message);
//       throw error;
//     }
//   },

//   async sendNotification(notificationData) {
//     try {
//       const response = await notificationApi.post('/api/v1/notifications/email', {
//         to: notificationData.userEmail,
//         subject: notificationData.title || 'Trip Update',
//         body: notificationData.message,
//         templateName: 'trip-update',
//         variables: {
//           tripId: notificationData.tripId,
//           userName: notificationData.userName,
//           destination: notificationData.destination,
//           status: notificationData.status,
//           ...notificationData.variables
//         }
//       });
//       return response.data;
//     } catch (error) {
//       console.error('Send notification error:', error);
//       return null;
//     }
//   },

//   async getEmailLogs(userId) {
//     try {
//       const response = await notificationApi.get(`/api/v1/notifications/events?userId=${userId}`);
//       return response.data;
//     } catch (error) {
//       console.error('Failed to fetch email logs:', error);
//       return [];
//     }
//   },

//   async getNotificationStats() {
//     try {
//       const response = await notificationApi.get('/api/v1/notifications/stats');
//       return response.data;
//     } catch (error) {
//       console.error('Failed to fetch notification stats:', error);
//       return null;
//     }
//   },

//   async getEvents(status = null, page = 0, size = 10) {
//     try {
//       let url = `/api/v1/notifications/events/paged?page=${page}&size=${size}`;
//       if (status) {
//         url += `&status=${status}`;
//       }
//       const response = await notificationApi.get(url);
//       return response.data;
//     } catch (error) {
//       console.error('Get events error:', error);
//       return { content: [], totalElements: 0 };
//     }
//   }
// };

// export default notificationService;


// import { notificationApi } from './api.config';
// import toast from 'react-hot-toast';

// export const notificationService = {
//   async sendEmail(emailData) {
//     try {
//       const response = await notificationApi.post('/api/v1/emails/send', emailData);
//       toast.success('Email sent successfully');
//       return response.data;
//     } catch (error) {
//       toast.error('Failed to send email');
//       throw error;
//     }
//   },

//   async getEmailLogs(userId) {
//     try {
//       const response = await notificationApi.get(`/api/v1/emails/logs/user/${userId}`);
//       return response.data;
//     } catch (error) {
//       console.error('Failed to fetch email logs:', error);
//       return [];
//     }
//   },

//   async getNotificationStats() {
//     try {
//       const response = await notificationApi.get('/api/v1/notifications/stats');
//       return response.data;
//     } catch (error) {
//       console.error('Failed to fetch notification stats:', error);
//       return null;
//     }
//   },
// };