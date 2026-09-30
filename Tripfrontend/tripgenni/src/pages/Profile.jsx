import { useState, useEffect } from 'react';
import { authService } from '../services/auth.service';
import { userService } from '../services/user.service';
import { notificationService } from '../services/notification.service';
import { FaUser, FaPhone, FaGlobe, FaHeart, FaUtensils, FaDollarSign, FaCloudSun, FaEdit, FaSave, FaTrash, FaPlus, FaMapMarkerAlt, FaPlane, FaHotel, FaUmbrellaBeach, FaMountain, FaCity, FaBell, FaEnvelope } from 'react-icons/fa';
import toast from 'react-hot-toast';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [preferences, setPreferences] = useState({
    budgetRange: '',
    preferredClimate: '',
    travelStyle: '',
    foodPreference: '',
    interestTags: [],
    groupSize: 1
  });
  const [destinations, setDestinations] = useState([]);
  const [newDestination, setNewDestination] = useState({ destinationName: '', country: '', notes: '' });
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [notificationPrefs, setNotificationPrefs] = useState({
    emailNotifications: true,
    tripUpdates: true,
    aiSuggestions: true,
    promotionalEmails: false
  });
  const [savingNotification, setSavingNotification] = useState(false);
  
  const currentUser = authService.getCurrentUser();
  const userId = currentUser?.userId;
  const userEmail = currentUser?.email || localStorage.getItem('userEmail');

  useEffect(() => {
    fetchProfileData();
    loadNotificationPrefs();
  }, []);

  const fetchProfileData = async () => {
    try {
      let profileData = null;
      try {
        profileData = await userService.getProfile(userId);
      } catch (err) {
        console.log('Profile not found');
      }
      
      let preferencesData = null;
      try {
        preferencesData = await userService.getPreference(userId);
      } catch (err) {
        console.log('Preferences not found');
      }
      
      let destinationsData = [];
      try {
        destinationsData = await userService.getDestinations(userId);
      } catch (err) {
        console.log('Destinations not found');
      }
      
      setProfile(profileData);
      if (preferencesData) {
        setPreferences({
          ...preferences,
          ...preferencesData,
          interestTags: preferencesData.interestTags || []
        });
      }
      setDestinations(destinationsData || []);
    } catch (error) {
      console.error('Failed to fetch profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotificationPrefs = () => {
    const savedPrefs = localStorage.getItem('notificationPrefs');
    if (savedPrefs) {
      try {
        setNotificationPrefs(JSON.parse(savedPrefs));
      } catch (e) {
        console.error('Failed to parse notification prefs:', e);
      }
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      const profileData = {
        ...profile,
        authUserId: userId,
        email: userEmail
      };
      
      const existingProfile = await userService.getProfile(userId);
      if (existingProfile) {
        await userService.updateProfile(userId, profileData);
        toast.success('Profile updated successfully!');
      } else {
        await userService.createProfile(profileData);
        toast.success('Profile created successfully!');
      }
      setIsEditing(false);
      await fetchProfileData();
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile. Please try again.');
    }
  };

  const handlePreferencesSubmit = async () => {
    try {
      const existingPrefs = await userService.getPreference(userId);
      if (existingPrefs) {
        await userService.updatePreference(userId, {
          ...preferences,
          userId: userId
        });
      } else {
        await userService.savePreference({
          ...preferences,
          userId: userId
        });
      }
      toast.success('Travel preferences saved successfully!');
      await fetchProfileData();
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast.error('Failed to save preferences. Please try again.');
    }
  };

  const handleNotificationSubmit = async () => {
    setSavingNotification(true);
    try {
      // Save to localStorage
      localStorage.setItem('notificationPrefs', JSON.stringify(notificationPrefs));
      
      // Show success message
      toast.success('Notification preferences saved!');
      
      // If email notifications are enabled, send a test email
      if (notificationPrefs.emailNotifications && userEmail) {
        try {
          await notificationService.sendEmail({
            to: userEmail,
            subject: 'TripGenni Notification Settings Updated',
            body: `Hello ${profile?.fullName || 'Traveler'},

Your notification preferences have been updated successfully!

Current Settings:
- Email Notifications: ${notificationPrefs.emailNotifications ? '✓ Enabled' : '✗ Disabled'}
- Trip Updates: ${notificationPrefs.tripUpdates ? '✓ Enabled' : '✗ Disabled'}
- AI Suggestions: ${notificationPrefs.aiSuggestions ? '✓ Enabled' : '✗ Disabled'}

You can change these settings anytime in your profile.

Happy Travels!
TripGenni Team`,
            templateName: 'notification-update'
          });
          toast.success('Test email sent to your inbox!');
        } catch (emailError) {
          console.error('Failed to send test email:', emailError);
          toast.error('Preferences saved but test email failed. Check your email settings.');
        }
      }
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
      toast.error('Failed to save notification preferences. Please try again.');
    } finally {
      setSavingNotification(false);
    }
  };

  const handleAddDestination = async () => {
    if (!newDestination.destinationName) {
      toast.error('Please enter a destination name');
      return;
    }
    try {
      await userService.addDestination({
        ...newDestination,
        userId: userId
      });
      setNewDestination({ destinationName: '', country: '', notes: '' });
      await fetchProfileData();
      toast.success('Destination added to wishlist!');
    } catch (error) {
      console.error('Failed to add destination:', error);
      toast.error('Failed to add destination. Please try again.');
    }
  };

  const handleRemoveDestination = async (id) => {
    if (window.confirm('Remove this destination from your wishlist?')) {
      try {
        await userService.removeDestination(id);
        await fetchProfileData();
        toast.success('Destination removed from wishlist!');
      } catch (error) {
        console.error('Failed to remove destination:', error);
        toast.error('Failed to remove destination. Please try again.');
      }
    }
  };

  const toggleInterest = (interest) => {
    setPreferences({
      ...preferences,
      interestTags: preferences.interestTags.includes(interest)
        ? preferences.interestTags.filter(i => i !== interest)
        : [...preferences.interestTags, interest]
    });
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
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

      {/* Profile Header */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <FaUser className="text-3xl" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{profile?.fullName || 'Traveler'}</h2>
            <p className="text-primary-100 flex items-center gap-2">
              <FaEnvelope className="text-sm" />
              {userEmail || 'Email not set'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b">
        {[
          { id: 'profile', label: 'Personal Info', icon: FaUser },
          { id: 'preferences', label: 'Travel Preferences', icon: FaHeart },
          { id: 'destinations', label: 'Wishlist', icon: FaMapMarkerAlt },
          { id: 'notifications', label: 'Notifications', icon: FaBell }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-t-lg transition ${
              activeTab === tab.id
                ? 'bg-white text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="text-sm" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Profile Section */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <FaUser className="mr-2 text-primary-600" />
              Personal Information
            </h2>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-primary-600 hover:text-primary-700 flex items-center space-x-1"
            >
              <FaEdit />
              <span>{isEditing ? 'Cancel' : 'Edit'}</span>
            </button>
          </div>

          {isEditing ? (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={profile?.fullName || ''}
                  onChange={(e) => setProfile({...profile, fullName: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={userEmail || ''}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={profile?.phoneNumber || ''}
                  onChange={(e) => setProfile({...profile, phoneNumber: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter your phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={profile?.country || ''}
                  onChange={(e) => setProfile({...profile, country: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter your country"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea
                  value={profile?.bio || ''}
                  onChange={(e) => setProfile({...profile, bio: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  rows="3"
                  placeholder="Tell us about yourself..."
                />
              </div>
              <button type="submit" className="btn-primary flex items-center space-x-2">
                <FaSave />
                <span>Save Changes</span>
              </button>
            </form>
          ) : (
            <div className="space-y-3">
              <p><span className="font-medium">Name:</span> {profile?.fullName || 'Not set'}</p>
              <p><span className="font-medium">Email:</span> {userEmail || 'Not set'}</p>
              <p><span className="font-medium">Phone:</span> {profile?.phoneNumber || 'Not set'}</p>
              <p><span className="font-medium">Country:</span> {profile?.country || 'Not set'}</p>
              {profile?.bio && <p><span className="font-medium">Bio:</span> {profile.bio}</p>}
            </div>
          )}
        </div>
      )}

      {/* Travel Preferences Section (Keep as is) */}
      {activeTab === 'preferences' && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <FaHeart className="mr-2 text-red-500" />
            Travel Preferences
          </h2>
          
          <div className="space-y-6">
            {/* Budget Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Budget Range</label>
              <div className="flex flex-wrap gap-2">
                {['Budget (< ₹20k)', 'Moderate (₹20k-₹50k)', 'Premium (₹50k-₹1L)', 'Luxury (₹1L+)'].map(range => (
                  <button
                    key={range}
                    onClick={() => setPreferences({...preferences, budgetRange: range})}
                    className={`px-4 py-2 rounded-full text-sm transition ${
                      preferences.budgetRange === range
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {/* Preferred Climate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Climate</label>
              <div className="flex flex-wrap gap-2">
                {['Tropical', 'Mountain', 'Desert', 'Coastal', 'Temperate'].map(climate => (
                  <button
                    key={climate}
                    onClick={() => setPreferences({...preferences, preferredClimate: climate})}
                    className={`px-4 py-2 rounded-full text-sm transition ${
                      preferences.preferredClimate === climate
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {climate}
                  </button>
                ))}
              </div>
            </div>

            {/* Travel Style */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Travel Style</label>
              <div className="flex flex-wrap gap-2">
                {['Solo', 'Couple', 'Family', 'Friends', 'Group Tour'].map(style => (
                  <button
                    key={style}
                    onClick={() => setPreferences({...preferences, travelStyle: style})}
                    className={`px-4 py-2 rounded-full text-sm transition ${
                      preferences.travelStyle === style
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Food Preference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Food Preference</label>
              <select
                value={preferences.foodPreference}
                onChange={(e) => setPreferences({...preferences, foodPreference: e.target.value})}
                className="w-full md:w-1/2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select food preference</option>
                <option value="vegetarian">Vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="non-vegetarian">Non-Vegetarian</option>
                <option value="halal">Halal</option>
                <option value="no-preference">No Preference</option>
              </select>
            </div>

            {/* Interests */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Interests</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'beaches', label: 'Beaches', icon: FaUmbrellaBeach },
                  { value: 'mountains', label: 'Mountains', icon: FaMountain },
                  { value: 'cities', label: 'Cities', icon: FaCity },
                  { value: 'adventure', label: 'Adventure', icon: FaPlane },
                  { value: 'cultural', label: 'Cultural', icon: FaHotel },
                  { value: 'food', label: 'Food & Dining', icon: FaUtensils }
                ].map(interest => (
                  <button
                    key={interest.value}
                    onClick={() => toggleInterest(interest.value)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm transition ${
                      preferences.interestTags.includes(interest.value)
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <interest.icon className="text-sm" />
                    <span>{interest.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Group Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Group Size Preference</label>
              <input
                type="number"
                value={preferences.groupSize}
                onChange={(e) => setPreferences({...preferences, groupSize: parseInt(e.target.value)})}
                className="w-full md:w-1/3 px-4 py-2 border border-gray-300 rounded-lg"
                min="1"
                max="20"
              />
            </div>

            <button
              onClick={handlePreferencesSubmit}
              className="btn-primary flex items-center space-x-2"
            >
              <FaSave />
              <span>Save Preferences</span>
            </button>
          </div>
        </div>
      )}

      {/* Saved Destinations Section (Keep as is) */}
      {activeTab === 'destinations' && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <FaMapMarkerAlt className="mr-2 text-green-600" />
            My Wishlist
          </h2>

          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-3">Add New Destination</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Destination name*"
                value={newDestination.destinationName}
                onChange={(e) => setNewDestination({...newDestination, destinationName: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="Country"
                value={newDestination.country}
                onChange={(e) => setNewDestination({...newDestination, country: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <textarea
                placeholder="Notes (why you want to visit)"
                value={newDestination.notes}
                onChange={(e) => setNewDestination({...newDestination, notes: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                rows="2"
              />
              <button
                onClick={handleAddDestination}
                className="btn-primary flex items-center space-x-2"
              >
                <FaPlus />
                <span>Add to Wishlist</span>
              </button>
            </div>
          </div>

          {destinations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {destinations.map((dest) => (
                <div key={dest.id} className="border rounded-lg p-4 hover:shadow-md transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{dest.destinationName}</h3>
                      <p className="text-sm text-gray-600">{dest.country}</p>
                      {dest.notes && (
                        <p className="text-sm text-gray-500 mt-2">{dest.notes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveDestination(dest.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FaMapMarkerAlt className="text-4xl text-gray-300 mx-auto mb-2" />
              <p className="text-gray-600">No destinations in your wishlist yet.</p>
              <p className="text-sm text-gray-500 mt-1">Add places you dream of visiting!</p>
            </div>
          )}
        </div>
      )}

      {/* Notifications Section - WORKING VERSION */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <FaBell className="mr-2 text-yellow-600" />
            Notification Preferences
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-gray-500">Receive updates via email at {userEmail || 'your email'}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={notificationPrefs.emailNotifications}
                  onChange={(e) => setNotificationPrefs({...notificationPrefs, emailNotifications: e.target.checked})}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium">Trip Updates</p>
                <p className="text-sm text-gray-500">Get notified about changes to your trips</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={notificationPrefs.tripUpdates}
                  onChange={(e) => setNotificationPrefs({...notificationPrefs, tripUpdates: e.target.checked})}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium">AI Suggestions</p>
                <p className="text-sm text-gray-500">Receive personalized trip recommendations</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={notificationPrefs.aiSuggestions}
                  onChange={(e) => setNotificationPrefs({...notificationPrefs, aiSuggestions: e.target.checked})}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium">Promotional Emails</p>
                <p className="text-sm text-gray-500">Receive special offers and deals</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={notificationPrefs.promotionalEmails}
                  onChange={(e) => setNotificationPrefs({...notificationPrefs, promotionalEmails: e.target.checked})}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <button
              onClick={handleNotificationSubmit}
              disabled={savingNotification}
              className="btn-primary w-full md:w-auto flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingNotification ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FaSave />
                  <span>Save Preferences</span>
                </>
              )}
            </button>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              <p className="font-medium">💡 Note:</p>
              <p className="text-xs mt-1">Your preferences are saved locally. If you enable email notifications, we'll send a test email to verify your settings.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;