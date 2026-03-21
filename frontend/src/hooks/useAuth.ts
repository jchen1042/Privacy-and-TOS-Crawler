import { useState, useEffect, useCallback } from 'react'
import { User } from 'firebase/auth'
import { AuthService } from '../lib/authService'

interface UserProfile {
  username?: string
  displayName?: string
  email?: string
  [key: string]: any
}

interface AuthState {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  error: string | null
}

interface AuthActions {
  signUpWithEmail: (email: string, password: string, username?: string) => Promise<{ success: boolean; error?: string; message?: string }>
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string; message?: string }>
  signInWithGoogle: () => Promise<{ success: boolean; error?: string; message?: string }>
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string; message?: string }>
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string; message?: string }>
  resendEmailVerification: () => Promise<{ success: boolean; error?: string; message?: string }>
  signOut: () => Promise<{ success: boolean; error?: string; message?: string }>
}

export const useAuth = (): AuthState & AuthActions => {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch user profile from Firestore when user changes
  // Optimized useEffect to skip Firestore lookups
  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged((user) => {
      setUser(user)
      
      if (user) {
        // Instead of calling fetchUserProfile (Firestore), 
        // we construct a profile object directly from the Auth data.
        // This satisfies the UI's need for a 'userProfile' instantly.
        setUserProfile({
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          username: user.displayName || user.email?.split('@')[0] || 'User',
        })
      } else {
        setUserProfile(null)
      }
      
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signUpWithEmail = useCallback(async (email: string, password: string, username?: string) => {
    setError(null)
    const result = await AuthService.signUpWithEmail(email, password, username)
    if (!result.success) {
      setError(result.error || 'Sign up failed')
    }
    return result
  }, [])

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setError(null)
    const result = await AuthService.signInWithEmail(email, password)
    if (!result.success) {
      setError(result.error || 'Sign in failed')
    }
    return result
  }, [])

  const signInWithGoogle = useCallback(async () => {
    setError(null)
    const result = await AuthService.signInWithGoogle()
    if (!result.success) {
      setError(result.error || 'Google sign in failed')
    }
    return result
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    setError(null)
    const result = await AuthService.resetPassword(email)
    if (!result.success) {
      setError(result.error || 'Password reset failed')
    }
    return result
  }, [])

  const updatePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    setError(null)
    const result = await AuthService.updateUserPassword(currentPassword, newPassword)
    if (!result.success) {
      setError(result.error || 'Password update failed')
    }
    return result
  }, [])

  const resendEmailVerification = useCallback(async () => {
    setError(null)
    const result = await AuthService.resendEmailVerification()
    if (!result.success) {
      setError(result.error || 'Resend verification failed')
    }
    return result
  }, [])

  const signOut = useCallback(async () => {
    setError(null)
    
    // Clear crawler sessions when user logs out to prevent cross-user data leakage
    try {
      const { useCrawlerStore } = await import('@/store/crawlerStore')
      useCrawlerStore.getState().clearSessions()
    } catch (error) {
      console.error('Error clearing crawler sessions on logout:', error)
    }
    
    const result = await AuthService.signOut()
    if (!result.success) {
      setError(result.error || 'Sign out failed')
    }
    return result
  }, [])

  return {
    user,
    userProfile,
    loading,
    error,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    resetPassword,
    updatePassword,
    resendEmailVerification,
    signOut
  }
}

export default useAuth