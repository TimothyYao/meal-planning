import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import type { ConfirmationResult } from 'firebase/auth';

/**
 * Example component showing how to use phone authentication
 * You can integrate this into your ProfileScreen or create a dedicated auth screen
 */
export default function PhoneAuthExample() {
  const { signInWithPhone, verifyPhoneCode, user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [step, setStep] = useState<'phone' | 'code'>('phone');

  const handleSendCode = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    try {
      const result = await signInWithPhone(phoneNumber);
      setConfirmationResult(result);
      setStep('code');
      Alert.alert('Success', 'Verification code sent!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send verification code');
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim() || !confirmationResult) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    try {
      await verifyPhoneCode(confirmationResult, verificationCode);
      Alert.alert('Success', 'Phone number verified!');
      setStep('phone');
      setPhoneNumber('');
      setVerificationCode('');
      setConfirmationResult(null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Invalid verification code');
    }
  };

  if (user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Signed in as:</Text>
        <Text style={styles.userInfo}>{user.phoneNumber || user.email || user.uid}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Phone Authentication</Text>
      
      {step === 'phone' ? (
        <View style={styles.form}>
          <Text style={styles.label}>Phone Number (with country code)</Text>
          <TextInput
            style={styles.input}
            placeholder="+1234567890"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            autoComplete="tel"
          />
          <Button title="Send Verification Code" onPress={handleSendCode} />
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.label}>Verification Code</Text>
          <TextInput
            style={styles.input}
            placeholder="123456"
            value={verificationCode}
            onChangeText={setVerificationCode}
            keyboardType="number-pad"
            maxLength={6}
          />
          <Button title="Verify Code" onPress={handleVerifyCode} />
          <Button
            title="Change Phone Number"
            onPress={() => {
              setStep('phone');
              setVerificationCode('');
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  userInfo: {
    fontSize: 16,
    color: '#666',
  },
});
