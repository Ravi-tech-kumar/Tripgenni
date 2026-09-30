import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import 'leaflet-routing-machine';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// INR Formatter
const formatINR = (amount) => {
    if (!amount && amount !== 0) return '₹0';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

// Transportation modes
const transportModes = {
    car: {
        name: 'Car / Road Trip',
        icon: '🚗',
        description: 'Flexible schedule, scenic routes',
        speedKmh: 80,
        costPerKm: 12,
        color: '#3b82f6'
    },
    train: {
        name: 'Train Journey',
        icon: '🚆',
        description: 'Comfortable, scenic, affordable',
        speedKmh: 60,
        costPerKm: 6,
        color: '#10b981'
    },
    flight: {
        name: 'Flight',
        icon: '✈️',
        description: 'Fastest, time-saving',
        speedKmh: 800,
        costPerKm: 28,
        color: '#ef4444'
    },
    bus: {
        name: 'Bus / Coach',
        icon: '🚌',
        description: 'Economical, good for short trips',
        speedKmh: 50,
        costPerKm: 4,
        color: '#f59e0b'
    }
};

// Get recommendations based on budget
const getRecommendations = (distanceKm, budget) => {
    const results = [];
    for (const [mode, data] of Object.entries(transportModes)) {
        const cost = Math.round(distanceKm * data.costPerKm);
        const time = (distanceKm / data.speedKmh).toFixed(1);
        results.push({
            mode,
            ...data,
            cost,
            time,
            isAffordable: cost <= budget,
            budgetPercent: Math.round((cost / budget) * 100)
        });
    }
    results.sort((a, b) => a.time - b.time);
    const affordable = results.filter(r => r.isAffordable);
    const primary = affordable.length > 0 ? affordable[0] : results[0];
    primary.reason = primary.isAffordable ? 
        `Best option within your budget of ${formatINR(budget)}` : 
        `Most economical option (${formatINR(primary.cost)})`;
    
    return { primary, alternatives: results.filter(r => r.mode !== primary.mode) };
};

// Create custom markers
const createIcon = (color, emoji) => L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-size: 14px;">${emoji}</div>`,
    iconSize: [28, 28],
    popupAnchor: [0, -14]
});

const startIcon = createIcon('#10b981', '🚗');
const endIcon = createIcon('#ef4444', '🏁');

const tileLayers = {
    standard: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    satellite: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
};

