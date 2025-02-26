// app.config.ts
import { ConfigContext, ExpoConfig } from '@expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  // Get the existing config from app.json
  return {
    ...config,
    name: config.name || "poplove", // Ensure name is defined
    slug: config.slug || "poplove", // Ensure slug is defined
    newArchEnabled: false,
    plugins: [
      ...(config.plugins || [])
      // Removed "@react-native-google-signin/google-signin"
    ],
  };
};