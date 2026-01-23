export function useEffectiveRegion(): any {
  return {
    data: { region: null, source: "none" },
    setRegion: async (_code?: string, _opts?: any) => {},
    loading: false,
    region: null,
    source: "none",
  };
}
