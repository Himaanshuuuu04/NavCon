'use client';

import { useEffect, useRef, useState } from 'react';
import { getAccessToken } from '@/lib/api';

declare global {
  interface Window {
    mappls: any;
    initMap1?: () => void;
  }
}

interface MapProps {
  onMapLoad?: (map: any) => void;
  className?: string;
  showTraffic?: boolean;
}

export default function MapplsMap({ onMapLoad, className}: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // Use a fixed ID to prevent hydration mismatches (server ID != client ID). 
  // If you need multiple maps, pass a unique id prop to this component.
  const mapId = 'mappls-map-id'; 
  const [tokens, setTokens] = useState<{ access_token: string; rest_api_key: string } | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [pluginsLoaded, setPluginsLoaded] = useState(false);
  const mapInstance = useRef<any>(null);

  // 1. Fetch Tokens
  useEffect(() => {
    getAccessToken().then(setTokens).catch(console.error);
  }, []);

  // 2. Load Map SDK Script
  useEffect(() => {
    if (!tokens || scriptLoaded) return;

    // Load CSS for v3.0 (matching SDK version)
    const link = document.createElement('link');
    link.href = "https://apis.mappls.com/vector_map/assets/v3.0/mappls.css";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    // Setup callback function for map initialization
    window.initMap1 = () => {
      setScriptLoaded(true);
    };

    const script = document.createElement('script');
    // Load Mappls Web JS SDK v3.0 with callback using OAuth token
    script.src = `https://apis.mappls.com/advancedmaps/api/${tokens.access_token}/map_sdk?layer=vector&v=3.0&callback=initMap1`;
    script.async = true;
    script.onerror = () => {
        console.error("Failed to load Mappls SDK. Check token or network.");
    };
    document.body.appendChild(script);

    return () => {
        // Optional cleanup
        delete window.initMap1;
    };
  }, [tokens, scriptLoaded]);

  // 3. Load Plugins Script after main SDK loads
  useEffect(() => {
    if (!scriptLoaded || pluginsLoaded || !tokens) return;

    const pluginScript = document.createElement('script');
    // Load plugins using static REST API key (not OAuth token)
    pluginScript.src = `https://sdk.mappls.com/map/sdk/plugins?access_token=${tokens.rest_api_key}&v=3.0`;
    pluginScript.async = true;
    pluginScript.onload = () => {
      console.log("Mappls plugins loaded successfully");
      setPluginsLoaded(true);
    };
    pluginScript.onerror = () => {
      console.error("Failed to load Mappls plugins. Check REST API key.");
    };
    document.body.appendChild(pluginScript);
  }, [scriptLoaded, pluginsLoaded, tokens]);

  // 4. Initialize Map
  useEffect(() => {
    if (pluginsLoaded && mapContainerRef.current && !mapInstance.current) {
        if (window.mappls && window.mappls.Map) {
            // Check if element with ID exists in DOM to avoid "container not found" error
            if (document.getElementById(mapId)) {
                try {
                    mapInstance.current = new window.mappls.Map(mapId, {
                        center: [28.61, 77.23], // Default: New Delhi
                        zoom: 12,
                        zoomControl: true,
                        location: true // Enable geolocation control
                    });

                    // Mappls SDK uses .addListener() for events
                    if (mapInstance.current) {
                        const map = mapInstance.current;
                        map.addListener('load', () => {
                            console.log("Map loaded successfully");
                            
                            // Initialize direction plugin
                            const directionOptions = {
                                map: map,
                                divWidth: '350px',
                                tripCost: true,
                                Resource: 'route_eta',
                                annotations: "nodes,congestion",
                                Profile: ['driving', 'biking', 'trucking', 'walking'],
                                routeSummary: {
                                    summarycallback: (data: any) => {
                                        console.log('Route summary callback - route updated');
                                        // The plugin instance is available globally, update it
                                        const directionInstance = (window as any).directionPluginInstance;
                                        if (directionInstance) {
                                            (window as any).directionPluginData = directionInstance;
                                            console.log('Updated directionPluginData with new route');
                                        }
                                    }
                                }
                            };
                            
                            const directionPlugin = window.mappls.direction(directionOptions, (data: any) => {
                                console.log('Direction plugin callback:', data);
                                // Store both the data and the instance
                                (window as any).directionPluginData = data;
                                (window as any).directionPluginInstance = data;
                            });
                            
                            // Store the instance immediately
                            (window as any).directionPluginInstance = directionPlugin;
                            
                            if (onMapLoad) onMapLoad(map);
                        });
                    }
                } catch (e) {
                    console.error("Error initializing map:", e);
                }
            } else {
                console.error("Map container element not found with id:", mapId);
            }
        }
    }
  }, [pluginsLoaded, onMapLoad]);

  return (
    <div 
      id={mapId}
      ref={mapContainerRef} 
      className={`w-full h-full min-h-[500px] ${className}`}
      style={{ width: '100%', height: '100%' }}
    >
      {!pluginsLoaded && (
        <div className="flex items-center justify-center h-full bg-gray-100">
          <div className="text-center">
            <div className="text-lg font-semibold mb-2">Loading Mappls Map...</div>
            <div className="text-sm text-gray-600">
              {!tokens ? 'Fetching access tokens...' : 
               !scriptLoaded ? 'Loading map SDK...' : 
               'Loading plugins...'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
