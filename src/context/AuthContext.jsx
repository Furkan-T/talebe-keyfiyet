import { createContext, useContext, useState, useEffect } from 'react'
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth'
import { auth } from '../firebase/config'
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore'
import { db } from '../firebase/config'

const AuthContext = createContext(null)

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [userProfile, setUserProfile] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser)
                // Kullanıcı profilini Firestore'dan al veya oluştur
                try {
                    const userDocRef = doc(db, 'users', firebaseUser.uid)
                    const userDoc = await getDoc(userDocRef)

                    if (userDoc.exists()) {
                        setUserProfile({ id: userDoc.id, ...userDoc.data() })
                    } else {
                        // Profil yoksa oluştur (ilk giriş)
                        const newProfile = {
                            email: firebaseUser.email,
                            name: firebaseUser.email.split('@')[0],
                            createdAt: Timestamp.now()
                        }
                        await setDoc(userDocRef, newProfile)
                        setUserProfile({
                            id: firebaseUser.uid,
                            ...newProfile
                        })
                    }
                } catch (error) {
                    console.error('Error fetching/creating user profile:', error)
                    // Hata durumunda temel bilgileri kullan
                    setUserProfile({
                        id: firebaseUser.uid,
                        email: firebaseUser.email,
                        name: firebaseUser.email.split('@')[0]
                    })
                }
            } else {
                setUser(null)
                setUserProfile(null)
            }
            setLoading(false)
        })

        return () => unsubscribe()
    }, [])

    const login = async (email, password) => {
        try {
            const result = await signInWithEmailAndPassword(auth, email, password)
            return { success: true, user: result.user }
        } catch (error) {
            console.error('Login error:', error)
            let message = 'Giriş yapılamadı'
            if (error.code === 'auth/user-not-found') message = 'Kullanıcı bulunamadı'
            else if (error.code === 'auth/wrong-password') message = 'Hatalı şifre'
            else if (error.code === 'auth/invalid-email') message = 'Geçersiz e-posta'
            else if (error.code === 'auth/invalid-credential') message = 'Hatalı e-posta veya şifre'
            return { success: false, error: message }
        }
    }

    const logout = async () => {
        try {
            await signOut(auth)
            return { success: true }
        } catch (error) {
            console.error('Logout error:', error)
            return { success: false, error: 'Çıkış yapılamadı' }
        }
    }

    const value = {
        user,
        userProfile,
        loading,
        login,
        logout,
        isAuthenticated: !!user
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}
