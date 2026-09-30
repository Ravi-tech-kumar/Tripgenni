import { aiApi } from './api.config';
import toast from 'react-hot-toast';

export const aiService = {
  // ================= REGULAR API CALL (Old Method) =================
  async generateItinerary(request) {
    try {
      let days = request.days;
      if (!days && request.startDate && request.endDate) {
        const start = new Date(request.startDate);
        const end = new Date(request.endDate);
        days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      }

      const payload = {
        destination: request.destination,
        startingPoint: request.startingPoint || 'your location',
        days: days || 3,
        budget: request.budget || 50000,
        travelStyle: request.travelStyle || 'balanced',
        interests: request.interests || [],
        startDate: request.startDate,
        endDate: request.endDate,
        groupSize: request.groupSize || 1,
        preferences: request.preferences || {}
      };

      console.log('📤 Sending to AI Service:', payload);

      const response = await aiApi.post('/api/ai/generate', payload);
      
      console.log('📥 AI Service Response:', response.data);

      return this.transformResponse(response.data, request);
      
    } catch (error) {
      console.error('❌ AI generation error:', error);
      
      if (error.code === 'ERR_NETWORK') {
        toast.error('❌ AI Service is not running! Start it on port 8089');
      } else if (error.response?.status === 404) {
        toast.error('❌ AI endpoint not found');
      } else if (error.response?.status === 500) {
        toast.error('❌ AI Service internal error');
      } else {
        toast.error(`❌ AI Service error: ${error.response?.data?.message || error.message}`);
      }
      
      console.warn('⚠️ Using fallback response');
      return this.getFallbackResponse(request);
    }
  },

  // ================= STREAMING API CALL (New Method) =================
  async streamItinerary(request, onChunk, onComplete, onError, abortSignal) {
    try {
      let days = request.days;
      if (!days && request.startDate && request.endDate) {
        const start = new Date(request.startDate);
        const end = new Date(request.endDate);
        days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      }

      const payload = {
        destination: request.destination,
        startingPoint: request.startingPoint || 'your location',
        days: days || 3,
        budget: request.budget || 50000,
        travelStyle: request.travelStyle || 'balanced',
        interests: request.interests || [],
        startDate: request.startDate,
        endDate: request.endDate,
        groupSize: request.groupSize || 1,
        preferences: request.preferences || {}
      };

      console.log('📤 Streaming to AI Service:', payload);

      const response = await fetch('http://localhost:8089/api/ai/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(payload),
        signal: abortSignal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          let content = trimmed;

          // Remove ALL "data:" occurrences
          if (content.includes('data:')) {
            content = content.replace(/data:/g, '');
          }

          // Clean up
          content = content
            .replace(/\r$/, '')
            .replace(/\s+/g, ' ')
            .trim();

          if (!content || content === '[DONE]') continue;

          // Add space to avoid word merging
          fullResponse += content + ' ';

          if (onChunk) onChunk(content, fullResponse);
        }
      }

      if (onComplete) onComplete(fullResponse || '⚠️ No response from AI service.');
      
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('❌ Streaming error:', error);
      toast.error('Streaming failed');
      if (onError) onError(error);
      if (onComplete) onComplete('⚠️ Failed to generate plan.');
    }
  },

  // ================= TRANSFORM RESPONSE =================
  transformResponse(data, request) {
    console.log('🔄 Transforming AI response...');
    
    if (data.itinerary && data.budgetBreakdown) {
      console.log('✅ Response already in correct format');
      return data;
    }

    const transformed = {
      destination: request.destination,
      itinerary: [],
      budgetBreakdown: {
        travel: 0,
        stay: 0,
        food: 0,
        activities: 0,
        miscellaneous: 0
      },
      totalBudget: 0,
      locations: [],
      tips: []
    };

    if (data.dailyItinerary && Array.isArray(data.dailyItinerary)) {
      console.log(`📅 Transforming ${data.dailyItinerary.length} days of itinerary`);
      transformed.itinerary = data.dailyItinerary.map(day => ({
        day: day.day,
        title: day.title,
        description: day.description || `Day ${day.day} in ${request.destination}`,
        activities: day.activities || [],
        accommodation: day.accommodation || 'City center hotel recommended',
        estimatedCost: day.estimatedCost || 100
      }));
    }

    if (data.estimatedBudget) {
      transformed.totalBudget = data.estimatedBudget;
      transformed.budgetBreakdown = {
        travel: data.estimatedBudget * 0.3,
        stay: data.estimatedBudget * 0.35,
        food: data.estimatedBudget * 0.2,
        activities: data.estimatedBudget * 0.1,
        miscellaneous: data.estimatedBudget * 0.05
      };
    }

    if (data.tips && Array.isArray(data.tips)) {
      transformed.tips = data.tips;
    }

    return transformed;
  },

  // ================= FALLBACK RESPONSE =================
  getFallbackResponse(request) {
    const days = request.days || 3;
    const destination = request.destination || 'your destination';

    console.log(`📋 Generating fallback response for ${destination} (${days} days)`);

    return {
      destination: destination,
      itinerary: Array.from({ length: days }, (_, i) => ({
        day: i + 1,
        title: `Day ${i + 1}: Explore ${destination}`,
        description: `Discover the beauty and culture of ${destination}.`,
        activities: [
          "Morning: Visit local attractions and landmarks",
          "Afternoon: Enjoy local cuisine at popular restaurants",
          "Evening: Relax and explore the nightlife"
        ],
        accommodation: "City center hotel recommended",
        estimatedCost: 100 + (i * 25)
      })),
      budgetBreakdown: {
        travel: 300,
        stay: 100 * days,
        food: 50 * days,
        activities: 30 * days,
        miscellaneous: 100
      },
      totalBudget: 300 + (100 * days) + (50 * days) + (30 * days) + 100,
      locations: [
        {
          name: destination,
          lat: 0,
          lng: 0,
          description: `Main destination - ${destination}`
        }
      ],
      tips: [
        "✓ Book accommodations in advance for better rates",
        "✓ Check local weather before packing",
        "✓ Learn a few basic local phrases",
        "✓ Keep digital copies of important documents",
        "✓ Purchase travel insurance for peace of mind",
        "✓ Download offline maps before your trip"
      ]
    };
  },

  // ================= HEALTH CHECK =================
  async checkHealth() {
    try {
      const response = await aiApi.get('/api/ai/health');
      console.log('✅ AI Service is healthy:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ AI Service health check failed:', error);
      return 'AI Service is unavailable';
    }
  }
};

