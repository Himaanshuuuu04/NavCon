'use client';

import { useState, useEffect, useRef } from 'react';

interface MapPluginsProps {
  map: any;
  onNearbyResults?: (results: any) => void;
}

export default function MapPlugins({ map, onNearbyResults }: MapPluginsProps) {
  const [showNearby, setShowNearby] = useState(false);
  const [nearbyKeyword, setNearbyKeyword] = useState('');
  const nearbyPluginRef = useRef<any>(null);
  const nearbyMarkersRef = useRef<any[]>([]);

  // Initialize Nearby Search Plugin
  const initNearbySearch = () => {
    if (!map || !window.mappls || !window.mappls.nearby) {
      alert('Mappls plugins not loaded yet. Please wait.');
      return;
    }

    // Clear previous markers
    clearNearbyMarkers();

    try {
      // Get map center for reference location
      const center = map.getCenter();
      const refLocation = [center.lat, center.lng];

      const nearbyOptions = {
        map: map,
        keywords: nearbyKeyword || 'restaurant',
        refLocation: refLocation,
        fitbounds: true,
        geolocation: false,
        radius: 5000, // 5km radius
        popup: false, // Disable default popup
        icon: {
          url: 'https://apis.mappls.com/map_v3/1.png',
          width: 30,
          height: 40
        }
      };

      nearbyPluginRef.current = window.mappls.nearby(nearbyOptions, (results: any) => {
        console.log('Nearby results:', results);
        
        // Add click handlers to each result marker
        if (results && Array.isArray(results)) {
          results.forEach((place: any) => {
            // Create markers manually with click handlers
            if (place.eLoc && window.mappls && window.mappls.Marker) {
              const marker = new window.mappls.Marker({
                position: [place.latitude || place.lat, place.longitude || place.lng],
                map: map,
                title: place.placeName,
                icon: {
                  url: 'https://apis.mappls.com/map_v3/1.png',
                  width: 30,
                  height: 40
                }
              });
              
              // Add click listener to show details
              marker.addListener('click', () => {
                console.log('Marker clicked for:', place);
                showPlaceDetails(place.eLoc);
              });
              
              nearbyMarkersRef.current.push(marker);
            }
          });
        }
        
        if (onNearbyResults) {
          onNearbyResults(results);
        }
      });
    } catch (error) {
      console.error('Error initializing Nearby plugin:', error);
      alert('Failed to initialize Nearby search');
    }
  };

  // Clear nearby markers
  const clearNearbyMarkers = () => {
    nearbyMarkersRef.current.forEach(marker => {
      try {
        if (marker && typeof marker.remove === 'function') {
          marker.remove();
        }
      } catch (e) {
        console.warn('Error removing marker:', e);
      }
    });
    nearbyMarkersRef.current = [];
  };

  // Show place details using getPinDetails with infoDiv
  const showPlaceDetails = (eLoc: string) => {
    if (!map || !window.mappls || !window.mappls.getPinDetails) {
      console.warn('getPinDetails plugin not available');
      return;
    }

    try {
      if (!eLoc) {
        console.warn('No eLoc provided');
        return;
      }

      console.log('Showing details for eLoc:', eLoc);

      // Use getPinDetails to show info div
      const detailsObj = window.mappls.getPinDetails({
        map: map,
        pin: eLoc,
        infoDiv: true // Show detailed info panel
      }, (detailsData: any) => {
        console.log('Place details loaded:', detailsData);
        // Fit bounds to show the place
        if (detailsObj && typeof detailsObj.fitbounds === 'function') {
          detailsObj.fitbounds({ maxZoom: 16 });
        }
      });
    } catch (error) {
      console.error('Error showing place details:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearNearbyMarkers();
      if (nearbyPluginRef.current && typeof nearbyPluginRef.current.remove === 'function') {
        try {
          nearbyPluginRef.current.remove();
        } catch (e) {
          console.warn('Error removing nearby plugin:', e);
        }
      }
    };
  }, []);

  return (
    <div className="absolute top-4 right-4 z-10 space-y-2">
      {/* Nearby Search Control */}
      <div className="bg-white shadow-lg rounded-lg p-3">
        <button
          onClick={() => setShowNearby(!showNearby)}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          🔍 Nearby Search
        </button>
        
        {showNearby && (
          <div className="mt-3 space-y-2">
            <input
              type="text"
              placeholder="e.g., ATM, Restaurant, Hospital"
              value={nearbyKeyword}
              onChange={(e) => setNearbyKeyword(e.target.value)}
              className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={initNearbySearch}
              disabled={!nearbyKeyword}
              className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
            >
              Search Nearby
            </button>
            <div className="text-xs text-gray-500 mt-1">
              Searches within 5km radius of map center. Click markers for details.
            </div>
          </div>
        )}
      </div>


      {/* Quick Nearby Categories */}
      <div className="bg-white shadow-lg rounded-lg p-3">
        <div className="text-xs font-bold text-gray-700 mb-2">Quick Search</div>
        <div className="grid grid-cols-2 gap-2">
          {['ATM', 'Restaurant', 'Hospital', 'Petrol Pump'].map((category) => (
            <button
              key={category}
              onClick={() => {
                setNearbyKeyword(category);
                setShowNearby(true);
                clearNearbyMarkers();
                setTimeout(() => {
                  if (map && window.mappls && window.mappls.nearby) {
                    const center = map.getCenter();
                    nearbyPluginRef.current = window.mappls.nearby({
                      map: map,
                      keywords: category,
                      refLocation: [center.lat, center.lng],
                      fitbounds: true,
                      radius: 3000,
                      popup: false
                    }, (results: any) => {
                      console.log(category + ' results:', results);
                      
                      // Add click handlers to each result marker
                      if (results && Array.isArray(results)) {
                        results.forEach((place: any) => {
                          if (place.eLoc && window.mappls && window.mappls.Marker) {
                            const marker = new window.mappls.Marker({
                              position: [place.latitude || place.lat, place.longitude || place.lng],
                              map: map,
                              title: place.placeName,
                              icon: {
                                url: 'https://apis.mappls.com/map_v3/1.png',
                                width: 30,
                                height: 40
                              }
                            });
                            
                            marker.addListener('click', () => {
                              console.log('Quick search marker clicked:', place);
                              showPlaceDetails(place.eLoc);
                            });
                            
                            nearbyMarkersRef.current.push(marker);
                          }
                        });
                      }
                      
                      if (onNearbyResults) onNearbyResults(results);
                    });
                  }
                }, 100);
              }}
              className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-medium transition-colors"
            >
              {category}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
