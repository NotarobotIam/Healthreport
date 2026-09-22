export type PlaceType = 'hospital' | 'clinic';

export interface PlaceDTO {
  /** OpenStreetMap id such as "way/123", or null if it could not be validated. */
  id: string | null;
  name: string;
  lat: number;
  lon: number;
  distanceKm: number;
  address: string;
  phone: string | null;
  website: string | null;
  emergency: boolean;
  openingHours: string | null;
}

export interface NearbyResponse {
  success: boolean;
  type: PlaceType;
  radiusKm: number;
  /** The rounded position the search actually used. */
  center: { lat: number; lon: number };
  results: PlaceDTO[];
  /** True when the map service was busy and we are showing an older answer for this area. */
  stale: boolean;
  attribution: string;
}

export interface GeocodeCandidate {
  label: string;
  lat: number;
  lon: number;
}

export interface GeocodeResponse {
  success: boolean;
  results: GeocodeCandidate[];
}
