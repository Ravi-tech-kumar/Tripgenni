import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { tripService } from '../services/trip.service';
import { authService } from '../services/auth.service';
import { notificationService } from '../services/notification.service';
import { aiService } from '../services/ai.service';
import { 
    FaArrowLeft, 
    FaCalendar, 
    FaMapMarkerAlt, 
    FaDollarSign, 
    FaClock, 
    FaEdit, 
    FaMagic, 
    FaMap, 
    FaShare, 
    FaTrash, 
    FaPlane, 
    FaRoute,
    FaHotel,
    FaUtensils,
    FaBus,
    FaTrain,
    FaCar
} from 'react-icons/fa';
import TripEditModal from '../components/trip/TripEditModal';
import AITripGenerator from '../components/trip/AITripGenerator';
import MapView from '../components/trip/Mapview.jsx';
import toast from 'react-hot-toast';

const TripDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [trip, setTrip] = useState(null);
    const [itinerary, setItinerary] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAIGenerator, setShowAIGenerator] = useState(false);
    const [aiGeneratedData, setAiGeneratedData] = useState(null);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [newExpense, setNewExpense] = useState({
        category: '',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        currency: 'INR'
    });

    const userId = authService.getCurrentUser()?.userId;
    const currentUser = authService.getCurrentUser();

    const expenseCategories = [
        { value: 'Accommodation', icon: FaHotel, label: '🏨 Accommodation' },
        { value: 'Transportation', icon: FaBus, label: '🚗 Transportation' },
        { value: 'Food', icon: FaUtensils, label: '🍽️ Food' },
        { value: 'Activities', icon: FaMagic, label: '🎯 Activities' },
        { value: 'Shopping', icon: FaDollarSign, label: '🛍️ Shopping' },
        { value: 'Miscellaneous', icon: FaClock, label: '📦 Miscellaneous' }
    ];

    // Validate if id is a valid UUID
    const isValidUUID = (str) => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
    };

    useEffect(() => {
        if (!id || !isValidUUID(id)) {
            setError('Invalid trip ID');
            setLoading(false);
            toast.error('Invalid trip ID');
            navigate('/trips');
            return;
        }
        fetchTripDetails();
    }, [id]);

    const fetchTripDetails = async () => {
        try {
            setLoading(true);
            setError(null);

            const [tripData, itineraryData, expensesData] = await Promise.all([
                tripService.getTrip(id),
                tripService.getItinerary(id),
                tripService.getExpenses(id)
            ]);

            if (!tripData) {
                throw new Error('Trip not found');
            }

            setTrip(tripData);
            setItinerary(itineraryData || []);
            setExpenses(expensesData || []);
        } catch (error) {
            console.error('Failed to fetch trip details:', error);
            setError(error.response?.data?.message || error.message || 'Failed to load trip details');
            toast.error('Failed to load trip details');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateTrip = async (updatedData) => {
        try {
            await tripService.updateTrip(id, updatedData);
            await fetchTripDetails();

            await notificationService.sendNotification({
                userEmail: currentUser?.email,
                title: 'Trip Updated',
                message: `Your trip to ${updatedData.destination || trip.destination} has been updated`,
                tripId: id,
                destination: updatedData.destination || trip.destination
            });

            toast.success('Trip updated successfully');
        } catch (error) {
            console.error('Failed to update trip:', error);
            toast.error('Failed to update trip');
            throw error;
        }
    };

    const handleDeleteTrip = async () => {
        if (window.confirm('Are you sure you want to delete this trip? This action cannot be undone.')) {
            try {
                await tripService.deleteTrip(id);
                toast.success('Trip deleted successfully');
                navigate('/trips');
            } catch (error) {
                console.error('Failed to delete trip:', error);
                toast.error('Failed to delete trip');
            }
        }
    };

    const handleShareTrip = () => {
        const shareUrl = `${window.location.origin}/trips/${id}`;
        navigator.clipboard.writeText(shareUrl);
        toast.success('Trip link copied to clipboard!');
    };

    const handleAIGenerated = (data) => {
        setAiGeneratedData(data);
        if (data.itinerary) {
            setItinerary(data.itinerary);
        }
    };

    const handleAddExpense = async () => {
        if (!newExpense.category || !newExpense.amount) {
            toast.error('Please fill category and amount');
            return;
        }

        try {
            const expenseData = {
                tripId: id,
                category: newExpense.category,
                amount: parseFloat(newExpense.amount),
                description: newExpense.description,
                date: newExpense.date,
                currency: newExpense.currency
            };

            await tripService.addExpense(expenseData);
            toast.success('Expense added successfully!');
            setShowExpenseModal(false);
            setNewExpense({
                category: '',
                amount: '',
                description: '',
                date: new Date().toISOString().split('T')[0],
                currency: 'INR'
            });
            fetchTripDetails();
        } catch (error) {
            console.error('Failed to add expense:', error);
            toast.error('Failed to add expense');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'CONFIRMED': return 'bg-green-100 text-green-800';
            case 'COMPLETED': return 'bg-blue-100 text-blue-800';
            case 'PLANNING': return 'bg-yellow-100 text-yellow-800';
            case 'ONGOING': return 'bg-purple-100 text-purple-800';
            case 'CANCELLED': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'PLANNING': return 'Planning';
            case 'CONFIRMED': return 'Confirmed';
            case 'ONGOING': return 'Ongoing';
            case 'COMPLETED': return 'Completed';
            case 'CANCELLED': return 'Cancelled';
            default: return status;
        }
    };

    const formatCurrency = (amount) => {
        if (!amount && amount !== 0) return '₹0';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                    <h3 className="text-red-700 font-semibold text-lg mb-2">Error Loading Trip</h3>
                    <p className="text-red-600 mb-4">{error}</p>
                    <Link to="/trips" className="btn-primary inline-block">
                        Back to Trips
                    </Link>
                </div>
            </div>
        );
    }

    if (!trip) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-600 mb-4">Trip not found.</p>
                <Link to="/trips" className="btn-primary">Back to Trips</Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                    <Link to="/trips" className="text-gray-600 hover:text-gray-900 transition">
                        <FaArrowLeft />
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">{trip.destination}</h1>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(trip.status)}`}>
                        {getStatusLabel(trip.status)}
                    </span>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setShowEditModal(true)}
                        className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-1"
                    >
                        <FaEdit className="text-gray-600" />
                        <span>Edit</span>
                    </button>
                    <button
                        onClick={handleShareTrip}
                        className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-1"
                    >
                        <FaShare className="text-gray-600" />
                        <span>Share</span>
                    </button>
                    <button
                        onClick={handleDeleteTrip}
                        className="px-3 py-2 bg-red-50 border border-red-300 rounded-lg hover:bg-red-100 transition-colors flex items-center space-x-1"
                    >
                        <FaTrash className="text-red-600" />
                        <span>Delete</span>
                    </button>
                </div>
            </div>

            {/* Trip Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition">
                    <div className="flex items-center space-x-3">
                        <FaCalendar className="text-primary-600 text-xl" />
                        <div>
                            <p className="text-sm text-gray-600">Duration</p>
                            <p className="font-semibold">
                                {Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24))} days
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition">
                    <div className="flex items-center space-x-3">
                        <FaMapMarkerAlt className="text-green-600 text-xl" />
                        <div>
                            <p className="text-sm text-gray-600">Destination</p>
                            <p className="font-semibold truncate">{trip.destination}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition">
                    <div className="flex items-center space-x-3">
                        <FaDollarSign className="text-yellow-600 text-xl" />
                        <div>
                            <p className="text-sm text-gray-600">Budget</p>
                            <p className="font-semibold">{formatCurrency(trip.budget)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition">
                    <div className="flex items-center space-x-3">
                        <FaClock className="text-purple-600 text-xl" />
                        <div>
                            <p className="text-sm text-gray-600">Created</p>
                            <p className="font-semibold">{new Date(trip.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Generator Button */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center space-x-3">
                        <FaMagic className="text-purple-600 text-xl" />
                        <div>
                            <p className="font-semibold text-gray-800">AI Trip Planner</p>
                            <p className="text-sm text-gray-600">Get personalized itinerary and budget breakdown</p>
                        </div>
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={async () => {
                                const health = await aiService.checkHealth();
                                if (health === 'AI Service is unavailable') {
                                    toast.error('❌ AI Service not running! Start on port 8089');
                                } else {
                                    toast.success('✅ AI Service is running!');
                                }
                            }}
                            className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm"
                        >
                            Test AI
                        </button>
                        <button
                            onClick={() => setShowAIGenerator(!showAIGenerator)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center space-x-2"
                        >
                            <FaMagic />
                            <span>{showAIGenerator ? 'Hide AI Planner' : 'Generate AI Plan'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* AI Generator Section */}
            {showAIGenerator && (
                <div className="bg-white rounded-lg shadow-md p-6 border border-purple-100 animate-fadeIn">
                    <AITripGenerator
                        tripId={id}
                        destination={trip.destination}
                        startDate={trip.startDate}
                        endDate={trip.endDate}
                        budget={trip.budget}
                        startingPoint={trip.startingPoint}
                        onGenerated={handleAIGenerated}
                    />
                </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex flex-wrap gap-2">
                    {['overview', 'itinerary', 'expenses', 'map'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`py-2 px-4 border-b-2 font-medium text-sm capitalize transition ${
                                activeTab === tab
                                    ? 'border-primary-600 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab === 'map' ? (
                                <span className="flex items-center space-x-1">
                                    <FaMap className="mr-1" />
                                    Map View
                                </span>
                            ) : (
                                tab.charAt(0).toUpperCase() + tab.slice(1)
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-lg shadow-md p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div>
                        <h2 className="text-lg font-semibold mb-4">Trip Overview</h2>

                        {/* Route Card */}
                        {trip.startingPoint && trip.startingPoint !== 'Not specified' && (
                            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-5 mb-6">
                                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <FaRoute className="text-blue-600" />
                                    Your Journey Route
                                </h3>
                                <div className="flex items-center justify-between">
                                    <div className="text-center flex-1">
                                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                            <FaPlane className="text-green-600 text-xl" />
                                        </div>
                                        <p className="text-sm font-semibold mt-2">{trip.startingPoint}</p>
                                        <p className="text-xs text-gray-500">Starting Point</p>
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
                                        <p className="text-sm font-semibold mt-2">{trip.destination}</p>
                                        <p className="text-xs text-gray-500">Destination</p>
                                    </div>
                                </div>
                                {trip.distance && (
                                    <div className="mt-3 text-center text-xs text-gray-500">
                                        📍 Approximately {Math.round(trip.distance)} km journey
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="mb-2"><span className="font-medium">Start Date:</span> {new Date(trip.startDate).toLocaleDateString()}</p>
                                <p className="mb-2"><span className="font-medium">End Date:</span> {new Date(trip.endDate).toLocaleDateString()}</p>
                                <p className="mb-2"><span className="font-medium">Budget:</span> {formatCurrency(trip.budget)}</p>
                                <p className="mb-2"><span className="font-medium">Status:</span> {getStatusLabel(trip.status)}</p>
                            </div>
                            <div>
                                <p className="mb-2"><span className="font-medium">Created At:</span> {new Date(trip.createdAt).toLocaleString()}</p>
                                <p className="mb-2"><span className="font-medium">Last Updated:</span> {new Date(trip.updatedAt).toLocaleString()}</p>
                            </div>
                        </div>
                        {trip.description && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                <p className="font-medium mb-1">Description:</p>
                                <p className="text-gray-600">{trip.description}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Itinerary Tab */}
                {activeTab === 'itinerary' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold">Itinerary</h2>
                            <button
                                onClick={() => setShowAIGenerator(true)}
                                className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center space-x-1"
                            >
                                <FaMagic />
                                <span>Generate with AI</span>
                            </button>
                        </div>
                        {itinerary.length > 0 ? (
                            <div className="space-y-4">
                                {itinerary.map((day, idx) => (
                                    <div key={day.id || idx} className="border-l-4 border-primary-500 pl-4 py-2 hover:bg-gray-50 transition-colors">
                                        <h3 className="font-semibold text-gray-900">Day {day.dayNumber || idx + 1}: {day.title || `Day ${idx + 1}`}</h3>
                                        <p className="text-gray-600 mt-1">{day.description}</p>
                                        {day.activities && day.activities.length > 0 && (
                                            <div className="mt-2">
                                                <p className="text-sm font-medium text-gray-700">Activities:</p>
                                                <ul className="list-disc list-inside text-sm text-gray-600">
                                                    {day.activities.map((activity, i) => (
                                                        <li key={i}>{activity}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {day.accommodation && (
                                            <p className="text-sm text-gray-500 mt-2">🏨 Accommodation: {day.accommodation}</p>
                                        )}
                                        {day.estimatedCost && (
                                            <p className="text-sm text-gray-500 mt-1">💰 {formatCurrency(day.estimatedCost)}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-gray-600 mb-4">No itinerary added yet.</p>
                                <button
                                    onClick={() => setShowAIGenerator(true)}
                                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                                >
                                    Generate AI Itinerary
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Expenses Tab */}
                {activeTab === 'expenses' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold">Expenses</h2>
                            <button
                                onClick={() => setShowExpenseModal(true)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center space-x-2"
                            >
                                <FaDollarSign />
                                <span>Add Expense</span>
                            </button>
                        </div>

                        {expenses.length > 0 ? (
                            <div>
                                <div className="space-y-2">
                                    {expenses.map((expense) => (
                                        <div key={expense.id} className="flex justify-between items-center border-b py-3 hover:bg-gray-50 transition">
                                            <div>
                                                <p className="font-medium">{expense.category}</p>
                                                <p className="text-sm text-gray-500">{expense.description}</p>
                                                <p className="text-xs text-gray-400">{new Date(expense.date).toLocaleDateString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold text-lg">{formatCurrency(expense.amount)}</p>
                                                <p className="text-xs text-gray-400">{expense.currency}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between items-center pt-4 mt-4 border-t">
                                    <p className="font-bold text-lg">Total</p>
                                    <p className="font-bold text-xl text-blue-600">
                                        {formatCurrency(expenses.reduce((sum, e) => sum + e.amount, 0))}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-gray-50 rounded-lg">
                                <FaDollarSign className="text-4xl text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-600">No expenses added yet</p>
                                <p className="text-sm text-gray-500 mt-1">Click "Add Expense" to start tracking your trip costs</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Map Tab - Enhanced */}
                {activeTab === 'map' && (
                    <div className="space-y-4">
                        {/* Map Header with Info */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                        <FaMap className="text-blue-600 text-xl" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-800">Journey Map</h3>
                                        <p className="text-sm text-gray-500">
                                            {trip.startingPoint && trip.startingPoint !== 'Not specified' ? (
                                                <>From <span className="font-medium text-green-600">{trip.startingPoint}</span> to <span className="font-medium text-red-600">{trip.destination}</span></>
                                            ) : (
                                                <>Explore <span className="font-medium text-red-600">{trip.destination}</span></>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-500">Trip Budget</p>
                                    <p className="font-bold text-blue-600">{formatCurrency(trip.budget)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Main Map Component */}
                        <MapView
                            destination={trip.destination}
                            startingPoint={trip.startingPoint}
                            tripBudget={trip.budget}
                            height="500px"
                        />

                        {/* Travel Tips Card */}
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                                <div className="text-2xl">💡</div>
                                <div>
                                    <h4 className="font-semibold text-amber-800 mb-1">Travel Tips</h4>
                                    <p className="text-sm text-amber-700">
                                        {trip.startingPoint && trip.startingPoint !== 'Not specified' ? (
                                            <>Your journey from <strong>{trip.startingPoint}</strong> to <strong>{trip.destination}</strong>. Click on different travel options above to compare costs and duration within your budget of {formatCurrency(trip.budget)}.</>
                                        ) : (
                                            <>Click on different travel options above to find the best way to reach {trip.destination} within your budget of {formatCurrency(trip.budget)}.</>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Expense Modal */}
            {showExpenseModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-scaleIn">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Add Expense</h2>
                            <button
                                onClick={() => setShowExpenseModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                                <select
                                    value={newExpense.category}
                                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select category</option>
                                    {expenseCategories.map(cat => (
                                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={newExpense.amount}
                                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="0.00"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                <input
                                    type="date"
                                    value={newExpense.date}
                                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    value={newExpense.description}
                                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    rows="2"
                                    placeholder="What was this expense for?"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                                <select
                                    value={newExpense.currency}
                                    onChange={(e) => setNewExpense({ ...newExpense, currency: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="INR">INR (₹)</option>
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="GBP">GBP (£)</option>
                                </select>
                            </div>

                            <button
                                onClick={handleAddExpense}
                                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                            >
                                Add Expense
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Trip Edit Modal */}
            <TripEditModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                trip={trip}
                onUpdate={handleUpdateTrip}
            />
        </div>
    );
};

export default TripDetail;