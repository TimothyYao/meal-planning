import { firebaseConfig } from '../config/firebase';
import type { ApplicationVerifier } from './auth';

/**
 * Custom ApplicationVerifier that uses a WebView-based reCAPTCHA
 * This replaces the deprecated expo-firebase-recaptcha
 */
export class CustomApplicationVerifier implements ApplicationVerifier {
  type = 'recaptcha';
  private resolveVerify?: (token: string) => void;
  private rejectVerify?: (error: Error) => void;
  private modalVisible = false;
  private setModalVisible?: (visible: boolean) => void;
  private testMode = false;

  constructor(setModalVisible: (visible: boolean) => void, testMode: boolean = false) {
    this.setModalVisible = setModalVisible;
    this.testMode = testMode;
  }

  // Firebase requires this method (can be empty)
  _reset(): void {
    // Reset the verifier state
    this.modalVisible = false;
    if (this.setModalVisible) {
      this.setModalVisible(false);
    }
    // Don't reject the promise on reset - Firebase may call this during normal operation
  }

  async verify(): Promise<string> {
    // For test phone numbers, Firebase will automatically skip reCAPTCHA
    // We still need to return a promise, but Firebase handles it internally
    // For development, you can use test phone numbers configured in Firebase Console
    
    return new Promise((resolve, reject) => {
      this.resolveVerify = resolve;
      this.rejectVerify = reject;
      
      // If test mode, resolve immediately with empty string
      // Firebase will detect test numbers and skip reCAPTCHA
      if (this.testMode) {
        // For test numbers, Firebase doesn't actually need a token
        // It will skip reCAPTCHA automatically
        setTimeout(() => resolve(''), 100);
        return;
      }
      
      // Show modal for real phone numbers
      this.modalVisible = true;
      if (this.setModalVisible) {
        this.setModalVisible(true);
      }
    });
  }

  onVerify(token: string) {
    this.modalVisible = false;
    if (this.setModalVisible) {
      this.setModalVisible(false);
    }
    if (this.resolveVerify) {
      this.resolveVerify(token);
      this.resolveVerify = undefined;
      this.rejectVerify = undefined;
    }
  }

  onCancel() {
    this.modalVisible = false;
    if (this.setModalVisible) {
      this.setModalVisible(false);
    }
    if (this.rejectVerify) {
      this.rejectVerify(new Error('reCAPTCHA cancelled by user'));
      this.resolveVerify = undefined;
      this.rejectVerify = undefined;
    }
  }

  onError(error: Error) {
    this.modalVisible = false;
    if (this.setModalVisible) {
      this.setModalVisible(false);
    }
    if (this.rejectVerify) {
      this.rejectVerify(error);
      this.resolveVerify = undefined;
      this.rejectVerify = undefined;
    }
  }
}
