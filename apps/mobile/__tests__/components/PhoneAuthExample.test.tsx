import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import PhoneAuthExample from '../../components/PhoneAuthExample';
import { useAuth } from '../../contexts/AuthContext';

// Mock the AuthContext
jest.mock('../../contexts/AuthContext');

describe('PhoneAuthExample', () => {
  const mockSignInWithPhone = jest.fn();
  const mockVerifyPhoneCode = jest.fn();
  const mockSignOut = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
      signInWithPhone: mockSignInWithPhone,
      verifyPhoneCode: mockVerifyPhoneCode,
      signOut: mockSignOut,
    });
  });

  describe('phone input screen', () => {
    it('renders phone input when user is not signed in', () => {
      const { getByText, getByPlaceholderText } = render(<PhoneAuthExample />);

      expect(getByText('Phone Authentication')).toBeTruthy();
      expect(getByText('Phone Number (with country code)')).toBeTruthy();
      expect(getByPlaceholderText('+1234567890')).toBeTruthy();
    });

    it('shows Send Verification Code button', () => {
      const { getByText } = render(<PhoneAuthExample />);

      expect(getByText('Send Verification Code')).toBeTruthy();
    });

    it('shows error alert when phone number is empty', async () => {
      const { getByText } = render(<PhoneAuthExample />);

      fireEvent.press(getByText('Send Verification Code'));

      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter a phone number');
    });

    it('calls signInWithPhone when phone number is provided', async () => {
      mockSignInWithPhone.mockResolvedValue({ verificationId: 'test-id' });

      const { getByText, getByPlaceholderText } = render(<PhoneAuthExample />);

      fireEvent.changeText(getByPlaceholderText('+1234567890'), '+1555123456');
      fireEvent.press(getByText('Send Verification Code'));

      await waitFor(() => {
        expect(mockSignInWithPhone).toHaveBeenCalledWith('+1555123456');
      });
    });

    it('shows success alert after sending code', async () => {
      mockSignInWithPhone.mockResolvedValue({ verificationId: 'test-id' });

      const { getByText, getByPlaceholderText } = render(<PhoneAuthExample />);

      fireEvent.changeText(getByPlaceholderText('+1234567890'), '+1555123456');
      fireEvent.press(getByText('Send Verification Code'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Success', 'Verification code sent!');
      });
    });

    it('switches to verification code screen after sending code', async () => {
      mockSignInWithPhone.mockResolvedValue({ verificationId: 'test-id' });

      const { getByText, getByPlaceholderText, findByText, findByPlaceholderText } =
        render(<PhoneAuthExample />);

      fireEvent.changeText(getByPlaceholderText('+1234567890'), '+1555123456');
      fireEvent.press(getByText('Send Verification Code'));

      await waitFor(async () => {
        expect(await findByText('Verification Code')).toBeTruthy();
        expect(await findByPlaceholderText('123456')).toBeTruthy();
      });
    });

    it('shows error alert when signInWithPhone fails', async () => {
      mockSignInWithPhone.mockRejectedValue(new Error('Network error'));

      const { getByText, getByPlaceholderText } = render(<PhoneAuthExample />);

      fireEvent.changeText(getByPlaceholderText('+1234567890'), '+1555123456');
      fireEvent.press(getByText('Send Verification Code'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Network error');
      });
    });
  });

  describe('signed in state', () => {
    it('shows user info when signed in with phone', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: {
          uid: 'user-123',
          phoneNumber: '+1555123456',
          email: null,
          displayName: null,
          photoURL: null,
        },
        loading: false,
        signInWithPhone: mockSignInWithPhone,
        verifyPhoneCode: mockVerifyPhoneCode,
        signOut: mockSignOut,
      });

      const { getByText } = render(<PhoneAuthExample />);

      expect(getByText('Signed in as:')).toBeTruthy();
      expect(getByText('+1555123456')).toBeTruthy();
    });

    it('shows email when user has email', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: {
          uid: 'user-123',
          phoneNumber: null,
          email: 'test@example.com',
          displayName: null,
          photoURL: null,
        },
        loading: false,
        signInWithPhone: mockSignInWithPhone,
        verifyPhoneCode: mockVerifyPhoneCode,
        signOut: mockSignOut,
      });

      const { getByText } = render(<PhoneAuthExample />);

      expect(getByText('test@example.com')).toBeTruthy();
    });
  });

  describe('verification code step', () => {
    beforeEach(async () => {
      mockSignInWithPhone.mockResolvedValue({ verificationId: 'test-id' });
    });

    it('shows error when verification code is empty', async () => {
      const { getByText, getByPlaceholderText, findByText } = render(
        <PhoneAuthExample />
      );

      fireEvent.changeText(getByPlaceholderText('+1234567890'), '+1555123456');
      fireEvent.press(getByText('Send Verification Code'));

      await findByText('Verification Code');

      fireEvent.press(getByText('Verify Code'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Please enter the verification code'
      );
    });

    it('calls verifyPhoneCode with correct arguments', async () => {
      mockVerifyPhoneCode.mockResolvedValue({});

      const { getByText, getByPlaceholderText, findByPlaceholderText } = render(
        <PhoneAuthExample />
      );

      fireEvent.changeText(getByPlaceholderText('+1234567890'), '+1555123456');
      fireEvent.press(getByText('Send Verification Code'));

      const codeInput = await findByPlaceholderText('123456');
      fireEvent.changeText(codeInput, '123456');
      fireEvent.press(getByText('Verify Code'));

      await waitFor(() => {
        expect(mockVerifyPhoneCode).toHaveBeenCalled();
      });
    });

    it('shows success alert after verification', async () => {
      mockVerifyPhoneCode.mockResolvedValue({});

      const { getByText, getByPlaceholderText, findByPlaceholderText } = render(
        <PhoneAuthExample />
      );

      fireEvent.changeText(getByPlaceholderText('+1234567890'), '+1555123456');
      fireEvent.press(getByText('Send Verification Code'));

      const codeInput = await findByPlaceholderText('123456');
      fireEvent.changeText(codeInput, '123456');
      fireEvent.press(getByText('Verify Code'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Success', 'Phone number verified!');
      });
    });

    it('shows error alert when verification fails', async () => {
      mockVerifyPhoneCode.mockRejectedValue(new Error('Invalid code'));

      const { getByText, getByPlaceholderText, findByPlaceholderText } = render(
        <PhoneAuthExample />
      );

      fireEvent.changeText(getByPlaceholderText('+1234567890'), '+1555123456');
      fireEvent.press(getByText('Send Verification Code'));

      const codeInput = await findByPlaceholderText('123456');
      fireEvent.changeText(codeInput, '123456');
      fireEvent.press(getByText('Verify Code'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Invalid code');
      });
    });

    it('can go back to phone number step', async () => {
      const { getByText, getByPlaceholderText, findByText } = render(
        <PhoneAuthExample />
      );

      fireEvent.changeText(getByPlaceholderText('+1234567890'), '+1555123456');
      fireEvent.press(getByText('Send Verification Code'));

      await findByText('Verification Code');

      fireEvent.press(getByText('Change Phone Number'));

      await waitFor(() => {
        expect(findByText('Phone Number (with country code)')).toBeTruthy();
      });
    });
  });
});
