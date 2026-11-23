import Constants from 'expo-constants';

/** «1.0.1 · e1de848 · 2026-11-23»: versión y cambio del código con que se compiló esta app. */
export function buildLabel(): string {
  const cfg = Constants.expoConfig;
  const extra = (cfg?.extra ?? {}) as { commit?: string; builtAt?: string };
  return [cfg?.version, extra.commit, extra.builtAt].filter(Boolean).join(' · ');
}
