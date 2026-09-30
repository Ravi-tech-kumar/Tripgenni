import { useState, useEffect } from 'react';
import { 
    FaTimes, 
    FaPlane, 
    FaMapMarkerAlt, 
    FaCalendarAlt, 
    FaDollarSign, 
    FaFlag, 
    FaFileAlt 
} from 'react-icons/fa';

// Simple INR formatter without external dependency
const formatINR = (amount) => {
    if (!amount && amount !== 0) return '₹0';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

const TripEditModal = ({ isOpen, onClose, trip, onUpdate }) => {
    const [formData, setFormData] = useState({
        startingPoint: '',
        destination: '',
        startDate: '',
        endDate: '',
        budget: '',
        status: 'PLANNING',
        description: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (trip) {
            setFormData({
                startingPoint: trip.startingPoint || '',
                destination: trip.destination || '',
                startDate: trip.startDate?.split('T')[0] || '',
                endDate: trip.endDate?.split('T')[0] || '',
                budget: trip.budget || '',
                status: trip.status || 'PLANNING',
                description: trip.description || ''
            });
        }
    }, [trip]);

    const statuses = [
        { value: 'PLANNING', label: 'Planning', color: 'bg-yellow-100 text-yellow-800', icon: '📝' },
        { value: 'CONFIRMED', label: 'Confirmed', color: 'bg-green-100 text-green-800', icon: '✅' },
        { value: 'ONGOING', label: 'Ongoing', color: 'bg-blue-100 text-blue-800', icon: '✈️' },
        { value: 'COMPLETED', label: 'Completed', color: 'bg-gray-100 text-gray-800', icon: '🏁' },
        { value: 'CANCELLED', label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: '❌' }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onUpdate(trip.id, formData);
            onClose();
        } catch (error) {
            console.error('Failed to update trip:', error);
            alert('Failed to update trip. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold text-gray-800">Edit Trip</h2>
                    <button 
                        onClick={onClose} 
                        className="p-2 hover:bg-gray-100 rounded-full transition"
                        disabled={loading}
                    >
                        <FaTimes className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Starting Point */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <FaPlane className="w-4 h-4 inline mr-1 text-green-600" /> Starting From
                        </label>
                        <input
                            type="text"
                            value={formData.startingPoint}
                            onChange={(e) => setFormData({ ...formData, startingPoint: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Where are you traveling from?"
                            disabled={loading}
                        />
                    </div>

                    {/* Destination */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <FaMapMarkerAlt className="w-4 h-4 inline mr-1 text-blue-500" /> Destination
                        </label>
                        <input
                            type="text"
                            value={formData.destination}
                            onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter destination"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <FaCalendarAlt className="w-4 h-4 inline mr-1" /> Start Date
                            </label>
                            <input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <FaCalendarAlt className="w-4 h-4 inline mr-1" /> End Date
                            </label>
                            <input
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <FaDollarSign className="w-4 h-4 inline mr-1 text-yellow-600" /> Budget (₹ INR)
                        </label>
                        <input
                            type="number"
                            value={formData.budget}
                            onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Total budget in Rupees"
                            disabled={loading}
                        />
                        <p className="text-xs text-gray-500 mt-1">Amount in Indian Rupees (₹)</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <FaFlag className="w-4 h-4 inline mr-1" /> Status
                        </label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            disabled={loading}
                        >
                            {statuses.map(s => (
                                <option key={s.value} value={s.value}>{s.icon} {s.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <FaFileAlt className="w-4 h-4 inline mr-1" /> Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            rows="3"
                            placeholder="Trip description"
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default TripEditModal;