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
  // Sample data - realistic Firebase config
  const mockFirebaseConfig = {
    apiKey: 'test-api-key-abc123',
    authDomain: 'test-project.firebaseapp.com',
    projectId: 'test-project',
    storageBucket: 'test-project.appspot.com',
    messagingSenderId: '123456789012',
    appId: '1:123456789012:web:abcdef123456',
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

  describe('rendering', () => {
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

    it('displays title header', () => {
      const { getByText } = render(<CustomRecaptchaVerifier {...defaultProps} />);

      expect(getByText("Verify you're human")).toBeTruthy();
    });

    it('displays Cancel button', () => {
      const { getByText } = render(<CustomRecaptchaVerifier {...defaultProps} />);

      expect(getByText('Cancel')).toBeTruthy();
    });

    it('shows loading indicator initially', () => {
      const { getByText } = render(<CustomRecaptchaVerifier {...defaultProps} />);

      expect(getByText('Loading reCAPTCHA...')).toBeTruthy();
    });

    it('renders WebView component', () => {
      const { getByTestId } = render(<CustomRecaptchaVerifier {...defaultProps} />);

      expect(getByTestId('webview')).toBeTruthy();
    });

    it('includes firebase config in WebView HTML', () => {
      const { getByTestId } = render(<CustomRecaptchaVerifier {...defaultProps} />);

      const webview = getByTestId('webview');
      expect(webview.props.source).toBeDefined();
      expect(webview.props.source.html).toContain('test-api-key-abc123');
    });
  });

  describe('user interactions', () => {
    it('calls onCancel when Cancel button is pressed', () => {
      const onCancel = jest.fn();
      const { getByText } = render(
        <CustomRecaptchaVerifier {...defaultProps} onCancel={onCancel} />
      );

      fireEvent.press(getByText('Cancel'));

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('WebView messages', () => {
    it('calls onVerify when verification succeeds', async () => {
      const onVerify = jest.fn();
      const { getByTestId } = render(
        <CustomRecaptchaVerifier {...defaultProps} onVerify={onVerify} />
      );

      const webview = getByTestId('webview');

      fireEvent(webview, 'message', {
        nativeEvent: {
          data: JSON.stringify({
            type: 'verify',
            token: 'test-recaptcha-token-xyz789',
          }),
        },
      });

      await waitFor(() => {
        expect(onVerify).toHaveBeenCalledWith('test-recaptcha-token-xyz789');
      });
    });

    it('calls onError when error message is received', async () => {
      const onError = jest.fn();
      const { getByTestId } = render(
        <CustomRecaptchaVerifier {...defaultProps} onError={onError} />
      );

      const webview = getByTestId('webview');

      fireEvent(webview, 'message', {
        nativeEvent: {
          data: JSON.stringify({
            type: 'error',
            message: 'reCAPTCHA verification failed',
          }),
        },
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
        expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
        expect(onError.mock.calls[0][0].message).toBe('reCAPTCHA verification failed');
      });
    });

    it('hides loading when ready message is received', async () => {
      const { getByTestId, queryByText } = render(
        <CustomRecaptchaVerifier {...defaultProps} />
      );

      const webview = getByTestId('webview');

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
      const { getByTestId, queryByText } = render(
        <CustomRecaptchaVerifier {...defaultProps} />
      );

      const webview = getByTestId('webview');

      fireEvent(webview, 'message', {
        nativeEvent: {
          data: JSON.stringify({ type: 'load' }),
        },
      });

      await waitFor(() => {
        expect(queryByText('Loading reCAPTCHA...')).toBeNull();
      });
    });

    it('handles parse errors gracefully', async () => {
      const onError = jest.fn();
      const { getByTestId } = render(
        <CustomRecaptchaVerifier {...defaultProps} onError={onError} />
      );

      const webview = getByTestId('webview');

      fireEvent(webview, 'message', {
        nativeEvent: {
          data: 'invalid json string',
        },
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });
  });

  describe('WebView errors', () => {
    it('calls onError when WebView error occurs', async () => {
      const onError = jest.fn();
      const { getByTestId } = render(
        <CustomRecaptchaVerifier {...defaultProps} onError={onError} />
      );

      const webview = getByTestId('webview');

      fireEvent(webview, 'error', {
        nativeEvent: {
          description: 'Network connection failed',
        },
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });
  });
});
