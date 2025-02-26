// services/location.ts
import { countries } from 'countries-list';

export interface LocationData {
  country: string;
  city?: string;
  customLocation?: string;
}

export class LocationService {
  // Get all countries with their names and codes
  static getAllCountries(): Array<{name: string, code: string}> {
    return Object.entries(countries).map(([code, country]) => ({
      name: country.name,
      code
    }));
  }

  // Basic location validation
  static validateLocation(location: LocationData): boolean {
    // Check if country is provided
    if (!location.country) return false;
    
    // If custom location is provided, it's valid
    if (location.customLocation) return true;
    
    // If no custom location, city should be selected
    return !!location.city;
  }

  // Format location for display
  static formatLocation(location: LocationData): string {
    if (location.customLocation) return location.customLocation;
    if (location.city) return `${location.city}, ${location.country}`;
    return location.country;
  }
}

export default LocationService;