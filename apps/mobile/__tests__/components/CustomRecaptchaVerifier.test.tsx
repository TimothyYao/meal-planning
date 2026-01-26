import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CustomRecaptchaVerifier } from '../../components/CustomRecaptchaVerifier';

// Mock WebView
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  
  const MockWebView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      postMessage: jest.fn(),
    }));
    
    return (
      <View testID="webview" {...props}>
        {props.children}
      </View>
    );
  });
  
  return {
    WebView: MockWebView,
    default: MockWebView,
  };
});

describe('CustomRecaptchaVerifier', () => {
  const mockFirebaseConfig = {
    apiKey: 'test-api-key',
    authDomain: 'test.firebaseapp.com',
    projectId: 'test-project',
    storageBucket: 'test.appspot.com',
    messagingSenderId: '123456789',
    appId: '1:123456789:web:abcdef',
  };

  const defaultProps = {
    firebaseConfig: mockFirebaseConfig,
    visible: true,
    onVerify: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when visible is true', () => {
    const { getByText } = render(<CustomRecaptchaVerifier {...defaultProps} />);
    
    expect(getByText("Verify you're human")).toBeTruthy();
  });

  it('does not render when visible is false', () => {
    const { queryByText } = render(
      <CustomRecaptchaVerifier {...defaultProps} visible={false} />
    );
    
    expect(queryByText("Verify you're human")).toBeNull();
  });

  it('displays Cancel button', () => {
    const { getByText } = render(<CustomRecaptchaVerifier {...defaultProps} />);
    
    expect(getByText('Cancel')).toBeTruthy();
  });

  it('calls onCancel when Cancel button is pressed', () => {
    const onCancel = jest.fn();
    const { getByText } = render(
      <CustomRecaptchaVerifier {...defaultProps} onCancel={onCancel} />
    );
    
    fireEvent.press(getByText('Cancel'));
    
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows loading indicator initially', () => {
    const { getByText } = render(<CustomRecaptchaVerifier {...defaultProps} />);
    
    expect(getByText('Loading reCAPTCHA...')).toBeTruthy();
  });

  it('has WebView component', () => {
    const { getByTestId } = render(<CustomRecaptchaVerifier {...defaultProps} />);
    
    expect(getByTestId('webview')).toBeTruthy();
  });

  it('displays title header', () => {
    const { getByText } = render(<CustomRecaptchaVerifier {...defaultProps} />);
    
    expect(getByText("Verify you're human")).toBeTruthy();
  });

  it('calls onVerify when verification succeeds', async () => {
    const onVerify = jest.fn();
    const { getByTestId } = render(
      <CustomRecaptchaVerifier {...defaultProps} onVerify={onVerify} />
    );
    
    const webview = getByTestId('webview');
    
    // Simulate successful verification message from WebView
    fireEvent(webview, 'message', {
      nativeEvent: {
        data: JSON.stringify({
          type: 'verify',
          token: 'test-recaptcha-token',
        }),
      },
    });
    
    await waitFor(() => {
      expect(onVerify).toHaveBeenCalledWith('test-recaptcha-token');
    });
  });

  it('calls onError when error message is received', async () => {
    const onError = jest.fn();
    const { getByTestId } = render(
      <CustomRecaptchaVerifier {...defaultProps} onError={onError} />
    );
    
    const webview = getByTestId('webview');
    
    // Simulate error message from WebView
    fireEvent(webview, 'message', {
      nativeEvent: {
        data: JSON.stringify({
          type: 'error',
          message: 'reCAPTCHA failed',
        }),
      },
    });
    
    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
      expect(onError.mock.calls[0][0].message).toBe('reCAPTCHA failed');
    });
  });

  it('hides loading when ready message is received', async () => {
    const { getByTestId, queryByText } = render(<CustomRecaptchaVerifier {...defaultProps} />);
    
    const webview = getByTestId('webview');
    
    // Simulate ready message from WebView
    fireEvent(webview, 'message', {
      nativeEvent: {
        data: JSON.stringify({ type: 'ready' }),
      },
    });
    
    await waitFor(() => {
      expect(queryByText('Loading reCAPTCHA...')).toBeNull();
    });
  });

  it('hides loading when load message is received', async () => {
    const { getByTestId, queryByText } = render(<CustomRecaptchaVerifier {...defaultProps} />);
    
    const webview = getByTestId('webview');
    
    // Simulate load message from WebView
    fireEvent(webview, 'message', {
      nativeEvent: {
        data: JSON.stringify({ type: 'load' }),
      },
    });
    
    await waitFor(() => {
      expect(queryByText('Loading reCAPTCHA...')).toBeNull();
    });
  });

  it('handles WebView errors', async () => {
    const onError = jest.fn();
    const { getByTestId } = render(
      <CustomRecaptchaVerifier {...defaultProps} onError={onError} />
    );
    
    const webview = getByTestId('webview');
    
    // Simulate WebView error event
    fireEvent(webview, 'error', {
      nativeEvent: {
        description: 'Network error',
      },
    });
    
    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
  });

  it('handles parse errors gracefully', async () => {
    const onError = jest.fn();
    const { getByTestId } = render(
      <CustomRecaptchaVerifier {...defaultProps} onError={onError} />
    );
    
    const webview = getByTestId('webview');
    
    // Simulate invalid JSON message from WebView
    fireEvent(webview, 'message', {
      nativeEvent: {
        data: 'invalid json',
      },
    });
    
    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
  });

  it('includes firebase config in WebView HTML', () => {
    const { getByTestId } = render(<CustomRecaptchaVerifier {...defaultProps} />);
    
    const webview = getByTestId('webview');
    
    // The WebView source should contain HTML with the firebase config
    expect(webview.props.source).toBeDefined();
    expect(webview.props.source.html).toContain('test-api-key');
  });
});
