export function useRegionPreference() {
  return {
    region: null as any,
    checking: false,
    askGeolocationOnce: () => {},
    setManualRegion: (_code?: string) => {},
    setRegion: (_code?: string) => {},
  };
}