const MapView = ({ destination, startingPoint, tripBudget = 25000, height = '500px' }) => {
    const mapRef = useRef(null);
    const containerRef = useRef(null);
    const routingRef = useRef(null);
    const markersRef = useRef([]);
    const [activeLayer, setActiveLayer] = useState('standard');
    const [routeInfo, setRouteInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [recommendations, setRecommendations] = useState(null);
    const [selectedMode, setSelectedMode] = useState('car');
    const [showAlternatives, setShowAlternatives] = useState(false);
    const [mapReady, setMapReady] = useState(false);
    const [error, setError] = useState(null);

    // Initialize map - ONLY ONCE
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;
        
        try {
            // Create map instance
            const map = L.map(containerRef.current).setView([20.5937, 78.9629], 5);
            
            // Add base tile layer
            L.tileLayer(tileLayers.standard, {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19,
            }).addTo(map);
            
            // Add controls
            L.control.scale().addTo(map);
            L.control.zoom({ position: 'topright' }).addTo(map);
            
            mapRef.current = map;
            setMapReady(true);
            
            console.log('✅ Map initialized');
        } catch (err) {
            console.error('❌ Failed to initialize map:', err);
            setError('Failed to initialize map');
        }
        
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                setMapReady(false);
            }
        };
    }, []);

    // Change tile layer
    const changeLayer = (layer) => {
        if (!mapRef.current) return;
        
        try {
            // Remove existing tile layers
            mapRef.current.eachLayer((layer) => {
                if (layer instanceof L.TileLayer) {
                    mapRef.current.removeLayer(layer);
                }
            });
            
            // Add new tile layer
            L.tileLayer(tileLayers[layer], {
                attribution: '© OpenStreetMap',
                maxZoom: 19,
            }).addTo(mapRef.current);
            
            setActiveLayer(layer);
            console.log('Layer changed to:', layer);
        } catch (err) {
            console.error('Failed to change layer:', err);
        }
    };

    // Geocode location
    const geocodeLocation = async (location) => {
        if (!location || location === 'Not specified' || location === '') return null;
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`
            );
            const data = await response.json();
            if (data && data[0]) {
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon),
                    name: location
                };
            }
            return null;
        } catch (err) {
            console.error(`Geocoding failed for ${location}:`, err);
            return null;
        }
    };

    // Load route and recommendations
    useEffect(() => {
        if (!mapReady || !mapRef.current) return;
        
        const loadRoute = async () => {
            setIsLoading(true);
            setError(null);
            
            try {
                // Clear existing markers
                markersRef.current.forEach(m => {
                    if (m && m.remove) m.remove();
                });
                markersRef.current = [];
                
                // Clear existing routing
                if (routingRef.current) {
                    routingRef.current.remove();
                    routingRef.current = null;
                }
                
                // Geocode locations
                const [startCoords, endCoords] = await Promise.all([
                    geocodeLocation(startingPoint),
                    geocodeLocation(destination)
                ]);
                
                if (!endCoords) {
                    setError('Could not find destination on map');
                    setIsLoading(false);
                    return;
                }
                
                // Calculate straight line distance
                let distance = 0;
                if (startCoords) {
                    const R = 6371;
                    const dLat = (endCoords.lat - startCoords.lat) * Math.PI / 180;
                    const dLon = (endCoords.lng - startCoords.lng) * Math.PI / 180;
                    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                              Math.cos(startCoords.lat * Math.PI / 180) * Math.cos(endCoords.lat * Math.PI / 180) *
                              Math.sin(dLon/2) * Math.sin(dLon/2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                    distance = R * c;
                }
                
                // Get recommendations
                const budget = tripBudget || 25000;
                const recs = getRecommendations(distance || 500, budget);
                setRecommendations(recs);
                
                // Add start marker if available
                if (startCoords) {
                    const marker = L.marker([startCoords.lat, startCoords.lng], { icon: startIcon })
                        .addTo(mapRef.current)
                        .bindPopup(`<b>📍 Starting Point</b><br/>${startingPoint}`);
                    markersRef.current.push(marker);
                }
                
                // Add end marker
                const endMarker = L.marker([endCoords.lat, endCoords.lng], { icon: endIcon })
                    .addTo(mapRef.current)
                    .bindPopup(`<b>🏁 Destination</b><br/>${destination}`);
                markersRef.current.push(endMarker);
                
                // Fit bounds
                if (startCoords && endCoords) {
                    const bounds = L.latLngBounds(
                        [startCoords.lat, startCoords.lng],
                        [endCoords.lat, endCoords.lng]
                    );
                    mapRef.current.fitBounds(bounds, { padding: [50, 50] });
                } else if (endCoords) {
                    mapRef.current.setView([endCoords.lat, endCoords.lng], 10);
                }
                
                // Add route if both points exist
                if (startCoords && endCoords) {
                    const mode = transportModes[selectedMode];
                    
                    routingRef.current = L.Routing.control({
                        waypoints: [
                            L.latLng(startCoords.lat, startCoords.lng),
                            L.latLng(endCoords.lat, endCoords.lng)
                        ],
                        routeWhileDragging: false,
                        showAlternatives: false,
                        lineOptions: { styles: [{ color: mode.color, weight: 5 }] },
                        addWaypoints: false,
                        draggableWaypoints: false,
                        fitSelectedRoutes: true,
                        show: false,
                    }).addTo(mapRef.current);
                    
                    routingRef.current.on('routesfound', (e) => {
                        const route = e.routes[0];
                        if (route) {
                            const roadDistance = (route.summary.totalDistance / 1000).toFixed(0);
                            const duration = (route.summary.totalTime / 3600).toFixed(1);
                            const cost = Math.round(roadDistance * mode.costPerKm);
                            
                            setRouteInfo({
                                distance: roadDistance,
                                duration,
                                mode: selectedMode,
                                name: mode.name,
                                icon: mode.icon,
                                cost,
                                isRecommended: selectedMode === recs.primary.mode,
                                budget: budget,
                                remaining: budget - cost,
                                percent: Math.round((cost / budget) * 100),
                                reason: recs.primary.reason
                            });
                        }
                        setIsLoading(false);
                    });
                    
                    routingRef.current.on('routingerror', () => {
                        const cost = Math.round(distance * mode.costPerKm);
                        setRouteInfo({
                            distance: Math.round(distance),
                            duration: (distance / mode.speedKmh).toFixed(1),
                            mode: selectedMode,
                            name: mode.name,
                            icon: mode.icon,
                            cost,
                            isRecommended: selectedMode === recs.primary.mode,
                            budget: budget,
                            remaining: budget - cost,
                            percent: Math.round((cost / budget) * 100),
                            reason: recs.primary.reason
                        });
                        setIsLoading(false);
                    });
                } else {
                    setIsLoading(false);
                }
            } catch (err) {
                console.error('Error loading route:', err);
                setError('Failed to load route');
                setIsLoading(false);
            }
        };
        
        loadRoute();
    }, [mapReady, destination, startingPoint, tripBudget]);

    // Update route when mode changes
    useEffect(() => {
        if (!mapReady || !mapRef.current || !recommendations) return;
        
        const updateRoute = async () => {
            setIsLoading(true);
            
            try {
                const [startCoords, endCoords] = await Promise.all([
                    geocodeLocation(startingPoint),
                    geocodeLocation(destination)
                ]);
                
                if (startCoords && endCoords && routingRef.current) {
                    routingRef.current.setWaypoints([
                        L.latLng(startCoords.lat, startCoords.lng),
                        L.latLng(endCoords.lat, endCoords.lng)
                    ]);
                    
                    const mode = transportModes[selectedMode];
                    
                    routingRef.current.once('routesfound', (e) => {
                        const route = e.routes[0];
                        if (route) {
                            const roadDistance = (route.summary.totalDistance / 1000).toFixed(0);
                            const duration = (route.summary.totalTime / 3600).toFixed(1);
                            const cost = Math.round(roadDistance * mode.costPerKm);
                            
                            setRouteInfo(prev => ({
                                ...prev,
                                distance: roadDistance,
                                duration,
                                mode: selectedMode,
                                name: mode.name,
                                icon: mode.icon,
                                cost,
                                isRecommended: selectedMode === recommendations.primary.mode,
                                remaining: (prev?.budget || tripBudget) - cost,
                                percent: Math.round((cost / (prev?.budget || tripBudget)) * 100)
                            }));
                        }
                        setIsLoading(false);
                    });
                    
                    setTimeout(() => setIsLoading(false), 3000);
                }
            } catch (err) {
                console.error('Error updating route:', err);
                setIsLoading(false);
            }
        };
        
        updateRoute();
    }, [selectedMode, mapReady]);

    const selectMode = (mode) => {
        setSelectedMode(mode);
    };

    return (
        <div className="space-y-4">
            {/* Map Controls - Row 1 */}
            <div className="flex gap-2 flex-wrap">
                {Object.keys(tileLayers).map((layer) => (
                    <button
                        key={layer}
                        onClick={() => changeLayer(layer)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition capitalize ${
                            activeLayer === layer
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        {layer === 'standard' && '🗺️ Standard'}
                        {layer === 'satellite' && '🛰️ Satellite'}
                        {layer === 'terrain' && '⛰️ Terrain'}
                        {layer === 'dark' && '🌙 Dark'}
                        {layer === 'light' && '☀️ Light'}
                    </button>
                ))}
            </div>
            
            {/* Travel Options - Row 2 (ALWAYS VISIBLE) */}
            {recommendations && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="bg-gray-50 px-4 py-2 border-b">
                        <h4 className="font-semibold text-gray-700">🚗 Travel Options</h4>
                    </div>
                    <div className="p-3">
                        {/* Primary Recommendation */}
                        <div 
                            onClick={() => selectMode(recommendations.primary.mode)}
                            className={`p-3 rounded-lg mb-2 cursor-pointer transition border ${
                                selectedMode === recommendations.primary.mode 
                                    ? 'bg-blue-50 border-2 border-blue-500' 
                                    : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                            }`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">{recommendations.primary.icon}</span>
                                    <div>
                                        <div className="font-semibold">
                                            {recommendations.primary.name}
                                            {selectedMode === recommendations.primary.mode && (
                                                <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded">Selected</span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500">{recommendations.primary.description}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-green-600">{formatINR(recommendations.primary.cost)}</div>
                                    <div className="text-xs text-gray-500">{recommendations.primary.time} hrs</div>
                                    <div className={`text-xs ${recommendations.primary.isAffordable ? 'text-green-600' : 'text-red-500'}`}>
                                        {recommendations.primary.isAffordable ? '✓ Within budget' : '⚠️ Over budget'}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-2 text-xs text-blue-600 border-t pt-2">
                                💡 {recommendations.primary.reason}
                            </div>
                        </div>
                        
                        {/* Alternatives Toggle */}
                        <button 
                            onClick={() => setShowAlternatives(!showAlternatives)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium w-full text-center py-1"
                        >
                            {showAlternatives ? '▼ Hide alternatives' : '▶ Show other options'}
                        </button>
                        
                        {/* Alternative Options */}
                        {showAlternatives && recommendations.alternatives.map(alt => (
                            <div key={alt.mode} 
                                onClick={() => selectMode(alt.mode)}
                                className={`p-3 rounded-lg mb-2 cursor-pointer transition border ${
                                    selectedMode === alt.mode 
                                        ? 'bg-blue-50 border-2 border-blue-500' 
                                        : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                                }`}
                            >
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{alt.icon}</span>
                                        <div>
                                            <div className="font-semibold">
                                                {alt.name}
                                                {selectedMode === alt.mode && (
                                                    <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded">Selected</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-500">{alt.description}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold text-gray-700">{formatINR(alt.cost)}</div>
                                        <div className="text-xs text-gray-500">{alt.time} hrs</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Map Container - Row 3 */}
            <div className="relative">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10 rounded-xl">
                        <div className="bg-white p-3 rounded-lg shadow-lg flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <span className="text-sm">Loading route...</span>
                        </div>
                    </div>
                )}
                {error && (
                    <div className="absolute top-2 left-2 right-2 z-10 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                        {error}
                    </div>
                )}
                <div 
                    ref={containerRef} 
                    className="w-full rounded-xl overflow-hidden border shadow-lg"
                    style={{ height }}
                />
            </div>
            
            {/* Route Info - Row 4 */}
            {routeInfo && (
                <div className={`rounded-xl p-3 text-white ${routeInfo.isRecommended ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-blue-500 to-purple-600'}`}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-sm">
                        <div>
                            <div className="text-xs opacity-80">Mode</div>
                            <div className="font-semibold">{routeInfo.icon} {routeInfo.name}</div>
                        </div>
                        <div>
                            <div className="text-xs opacity-80">Distance</div>
                            <div className="font-semibold">{routeInfo.distance} km</div>
                        </div>
                        <div>
                            <div className="text-xs opacity-80">Duration</div>
                            <div className="font-semibold">{routeInfo.duration} hrs</div>
                        </div>
                        <div>
                            <div className="text-xs opacity-80">Est. Cost</div>
                            <div className="font-semibold">{formatINR(routeInfo.cost)}</div>
                        </div>
                    </div>
                    <div className="mt-2 pt-1 border-t border-white/30 flex flex-wrap justify-between text-xs">
                        <span>💰 Budget: {formatINR(routeInfo.budget)}</span>
                        <span>💵 Remaining: {formatINR(routeInfo.remaining)}</span>
                        <span>{routeInfo.percent}% of budget</span>
                    </div>
                    {routeInfo.reason && (
                        <div className="mt-1 text-xs text-center bg-black/20 rounded py-1">
                            💡 {routeInfo.reason}
                        </div>
                    )}
                </div>
            )}
            
            {/* Legend - Row 5 */}
            <div className="bg-white rounded-lg p-2 text-xs flex flex-wrap gap-3 justify-center border">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Starting Point</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>Destination</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-6 h-0.5 bg-blue-500"></div>
                    <span>Car Route</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-6 h-0.5 bg-green-500 border-t-2 border-dashed"></div>
                    <span>Train Route</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-6 h-0.5 bg-red-500 border-t-2 border-dotted"></div>
                    <span>Flight Path</span>
                </div>
            </div>
        </div>
    );
};

