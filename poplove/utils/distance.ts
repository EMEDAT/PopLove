// utils/distance.ts

/**
 * Calculates the distance between two coordinates using the Haversine formula
 * @param lat1 Latitude of first location
 * @param lon1 Longitude of first location
 * @param lat2 Latitude of second location
 * @param lon2 Longitude of second location
 * @returns Distance in kilometers
 */
export const calculateDistance = (
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number => {
    // Radius of the Earth in kilometers
    const R = 6371;
    
    // Convert degrees to radians
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    
    // Haversine formula
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  };
  
  /**
   * Converts degrees to radians
   */
  const deg2rad = (deg: number): number => {
    return deg * (Math.PI/180);
  };
  
  /**
   * Calculates distance from user location to a profile
   * If either location is missing, returns a simulated distance
   */
  export const getDistanceToProfile = (
    userLat: number | null | undefined,
    userLng: number | null | undefined,
    profileLat: number | null | undefined,
    profileLng: number | null | undefined
  ): number => {
    // If we have both coordinates, calculate actual distance
    if (
      userLat && userLng && profileLat && profileLng &&
      !isNaN(userLat) && !isNaN(userLng) && !isNaN(profileLat) && !isNaN(profileLng)
    ) {
      return calculateDistance(userLat, userLng, profileLat, profileLng);
    }
    
    // Otherwise return a simulated distance between 1-30km
    return Math.floor(Math.random() * 30) + 1;
  };
  
  /**
   * Filter profiles by maximum distance
   * @param profiles Array of profiles to filter
   * @param userLat User's latitude
   * @param userLng User's longitude
   * @param maxDistance Maximum distance in kilometers
   * @returns Filtered profiles with distance property added
   */
  export const filterProfilesByDistance = (
    profiles: any[],
    userLat: number | null | undefined,
    userLng: number | null | undefined,
    maxDistance: number = 100
  ): any[] => {
    // If no user location, return all profiles with simulated distances
    if (!userLat || !userLng) {
      return profiles.map(profile => ({
        ...profile,
        distance: Math.floor(Math.random() * 30) + 1
      }));
    }
    
    // Calculate distance for each profile
    return profiles
      .map(profile => {
        const distance = getDistanceToProfile(
          userLat, 
          userLng,
          profile.latitude, 
          profile.longitude
        );
        
        return {
          ...profile,
          distance
        };
      })
      .filter(profile => profile.distance <= maxDistance);
  };
  
  export default {
    calculateDistance,
    getDistanceToProfile,
    filterProfilesByDistance
  };