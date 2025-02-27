// app.config.ts
import { ConfigContext, ExpoConfig } from '@expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    name: config.name || "poplove",
    slug: config.slug || "poplove",
    newArchEnabled: false,
    plugins: [
      [
        "expo-build-properties",
        {
          android: {
            compileSdkVersion: 35,
            targetSdkVersion: 34,
            buildToolsVersion: "35.0.0",
            ndkVersion: "26.1.10909125"
          }
        }
      ],
      ...(config.plugins || [])
    ],
    android: {
      ...config.android, 
    }
  };
};