export default MapView;

// import { useEffect, useRef, useState } from 'react';
// import L from 'leaflet';
// import 'leaflet/dist/leaflet.css';
// import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
// import 'leaflet-routing-machine';

// // Fix for default marker icons in Leaflet
// delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//     iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
//     iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
//     shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
// });

// // INR Formatter
// const formatINR = (amount) => {
//     if (!amount && amount !== 0) return '₹0';
//     return new Intl.NumberFormat('en-IN', {
//         style: 'currency',
//         currency: 'INR',
//         minimumFractionDigits: 0,
//         maximumFractionDigits: 0
//     }).format(amount);
// };

// // Transportation modes with icons, costs (in INR), and styles
// const transportModes = {
//     car: {
//         name: 'Car / Road Trip',
//         icon: '🚗',
//         color: '#3b82f6',
//         routeStyle: { color: '#3b82f6', weight: 5, dashArray: null, opacity: 0.8 },
//         description: 'Flexible schedule, scenic routes',
//         speedKmh: 80,
//         costPerKm: 12,
//         minBudget: 0
//     },
//     train: {
//         name: 'Train Journey',
//         icon: '🚆',
//         color: '#10b981',
//         routeStyle: { color: '#10b981', weight: 5, dashArray: '5, 10', opacity: 0.8 },
//         description: 'Comfortable, scenic, affordable',
//         speedKmh: 60,
//         costPerKm: 6,
//         minBudget: 5000
//     },
//     flight: {
//         name: 'Flight',
//         icon: '✈️',
//         color: '#ef4444',
//         routeStyle: { color: '#ef4444', weight: 3, dashArray: '10, 5', opacity: 0.7 },
//         description: 'Fastest, time-saving',
//         speedKmh: 800,
//         costPerKm: 28,
//         minBudget: 25000
//     },
//     bus: {
//         name: 'Bus / Coach',
//         icon: '🚌',
//         color: '#f59e0b',
//         routeStyle: { color: '#f59e0b', weight: 4, dashArray: '8, 8', opacity: 0.7 },
//         description: 'Economical, good for short trips',
//         speedKmh: 50,
//         costPerKm: 4,
//         minBudget: 0
//     }
// };

