'use client';

import { useState, useRef, useEffect } from 'react';

interface NavigationControlProps {
  map: any;
}

export default function NavigationControl({ map }: NavigationControlProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const trackingPluginRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const startGPSTracking = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setCurrentLocation(newLocation);
        
        const now = Date.now();
        const timeSinceLastUpdate = now - lastUpdateRef.current;
        
        if (timeSinceLastUpdate >= 15000 && trackingPluginRef.current) {
          console.log('Updating tracking position:', newLocation);
          
          trackingPluginRef.current.trackingCall({
            location: [newLocation.lng, newLocation.lat],
            reRoute: true,
            heading: true,
            mapCenter: true,
            buffer: 50,
            delay: 3000,
            etaRefresh: true,
            fitBounds: true,
            callback: (data: any) => {
              console.log('Tracking update:', data);
            }
          });
          
          lastUpdateRef.current = now;
        }
      },
      (error) => {
        console.error('GPS Error:', error);
        alert(`GPS Error: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000
      }
    );
  };

  const stopGPSTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const handleStartTracking = () => {
    console.log('=== Starting Navigation ===');
    
    if (!map || !window.mappls || !window.mappls.tracking) {
      alert('Map or tracking plugin not ready');
      return;
    }

    // Make sure we stop any previous tracking first
    if (trackingPluginRef.current) {
      console.log('Previous tracking detected, stopping it first...');
      handleStopTracking();
      // Wait for cleanup then start fresh
      setTimeout(() => {
        startFreshTracking();
      }, 500);
    } else {
      startFreshTracking();
    }
  };

  const startFreshTracking = () => {
    // Get the LATEST direction plugin data
    const directionData = (window as any).directionPluginData;
    console.log('Latest direction data:', directionData);
    
    if (!directionData || !directionData.Request || directionData.Request.length < 2) {
      alert('Please calculate a route in the direction panel first');
      return;
    }

    // Extract from Request array
    const startObj = directionData.Request[0];
    const endObj = directionData.Request[1];
    
    const startGeoposition = startObj.geoposition;
    const endGeoposition = endObj.geoposition;
    
    console.log('Using route:', { start: startGeoposition, end: endGeoposition });

    // Get current location for display and tracking updates
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setCurrentLocation(currentPos);
        
        // Create fresh tracking instance with latest route data
        const trackingOptions = {
          map: map,
          start: { geoposition: startGeoposition },
          end: { geoposition: endGeoposition },
          fitBounds: true,
          ccpIconWidth: 70,
          strokeWidth: 7,
          routeColor: '#3b82f6',
          connector: true,
          cPopup: '<div class="p-2"><strong>Your Location</strong></div>'
        };

        console.log('Creating new tracking instance with:', trackingOptions);
        trackingPluginRef.current = window.mappls.tracking(trackingOptions, (data: any) => {
          console.log('Tracking initialized with fresh route:', data);
          lastUpdateRef.current = Date.now();
        });
        
        setIsTracking(true);
        startGPSTracking();
        console.log('=== Navigation Started Successfully ===');
      },
      (error) => {
        alert(`Failed to get location: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleStopTracking = () => {
    console.log('Stopping tracking...');
    setIsTracking(false);
    stopGPSTracking();
    
    if (trackingPluginRef.current) {
      try {
        // Remove tracking plugin and all its layers
        if (typeof trackingPluginRef.current.remove === 'function') {
          trackingPluginRef.current.remove();
          console.log('Tracking plugin removed');
        }
      } catch (e) {
        console.warn('Error removing tracking:', e);
      }
      trackingPluginRef.current = null;
    }
    
    // Force remove all tracking-related layers from the map
    if (map) {
      try {
        // Remove tracking route layer
        if (map.getLayer('tracking-route-layer')) {
          map.removeLayer('tracking-route-layer');
        }
        if (map.getSource('tracking-route-source')) {
          map.removeSource('tracking-route-source');
        }
        // Remove tracking marker layers
        const layers = map.getStyle().layers;
        if (layers) {
          layers.forEach((layer: any) => {
            if (layer.id && layer.id.includes('tracking')) {
              try {
                map.removeLayer(layer.id);
              } catch (e) {}
            }
          });
        }
        console.log('Cleaned up tracking layers from map');
      } catch (e) {
        console.warn('Error cleaning map layers:', e);
      }
    }
    
    setCurrentLocation(null);
    console.log('Tracking stopped and cleaned up');
  };

  useEffect(() => {
    return () => {
      stopGPSTracking();
      if (trackingPluginRef.current) {
        try {
          if (typeof trackingPluginRef.current.remove === 'function') {
            trackingPluginRef.current.remove();
          }
        } catch (e) {}
      }
    };
  }, []);

  return (
    <div className="absolute bottom-20 right-4 z-30">
      {!isTracking ? (
        <button
          onClick={handleStartTracking}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-colors flex items-center gap-2"
        >
          <span className="text-xl">▶️</span>
          <span>Start Navigation</span>
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          {currentLocation && (
            <div className="bg-white rounded-lg shadow-lg p-3 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-semibold">Tracking</span>
              </div>
              <div className="text-xs text-gray-600">
                {currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}
              </div>
            </div>
          )}
          <button
            onClick={handleStopTracking}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-colors flex items-center gap-2"
          >
            <span className="text-xl">⏹️</span>
            <span>Stop Navigation</span>
          </button>
        </div>
      )}
    </div>
  );
}