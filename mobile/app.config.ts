import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Stride Blog',
  slug: 'stride-blog',
  version: '1.0.0',
  scheme: 'strideblog',
  orientation: 'default',
  userInterfaceStyle: 'light',
  ios: { supportsTablet: true, bundleIdentifier: 'com.stride.blog', infoPlist: { ITSAppUsesNonExemptEncryption: false } },
  android: { package: 'com.stride.blog', predictiveBackGestureEnabled: true },
  plugins: [
    'expo-secure-store',
    'expo-font',
    ['expo-image-picker', { photosPermission: 'Choose images to include in your stories and comments.', cameraPermission: false, microphonePermission: false }],
    'expo-document-picker',
  ],
});
