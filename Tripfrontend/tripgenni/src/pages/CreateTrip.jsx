import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { tripService } from '../services/trip.service';
import { 
    FaMapMarkerAlt, 
    FaCalendarAlt, 
    FaDollarSign, 
    FaFileAlt, 
    FaSpinner, 
    FaPlane, 
    FaRoute,
    FaSearch
} from 'react-icons/fa';
import toast from 'react-hot-toast';

const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₹0';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

const CreateTrip = () => {
    const navigate = useNavigate();
    const currentUser = authService.getCurrentUser();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        startingPoint: '',
        destination: '',
        startDate: '',
        endDate: '',
        budget: '',
        description: '',
        status: 'PLANNING'
    });
    
    // Autocomplete states
    const [startingPointSuggestions, setStartingPointSuggestions] = useState([]);
    const [destinationSuggestions, setDestinationSuggestions] = useState([]);
    const [loadingStartingPoint, setLoadingStartingPoint] = useState(false);
    const [loadingDestination, setLoadingDestination] = useState(false);
    const [showStartingPointSuggestions, setShowStartingPointSuggestions] = useState(false);
    const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);
    
    // Refs for debouncing
    const startingPointTimeoutRef = useRef(null);
    const destinationTimeoutRef = useRef(null);
    const startingPointInputRef = useRef(null);
    const destinationInputRef = useRef(null);

    // Fetch address suggestions from OpenStreetMap (FREE - no API key needed)
    const fetchAddressSuggestions = useCallback(async (query, type) => {
        if (!query || query.length < 3) {
            if (type === 'startingPoint') {
                setStartingPointSuggestions([]);
                setShowStartingPointSuggestions(false);
            } else {
                setDestinationSuggestions([]);
                setShowDestinationSuggestions(false);
            }
            return;
        }

        if (type === 'startingPoint') {
            setLoadingStartingPoint(true);
        } else {
            setLoadingDestination(true);
        }

        try {
            // Using OpenStreetMap Nominatim API - Free, no API key required
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=in&accept-language=en`,
                {
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'TripPlannerApp/1.0' // Required by Nominatim
                    }
                }
            );
            const data = await response.json();
            
            const suggestions = data.map(item => ({
                display_name: item.display_name,
                lat: item.lat,
                lon: item.lon,
                place_id: item.place_id,
                type: item.type
            }));
            
            if (type === 'startingPoint') {
                setStartingPointSuggestions(suggestions);
                setShowStartingPointSuggestions(true);
                setLoadingStartingPoint(false);
            } else {
                setDestinationSuggestions(suggestions);
                setShowDestinationSuggestions(true);
                setLoadingDestination(false);
            }
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            if (type === 'startingPoint') {
                setStartingPointSuggestions([]);
                setLoadingStartingPoint(false);
            } else {
                setDestinationSuggestions([]);
                setLoadingDestination(false);
            }
        }
    }, []);

    // Debounced search for starting point
    const handleStartingPointChange = (e) => {
        const value = e.target.value;
        setFormData(prev => ({ ...prev, startingPoint: value }));
        
        if (startingPointTimeoutRef.current) {
            clearTimeout(startingPointTimeoutRef.current);
        }
        
        startingPointTimeoutRef.current = setTimeout(() => {
            fetchAddressSuggestions(value, 'startingPoint');
        }, 500);
    };

    // Debounced search for destination
    const handleDestinationChange = (e) => {
        const value = e.target.value;
        setFormData(prev => ({ ...prev, destination: value }));
        
        if (destinationTimeoutRef.current) {
            clearTimeout(destinationTimeoutRef.current);
        }
        
        destinationTimeoutRef.current = setTimeout(() => {
            fetchAddressSuggestions(value, 'destination');
        }, 500);
    };

    // Select suggestion for starting point
    const selectStartingPointSuggestion = (suggestion) => {
        setFormData(prev => ({ ...prev, startingPoint: suggestion.display_name }));
        setStartingPointSuggestions([]);
        setShowStartingPointSuggestions(false);
    };

    // Select suggestion for destination
    const selectDestinationSuggestion = (suggestion) => {
        setFormData(prev => ({ ...prev, destination: suggestion.display_name }));
        setDestinationSuggestions([]);
        setShowDestinationSuggestions(false);
    };

    // Handle click outside to close suggestions
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (startingPointInputRef.current && !startingPointInputRef.current.contains(event.target)) {
                setShowStartingPointSuggestions(false);
            }
            if (destinationInputRef.current && !destinationInputRef.current.contains(event.target)) {
                setShowDestinationSuggestions(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Cleanup timeouts
    useEffect(() => {
        return () => {
            if (startingPointTimeoutRef.current) clearTimeout(startingPointTimeoutRef.current);
            if (destinationTimeoutRef.current) clearTimeout(destinationTimeoutRef.current);
        };
    }, []);

    const calculateDays = () => {
        if (formData.startDate && formData.endDate) {
            const start = new Date(formData.startDate);
            const end = new Date(formData.endDate);
            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            return days >= 0 ? days + 1 : 0;
        }
        return 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.startingPoint) {
            toast.error('Please enter your starting point');
            return;
        }
        
        if (!formData.destination) {
            toast.error('Please enter your destination');
            return;
        }
        
        if (formData.startingPoint === formData.destination) {
            toast.error('Starting point and destination cannot be the same');
            return;
        }
        
        setLoading(true);
        
        try {
            const tripData = {
                ...formData,
                userId: currentUser.userId,
                budget: parseFloat(formData.budget) || 0
            };
            
            const response = await tripService.createTrip(tripData);
            toast.success('Trip created successfully!');
            navigate(`/trips/${response.id}`);
        } catch (error) {
            console.error('Failed to create trip:', error);
            toast.error(error.response?.data?.message || 'Failed to create trip');
        } finally {
            setLoading(false);
        }
    };

    const days = calculateDays();

    return (
        <div className="max-w-3xl mx-auto p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Plan Your New Adventure</h1>
            
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6 space-y-5">
                {/* Starting Point with Autocomplete */}
                <div className="relative" ref={startingPointInputRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        <FaPlane className="inline mr-1 text-green-500" /> Starting From *
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            name="startingPoint"
                            value={formData.startingPoint}
                            onChange={handleStartingPointChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                            placeholder="Search for a city, address, or landmark..."
                            autoComplete="off"
                        />
                        {loadingStartingPoint && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <FaSpinner className="animate-spin text-gray-400" />
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Start typing (min. 3 characters) to see location suggestions</p>
                    
                    {/* Suggestions Dropdown */}
                    {showStartingPointSuggestions && startingPointSuggestions.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                            {startingPointSuggestions.map((suggestion) => (
                                <div
                                    key={suggestion.place_id}
                                    onClick={() => selectStartingPointSuggestion(suggestion)}
                                    className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0 transition-colors"
                                >
                                    <div className="flex items-start gap-2">
                                        <FaMapMarkerAlt className="text-gray-400 mt-1 flex-shrink-0" size={12} />
                                        <div>
                                            <p className="text-sm text-gray-800">{suggestion.display_name}</p>
                                            <p className="text-xs text-gray-500 capitalize">{suggestion.type}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {showStartingPointSuggestions && startingPointSuggestions.length === 0 && !loadingStartingPoint && formData.startingPoint.length >= 3 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center">
                            <p className="text-sm text-gray-500">No locations found. Try another search term.</p>
                        </div>
                    )}
                </div>
                
                {/* Destination with Autocomplete */}
                <div className="relative" ref={destinationInputRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        <FaMapMarkerAlt className="inline mr-1 text-blue-500" /> Destination *
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            name="destination"
                            value={formData.destination}
                            onChange={handleDestinationChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                            placeholder="Search for a city, address, or landmark..."
                            autoComplete="off"
                        />
                        {loadingDestination && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <FaSpinner className="animate-spin text-gray-400" />
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Start typing (min. 3 characters) to see location suggestions</p>
                    
                    {/* Suggestions Dropdown */}
                    {showDestinationSuggestions && destinationSuggestions.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                            {destinationSuggestions.map((suggestion) => (
                                <div
                                    key={suggestion.place_id}
                                    onClick={() => selectDestinationSuggestion(suggestion)}
                                    className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0 transition-colors"
                                >
                                    <div className="flex items-start gap-2">
                                        <FaMapMarkerAlt className="text-gray-400 mt-1 flex-shrink-0" size={12} />
                                        <div>
                                            <p className="text-sm text-gray-800">{suggestion.display_name}</p>
                                            <p className="text-xs text-gray-500 capitalize">{suggestion.type}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {showDestinationSuggestions && destinationSuggestions.length === 0 && !loadingDestination && formData.destination.length >= 3 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center">
                            <p className="text-sm text-gray-500">No locations found. Try another search term.</p>
                        </div>
                    )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <FaCalendarAlt className="inline mr-1 text-green-500" /> Start Date *
                        </label>
                        <input
                            type="date"
                            name="startDate"
                            value={formData.startDate}
                            onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <FaCalendarAlt className="inline mr-1 text-red-500" /> End Date *
                        </label>
                        <input
                            type="date"
                            name="endDate"
                            value={formData.endDate}
                            onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
                
                {days > 0 && (
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <p className="text-sm text-blue-700">
                            <FaRoute className="inline mr-1" />
                            Trip duration: <strong>{days}</strong> {days === 1 ? 'day' : 'days'}
                        </p>
                    </div>
                )}
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        <FaDollarSign className="inline mr-1 text-yellow-500" /> Budget (₹ INR)
                    </label>
                    <input
                        type="number"
                        name="budget"
                        value={formData.budget}
                        onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter total budget in Rupees"
                    />
                    <p className="text-xs text-gray-500 mt-1">Amount in Indian Rupees (₹)</p>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        <FaFileAlt className="inline mr-1 text-purple-500" /> Description
                    </label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows="3"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Tell us about your trip..."
                    />
                </div>
                
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <FaSpinner className="animate-spin" />
                            Creating Trip...
                        </>
                    ) : (
                        'Create Trip'
                    )}
                </button>
            </form>
            
            {/* Attribution required for OpenStreetMap */}
            <div className="mt-4 text-center">
                <p className="text-xs text-gray-400">
                    📍 Address suggestions by OpenStreetMap contributors | Free service
                </p>
            </div>
            
            {/* Route Preview */}
            {formData.startingPoint && formData.destination && (
                <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-5">
                    <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <FaRoute className="text-blue-600" />
                        Your Journey Route
                    </h3>
                    <div className="relative">
                        <div className="flex items-center justify-between">
                            <div className="text-center flex-1">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                    <FaPlane className="text-green-600 text-xl" />
                                </div>
                                <p className="text-sm font-semibold mt-2 line-clamp-2">{formData.startingPoint}</p>
                                <p className="text-xs text-gray-500">Departure</p>
                            </div>
                            <div className="flex-1 px-4">
                                <div className="relative">
                                    <div className="h-0.5 bg-blue-400 w-full"></div>
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                        <FaPlane className="text-blue-500 text-xs rotate-90" />
                                    </div>
                                </div>
                            </div>
                            <div className="text-center flex-1">
                                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                                    <FaMapMarkerAlt className="text-red-600 text-xl" />
                                </div>
                                <p className="text-sm font-semibold mt-2 line-clamp-2">{formData.destination}</p>
                                <p className="text-xs text-gray-500">Destination</p>
                            </div>
                        </div>
                    </div>
                    {days > 0 && (
                        <div className="mt-4 text-center text-sm text-gray-600">
                            ✈️ {days} day trip from {formData.startingPoint.split(',')[0]} to {formData.destination.split(',')[0]}
                        </div>
                    )}
                    {formData.budget && (
                        <div className="mt-2 text-center text-sm text-green-600">
                            💰 Budget: {formatCurrency(formData.budget)}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CreateTrip;














// correct code down walla

// import { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { authService } from '../services/auth.service';
// import { tripService } from '../services/trip.service';
// import { 
//     FaMapMarkerAlt, 
//     FaCalendarAlt, 
//     FaDollarSign, 
//     FaFileAlt, 
//     FaSpinner, 
//     FaPlane, 
//     FaRoute 
// } from 'react-icons/fa';
// import toast from 'react-hot-toast';

// // Add this function at the top
// const formatCurrency = (amount) => {
//     if (!amount && amount !== 0) return '₹0';
//     return new Intl.NumberFormat('en-IN', {
//         style: 'currency',
//         currency: 'INR',
//         minimumFractionDigits: 0,
//         maximumFractionDigits: 0
//     }).format(amount);
// };

// const CreateTrip = () => {
//     const navigate = useNavigate();
//     const currentUser = authService.getCurrentUser();
//     const [loading, setLoading] = useState(false);
//     const [formData, setFormData] = useState({
//         startingPoint: '',
//         destination: '',
//         startDate: '',
//         endDate: '',
//         budget: '',
//         description: '',
//         status: 'PLANNING'
//     });

//     const handleChange = (e) => {
//         setFormData({
//             ...formData,
//             [e.target.name]: e.target.value
//         });
//     };

//     const calculateDays = () => {
//         if (formData.startDate && formData.endDate) {
//             const start = new Date(formData.startDate);
//             const end = new Date(formData.endDate);
//             const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
//             return days >= 0 ? days + 1 : 0;
//         }
//         return 0;
//     };

//     const handleSubmit = async (e) => {
//         e.preventDefault();
        
//         if (!formData.startingPoint) {
//             toast.error('Please enter your starting point');
//             return;
//         }
        
//         if (!formData.destination) {
//             toast.error('Please enter your destination');
//             return;
//         }
        
//         if (formData.startingPoint === formData.destination) {
//             toast.error('Starting point and destination cannot be the same');
//             return;
//         }
        
//         setLoading(true);
        
//         try {
//             const tripData = {
//                 ...formData,
//                 userId: currentUser.userId,
//                 budget: parseFloat(formData.budget) || 0
//             };
            
//             const response = await tripService.createTrip(tripData);
//             toast.success('Trip created successfully!');
//             navigate(`/trips/${response.id}`);
//         } catch (error) {
//             console.error('Failed to create trip:', error);
//             toast.error(error.response?.data?.message || 'Failed to create trip');
//         } finally {
//             setLoading(false);
//         }
//     };

//     const days = calculateDays();

//     return (
//         <div className="max-w-3xl mx-auto p-6">
//             <h1 className="text-2xl font-bold text-gray-800 mb-6">Plan Your New Adventure</h1>
            
//             <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6 space-y-5">
//                 {/* Starting Point */}
//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                         <FaPlane className="inline mr-1 text-green-500" /> Starting From *
//                     </label>
//                     <input
//                         type="text"
//                         name="startingPoint"
//                         value={formData.startingPoint}
//                         onChange={handleChange}
//                         required
//                         className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                         placeholder="Where are you traveling from? (e.g., Mumbai, Delhi, Bangalore)"
//                     />
//                     <p className="text-xs text-gray-500 mt-1">Your journey will begin here</p>
//                 </div>
                
//                 {/* Destination */}
//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                         <FaMapMarkerAlt className="inline mr-1 text-blue-500" /> Destination *
//                     </label>
//                     <input
//                         type="text"
//                         name="destination"
//                         value={formData.destination}
//                         onChange={handleChange}
//                         required
//                         className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                         placeholder="Where do you want to go?"
//                     />
//                 </div>
                
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                     <div>
//                         <label className="block text-sm font-medium text-gray-700 mb-1">
//                             <FaCalendarAlt className="inline mr-1 text-green-500" /> Start Date *
//                         </label>
//                         <input
//                             type="date"
//                             name="startDate"
//                             value={formData.startDate}
//                             onChange={handleChange}
//                             required
//                             className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                         />
//                     </div>
//                     <div>
//                         <label className="block text-sm font-medium text-gray-700 mb-1">
//                             <FaCalendarAlt className="inline mr-1 text-red-500" /> End Date *
//                         </label>
//                         <input
//                             type="date"
//                             name="endDate"
//                             value={formData.endDate}
//                             onChange={handleChange}
//                             required
//                             className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                         />
//                     </div>
//                 </div>
                
//                 {days > 0 && (
//                     <div className="bg-blue-50 rounded-lg p-3 text-center">
//                         <p className="text-sm text-blue-700">
//                             <FaRoute className="inline mr-1" />
//                             Trip duration: <strong>{days}</strong> {days === 1 ? 'day' : 'days'}
//                         </p>
//                     </div>
//                 )}
                
//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                         <FaDollarSign className="inline mr-1 text-yellow-500" /> Budget (₹ INR)
//                     </label>
//                     <input
//                         type="number"
//                         name="budget"
//                         value={formData.budget}
//                         onChange={handleChange}
//                         className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                         placeholder="Enter total budget in Rupees"
//                     />
//                     <p className="text-xs text-gray-500 mt-1">Amount in Indian Rupees (₹)</p>
//                 </div>
                
//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                         <FaFileAlt className="inline mr-1 text-purple-500" /> Description
//                     </label>
//                     <textarea
//                         name="description"
//                         value={formData.description}
//                         onChange={handleChange}
//                         rows="3"
//                         className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                         placeholder="Tell us about your trip..."
//                     />
//                 </div>
                
//                 <button
//                     type="submit"
//                     disabled={loading}
//                     className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
//                 >
//                     {loading ? (
//                         <>
//                             <FaSpinner className="animate-spin" />
//                             Creating Trip...
//                         </>
//                     ) : (
//                         'Create Trip'
//                     )}
//                 </button>
//             </form>
            
//             {/* Route Preview */}
//             {formData.startingPoint && formData.destination && (
//                 <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-5">
//                     <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
//                         <FaRoute className="text-blue-600" />
//                         Your Journey Route
//                     </h3>
//                     <div className="relative">
//                         <div className="flex items-center justify-between">
//                             <div className="text-center flex-1">
//                                 <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
//                                     <FaPlane className="text-green-600 text-xl" />
//                                 </div>
//                                 <p className="text-sm font-semibold mt-2">{formData.startingPoint}</p>
//                                 <p className="text-xs text-gray-500">Departure</p>
//                             </div>
//                             <div className="flex-1 px-4">
//                                 <div className="relative">
//                                     <div className="h-0.5 bg-blue-400 w-full"></div>
//                                     <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
//                                         <FaPlane className="text-blue-500 text-xs rotate-90" />
//                                     </div>
//                                 </div>
//                             </div>
//                             <div className="text-center flex-1">
//                                 <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
//                                     <FaMapMarkerAlt className="text-red-600 text-xl" />
//                                 </div>
//                                 <p className="text-sm font-semibold mt-2">{formData.destination}</p>
//                                 <p className="text-xs text-gray-500">Destination</p>
//                             </div>
//                         </div>
//                     </div>
//                     {days > 0 && (
//                         <div className="mt-4 text-center text-sm text-gray-600">
//                             ✈️ {days} day trip from {formData.startingPoint} to {formData.destination}
//                         </div>
//                     )}
//                     {formData.budget && (
//                         <div className="mt-2 text-center text-sm text-green-600">
//                             💰 Budget: {formatCurrency(formData.budget)}
//                         </div>
//                     )}
//                 </div>
//             )}
//         </div>
//     );
// };

// export default CreateTrip;