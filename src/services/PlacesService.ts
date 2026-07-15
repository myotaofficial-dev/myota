/**
 * Google Places API (New) service
 * Uses the Places API Text Search + Place Details endpoints.
 * API key comes from .env: VITE_GOOGLE_PLACES_API_KEY
 */

const API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY as string;
const BASE = 'https://places.googleapis.com/v1';

export interface PlaceCandidate {
  id: string;            // place_id equivalent in new API
  displayName: string;   // business name
  formattedAddress: string;
  location?: { latitude: number; longitude: number };
}

export interface PlaceDetails {
  name: string;
  formattedAddress: string;
  phone: string;
  website: string;
  description: string;
  rating: number;
  userRatingCount: number;
  location: { latitude: number; longitude: number } | null;
  photos: string[];      // full photo fetch URLs
  reviews: Array<{
    author: string;
    rating: number;
    text: string;
    relativeTime: string;
  }>;
  types: string[];
}

/**
 * Text Search — returns a list of matching businesses by query string.
 * Uses only Essentials fields → cheapest billing tier.
 */
export async function searchPlaces(query: string): Promise<PlaceCandidate[]> {
  try {
    const res = await fetch(`${BASE}/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        // Only request Essentials fields to keep billing low
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location',
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: 'en',
        maxResultCount: 5,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message ?? `Places search failed: ${res.status}`);
    }

    const data = await res.json();
    const places = (data.places ?? []) as Array<{
      id: string;
      displayName?: { text: string };
      formattedAddress?: string;
      location?: { latitude: number; longitude: number };
    }>;

    return places.map(p => ({
      id: p.id,
      displayName: p.displayName?.text ?? '',
      formattedAddress: p.formattedAddress ?? '',
      location: p.location,
    }));
  } catch (error: any) {
    console.warn('Google Places API search failed, falling back to OpenStreetMap Nominatim:', error);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'HotelBuilderApp/1.0'
        }
      });
      if (!res.ok) throw new Error('Nominatim query failed');
      const data = await res.json();
      return data.map((item: any) => ({
        id: `osm-${item.place_id}`,
        displayName: item.name || item.display_name.split(',')[0],
        formattedAddress: item.display_name,
        location: {
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon)
        }
      }));
    } catch (osmErr) {
      console.error('Nominatim fallback also failed:', osmErr);
      throw error; // throw original Google Places error so user sees the permission detail if both fail
    }
  }
}

/**
 * Place Details — fetches full details for a selected place.
 * Requests Enterprise fields (reviews, photos) so billed at Enterprise tier (~$0.020/call).
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  // placeId in new API is the resource name format: "places/XXXXX"
  const resourceName = placeId.startsWith('places/') ? placeId : `places/${placeId}`;

  const res = await fetch(`${BASE}/${resourceName}`, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': API_KEY,
      // Enterprise field mask — covers all data we need
      'X-Goog-FieldMask': [
        'displayName',
        'formattedAddress',
        'internationalPhoneNumber',
        'websiteUri',
        'editorialSummary',
        'rating',
        'userRatingCount',
        'location',
        'photos',
        'reviews',
        'types',
      ].join(','),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Place details failed: ${res.status}`);
  }

  const p = await res.json() as {
    displayName?: { text: string };
    formattedAddress?: string;
    internationalPhoneNumber?: string;
    websiteUri?: string;
    editorialSummary?: { text: string };
    rating?: number;
    userRatingCount?: number;
    location?: { latitude: number; longitude: number };
    photos?: Array<{ name: string; widthPx: number; heightPx: number }>;
    reviews?: Array<{
      authorAttribution?: { displayName: string };
      rating?: number;
      text?: { text: string };
      relativePublishTimeDescription?: string;
    }>;
    types?: string[];
  };

  // Build photo fetch URLs (max 6 photos, 800px wide)
  const photoUrls = (p.photos ?? []).slice(0, 6).map(photo =>
    `${BASE}/${photo.name}/media?key=${API_KEY}&maxWidthPx=800`
  );

  const reviews = (p.reviews ?? []).slice(0, 5).map(r => ({
    author: r.authorAttribution?.displayName ?? 'Guest',
    rating: r.rating ?? 5,
    text: r.text?.text ?? '',
    relativeTime: r.relativePublishTimeDescription ?? '',
  }));

  return {
    name: p.displayName?.text ?? '',
    formattedAddress: p.formattedAddress ?? '',
    phone: p.internationalPhoneNumber ?? '',
    website: p.websiteUri ?? '',
    description: p.editorialSummary?.text ?? '',
    rating: p.rating ?? 0,
    userRatingCount: p.userRatingCount ?? 0,
    location: p.location ?? null,
    photos: photoUrls,
    reviews,
    types: p.types ?? [],
  };
}
