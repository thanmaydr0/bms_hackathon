/**
 * Safe geolocation wrapper that never throws or rejects.
 * Returns coordinates on success, null on any failure.
 */
export function getCurrentPositionSafe(): Promise<GeolocationCoordinates | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('[geolocation] Geolocation API not available');
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      (error) => {
        console.warn('[geolocation] Position error:', error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 30000,
      }
    );
  });
}
