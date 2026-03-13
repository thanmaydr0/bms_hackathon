export async function preloadLocalTiles(
  centerLat: number,
  centerLng: number,
  zoomLevels: number[] = [12, 13, 14, 15]
): Promise<{ total: number; cached: number }> {
  const MAX_TILES = 500;
  const TILE_RADIUS = 8; // ±8 tiles from center is roughly a localized grid

  function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
    const x = Math.floor(((lng + 180) / 360) * Math.pow(2, zoom));
    const latRad = (lat * Math.PI) / 180;
    const y = Math.floor(
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, zoom)
    );
    return { x, y };
  }

  const tileUrls: string[] = [];

  for (const zoom of zoomLevels) {
    // OSM usage policy: restrict scraping to z12-z15
    if (zoom < 12 || zoom > 15) continue;

    const centerTile = latLngToTile(centerLat, centerLng, zoom);
    
    for (let dx = -TILE_RADIUS; dx <= TILE_RADIUS; dx++) {
      for (let dy = -TILE_RADIUS; dy <= TILE_RADIUS; dy++) {
        const tx = centerTile.x + dx;
        const ty = centerTile.y + dy;
        // Basic sanity check for valid tile bounds
        if (tx >= 0 && ty >= 0 && tx < Math.pow(2, zoom) && ty < Math.pow(2, zoom)) {
          tileUrls.push(`https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`);
        }
      }
    }
  }

  // Enforce Max Tiles check to respect OSM usage policies
  const urlsToFetch = tileUrls.slice(0, MAX_TILES);
  const total = urlsToFetch.length;
  let cached = 0;

  // Process in batches of 10 to prevent overwhelming the network/browser
  const BATCH_SIZE = 10;
  const DELAY_MS = 50;

  async function fetchTile(url: string) {
    try {
      // By fetching with no-cors / cors (workbox usually handles it), we 
      // trigger the service worker's `CacheFirst` route for osm-tiles.
      const response = await fetch(url, { mode: 'no-cors' });
      // With no-cors, an opaque response (type='opaque') is returned. 
      // It won't have a 200 status, but Workbox caching strategies can cache opaque responses.
      if (response.type === 'opaque' || response.ok) {
        cached++;
      }
    } catch (e) {
      console.warn('Failed to pre-cache tile:', url, e);
    }
  }

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = urlsToFetch.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(url => fetchTile(url)));
    if (i + BATCH_SIZE < total) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  return { total, cached };
}