// // Recommended transportation based on distance and budget (in INR)
// const getRecommendedTransport = (distanceKm, tripBudget) => {
//     const recommendations = [];
    
//     for (const [mode, data] of Object.entries(transportModes)) {
//         const estimatedCost = distanceKm * data.costPerKm;
//         const timeHours = distanceKm / data.speedKmh;
        
//         recommendations.push({
//             mode,
//             ...data,
//             estimatedCost: Math.round(estimatedCost),
//             timeHours: timeHours.toFixed(1),
//             isAffordable: estimatedCost <= tripBudget,
//             budgetPercentage: (estimatedCost / tripBudget * 100).toFixed(0)
//         });
//     }
    
//     recommendations.sort((a, b) => a.timeHours - b.timeHours);
    
//     const affordable = recommendations.filter(r => r.isAffordable);
//     const bestTime = recommendations[0];
//     const bestBudget = recommendations.reduce((prev, curr) => 
//         (curr.estimatedCost < prev.estimatedCost) ? curr : prev
//     );
    
//     let primary;
//     let reason = '';
    
//     if (tripBudget < 10000) {
//         primary = recommendations.find(r => r.mode === 'bus') || bestBudget;
//         reason = 'Best for low budget travel';
//     } else if (tripBudget < 30000) {
//         if (distanceKm < 500) {
//             primary = recommendations.find(r => r.mode === 'car') || bestBudget;
//             reason = 'Flexible and cost-effective for short distances';
//         } else {
//             primary = recommendations.find(r => r.mode === 'train') || bestBudget;
//             reason = 'Most economical for medium to long distances';
//         }
//     } else if (tripBudget < 100000) {
//         if (distanceKm < 300) {
//             primary = recommendations.find(r => r.mode === 'car') || bestBudget;
//             reason = 'Comfortable and convenient for short trips';
//         } else if (distanceKm < 1000) {
//             primary = recommendations.find(r => r.mode === 'train') || bestBudget;
//             reason = 'Balanced comfort and cost';
//         } else {
//             primary = recommendations.find(r => r.mode === 'flight') || bestBudget;
//             reason = 'Time-saving for long distances';
//         }
//     } else {
//         primary = recommendations.find(r => r.mode === 'flight') || bestTime;
//         reason = 'Fastest and most comfortable option';
//     }
    
