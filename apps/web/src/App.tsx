import { useState } from 'react'
import type { MacroTargets } from '@meal-planning/shared'
import { formatMacroValue, spacing, fontSize, fontColor, colors } from '@meal-planning/shared'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import type { ConfirmationResult } from 'firebase/auth'
import './App.css'

function AppContent() {
  const { user, loading, signInWithGoogle, signInWithApple, signInWithPhone, verifyPhoneCode, signOut } = useAuth()
  const [targetMacros] = useState<MacroTargets>({
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 65,
  })
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const [phoneAuthStep, setPhoneAuthStep] = useState<'phone' | 'code'>('phone')

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const result = await signInWithPhone(phoneNumber)
      setConfirmationResult(result)
      setPhoneAuthStep('code')
    } catch (error) {
      console.error('Error sending SMS:', error)
      alert('Error sending SMS code. Please try again.')
    }
  }

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!confirmationResult) return
    try {
      await verifyPhoneCode(confirmationResult, verificationCode)
      setPhoneAuthStep('phone')
      setPhoneNumber('')
      setVerificationCode('')
      setConfirmationResult(null)
    } catch (error) {
      console.error('Error verifying code:', error)
      alert('Invalid verification code. Please try again.')
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <>
      <div>
        <h1>Meal Planning Dashboard</h1>
        {user ? (
          <>
            <div className="card">
              <h2>Welcome, {user.displayName || user.email || user.phoneNumber}</h2>
              <button onClick={signOut}>Sign Out</button>
            </div>
            <div className="card">
              <h2>Daily Macro Targets</h2>
              <p>Calories: {formatMacroValue(targetMacros.calories, 'calories')}</p>
              <p>Protein: {formatMacroValue(targetMacros.protein, 'grams')}</p>
              <p>Carbs: {formatMacroValue(targetMacros.carbs, 'grams')}</p>
              <p>Fat: {formatMacroValue(targetMacros.fat, 'grams')}</p>
            </div>
          </>
        ) : (
          <div className="card">
            <h2>Sign In</h2>
            <button onClick={signInWithGoogle}>Sign in with Google</button>
            <button onClick={signInWithApple}>Sign in with Apple</button>
            
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #ccc' }}>
              <h3>Or sign in with phone</h3>
              {phoneAuthStep === 'phone' ? (
                <form onSubmit={handlePhoneSubmit}>
                  <input
                    type="tel"
                    placeholder="+1234567890"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    style={{ padding: `${spacing.sm}px`, marginRight: `${spacing.sm}px`, width: '200px' }}
                  />
                  <button type="submit">Send Code</button>
                </form>
              ) : (
                <form onSubmit={handleCodeSubmit}>
                  <input
                    type="text"
                    placeholder="Enter verification code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    required
                    style={{ padding: `${spacing.sm}px`, marginRight: `${spacing.sm}px`, width: '200px' }}
                  />
                  <button type="submit">Verify</button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneAuthStep('phone')
                      setVerificationCode('')
                    }}
                    style={{ marginLeft: '8px' }}
                  >
                    Change Number
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
        <p className="read-the-docs">
          Web dashboard for meal planning and macro tracking
        </p>
      </div>
      {/* reCAPTCHA container for phone auth */}
      <div id="recaptcha-container"></div>
    </>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
