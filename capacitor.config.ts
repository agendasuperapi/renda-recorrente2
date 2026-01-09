import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.d58d1d52fb1b448691d7558c22792e39',
  appName: 'Renda Recorrente',
  webDir: 'dist',
  // Removido server.url para usar arquivos locais em produção
  // Para desenvolvimento, você pode descomentar e usar:
  // server: {
  //   url: 'http://localhost:8080',
  //   cleartext: true
  // },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#10b981",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'Renda Recorrente',
  },
  android: {
    backgroundColor: "#10b981",
  },
};

export default config;