//     primary.reason = reason;
//     const alternatives = affordable.filter(a => a.mode !== primary.mode);
    
//     return { primary, alternatives, all: recommendations };
// };

// // Create custom markers
// const createCustomIcon = (color, emoji) => {
//     return L.divIcon({
//         className: 'custom-div-icon',
//         html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 16px;">
//                 ${emoji}
//               </div>`,
//         iconSize: [30, 30],
//         popupAnchor: [0, -15]
//     });
// };

// const startIcon = createCustomIcon('#10b981', '🚗');
// const endIcon = createCustomIcon('#ef4444', '🏁');

// const tileLayers = {
//     standard: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
//     satellite: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
//     terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
//     dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
//     light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
// };

// const MapView = ({ destination, locations = [], height = '500px', startingPoint = null, tripBudget = null }) => {
//     const mapRef = useRef(null);
//     const mapContainerRef = useRef(null);
//     const routingControlRef = useRef(null);
//     const markersRef = useRef([]);
//     const [activeTileLayer, setActiveTileLayer] = useState('standard');
//     const [routeInfo, setRouteInfo] = useState(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [recommendation, setRecommendation] = useState(null);
//     const [selectedMode, setSelectedMode] = useState('car');
//     const [showAlternatives, setShowAlternatives] = useState(false);

//     console.log('MapView received:', { startingPoint, destination, tripBudget });

