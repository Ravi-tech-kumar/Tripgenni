import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { tripService } from '../services/trip.service';
import { formatINR } from '../utils/currency';
import { FaPlus, FaSearch, FaFilter, FaCalendarAlt, FaMapMarkerAlt, FaDollarSign, FaClock } from 'react-icons/fa';

const Trips = () => {
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');

    const userId = authService.getCurrentUser()?.userId ?? null;

    const fetchTrips = useCallback(async () => {
        try {
            const data = await tripService.getTripsByUser(userId);
            setTrips(data);
        } catch (error) {
            console.error('Failed to fetch trips:', error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }
        fetchTrips();
    }, [userId, fetchTrips]);

    const filteredTrips = trips.filter(trip => {
        const matchesSearch = trip.destination.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'ALL' || trip.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Trips</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage and explore your adventures</p>
                </div>
                <Link to="/trips/new" className="bg-blue-600 text-white px-5 py-2 rounded-xl font-medium hover:bg-blue-700 transition flex items-center gap-2 shadow-sm">
                    <FaPlus />
                    <span>New Trip</span>
                </Link>
            </div>

            {/* Search and Filter */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search destinations..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <FaFilter className="text-gray-400" />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="ALL">All Status</option>
                            <option value="PLANNING">Planning</option>
                            <option value="CONFIRMED">Confirmed</option>
                            <option value="ONGOING">Ongoing</option>
                            <option value="COMPLETED">Completed</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
                    <p className="text-2xl font-bold text-blue-600">{trips.length}</p>
                    <p className="text-xs text-gray-500">Total Trips</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
                    <p className="text-2xl font-bold text-green-600">{trips.filter(t => t.status === 'ONGOING').length}</p>
                    <p className="text-xs text-gray-500">Ongoing</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
                    <p className="text-2xl font-bold text-yellow-600">{trips.filter(t => t.status === 'PLANNING').length}</p>
                    <p className="text-xs text-gray-500">Planning</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
                    <p className="text-2xl font-bold text-gray-600">{trips.filter(t => t.status === 'COMPLETED').length}</p>
                    <p className="text-xs text-gray-500">Completed</p>
                </div>
            </div>

            {/* Trips Grid */}
            {filteredTrips.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTrips.map((trip) => (
                        <Link
                            key={trip.id}
                            to={`/trips/${trip.id}`}
                            className="group bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1"
                        >
                            <div className="relative h-40 bg-gradient-to-r from-blue-500 to-indigo-600">
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition"></div>
                                <div className="absolute top-3 right-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(trip.status)}`}>
                                        {trip.status}
                                    </span>
                                </div>
                                <div className="absolute bottom-3 left-3 text-white">
                                    <h3 className="font-bold text-lg">{trip.destination}</h3>
                                    {trip.startingPoint && trip.startingPoint !== 'Not specified' && (
                                        <p className="text-xs opacity-90">From {trip.startingPoint}</p>
                                    )}
                                </div>
                            </div>
                            <div className="p-4">
                                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                                    <FaCalendarAlt className="text-gray-400" />
                                    <span>{new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                                    <FaDollarSign className="text-gray-400" />
                                    <span>Budget: {formatINR(trip.budget)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <FaClock className="text-gray-400" />
                                    <span>{Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24))} days</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                    <FaMapMarkerAlt className="text-5xl text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-2">No trips found</p>
                    <p className="text-sm text-gray-400 mb-4">Start planning your next adventure!</p>
                    <Link to="/trips/new" className="inline-block bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition">
                        Create Your First Trip
                    </Link>
                </div>
            )}
        </div>
    );
};

export default Trips;

// import { useState, useEffect, useCallback } from 'react';
// import { Link } from 'react-router-dom';
// import { authService } from '../services/auth.service';
// import { tripService } from '../services/trip.service';
// import { FaPlus, FaSearch, FaFilter } from 'react-icons/fa';

// const Trips = () => {
//   const [trips, setTrips] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [filterStatus, setFilterStatus] = useState('ALL');

//   // ✅ Always a string or null — never undefined
//   const userId = authService.getCurrentUser()?.userId ?? null;

//   // ✅ Define fetchTrips BEFORE useEffect
//   const fetchTrips = useCallback(async () => {
//     try {
//       const data = await tripService.getTripsByUser(userId);
//       setTrips(data);
//     } catch (error) {
//       console.error('Failed to fetch trips:', error);
//     } finally {
//       setLoading(false);
//     }
//   }, [userId]);

//   // ✅ Guard against null userId, stable deps array
//   useEffect(() => {
//     if (!userId) {
//       setLoading(false);
//       return;
//     }
//     fetchTrips();
//   }, [userId, fetchTrips]);

//   const filteredTrips = trips.filter(trip => {
//     const matchesSearch = trip.destination.toLowerCase().includes(searchTerm.toLowerCase());
//     const matchesFilter = filterStatus === 'ALL' || trip.status === filterStatus;
//     return matchesSearch && matchesFilter;
//   });

//   const getStatusColor = (status) => {
//     switch (status) {
//       case 'CONFIRMED': return 'bg-green-100 text-green-800';
//       case 'COMPLETED': return 'bg-blue-100 text-blue-800';
//       case 'DRAFT': return 'bg-yellow-100 text-yellow-800';
//       default: return 'bg-gray-100 text-gray-800';
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex justify-center items-center h-64">
//         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6">
//       {/* Header */}
//       <div className="flex justify-between items-center">
//         <h1 className="text-2xl font-bold text-gray-900">My Trips</h1>
//         <Link to="/trips/new" className="btn-primary flex items-center space-x-2">
//           <FaPlus />
//           <span>New Trip</span>
//         </Link>
//       </div>

//       {/* Search and Filter */}
//       <div className="bg-white rounded-lg shadow-md p-4">
//         <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
//           <div className="flex-1 relative">
//             <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
//             <input
//               type="text"
//               placeholder="Search destinations..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               className="input-field pl-10"
//             />
//           </div>
//           <div className="flex items-center space-x-2">
//             <FaFilter className="text-gray-400" />
//             <select
//               value={filterStatus}
//               onChange={(e) => setFilterStatus(e.target.value)}
//               className="input-field w-40"
//             >
//               <option value="ALL">All Status</option>
//               <option value="DRAFT">Draft</option>
//               <option value="PLANNING">Planning</option>
//               <option value="CONFIRMED">Confirmed</option>
//               <option value="COMPLETED">Completed</option>
//             </select>
//           </div>
//         </div>
//       </div>

//       {/* Trips Grid */}
//       {filteredTrips.length > 0 ? (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {filteredTrips.map((trip) => (
//             <Link
//               key={trip.id}
//               to={`/trips/${trip.id}`}
//               className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
//             >
//               <div className="h-32 bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center">
//                 <span className="text-white text-2xl font-bold">{trip.destination}</span>
//               </div>
//               <div className="p-4">
//                 <div className="flex justify-between items-start mb-2">
//                   <h3 className="font-bold text-gray-900">{trip.destination}</h3>
//                   <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(trip.status)}`}>
//                     {trip.status}
//                   </span>
//                 </div>
//                 <p className="text-sm text-gray-600 mb-2">
//                   {new Date(trip.startDate).toLocaleDateString()} -{' '}
//                   {new Date(trip.endDate).toLocaleDateString()}
//                 </p>
//                 <p className="text-sm text-gray-600">Budget: ₹{trip.budget?.toLocaleString('en-IN')}</p>              </div>
//             </Link>
//           ))}
//         </div>
//       ) : (
//         <div className="text-center py-12 bg-white rounded-lg shadow-md">
//           <p className="text-gray-600 mb-4">No trips found.</p>
//           <Link to="/trips/new" className="btn-primary">
//             Plan Your First Trip
//           </Link>
//         </div>
//       )}
//     </div>
//   );
// };

// export default Trips;

// import { useState, useEffect } from 'react';
// import { Link } from 'react-router-dom';
// import { authService } from '../services/auth.service';
// import { tripService } from '../services/trip.service';
// import { FaPlus, FaSearch, FaFilter } from 'react-icons/fa';

// const Trips = () => {
//   const [trips, setTrips] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [filterStatus, setFilterStatus] = useState('ALL');
//   const userId = authService.getCurrentUser()?.userId;

//   // useEffect(() => {
//   //   fetchTrips();
//   // }, []);
// // Add userId guard to prevent calls when not logged in
// useEffect(() => {
//   if (!userId) return;
//   fetchTrips();
// }, [userId]); // ← was [] before, causing stale closure + missing dependency warning
//   const fetchTrips = async () => {
//     try {
//       const data = await tripService.getTripsByUser(userId);
//       setTrips(data);
//     } catch (error) {
//       console.error('Failed to fetch trips:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const filteredTrips = trips.filter(trip => {
//     const matchesSearch = trip.destination.toLowerCase().includes(searchTerm.toLowerCase());
//     const matchesFilter = filterStatus === 'ALL' || trip.status === filterStatus;
//     return matchesSearch && matchesFilter;
//   });

//   const getStatusColor = (status) => {
//     switch(status) {
//       case 'CONFIRMED': return 'bg-green-100 text-green-800';
//       case 'COMPLETED': return 'bg-blue-100 text-blue-800';
//       case 'DRAFT': return 'bg-yellow-100 text-yellow-800';
//       default: return 'bg-gray-100 text-gray-800';
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex justify-center items-center h-64">
//         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6">
//       {/* Header */}
//       <div className="flex justify-between items-center">
//         <h1 className="text-2xl font-bold text-gray-900">My Trips</h1>
//         <Link to="/trips/new" className="btn-primary flex items-center space-x-2">
//           <FaPlus />
//           <span>New Trip</span>
//         </Link>
//       </div>

//       {/* Search and Filter */}
//       <div className="bg-white rounded-lg shadow-md p-4">
//         <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
//           <div className="flex-1 relative">
//             <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
//             <input
//               type="text"
//               placeholder="Search destinations..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               className="input-field pl-10"
//             />
//           </div>
//           <div className="flex items-center space-x-2">
//             <FaFilter className="text-gray-400" />
//             <select
//               value={filterStatus}
//               onChange={(e) => setFilterStatus(e.target.value)}
//               className="input-field w-40"
//             >
//               <option value="ALL">All Status</option>
            //  <option value="PLANNING">Planning</option>
//               <option value="DRAFT">Draft</option>
//               <option value="CONFIRMED">Confirmed</option>
//               <option value="COMPLETED">Completed</option>
//             </select>
//           </div>
//         </div>
//       </div>

//       {/* Trips Grid */}
//       {filteredTrips.length > 0 ? (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {filteredTrips.map((trip) => (
//             <Link
//               key={trip.id}
//               to={`/trips/${trip.id}`}
//               className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
//             >
//               <div className="h-32 bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center">
//                 <span className="text-white text-2xl font-bold">{trip.destination}</span>
//               </div>
//               <div className="p-4">
//                 <div className="flex justify-between items-start mb-2">
//                   <h3 className="font-bold text-gray-900">{trip.destination}</h3>
//                   <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(trip.status)}`}>
//                     {trip.status}
//                   </span>
//                 </div>
//                 <p className="text-sm text-gray-600 mb-2">
//                   {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
//                 </p>
//                 <p className="text-sm text-gray-600">
//                   Budget: ${trip.budget}
//                 </p>
//               </div>
//             </Link>
//           ))}
//         </div>
//       ) : (
//         <div className="text-center py-12 bg-white rounded-lg shadow-md">
//           <p className="text-gray-600 mb-4">No trips found.</p>
//           <Link to="/trips/new" className="btn-primary">
//             Plan Your First Trip
//           </Link>
//         </div>
//       )}
//     </div>
//   );
// };

// export default Trips;