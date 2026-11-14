export type GeographicFeature = {
  geometry: { type: string; coordinates: number[][][] | number[][][][] };
};
type MapResponse = { ok: boolean; json: () => Promise<{ features: GeographicFeature[] }> };

/** One immutable, bundled geography load shared across mounted maps. */
export function createMapLoader(request: () => Promise<MapResponse>) {
  let cached: Promise<GeographicFeature[]> | undefined;
  return () => {
    cached ??= request().then(async (response) => {
      if (!response.ok) throw new Error("Map asset missing");
      return (await response.json()).features;
    }).catch((error: unknown) => {
      cached = undefined;
      throw error;
    });
    return cached;
  };
}
export const loadMapFeatures = createMapLoader(() => fetch("/assets/countries.geojson"));