//     useEffect(() => {
//         if (!mapContainerRef.current || mapRef.current) return;
//         mapRef.current = L.map(mapContainerRef.current).setView([20.5937, 78.9629], 5);
//         L.tileLayer(tileLayers.standard, {
//             attribution: '© OpenStreetMap contributors',
//             maxZoom: 19,
//         }).addTo(mapRef.current);
//         L.control.scale().addTo(mapRef.current);
//         L.control.zoom({ position: 'topright' }).addTo(mapRef.current);
//         return () => {
//             if (mapRef.current) {
//                 mapRef.current.remove();
//                 mapRef.current = null;
//             }
//         };
//     }, []);

//     const changeTileLayer = (layerType) => {
//         if (!mapRef.current) return;
//         mapRef.current.eachLayer((layer) => {
//             if (layer instanceof L.TileLayer) {
//                 mapRef.current.removeLayer(layer);
//             }
//         });
//         L.tileLayer(tileLayers[layerType], {
//             attribution: '© OpenStreetMap',
//             maxZoom: 19,
//         }).addTo(mapRef.current);
//         setActiveTileLayer(layerType);
//     };

//     useEffect(() => {
//         if (!mapRef.current) return;
        
//         setIsLoading(true);
//         setError(null);

//         const geocodeLocation = async (location) => {
//             if (!location || location === 'Not specified' || location === '') return null;
//             try {
//                 const response = await fetch(
//                     `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`
//                 );
//                 const data = await response.json();
//                 if (data && data[0]) {
//                     return {
//                         lat: parseFloat(data[0].lat),
//                         lng: parseFloat(data[0].lon),
//                         name: location
//                     };
//                 }
//                 return null;
//             } catch (error) {
//                 console.error(`Geocoding failed:`, error);
//                 return null;
//             }
//         };

//         const showRoute = async () => {
//             if (routingControlRef.current) {
//                 routingControlRef.current.remove();
//                 routingControlRef.current = null;
//             }
//             markersRef.current.forEach(marker => marker.remove());
//             markersRef.current = [];

//             const [startCoords, endCoords] = await Promise.all([
//                 geocodeLocation(startingPoint),
//                 geocodeLocation(destination)
//             ]);

//             if (startCoords && endCoords) {
//                 const R = 6371;
//                 const dLat = (endCoords.lat - startCoords.lat) * Math.PI / 180;
//                 const dLon = (endCoords.lng - startCoords.lng) * Math.PI / 180;
//                 const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
//                           Math.cos(startCoords.lat * Math.PI / 180) * Math.cos(endCoords.lat * Math.PI / 180) *
//                           Math.sin(dLon/2) * Math.sin(dLon/2);
//                 const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
//                 const distance = R * c;
                
//                 const budget = tripBudget || 25000;
//                 const recommendations = getRecommendedTransport(distance, budget);
//                 setRecommendation(recommendations);
                
//                 const startMarker = L.marker([startCoords.lat, startCoords.lng], { icon: startIcon })
//                     .addTo(mapRef.current)
//                     .bindPopup(`<b>📍 Starting Point</b><br/>${startingPoint}`);
//                 markersRef.current.push(startMarker);
                
//                 const endMarker = L.marker([endCoords.lat, endCoords.lng], { icon: endIcon })
//                     .addTo(mapRef.current)
//                     .bindPopup(`<b>🏁 Destination</b><br/>${destination}`);
//                 markersRef.current.push(endMarker);
                
//                 const bounds = L.latLngBounds(
//                     [startCoords.lat, startCoords.lng],
//                     [endCoords.lat, endCoords.lng]
//                 );
//                 mapRef.current.fitBounds(bounds, { padding: [50, 50] });
                
//                 const mode = transportModes[selectedMode];
//                 const routeStyle = mode.routeStyle;
                
//                 try {
//                     routingControlRef.current = L.Routing.control({
//                         waypoints: [
//                             L.latLng(startCoords.lat, startCoords.lng),
//                             L.latLng(endCoords.lat, endCoords.lng)
//                         ],
//                         routeWhileDragging: false,
//                         showAlternatives: false,
//                         lineOptions: { styles: [routeStyle] },
//                         addWaypoints: false,
//                         draggableWaypoints: false,
//                         fitSelectedRoutes: true,
//                         show: false,
//                     }).addTo(mapRef.current);
                    
//                     routingControlRef.current.on('routesfound', (e) => {
//                         const route = e.routes[0];
//                         if (route) {
//                             const roadDistanceKm = (route.summary.totalDistance / 1000).toFixed(0);
//                             const durationHours = (route.summary.totalTime / 3600).toFixed(1);
//                             const primary = recommendations.primary;
//                             const estimatedCost = Math.round(roadDistanceKm * transportModes[selectedMode].costPerKm);
                            