export default aiService;


// import { aiApi } from './api.config';
// import toast from 'react-hot-toast';

// export const aiService = {
//   async generateItinerary(request) {
//     try {
//       // Calculate days if not provided
//       let days = request.days;
//       if (!days && request.startDate && request.endDate) {
//         const start = new Date(request.startDate);
//         const end = new Date(request.endDate);
//         days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
//       }

//     const payload = {
//     destination: request.destination,
//     startingPoint: request.startingPoint, // NEW
//     days: days || 3,
//     budget: request.budget || 1000,
//     travelStyle: request.travelStyle || 'standard',
//     interests: request.interests || [],
//     startDate: request.startDate,
//     endDate: request.endDate,
//     groupSize: request.groupSize || 1,
//     preferences: request.preferences || {}
// };

//       // Log what we're sending
//       console.log('📤 Sending to AI Service:', {
//         url: '/api/ai/generate',
//         payload: payload
//       });

//       const response = await aiApi.post('/api/ai/generate', payload);
      
//       // Log what we received
//       console.log('📥 AI Service Response:', response.data);

//       // Transform response to match frontend expectations
//       return this.transformResponse(response.data, request);
      
//     } catch (error) {
//       console.error('❌ AI generation error:', error);
      
//       // Show specific error message
//       if (error.code === 'ERR_NETWORK') {
//         toast.error('❌ AI Service is not running! Start it on port 8089');
//         console.error('Please start AI service: cd backend/ai-service && mvn spring-boot:run');
//       } else if (error.response?.status === 404) {
//         toast.error('❌ AI endpoint not found. Check if AI service is configured correctly');
//       } else if (error.response?.status === 500) {
//         toast.error('❌ AI Service internal error. Check backend logs');
//       } else {
//         toast.error(`❌ AI Service error: ${error.response?.data?.message || error.message}`);
//       }
      
//       // Fallback to hardcoded values
//       console.warn('⚠️ Using fallback hardcoded response');
//       return this.getFallbackResponse(request);
//     }
//   },

