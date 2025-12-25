
import { Coordinates, RouteStop, User } from '../types';
import React, { useEffect, useRef } from 'react';

interface MapMockProps {
  className?: string;
  showRoute?: boolean;
  routeStops?: RouteStop[]; 
  currentLocation?: Coordinates | null;
  multiDrivers?: User[]; // Adicionado para exibir múltiplos entregadores
  autoCenter?: boolean;
}

// Access Leaflet from global scope (added via CDN in index.html)
declare global {
  interface Window {
    L: any;
  }
}

export const MapMock: React.FC<MapMockProps> = ({ 
  className, 
  routeStops = [], 
  currentLocation,
  multiDrivers = [],
  autoCenter = true
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const multiMarkersRef = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    if (!mapRef.current || !window.L) return;

    const L = window.L;

    // 1. Initialize Map
    if (!mapInstance.current) {
      const defaultPos = currentLocation ? [currentLocation.lat, currentLocation.lng] : [-23.5505, -46.6333];
      mapInstance.current = L.map(mapRef.current).setView(defaultPos, 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstance.current);
    }

    // Helper to create icons
    const createIcon = (color: string, label: string | React.ReactNode, isDriver = false) => {
      return L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div style="
            background-color: ${color}; 
            width: ${isDriver ? '32px' : '24px'}; 
            height: ${isDriver ? '32px' : '24px'}; 
            border-radius: 50%; 
            border: 3px solid white; 
            box-shadow: 0 4px 10px rgba(0,0,0,0.4); 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            color: white; 
            font-weight: bold; 
            font-size: ${isDriver ? '14px' : '10px'};
            transform: ${isDriver ? 'scale(1.2)' : 'none'};
            z-index: ${isDriver ? '1000' : '500'};
          ">
            ${label}
          </div>`,
        iconSize: isDriver ? [32, 32] : [24, 24],
        iconAnchor: isDriver ? [16, 16] : [12, 12]
      });
    };

    // 2. Manage Single Driver Marker
    if (currentLocation) {
      if (!driverMarkerRef.current) {
        driverMarkerRef.current = L.marker([currentLocation.lat, currentLocation.lng], {
          icon: createIcon('#2563EB', '🏍️', true),
          zIndexOffset: 1000
        }).addTo(mapInstance.current);
      } else {
        driverMarkerRef.current.setLatLng([currentLocation.lat, currentLocation.lng]);
      }
      
      if (autoCenter && routeStops.length === 0 && multiDrivers.length === 0) {
        mapInstance.current.panTo([currentLocation.lat, currentLocation.lng]);
      }
    } else if (driverMarkerRef.current) {
      driverMarkerRef.current.remove();
      driverMarkerRef.current = null;
    }

    // 3. Manage Multi Driver Markers
    const currentIds = new Set(multiDrivers.filter(d => d.location).map(d => d.id));
    
    // Remove old ones
    multiMarkersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        multiMarkersRef.current.delete(id);
      }
    });

    // Add or update
    multiDrivers.forEach(driver => {
      if (driver.location) {
        const marker = multiMarkersRef.current.get(driver.id);
        if (marker) {
          marker.setLatLng([driver.location.lat, driver.location.lng]);
        } else {
          const newMarker = L.marker([driver.location.lat, driver.location.lng], {
            icon: createIcon('#AC92EC', '🛵', true),
            zIndexOffset: 900
          })
          .addTo(mapInstance.current)
          .bindPopup(`<b>${driver.name}</b><br/>Status: ${driver.isOnline ? 'Disponível' : 'Em Rota'}`);
          multiMarkersRef.current.set(driver.id, newMarker);
        }
      }
    });

    // 4. Update Static Markers (Stops)
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    
    const latLngs: any[] = [];
    const bounds = L.latLngBounds([]);

    if (currentLocation) {
      latLngs.push([currentLocation.lat, currentLocation.lng]);
      bounds.extend([currentLocation.lat, currentLocation.lng]);
    }

    routeStops.forEach((stop, index) => {
      if (stop.coordinates) {
        const { lat, lng } = stop.coordinates;
        latLngs.push([lat, lng]);
        
        const isPickup = stop.type === 'PICKUP';
        const color = isPickup ? '#F59E0B' : '#16A34A'; // Amber : Green
        const icon = createIcon(color, isPickup ? '📦' : '🏠');

        const marker = L.marker([lat, lng], { icon })
          .addTo(mapInstance.current)
          .bindPopup(`<b>${isPickup ? 'Coleta' : 'Entrega'}</b><br/>${stop.address}`);
        
        markersRef.current.push(marker);
        bounds.extend([lat, lng]);
      }
    });

    // 5. Update Polyline
    if (polylineRef.current) polylineRef.current.remove();
    if (latLngs.length > 1) {
      polylineRef.current = L.polyline(latLngs, { 
        color: '#2563EB', 
        weight: 5, 
        opacity: 0.6, 
        dashArray: '10, 10' 
      }).addTo(mapInstance.current);
      
      if (autoCenter) {
        mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
      }
    } else if (autoCenter && multiDrivers.length > 0) {
      // Fit bounds for all couriers if no specific route is shown
      const couriersBounds = L.latLngBounds([]);
      let hasPoints = false;
      multiMarkersRef.current.forEach(m => {
        couriersBounds.extend(m.getLatLng());
        hasPoints = true;
      });
      if (hasPoints) {
        mapInstance.current.fitBounds(couriersBounds, { padding: [100, 100], maxZoom: 15 });
      }
    }

    // Handle initial sizing
    setTimeout(() => {
        mapInstance.current.invalidateSize();
    }, 100);

  }, [routeStops, currentLocation, multiDrivers, autoCenter]);

  return <div ref={mapRef} className={`z-0 ${className}`} style={{ minHeight: '100%' }} />;
};
