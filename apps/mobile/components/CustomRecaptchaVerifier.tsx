import React, { useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, ActivityIndicator, SafeAreaView, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import type { FirebaseOptions } from 'expo-firebase-core';

interface CustomRecaptchaVerifierProps {
  firebaseConfig: FirebaseOptions;
  visible: boolean;
  onVerify: (token: string) => void;
  onCancel: () => void;
  onError?: (error: Error) => void;
}

export function CustomRecaptchaVerifier({
  firebaseConfig,
  visible,
  onVerify,
  onCancel,
  onError,
}: CustomRecaptchaVerifierProps) {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
  <meta name="HandheldFriendly" content="true">
  <!-- Load Firebase v8 scripts (compat mode for reCAPTCHA) -->
  <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"></script>
  <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js"></script>
  <script>
    // Initialize Firebase after scripts load
    (function() {
      try {
        if (typeof firebase === 'undefined') {
          throw new Error('Firebase scripts failed to load');
        }
        // Check if already initialized
        if (firebase.apps.length === 0) {
          firebase.initializeApp(${JSON.stringify(firebaseConfig)});
          console.log('Firebase initialized successfully');
        } else {
          console.log('Firebase already initialized');
        }
        window.dispatchEvent(new Event('firebaseReady'));
      } catch (e) {
        console.error('Firebase init error:', e);
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'error',
            message: 'Failed to initialize Firebase: ' + (e.message || String(e)),
            stack: e.stack
          }));
        }
      }
    })();
  </script>
  <style>
    html, body {
      height: 100%;
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      background: #f5f5f5;
    }
    /* RecaptchaVerifier requires an EMPTY container - no inner elements */
    #recaptcha-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      min-width: 100%;
    }
  </style>
</head>
<body>
  <div id="recaptcha-container"></div>
  <script>
    var recaptchaVerifier;
    var recaptchaInitialized = false;
    function onVerify(token) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'verify',
        token: token
      }));
    }
    function onError(error) {
      console.error('reCAPTCHA error:', error);
      var errorMessage = 'reCAPTCHA failed';
      if (error) {
        if (typeof error === 'string') {
          errorMessage = error;
        } else if (error.message) {
          errorMessage = error.message;
        } else if (error.toString) {
          errorMessage = error.toString();
        }
      }
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'error',
          message: errorMessage,
          error: error ? String(error) : 'Unknown error'
        }));
      }
    }
    function initRecaptcha() {
      if (typeof firebase === 'undefined' || !firebase.auth) {
        console.error('Firebase not loaded yet');
        setTimeout(initRecaptcha, 100);
        return;
      }
      if (recaptchaInitialized) {
        console.log('reCAPTCHA already initialized, skipping');
        return;
      }
      
      var container = document.getElementById('recaptcha-container');
      if (!container) {
        onError(new Error('reCAPTCHA container not found'));
        return;
      }
      /* Firebase requires empty container - clear any leftover content */
      container.innerHTML = '';
      
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'load' }));
      
      try {
        recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
          size: 'normal',
          callback: onVerify,
          'expired-callback': function() {
            onError(new Error('reCAPTCHA expired'));
          }
        });
        recaptchaInitialized = true;
        recaptchaVerifier.render().then(function() {
          console.log('reCAPTCHA rendered successfully');
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
        }).catch(function(error) {
          recaptchaInitialized = false;
          console.error('reCAPTCHA render error:', error);
          var errorMsg = error && (error.message || error.toString()) ? (error.message || error.toString()) : 'Failed to render reCAPTCHA';
          onError(new Error(errorMsg));
        });
      } catch (error) {
        recaptchaInitialized = false;
        console.error('reCAPTCHA init error:', error);
        var errorMsg = error && (error.message || error.toString()) ? (error.message || error.toString()) : 'Failed to initialize reCAPTCHA';
        onError(new Error(errorMsg));
      }
    }
    
    function loadRecaptchaScript() {
      if (window.__recaptchaScriptLoaded) return;
      window.__recaptchaScriptLoaded = true;
      var el = document.createElement('script');
      el.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
      el.onload = function() { setTimeout(initRecaptcha, 100); };
      el.onerror = function() { onError(new Error('Failed to load reCAPTCHA script')); };
      document.body.appendChild(el);
    }
    
    window.addEventListener('firebaseReady', loadRecaptchaScript);
    
    window.addEventListener('load', function() {
      setTimeout(function() {
        if (typeof firebase !== 'undefined' && firebase.auth && !recaptchaInitialized) {
          loadRecaptchaScript();
        }
      }, 1000);
    });
    
    window.addEventListener('error', function(e) {
      console.error('Page error:', e);
      onError(new Error('Failed to load page'));
    });
  </script>
</body>
</html>
  `;

  const handleMessage = (event: any) => {
    try {
      const rawData = event.nativeEvent.data;
      console.log('WebView raw message:', rawData);
      const data = JSON.parse(rawData);
      console.log('WebView parsed message:', JSON.stringify(data, null, 2));
      
      switch (data.type) {
        case 'load':
          setLoading(false);
          break;
        case 'ready':
          setLoading(false);
          break;
        case 'verify':
          setLoading(false);
          onVerify(data.token);
          break;
        case 'error':
          setLoading(false);
          const errorMessage = data.message || data.error || 'Unknown reCAPTCHA error';
          console.error('reCAPTCHA error from WebView:', {
            message: errorMessage,
            fullData: data,
          });
          const error = new Error(errorMessage);
          if (onError) {
            onError(error);
          }
          break;
        default:
          console.log('Unknown WebView message type:', data.type);
      }
    } catch (e) {
      console.error('Error parsing WebView message:', e, 'Raw data:', event.nativeEvent.data);
      setLoading(false);
      if (onError) {
        onError(new Error(`Failed to parse WebView message: ${e instanceof Error ? e.message : String(e)}`));
      }
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Verify you're human</Text>
          <TouchableOpacity onPress={onCancel}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.webviewContainer}>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading reCAPTCHA...</Text>
            </View>
          )}
          <WebView
            ref={webViewRef}
            source={{ html: htmlContent }}
            style={styles.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            onMessage={handleMessage}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('WebView error:', nativeEvent);
              setLoading(false);
              if (onError) {
                onError(new Error(nativeEvent.description || 'WebView error'));
              }
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('WebView HTTP error:', nativeEvent);
            }}
            onLoadEnd={() => {
              console.log('WebView load ended');
            }}
            originWhitelist={['*']}
            mixedContentMode="always"
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  cancel: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '600',
  },
  webviewContainer: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});
