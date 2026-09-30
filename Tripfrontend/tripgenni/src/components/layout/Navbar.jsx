import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { aiService } from '../../services/ai.service';
import { FaPlane, FaUser, FaSignOutAlt, FaSignInAlt, FaUserPlus, FaHome, FaCalendarAlt, FaRobot } from 'react-icons/fa';
import toast from 'react-hot-toast';

const Navbar = () => {
  const navigate = useNavigate();
  const isAuthenticated = authService.isAuthenticated();
  const currentUser = authService.getCurrentUser();

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const testAIConnection = async () => {
    try {
      const health = await aiService.checkHealth();
      console.log('Health check:', health);
      if (health === 'AI Service is unavailable') {
        toast.error('❌ AI Service is not running! Start it on port 8089');
      } else {
        toast.success('✅ AI Service is running!');
      }
    } catch (error) {
      console.error('AI test failed:', error);
      toast.error('❌ AI Service connection failed');
    }
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition">
            <FaPlane className="text-primary-600 text-2xl" />
            <span className="font-bold text-xl text-gray-800">TripGenni</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-6">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="flex items-center space-x-1 text-gray-600 hover:text-primary-600 transition">
                  <FaHome className="text-sm" />
                  <span className="hidden md:inline">Dashboard</span>
                </Link>
                <Link to="/trips" className="flex items-center space-x-1 text-gray-600 hover:text-primary-600 transition">
                  <FaCalendarAlt className="text-sm" />
                  <span className="hidden md:inline">My Trips</span>
                </Link>
                <Link to="/profile" className="flex items-center space-x-1 text-gray-600 hover:text-primary-600 transition">
                  <FaUser className="text-sm" />
                  <span className="hidden md:inline">Profile</span>
                </Link>
                
                {/* Test AI Connection Button - Only for testing */}
                <button
                  onClick={testAIConnection}
                  className="flex items-center space-x-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition"
                  title="Test AI Service Connection"
                >
                  <FaRobot className="text-sm" />
                  <span className="hidden md:inline text-sm">Test AI</span>
                </button>
                
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 text-red-600 hover:text-red-700 transition"
                >
                  <FaSignOutAlt />
                  <span className="hidden md:inline">Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="flex items-center space-x-1 text-gray-600 hover:text-primary-600 transition">
                  <FaSignInAlt />
                  <span>Login</span>
                </Link>
                <Link to="/register" className="flex items-center space-x-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition">
                  <FaUserPlus />
                  <span>Register</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;