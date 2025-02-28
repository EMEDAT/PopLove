// app.config.ts
import { ConfigContext, ExpoConfig } from '@expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    name: "poplove",
    slug: "poplove",
    version: "1.0.0",
    scheme: "poplove",
    newArchEnabled: true, // Change to true for Firebase compatibility
    plugins: [
      [
        "expo-build-properties",
        {
          android: {
            compileSdkVersion: 35,
            targetSdkVersion: 34,
            buildToolsVersion: "35.0.0",
            ndkVersion: "26.1.10909125"
          },
          ios: {
            useFrameworks: "static" // Critical for Firebase
          }
        }
      ]
    ],
    android: {
      package: "com.yourname.poplove",
      googleServicesFile: "./google-services.json"
    },
    ios: {
      bundleIdentifier: "com.yourname.poplove",
      googleServicesFile: "./GoogleService-Info.plist"
    },
    extra: {
      eas: {
        projectId: "f15a5669-821e-4a47-b075-ded96f9ee970"
      }
    }
  };
};