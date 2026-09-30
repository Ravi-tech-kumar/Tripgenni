import { Link } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { FaPlane, FaMapMarkedAlt, FaRobot, FaShieldAlt, FaUsers, FaCalendarAlt, FaChartLine, FaGlobe } from 'react-icons/fa';

const Home = () => {
  const isAuthenticated = authService.isAuthenticated();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute top-20 right-10 opacity-10">
          <FaPlane className="text-9xl rotate-45" />
        </div>
        <div className="absolute bottom-10 left-10 opacity-10">
          <FaGlobe className="text-8xl" />
        </div>
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <FaRobot className="text-sm" />
              <span className="text-sm font-medium">AI-Powered Travel Planning</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Plan Your Perfect Trip
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
                Without The Chaos
              </span>
            </h1>
            <p className="text-xl mb-8 text-blue-100">
              Create your crew, plan together, and let our AI handle the complicated stuff.
            </p>
            {!isAuthenticated && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/register" className="bg-white text-indigo-600 px-8 py-3 rounded-full font-semibold hover:shadow-lg transition-all hover:scale-105">
                  Get Started Free
                </Link>
                <Link to="/login" className="border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white/10 transition-all">
                  Sign In
                </Link>
              </div>
            )}
            {isAuthenticated && (
              <Link to="/dashboard" className="bg-white text-indigo-600 px-8 py-3 rounded-full font-semibold hover:shadow-lg transition-all inline-block">
                Go to Dashboard →
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Plan Better, Together</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              From creating your trip group to booking your adventure - all in one place.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition group">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-500 transition">
                <FaUsers className="text-2xl text-blue-600 group-hover:text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Create Your Crew</h3>
              <p className="text-gray-600">Start a trip group and invite your friends to join the planning process.</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition group">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-green-500 transition">
                <FaCalendarAlt className="text-2xl text-green-600 group-hover:text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Plan Together</h3>
              <p className="text-gray-600">Collaborate using group chat to discuss ideas and make decisions together.</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition group">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-purple-500 transition">
                <FaRobot className="text-2xl text-purple-600 group-hover:text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Tools</h3>
              <p className="text-gray-600">Leverage AI trip suggestions, budget estimation, and planning tools.</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition group">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-orange-500 transition">
                <FaMapMarkedAlt className="text-2xl text-orange-600 group-hover:text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Book & Go</h3>
              <p className="text-gray-600">Finalize your plans and book your trip with our secure payment system.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">10K+</div>
              <div className="text-blue-100">Happy Travelers</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50+</div>
              <div className="text-blue-100">Destinations</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">1000+</div>
              <div className="text-blue-100">Trips Planned</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-blue-100">AI Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Begin Your Adventure?</h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied travelers who have experienced the world with us.
          </p>
          {!isAuthenticated ? (
            <Link to="/register" className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-full font-semibold hover:shadow-lg transition-all inline-block">
              Create Free Account
            </Link>
          ) : (
            <Link to="/dashboard" className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-full font-semibold hover:shadow-lg transition-all inline-block">
              Go to Dashboard
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;