//                             setRouteInfo({
//                                 distance: roadDistanceKm,
//                                 duration: durationHours,
//                                 mode: selectedMode,
//                                 modeName: mode.name,
//                                 modeIcon: mode.icon,
//                                 estimatedCost: estimatedCost,
//                                 isRecommended: selectedMode === primary.mode,
//                                 budgetPercentage: primary.budgetPercentage,
//                                 availableBudget: budget,
//                                 remainingBudget: budget - estimatedCost,
//                                 reason: primary.reason
//                             });
//                         }
//                         setIsLoading(false);
//                     });
                    
//                     routingControlRef.current.on('routingerror', () => {
//                         setError('Could not find route between locations');
//                         setIsLoading(false);
//                     });
                    
//                 } catch (err) {
//                     console.error('Routing error:', err);
//                     setIsLoading(false);
//                 }
//             } else {
//                 setError('Could not find locations on map');
//                 setIsLoading(false);
//             }
//         };

//         showRoute();
//     }, [destination, startingPoint, tripBudget, selectedMode]);

//     const changeTransportMode = (mode) => {
//         setSelectedMode(mode);
//         setIsLoading(true);
//     };

//     return (
//         <div className="space-y-4">
//             {/* Map Controls */}
//             <div className="flex gap-2 flex-wrap">
//                 {Object.keys(tileLayers).map((layer) => (
//                     <button
//                         key={layer}
//                         onClick={() => changeTileLayer(layer)}
//                         className={`px-3 py-1.5 rounded-lg text-sm font-medium transition capitalize ${
//                             activeTileLayer === layer
//                                 ? 'bg-blue-600 text-white shadow-md'
//                                 : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
//                         }`}
//                     >
//                         {layer === 'standard' && '🗺️ Standard'}
//                         {layer === 'satellite' && '🛰️ Satellite'}
//                         {layer === 'terrain' && '⛰️ Terrain'}
//                         {layer === 'dark' && '🌙 Dark'}
//                         {layer === 'light' && '☀️ Light'}
//                     </button>
//                 ))}
//             </div>
            
//             {/* Transport Options */}
//             {recommendation && (
//                 <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//                     <div className="bg-gray-50 px-4 py-2 border-b">
//                         <h4 className="font-semibold text-gray-700">🚗 Travel Options</h4>
//                     </div>
//                     <div className="p-3">
//                         <div 
//                             className={`p-3 rounded-lg mb-2 cursor-pointer transition ${
//                                 selectedMode === recommendation.primary.mode 
//                                     ? 'bg-blue-50 border-2 border-blue-500' 
//                                     : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
//                             }`}
//                             onClick={() => changeTransportMode(recommendation.primary.mode)}
//                         >
//                             <div className="flex justify-between items-center">
//                                 <div className="flex items-center gap-3">
//                                     <span className="text-2xl">{transportModes[recommendation.primary.mode].icon}</span>
//                                     <div>
//                                         <div className="font-semibold">
//                                             {transportModes[recommendation.primary.mode].name}
//                                             {selectedMode === recommendation.primary.mode && (
//                                                 <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded">Selected</span>
//                                             )}
//                                         </div>
//                                         <div className="text-xs text-gray-500">{transportModes[recommendation.primary.mode].description}</div>
//                                     </div>
//                                 </div>
//                                 <div className="text-right">
//                                     <div className="font-bold text-green-600">{formatINR(recommendation.primary.estimatedCost)}</div>
//                                     <div className="text-xs text-gray-500">{recommendation.primary.timeHours} hrs</div>
//                                     {recommendation.primary.isAffordable ? (
//                                         <div className="text-xs text-green-600">✓ Within budget</div>
//                                     ) : (
//                                         <div className="text-xs text-red-500">⚠️ Over budget</div>
//                                     )}
//                                 </div>
//                             </div>
//                             <div className="mt-2 text-xs text-blue-600 border-t pt-2">
//                                 💡 {recommendation.primary.reason}
//                             </div>
//                         </div>
                        
//                         <button 
//                             onClick={() => setShowAlternatives(!showAlternatives)}
//                             className="text-xs text-blue-600 hover:text-blue-700 font-medium w-full text-center py-1"
//                         >
//                             {showAlternatives ? '▼ Hide alternatives' : '▶ Show other options'}
//                         </button>
                        
