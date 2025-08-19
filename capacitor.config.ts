import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.canvasmvp.app',
  appName: 'Canvas MVP',
  webDir: '.output/public',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#999999',
      splashFullScreen: true,
      splashImmersive: true,
      backgroundColor: '#ffffff'
    },
    StatusBar: {
      style: 'default',
      backgroundColor: '#ffffff'
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true
    },
    App: {
      launchUrl: ''
    }
  },
  ios: {
    scheme: 'Canvas MVP',
    contentInset: 'automatic'
  },
  android: {
    buildOptions: {
      keystorePath: 'release.keystore',
      keystoreAlias: process.env.ANDROID_KEY_ALIAS || 'canvas-mvp-key',
      releaseType: 'AAB'
    },
    minWebViewVersion: 60
  }
}

export default config
