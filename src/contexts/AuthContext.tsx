import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, updateProfile, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

// TODO: Replace with your Firebase configuration
// 1. Go to Firebase Console (https://console.firebase.google.com/)
// 2. Create a new project or select existing one
// 3. Go to Project Settings > General > Your apps
// 4. Add a web app and copy the config object
// 5. Replace the firebaseConfig object below with your config
// 6. Enable Authentication in Firebase Console > Authentication > Sign-in method
// 7. Enable Google sign-in provider

const firebaseConfig = {
  apiKey: "AIzaSyAaVEpqLDiZvsT_QFpRvMwoAejdLzPwMow",
  authDomain: "expense-tracker-6a6e8.firebaseapp.com",
  projectId: "expense-tracker-6a6e8",
  storageBucket: "expense-tracker-6a6e8.firebasestorage.app",
  messagingSenderId: "505544640533",
  appId: "1:505544640533:web:15fdea527900768bcae61c",
  measurementId: "G-1CVKJ06T9B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const { uid, email, displayName, photoURL } = firebaseUser;
        setUser({
          uid,
          email: email || '',
          displayName: displayName || '',
          photoURL: photoURL || undefined,
          createdAt: firebaseUser.metadata.creationTime || ''
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    // user state will be set by onAuthStateChanged
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    // user state will be set by onAuthStateChanged
  };

  const register = async (email: string, password: string, displayName: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName });
    }
    // user state will be set by onAuthStateChanged
  };

  const logout = async () => {
    await signOut(auth);
    // user state will be set by onAuthStateChanged
  };

  const value = {
    user,
    loading,
    login,
    loginWithGoogle,
    register,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