//                         {showAlternatives && recommendation.alternatives.map(alt => (
//                             <div key={alt.mode} 
//                                 className={`p-3 rounded-lg mb-2 cursor-pointer transition ${
//                                     selectedMode === alt.mode 
//                                         ? 'bg-blue-50 border-2 border-blue-500' 
//                                         : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
//                                 }`}
//                                 onClick={() => changeTransportMode(alt.mode)}>
//                                 <div className="flex justify-between items-center">
//                                     <div className="flex items-center gap-3">
//                                         <span className="text-2xl">{alt.icon}</span>
//                                         <div>
//                                             <div className="font-semibold">
//                                                 {alt.name}
//                                                 {selectedMode === alt.mode && (
//                                                     <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded">Selected</span>
//                                                 )}
//                                             </div>
//                                             <div className="text-xs text-gray-500">{alt.description}</div>
//                                         </div>
//                                     </div>
//                                     <div className="text-right">
//                                         <div className="font-semibold text-gray-700">{formatINR(alt.estimatedCost)}</div>
//                                         <div className="text-xs text-gray-500">{alt.timeHours} hrs</div>
//                                     </div>
//                                 </div>
//                             </div>
//                         ))}
//                     </div>
//                 </div>
//             )}
            
//             {/* Map Container */}
//             <div className="relative">
//                 {isLoading && (
//                     <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10 rounded-xl">
//                         <div className="bg-white p-4 rounded-lg shadow-lg flex items-center gap-2">
//                             <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
//                             <span>Finding best route...</span>
//                         </div>
//                     </div>
//                 )}
//                 {error && (
//                     <div className="absolute top-2 left-2 right-2 z-10 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
//                         {error}
//                     </div>
//                 )}
//                 <div 
//                     ref={mapContainerRef} 
//                     className="w-full rounded-xl overflow-hidden border shadow-lg"
//                     style={{ height }}
//                 />
//             </div>
            
//             {/* Route Info */}
//             {routeInfo && (
//                 <div className={`rounded-xl p-4 text-white ${
//                     routeInfo.isRecommended 
//                         ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
//                         : 'bg-gradient-to-r from-blue-500 to-purple-600'
//                 }`}>
//                     <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
//                         <div>
//                             <div className="text-xs opacity-80">Mode</div>
//                             <div className="font-semibold text-lg">{routeInfo.modeIcon} {routeInfo.modeName}</div>
//                         </div>
//                         <div>
//                             <div className="text-xs opacity-80">Distance</div>
//                             <div className="font-semibold text-lg">{routeInfo.distance} km</div>
//                         </div>
//                         <div>
//                             <div className="text-xs opacity-80">Duration</div>
//                             <div className="font-semibold text-lg">{routeInfo.duration} hrs</div>
//                         </div>
//                         <div>
//                             <div className="text-xs opacity-80">Est. Cost</div>
//                             <div className="font-semibold text-lg">{formatINR(routeInfo.estimatedCost)}</div>
//                         </div>
//                     </div>
//                     <div className="mt-3 pt-2 border-t border-white/30 flex flex-wrap justify-between items-center text-xs">
//                         <span>💰 Budget: {formatINR(routeInfo.availableBudget)}</span>
//                         <span>💵 Remaining: {formatINR(routeInfo.remainingBudget)}</span>
//                         <span>{routeInfo.budgetPercentage}% of budget</span>
//                     </div>
//                     {routeInfo.reason && (
//                         <div className="mt-2 text-xs text-center bg-black/20 rounded-lg p-2">
//                             💡 {routeInfo.reason}
//                         </div>
//                     )}
//                 </div>
//             )}
            
//             {/* Legend */}
//             <div className="bg-white rounded-lg p-2 text-xs flex flex-wrap gap-3 justify-center border">
//                 <div className="flex items-center gap-1">
//                     <div className="w-3 h-3 bg-green-500 rounded-full"></div>
//                     <span>Starting Point</span>
//                 </div>
//                 <div className="flex items-center gap-1">
//                     <div className="w-3 h-3 bg-red-500 rounded-full"></div>
//                     <span>Destination</span>
//                 </div>
//                 <div className="flex items-center gap-1">
//                     <div className="w-6 h-0.5 bg-blue-500"></div>
//                     <span>Car Route</span>
//                 </div>
//                 <div className="flex items-center gap-1">
//                     <div className="w-6 h-0.5 bg-green-500 border-t-2 border-dashed"></div>
//                     <span>Train Route</span>
//                 </div>
//                 <div className="flex items-center gap-1">
//                     <div className="w-6 h-0.5 bg-red-500 border-t-2 border-dotted"></div>
//                     <span>Flight Path</span>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default MapView;