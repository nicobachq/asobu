declare global {
  interface Window {
    google?: any;
    __asobuGoogleMapsPromise?: Promise<any>;
  }
}

const GOOGLE_MAPS_SCRIPT_ID = 'asobu-google-maps-places';
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

export type GooglePlaceSelection = {
  label: string;
  name: string | null;
  formattedAddress: string | null;
  placeId: string | null;
};

export function hasGoogleMapsPlacesKey() {
  return Boolean(GOOGLE_MAPS_API_KEY);
}

export function buildGoogleMapsSearchUrl(location: string) {
  const query = location.trim();
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export async function loadGoogleMapsPlaces() {
  if (!GOOGLE_MAPS_API_KEY) {
    return null;
  }

  if (window.google?.maps?.places) {
    return window.google;
  }

  if (window.__asobuGoogleMapsPromise) {
    return window.__asobuGoogleMapsPromise;
  }

  window.__asobuGoogleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.google ?? null), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps Places.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google ?? null);
    script.onerror = () => reject(new Error('Failed to load Google Maps Places.'));
    document.head.appendChild(script);
  });

  return window.__asobuGoogleMapsPromise;
}

function formatPlaceSelection(place: any): GooglePlaceSelection | null {
  if (!place) return null;

  const name = typeof place.name === 'string' && place.name.trim() ? place.name.trim() : null;
  const formattedAddress = typeof place.formatted_address === 'string' && place.formatted_address.trim()
    ? place.formatted_address.trim()
    : null;

  const label = [name, formattedAddress]
    .filter((value, index, array) => value && array.indexOf(value) === index)
    .join(' — ')
    .trim();

  return {
    label: label || formattedAddress || name || '',
    name,
    formattedAddress,
    placeId: typeof place.place_id === 'string' ? place.place_id : null,
  };
}

export async function attachGooglePlacesAutocomplete(
  input: HTMLInputElement,
  onPlaceSelected: (selection: GooglePlaceSelection) => void
) {
  const google = await loadGoogleMapsPlaces();
  const Autocomplete = google?.maps?.places?.Autocomplete;

  if (!Autocomplete) {
    return () => {};
  }

  const autocomplete = new Autocomplete(input, {
    fields: ['name', 'formatted_address', 'place_id'],
  });

  const listener = autocomplete.addListener('place_changed', () => {
    const selection = formatPlaceSelection(autocomplete.getPlace?.());
    if (!selection?.label) return;
    onPlaceSelected(selection);
  });

  return () => {
    if (listener?.remove) {
      listener.remove();
      return;
    }

    if (google?.maps?.event?.removeListener) {
      google.maps.event.removeListener(listener);
    }
  };
}