//   transformResponse(data, request) {
//     console.log('🔄 Transforming AI response...');
    
//     // If the response already has the expected structure
//     if (data.itinerary && data.budgetBreakdown) {
//       console.log('✅ Response already in correct format');
//       return data;
//     }

//     // Transform from dailyItinerary format to itinerary format
//     const transformed = {
//       destination: request.destination,
//       itinerary: [],
//       budgetBreakdown: {
//         travel: 0,
//         stay: 0,
//         food: 0,
//         activities: 0,
//         miscellaneous: 0
//       },
//       totalBudget: 0,
//       locations: [],
//       tips: []
//     };

//     // Transform itinerary
//     if (data.dailyItinerary && Array.isArray(data.dailyItinerary)) {
//       console.log(`📅 Transforming ${data.dailyItinerary.length} days of itinerary`);
//       transformed.itinerary = data.dailyItinerary.map(day => ({
//         day: day.day,
//         title: day.title,
//         description: day.description || `Day ${day.day} in ${request.destination}`,
//         activities: day.activities || [],
//         accommodation: day.accommodation || 'City center hotel recommended',
//         estimatedCost: day.estimatedCost || 100
//       }));
//     }

//     // Set budget
//     if (data.estimatedBudget) {
//       transformed.totalBudget = data.estimatedBudget;
//       transformed.budgetBreakdown = {
//         travel: data.estimatedBudget * 0.3,
//         stay: data.estimatedBudget * 0.35,
//         food: data.estimatedBudget * 0.2,
//         activities: data.estimatedBudget * 0.1,
//         miscellaneous: data.estimatedBudget * 0.05
//       };
//     }

//     // Set tips
//     if (data.tips && Array.isArray(data.tips)) {
//       transformed.tips = data.tips;
//     }

//     return transformed;
//   },

//   getFallbackResponse(request) {
//     const days = request.days || 3;
//     const destination = request.destination || 'your destination';

//     console.log(`📋 Generating fallback response for ${destination} (${days} days)`);

//     return {
//       destination: destination,
//       itinerary: Array.from({ length: days }, (_, i) => ({
//         day: i + 1,
//         title: `Day ${i + 1}: Explore ${destination}`,
//         description: `Discover the beauty and culture of ${destination}. This day is packed with exciting activities and local experiences.`,
//         activities: [
//           "Morning: Visit local attractions and landmarks",
//           "Afternoon: Enjoy local cuisine at popular restaurants",
//           "Evening: Relax and explore the nightlife"
//         ],
//         accommodation: "City center hotel recommended for convenience",
//         estimatedCost: 100 + (i * 25)
//       })),
//       budgetBreakdown: {
//         travel: 300,
//         stay: 100 * days,
//         food: 50 * days,
//         activities: 30 * days,
//         miscellaneous: 100
//       },
//       totalBudget: 300 + (100 * days) + (50 * days) + (30 * days) + 100,
//       locations: [
//         {
//           name: destination,
//           lat: 0,
//           lng: 0,
//           description: `Main destination - ${destination}`
//         }
//       ],
//       tips: [
//         "✓ Book accommodations in advance for better rates",
//         "✓ Check local weather before packing",
//         "✓ Learn a few basic local phrases",
//         "✓ Keep digital copies of important documents",
//         "✓ Purchase travel insurance for peace of mind",
//         "✓ Download offline maps before your trip"
//       ]
//     };
//   },

//   async checkHealth() {
//     try {
//       const response = await aiApi.get('/api/ai/health');
//       console.log('✅ AI Service is healthy:', response.data);
//       return response.data;
//     } catch (error) {
//       console.error('❌ AI Service health check failed:', error);
//       return 'AI Service is unavailable';
//     }
//   }
// };

// export default aiService;



// import { aiApi } from './api.config';
// import toast from 'react-hot-toast';

// export const aiService = {
//   async generateItinerary(request) {
//     try {
//       const response = await aiApi.post('/api/ai/generate', request);
//       return response.data;
//     } catch (error) {
//       toast.error('Failed to generate AI itinerary');
//       throw error;
//     }
//   },

//   async checkHealth() {
//     try {
//       const response = await aiApi.get('/api/ai/health');
//       return response.data;
//     } catch (error) {
//       console.error('AI service is down');
//       return 'AI Service is unavailable';
//     }
//   },
// };