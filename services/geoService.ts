
import { Coordinates } from '../types';

// Default fallback (São Paulo)
const DEFAULT_COORDS: Coordinates = { lat: -23.5505, lng: -46.6333 };

export const GeoService = {
  /**
   * Get current user position from Browser API
   */
  getCurrentPosition: (): Promise<Coordinates> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(DEFAULT_COORDS);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Geolocation blocked or failed, using default.', error);
          resolve(DEFAULT_COORDS);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  },

  /**
   * Watch current user position
   */
  watchLocation: (onUpdate: (coords: Coordinates) => void, onError?: (err: any) => void) => {
    if (!navigator.geolocation) return null;

    return navigator.geolocation.watchPosition(
      (position) => {
        onUpdate({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        console.error('WatchPosition error:', error);
        if (onError) onError(error);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 10000, 
        maximumAge: 0 
      }
    );
  },

  /**
   * Convert address string to Coordinates using OpenStreetMap Nominatim API (Free)
   */
  geocodeAddress: async (address: string): Promise<Coordinates> => {
    try {
      const query = encodeURIComponent(`${address}, Brasil`);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
      const data = await response.json();

      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
      throw new Error('Address not found');
    } catch (error) {
      console.error('Geocoding failed for:', address);
      return {
        lat: DEFAULT_COORDS.lat + (Math.random() - 0.5) * 0.05,
        lng: DEFAULT_COORDS.lng + (Math.random() - 0.5) * 0.05
      };
    }
  },

  /**
   * Calculate rough distance for estimates (Mock/Fallback utility)
   */
  calculateDistance: (coord1: Coordinates, coord2: Coordinates) => {
    const R = 6371; // km
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
  }
};
