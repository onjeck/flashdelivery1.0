
import { Coordinates, Order, OrderStatus, RouteStop, TrafficLevel } from '../types';

// Haversine formula for distance in km
const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(coord2.lat - coord1.lat);
  const dLon = deg2rad(coord2.lng - coord1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(coord1.lat)) * Math.cos(deg2rad(coord2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

const deg2rad = (deg: number) => {
  return deg * (Math.PI / 180);
};

// Estimate time: Assume average speed of 30km/h in city
const calculateTime = (distanceKm: number, traffic: TrafficLevel): number => {
  const baseSpeed = 30; // km/h
  let multiplier = 1.0;
  
  switch(traffic) {
    case TrafficLevel.MODERATE: multiplier = 1.3; break;
    case TrafficLevel.HEAVY: multiplier = 1.8; break;
    default: multiplier = 1.0;
  }

  return Math.ceil((distanceKm / baseSpeed) * 60 * multiplier) + 2; 
};

export const RouteService = {
  /**
   * Optimizes the route for multiple orders based on current location using a Nearest Neighbor approach
   * respecting precedence constraints (Pickup before Dropoff).
   */
  optimizeRoute: (
    currentLocation: Coordinates,
    orders: Order[],
    traffic: TrafficLevel = TrafficLevel.LOW
  ): RouteStop[] => {
    
    // 1. Identify all pending tasks (Pickups and Dropoffs)
    let pendingStops: RouteStop[] = [];
    const collectedOrderIds = new Set<string>();

    orders.forEach(order => {
      // Valid coordinates are essential
      const pickupCoords = order.pickupCoordinates || currentLocation;
      const dropoffCoords = order.dropoffCoordinates || currentLocation;

      // Add Pickups if not collected yet
      if ([OrderStatus.ACCEPTED, OrderStatus.ON_WAY].includes(order.status)) {
          pendingStops.push({
            id: `p-${order.id}`,
            type: 'PICKUP',
            orderId: order.id,
            address: order.pickupAddress,
            coordinates: pickupCoords,
            completed: false
          });
      }
      
      // Add Dropoffs if not delivered yet
      if ([OrderStatus.ACCEPTED, OrderStatus.ON_WAY, OrderStatus.COLLECTED].includes(order.status)) {
           pendingStops.push({
             id: `d-${order.id}`,
             type: 'DROPOFF',
             orderId: order.id,
             address: order.dropoffAddress,
             coordinates: dropoffCoords,
             completed: false
           });
      }

      if (order.status === OrderStatus.COLLECTED) {
        collectedOrderIds.add(order.id);
      }
    });

    // 2. Build the optimized route
    const optimizedRoute: RouteStop[] = [];
    let currentLocationCursor = currentLocation;

    while (pendingStops.length > 0) {
      // Filter stops that are valid to visit next
      const validNextStops = pendingStops.filter(stop => {
        if (stop.type === 'PICKUP') return true;
        if (stop.type === 'DROPOFF') return collectedOrderIds.has(stop.orderId);
        return false;
      });

      if (validNextStops.length === 0) break;

      // Find nearest neighbor
      let nearestStop: RouteStop | null = null;
      let minDist = Infinity;

      validNextStops.forEach(stop => {
        const d = calculateDistance(currentLocationCursor, stop.coordinates);
        if (d < minDist) {
          minDist = d;
          nearestStop = stop;
        }
      });

      if (nearestStop) {
        const selected = nearestStop as RouteStop;
        selected.distanceToNext = parseFloat(minDist.toFixed(1));
        selected.timeToNext = calculateTime(minDist, traffic);

        optimizedRoute.push(selected);
        
        // Update state simulation
        currentLocationCursor = selected.coordinates;
        if (selected.type === 'PICKUP') {
          collectedOrderIds.add(selected.orderId);
        }
        
        // Remove from pending
        pendingStops = pendingStops.filter(s => s.id !== selected.id);
      } else {
        break;
      }
    }

    return optimizedRoute;
  },

  calculateTotalTime: (route: RouteStop[]): number => {
    return route.reduce((acc, stop) => acc + (stop.timeToNext || 0), 0);
  }
};
