// Enhanced LocationService.ts - Without changing the API structure
import { countries } from 'countries-list';
import citiesList from 'cities-list'; // Install this with: npm install cities-list

export interface LocationData {
  country: string;
  city?: string;
  customLocation?: string;
}

// Create a mapping of popular cities to countries
// This allows us to display city and country information together
const cityCountryMap: Record<string, string> = {
  // United States
  "New York": "United States",
  "Los Angeles": "United States",
  "Chicago": "United States",
  "Houston": "United States",
  "Phoenix": "United States",
  "Philadelphia": "United States",
  "San Antonio": "United States",
  "San Diego": "United States",
  "Dallas": "United States",
  "San Jose": "United States",
  
  // United Kingdom
  "London": "United Kingdom",
  "Birmingham": "United Kingdom",
  "Manchester": "United Kingdom",
  "Liverpool": "United Kingdom",
  "Glasgow": "United Kingdom",
  
  // Other major cities
  "Paris": "France",
  "Tokyo": "Japan",
  "Berlin": "Germany",
  "Madrid": "Spain",
  "Rome": "Italy",
  "Toronto": "Canada",
  "Sydney": "Australia",
  "Mumbai": "India",
  "Beijing": "China",
  "Shanghai": "China",
  "Lagos": "Nigeria",
  "Cairo": "Egypt",
  "Rio de Janeiro": "Brazil",
  "Sao Paulo": "Brazil",
  "Moscow": "Russia",
  "Amsterdam": "Netherlands",
  "Dubai": "United Arab Emirates",
  "Singapore": "Singapore",
  "Hong Kong": "China",
  "Bangkok": "Thailand",
  "Seoul": "South Korea",
  "Mexico City": "Mexico",
  "Delhi": "India",
  "Istanbul": "Turkey",
  "Buenos Aires": "Argentina",
  "Johannesburg": "South Africa",
  "Vienna": "Austria",
  "Brussels": "Belgium",
  "Athens": "Greece",
  "Dublin": "Ireland",
  "Lisbon": "Portugal",
  "Oslo": "Norway",
  "Stockholm": "Sweden",
  "Copenhagen": "Denmark",
  "Helsinki": "Finland",
  "Warsaw": "Poland",
  "Prague": "Czech Republic",
  "Budapest": "Hungary",
  "Zurich": "Switzerland",
  "Barcelona": "Spain"
};

// Add more cities or enhance as needed

export class LocationService {
  // Get all countries with their names and codes
  static getAllCountries(): Array<{name: string, code: string}> {
    return Object.entries(countries).map(([code, country]) => ({
      name: country.name,
      code
    })).sort((a, b) => a.name.localeCompare(b.name));
  }

  // Enhanced searchCities to include country information without changing the API
  static searchCities(query: string): Array<{name: string, country?: string}> {
    if (!query || query.length < 2) return [];
    
    const cleanQuery = query.toLowerCase().trim();
    
    // First, search through our city-country map for better results
    const citiesWithCountries = Object.keys(cityCountryMap)
      .filter(cityName => 
        cityName.toLowerCase().includes(cleanQuery)
      )
      .map(cityName => ({
        name: cityName,
        country: cityCountryMap[cityName]
      }));
    
    // Then search through cities-list for more comprehensive results
    const additionalCities = Object.keys(citiesList)
      .filter(cityName => 
        cityName.toLowerCase().includes(cleanQuery) &&
        // Don't include cities already in our city-country map
        !cityCountryMap[cityName]
      )
      .slice(0, Math.max(0, 50 - citiesWithCountries.length)) // Limit to 50 total results
      .map(cityName => ({
        name: cityName
        // No country since cities-list doesn't include country information
      }));
    
    // Combine the results, prioritizing cities with country information
    return [...citiesWithCountries, ...additionalCities];
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