import { apiGet } from './apiClient';
import type { GeocodeResponse, NearbyResponse, PlaceType } from '../../types/places';

/** About 1 km. The server rounds again, but the exact position should never leave the browser at all. */
export const roundCoord = (n: number) => Math.round(n * 100) / 100;

export const fetchNearbyPlaces = (lat: number, lon: number, radiusKm: number, type: PlaceType) =>
  apiGet<NearbyResponse>(`/places/nearby?lat=${roundCoord(lat)}&lon=${roundCoord(lon)}&radiusKm=${radiusKm}&type=${type}`);

export const geocodePlace = (q: string) => apiGet<GeocodeResponse>(`/places/geocode?q=${encodeURIComponent(q)}`);
