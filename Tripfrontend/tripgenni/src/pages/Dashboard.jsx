import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatINR } from '../utils/currency';
import { authService } from '../services/auth.service';
import { userService } from '../services/user.service';
import { tripService } from '../services/trip.service';
import { aiService } from '../services/ai.service';
import { 
    FaSuitcase, 
    FaUserCircle, 
    FaPlusCircle, 
    FaMapMarkedAlt, 
    FaRobot,
    FaCalendarAlt,
    FaPlane,
    FaStar,
    FaChartLine,
    FaUsers,
    FaHeart,
    FaClock,
    FaCheckCircle,
    FaGlobe,
    FaCompass,
    FaMountain,
    FaUmbrellaBeach,
    FaCity,
    FaLandmark
} from 'react-icons/fa';
import toast from 'react-hot-toast';

const Dashboard = () => {
    const [userProfile, setUserProfile] = useState(null);
    const [recentTrips, setRecentTrips] = useState([]);
    const [stats, setStats] = useState({
        totalTrips: 0,
        completedTrips: 0,
        plannedTrips: 0,
        totalDistance: 0,
        savedDestinations: 0
    });
    const [loading, setLoading] = useState(true);
    const userId = authService.getCurrentUser()?.userId;
    const currentUser = authService.getCurrentUser();

    const testAIConnection = async () => {
        try {
            const health = await aiService.checkHealth();
            if (health === 'AI Service is unavailable') {
                toast.error('❌ AI Service is not running! Start on port 8089');
            } else {
                toast.success('✅ AI Service is running!');
            }
        } catch (error) {
            console.error('AI test failed:', error);
            toast.error('❌ AI Service connection failed');
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [profile, trips, destinations] = await Promise.all([
                userService.getProfile(userId),
                tripService.getTripsByUser(userId),
                userService.getDestinations(userId)
            ]);
            
            setUserProfile(profile);
            setRecentTrips(trips.slice(0, 3));
            
            setStats({
                totalTrips: trips.length,
                completedTrips: trips.filter(t => t.status === 'COMPLETED').length,
                plannedTrips: trips.filter(t => t.status === 'PLANNING').length,
                totalDistance: trips.reduce((sum, t) => sum + (t.distance || 0), 0),
                savedDestinations: destinations?.length || 0
            });
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            PLANNING: 'bg-yellow-100 text-yellow-800',
            CONFIRMED: 'bg-green-100 text-green-800',
            ONGOING: 'bg-blue-100 text-blue-800',
            COMPLETED: 'bg-gray-100 text-gray-800',
            CANCELLED: 'bg-red-100 text-red-800'
        };
        return styles[status] || 'bg-gray-100 text-gray-800';
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Premium Hero Section */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 text-white p-8 shadow-xl">
                {/* Background Decorations */}
                <div className="absolute top-0 right-0 opacity-10">
                    <FaGlobe className="text-8xl" />
                </div>
                <div className="absolute bottom-0 left-0 opacity-10">
                    <FaCompass className="text-7xl" />
                </div>
                <div className="absolute top-20 left-20 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>
                
                <div className="relative z-10">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-5">
                            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm ring-4 ring-white/30">
                                {userProfile?.fullName ? (
                                    <span className="text-3xl font-bold">{userProfile.fullName.charAt(0)}</span>
                                ) : (
                                    <FaUserCircle className="text-4xl" />
                                )}
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold">
                                    Welcome back, {userProfile?.fullName?.split(' ')[0] || 'Traveler'}! 👋
                                </h1>
                                <p className="text-blue-100 mt-1 flex items-center gap-2">
                                    <FaMapMarkedAlt className="text-sm" />
                                    {currentUser?.email || 'Ready for your next adventure?'}
                                </p>
                                <div className="flex gap-3 mt-3">
                                    <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs">
                                        ✈️ Explorer
                                    </span>
                                    <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs">
                                        🌟 {stats.totalTrips} Trips Planned
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Link to="/trips/new" className="bg-white text-blue-600 px-5 py-2 rounded-full font-semibold hover:shadow-lg transition-all hover:scale-105 flex items-center gap-2">
                                <FaPlusCircle className="text-sm" />
                                New Trip
                            </Link>
                            <button 
                                onClick={testAIConnection}
                                className="bg-white/20 backdrop-blur-sm border border-white/30 px-5 py-2 rounded-full font-semibold hover:bg-white/30 transition-all flex items-center gap-2"
                            >
                                <FaRobot />
                                Test AI
                            </button>
                        </div>
                    </div>
                    
                    {/* Quick Stats in Hero */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-4 border-t border-white/20">
                        <div>
                            <p className="text-xs opacity-80">Total Distance Traveled</p>
                            <p className="text-xl font-bold">{Math.round(stats.totalDistance).toLocaleString()} km</p>
                        </div>
                        <div>
                            <p className="text-xs opacity-80">Adventure Score</p>
                            <p className="text-xl font-bold">{stats.totalTrips * 100} pts</p>
                        </div>
                        <div>
                            <p className="text-xs opacity-80">Countries Visited</p>
                            <p className="text-xl font-bold">{Math.min(stats.totalTrips + 1, 10)}</p>
                        </div>
                        <div>
                            <p className="text-xs opacity-80">Travel Streak</p>
                            <p className="text-xl font-bold">{stats.plannedTrips} 🔥</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
                <div className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-500 transition">
                        <FaSuitcase className="text-xl text-blue-600 group-hover:text-white" />
                    </div>
                    <p className="text-2xl font-bold text-gray-800">{stats.totalTrips}</p>
                    <p className="text-sm text-gray-500">Total Trips</p>
                </div>
                
                <div className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-green-500 transition">
                        <FaCheckCircle className="text-xl text-green-600 group-hover:text-white" />
                    </div>
                    <p className="text-2xl font-bold text-gray-800">{stats.completedTrips}</p>
                    <p className="text-sm text-gray-500">Completed</p>
                </div>
                
                <div className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer">
                    <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-yellow-500 transition">
                        <FaClock className="text-xl text-yellow-600 group-hover:text-white" />
                    </div>
                    <p className="text-2xl font-bold text-gray-800">{stats.plannedTrips}</p>
                    <p className="text-sm text-gray-500">Planning</p>
                </div>
                
                <div className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-purple-500 transition">
                        <FaHeart className="text-xl text-purple-600 group-hover:text-white" />
                    </div>
                    <p className="text-2xl font-bold text-gray-800">{stats.savedDestinations}</p>
                    <p className="text-sm text-gray-500">Wishlist</p>
                </div>
                
                <div className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer">
                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-indigo-500 transition">
                        <FaChartLine className="text-xl text-indigo-600 group-hover:text-white" />
                    </div>
                    <p className="text-2xl font-bold text-gray-800">{Math.round(stats.totalDistance)} km</p>
                    <p className="text-sm text-gray-500">Total Distance</p>
                </div>
            </div>

            {/* Premium Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link to="/trips/new" className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white hover:shadow-xl transition-all hover:-translate-y-1">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition duration-500"></div>
                    <div className="relative z-10">
                        <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                            <FaPlusCircle className="text-2xl" />
                        </div>
                        <h3 className="text-xl font-bold mb-1">Start New Adventure</h3>
                        <p className="text-blue-100 text-sm">Create a trip and invite friends to join</p>
                        <div className="mt-4 flex items-center gap-1 text-sm opacity-80 group-hover:opacity-100">
                            Get started <span>→</span>
                        </div>
                    </div>
                </Link>
                
                <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-6 text-white hover:shadow-xl transition-all hover:-translate-y-1">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition duration-500"></div>
                    <div className="relative z-10">
                        <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                            <FaRobot className="text-2xl" />
                        </div>
                        <h3 className="text-xl font-bold mb-1">AI Trip Planner</h3>
                        <p className="text-purple-100 text-sm">Let AI create your perfect itinerary</p>
                        <button onClick={testAIConnection} className="mt-4 flex items-center gap-1 text-sm opacity-80 hover:opacity-100">
                            Test AI Assistant <span>→</span>
                        </button>
                    </div>
                </div>
                
                <Link to="/profile" className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white hover:shadow-xl transition-all hover:-translate-y-1">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition duration-500"></div>
                    <div className="relative z-10">
                        <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                            <FaUsers className="text-2xl" />
                        </div>
                        <h3 className="text-xl font-bold mb-1">Complete Your Profile</h3>
                        <p className="text-green-100 text-sm">Add preferences for better recommendations</p>
                        <div className="mt-4 flex items-center gap-1 text-sm opacity-80 group-hover:opacity-100">
                            Update Profile <span>→</span>
                        </div>
                    </div>
                </Link>
            </div>

            {/* Premium Recent Trips */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Recent Adventures</h2>
                        <p className="text-sm text-gray-500 mt-1">Your latest travel plans</p>
                    </div>
                    <Link to="/trips" className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 bg-blue-50 px-4 py-2 rounded-lg">
                        View All Trips <span>→</span>
                    </Link>
                </div>
                
                {recentTrips.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {recentTrips.map((trip, idx) => {
                            const gradient = idx === 0 ? 'from-amber-500 to-orange-600' : 
                                           idx === 1 ? 'from-blue-500 to-indigo-600' : 
                                           'from-emerald-500 to-teal-600';
                            return (
                                <Link
                                    key={trip.id}
                                    to={`/trips/${trip.id}`}
                                    className="group relative overflow-hidden rounded-xl bg-white border border-gray-100 hover:shadow-xl transition-all hover:-translate-y-2"
                                >
                                    <div className={`h-36 bg-gradient-to-r ${gradient} relative`}>
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition"></div>
                                        <div className="absolute top-3 right-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(trip.status)}`}>
                                                {trip.status}
                                            </span>
                                        </div>
                                        <div className="absolute bottom-3 left-3 text-white">
                                            <h3 className="font-bold text-lg">{trip.destination}</h3>
                                            {trip.startingPoint && trip.startingPoint !== 'Not specified' && (
                                                <p className="text-xs opacity-90 flex items-center gap-1">
                                                    <FaPlane className="text-xs" /> From {trip.startingPoint}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <div className="flex items-center text-sm text-gray-500 mb-2">
                                            <FaCalendarAlt className="mr-2 text-gray-400" />
                                            <span>{new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1 text-sm text-gray-500">
                                                <FaClock className="text-gray-400" />
                                                <span>{Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24))} days</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs text-gray-500">Budget:</span>
                                                <span className="font-semibold text-blue-600">{formatINR(trip.budget)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FaPlane className="text-3xl text-gray-400" />
                        </div>
                        <p className="text-gray-500 mb-2">No trips planned yet</p>
                        <p className="text-sm text-gray-400 mb-4">Your next adventure is waiting!</p>
                        <Link to="/trips/new" className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition">
                            <FaPlusCircle />
                            Plan Your First Trip
                        </Link>
                    </div>
                )}
            </div>

            {/* Premium Inspiration Section */}
            <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <FaCompass className="text-blue-600" />
                            Explore Destinations
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">Get inspired for your next journey</p>
                    </div>
                    <span className="text-xs text-blue-600">Popular this week</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { name: 'Beaches', icon: FaUmbrellaBeach, color: 'from-cyan-400 to-blue-500', count: '24 destinations' },
                        { name: 'Mountains', icon: FaMountain, color: 'from-green-400 to-emerald-500', count: '18 destinations' },
                        { name: 'Cities', icon: FaCity, color: 'from-purple-400 to-pink-500', count: '32 destinations' },
                        { name: 'Heritage', icon: FaLandmark, color: 'from-amber-400 to-orange-500', count: '15 destinations' }
                    ].map((category) => (
                        <div key={category.name} className={`bg-gradient-to-r ${category.color} rounded-xl p-4 text-white cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1`}>
                            <category.icon className="text-2xl mb-2" />
                            <p className="font-semibold">{category.name}</p>
                            <p className="text-xs opacity-80">{category.count}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

// import { useState, useEffect } from 'react';
// import { Link } from 'react-router-dom';
// import { formatINR } from '../utils/currency';
// import { authService } from '../services/auth.service';
// import { userService } from '../services/user.service';
// import { tripService } from '../services/trip.service';
// import { aiService } from '../services/ai.service';
// import { 
//     FaSuitcase, 
//     FaUserCircle, 
//     FaPlusCircle, 
//     FaMapMarkedAlt, 
//     FaRobot,
//     FaCalendarAlt,
//     FaPlane,
//     FaStar,
//     FaChartLine,
//     FaUsers
// } from 'react-icons/fa';
// import toast from 'react-hot-toast';

// const Dashboard = () => {
//     const [userProfile, setUserProfile] = useState(null);
//     const [recentTrips, setRecentTrips] = useState([]);
//     const [stats, setStats] = useState({
//         totalTrips: 0,
//         completedTrips: 0,
//         plannedTrips: 0,
//         totalDistance: 0,
//         savedDestinations: 0
//     });
//     const [loading, setLoading] = useState(true);
//     const userId = authService.getCurrentUser()?.userId;

//     const testAIConnection = async () => {
//         try {
//             const health = await aiService.checkHealth();
//             if (health === 'AI Service is unavailable') {
//                 toast.error('❌ AI Service is not running! Start on port 8089');
//             } else {
//                 toast.success('✅ AI Service is running!');
//             }
//         } catch (error) {
//             console.error('AI test failed:', error);
//             toast.error('❌ AI Service connection failed');
//         }
//     };

//     useEffect(() => {
//         fetchDashboardData();
//     }, []);

//     const fetchDashboardData = async () => {
//         try {
//             const [profile, trips, destinations] = await Promise.all([
//                 userService.getProfile(userId),
//                 tripService.getTripsByUser(userId),
//                 userService.getDestinations(userId)
//             ]);
            
//             setUserProfile(profile);
//             setRecentTrips(trips.slice(0, 3));
            
//             // Calculate stats
//             setStats({
//                 totalTrips: trips.length,
//                 completedTrips: trips.filter(t => t.status === 'COMPLETED').length,
//                 plannedTrips: trips.filter(t => t.status === 'PLANNING').length,
//                 totalDistance: trips.reduce((sum, t) => sum + (t.distance || 0), 0),
//                 savedDestinations: destinations?.length || 0
//             });
//         } catch (error) {
//             console.error('Failed to fetch dashboard data:', error);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const getStatusBadge = (status) => {
//         const styles = {
//             PLANNING: 'bg-yellow-100 text-yellow-800',
//             CONFIRMED: 'bg-green-100 text-green-800',
//             ONGOING: 'bg-blue-100 text-blue-800',
//             COMPLETED: 'bg-gray-100 text-gray-800',
//             CANCELLED: 'bg-red-100 text-red-800'
//         };
//         return styles[status] || 'bg-gray-100 text-gray-800';
//     };

//     if (loading) {
//         return (
//             <div className="flex justify-center items-center h-64">
//                 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
//             </div>
//         );
//     }

//     return (
//         <div className="space-y-8">
//             {/* Welcome Hero Section */}
//             <div className="bg-gradient-to-r from-primary-600 to-indigo-600 rounded-2xl p-8 text-white relative overflow-hidden">
//                 <div className="absolute right-0 top-0 opacity-10">
//                     <FaPlane className="text-9xl" />
//                 </div>
//                 <div className="relative z-10">
//                     <div className="flex items-center space-x-4">
//                         <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
//                             <FaUserCircle className="text-4xl" />
//                         </div>
//                         <div>
//                             <h1 className="text-3xl font-bold">
//                                 Welcome back, {userProfile?.fullName?.split(' ')[0] || 'Traveler'}! 👋
//                             </h1>
//                             <p className="text-primary-100 mt-1">
//                                 Ready for your next adventure? Let's explore together!
//                             </p>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* Stats Cards */}
//             <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
//                 <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition">
//                     <div className="flex items-center justify-between">
//                         <div>
//                             <p className="text-gray-500 text-sm">Total Trips</p>
//                             <p className="text-2xl font-bold text-gray-800">{stats.totalTrips}</p>
//                         </div>
//                         <FaSuitcase className="text-3xl text-primary-500" />
//                     </div>
//                 </div>
                
//                 <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition">
//                     <div className="flex items-center justify-between">
//                         <div>
//                             <p className="text-gray-500 text-sm">Completed</p>
//                             <p className="text-2xl font-bold text-green-600">{stats.completedTrips}</p>
//                         </div>
//                         <FaStar className="text-3xl text-green-500" />
//                     </div>
//                 </div>
                
//                 <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition">
//                     <div className="flex items-center justify-between">
//                         <div>
//                             <p className="text-gray-500 text-sm">Planning</p>
//                             <p className="text-2xl font-bold text-yellow-600">{stats.plannedTrips}</p>
//                         </div>
//                         <FaCalendarAlt className="text-3xl text-yellow-500" />
//                     </div>
//                 </div>
                
//                 <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition">
//                     <div className="flex items-center justify-between">
//                         <div>
//                             <p className="text-gray-500 text-sm">Destinations</p>
//                             <p className="text-2xl font-bold text-purple-600">{stats.savedDestinations}</p>
//                         </div>
//                         <FaMapMarkedAlt className="text-3xl text-purple-500" />
//                     </div>
//                 </div>
                
//                 <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition">
//                     <div className="flex items-center justify-between">
//                         <div>
//                             <p className="text-gray-500 text-sm">Total KM</p>
//                             <p className="text-2xl font-bold text-blue-600">{Math.round(stats.totalDistance)}</p>
//                         </div>
//                         <FaChartLine className="text-3xl text-blue-500" />
//                     </div>
//                 </div>
//             </div>

//             {/* Quick Actions */}
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                 <Link to="/trips/new" className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-5 text-white hover:from-blue-600 hover:to-blue-700 transition-all group">
//                     <div className="flex items-center justify-between">
//                         <div>
//                             <p className="text-sm opacity-90">Start New Adventure</p>
//                             <p className="text-xl font-bold">Plan a Trip →</p>
//                         </div>
//                         <FaPlusCircle className="text-4xl opacity-80 group-hover:scale-110 transition" />
//                     </div>
//                 </Link>
                
//                 <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-5 text-white">
//                     <div className="flex items-center justify-between">
//                         <div>
//                             <p className="text-sm opacity-90">AI Assistant</p>
//                             <button onClick={testAIConnection} className="text-xl font-bold flex items-center gap-2 hover:opacity-90">
//                                 <FaRobot /> Test AI →
//                             </button>
//                         </div>
//                         <FaRobot className="text-4xl opacity-80" />
//                     </div>
//                 </div>
                
//                 <Link to="/profile" className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-5 text-white hover:from-green-600 hover:to-emerald-700 transition-all">
//                     <div className="flex items-center justify-between">
//                         <div>
//                             <p className="text-sm opacity-90">Your Profile</p>
//                             <p className="text-xl font-bold">Complete Profile →</p>
//                         </div>
//                         <FaUsers className="text-4xl opacity-80" />
//                     </div>
//                 </Link>
//             </div>

//             {/* Recent Trips Section */}
//             <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
//                 <div className="flex justify-between items-center mb-6">
//                     <h2 className="text-xl font-bold text-gray-800">Recent Trips</h2>
//                     <Link to="/trips" className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1">
//                         View All <span>→</span>
//                     </Link>
//                 </div>
                
//                 {recentTrips.length > 0 ? (
//                     <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
//                         {recentTrips.map((trip, idx) => (
//                             <Link
//                                 key={trip.id}
//                                 to={`/trips/${trip.id}`}
//                                 className="group relative overflow-hidden rounded-xl bg-white border border-gray-100 hover:shadow-lg transition-all duration-300"
//                             >
//                                 <div className={`h-32 bg-gradient-to-r ${idx === 0 ? 'from-orange-500 to-red-500' : idx === 1 ? 'from-blue-500 to-purple-500' : 'from-green-500 to-teal-500'} relative`}>
//                                     <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition"></div>
//                                     <div className="absolute bottom-3 left-3 text-white">
//                                         <h3 className="font-bold text-lg">{trip.destination}</h3>
//                                     </div>
//                                     <div className="absolute top-3 right-3">
//                                         <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(trip.status)}`}>
//                                             {trip.status}
//                                         </span>
//                                     </div>
//                                 </div>
//                                 <div className="p-4">
//                                     <div className="flex items-center text-sm text-gray-500 mb-2">
//                                         <FaCalendarAlt className="mr-1 text-gray-400" />
//                                         <span>{new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}</span>
//                                     </div>
//                                     <div className="flex items-center justify-between">
//                                         <span className="text-sm text-gray-500">
//                                             {Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24))} days
//                                         </span>
//                                         <span className="font-semibold text-primary-600">{formatINR(trip.budget)}</span>
//                                     </div>
//                                 </div>
//                             </Link>
//                         ))}
//                     </div>
//                 ) : (
//                     <div className="text-center py-12">
//                         <FaPlane className="text-5xl text-gray-300 mx-auto mb-3" />
//                         <p className="text-gray-500">No trips planned yet.</p>
//                         <Link to="/trips/new" className="inline-block mt-4 text-primary-600 hover:text-primary-700 font-medium">
//                             Plan your first adventure →
//                         </Link>
//                     </div>
//                 )}
//             </div>

//             {/* Inspiration Section */}
//             <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6">
//                 <h3 className="text-lg font-semibold text-gray-800 mb-4">✨ Travel Inspiration</h3>
//                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//                     {['Beaches', 'Mountains', 'Cities', 'Temples'].map((category) => (
//                         <div key={category} className="bg-white rounded-lg p-3 text-center hover:shadow-md transition cursor-pointer">
//                             <div className="text-2xl mb-1">
//                                 {category === 'Beaches' && '🏖️'}
//                                 {category === 'Mountains' && '🏔️'}
//                                 {category === 'Cities' && '🌆'}
//                                 {category === 'Temples' && '🛕'}
//                             </div>
//                             <p className="text-sm font-medium text-gray-700">{category}</p>
//                         </div>
//                     ))}
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default Dashboard;