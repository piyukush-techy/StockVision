// context/AuthContext.jsx — Firebase auth + Firestore user profile
import { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged, signOut,
  signInWithPopup, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(null);   // Firebase user
  const [profile,     setProfile]     = useState(null);   // Firestore profile
  const [loading,     setLoading]     = useState(true);
  const [needsProfile, setNeedsProfile] = useState(false); // show profile modal

  // Listen to Firebase auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await loadOrCreateProfile(firebaseUser);
      } else {
        setUser(null);
        setProfile(null);
        setNeedsProfile(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // Load profile from Firestore; if new user, flag profile modal
  async function loadOrCreateProfile(firebaseUser) {
    const ref  = doc(db, 'users', firebaseUser.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      setProfile(data);
      // If profile incomplete (no phone saved), show modal again
      setNeedsProfile(!data.profileComplete);
    } else {
      // Brand new user — create skeleton doc
      const newProfile = {
        uid:             firebaseUser.uid,
        email:           firebaseUser.email,
        displayName:     firebaseUser.displayName || '',
        photoURL:        firebaseUser.photoURL    || '',
        phone:           '',
        location:        '',
        occupation:      '',
        investmentStyle: '',
        experience:      '',
        riskTolerance:   '',
        bio:             '',
        profileComplete: false,
        createdAt:       serverTimestamp(),
        lastLogin:       serverTimestamp()
      };
      await setDoc(ref, newProfile);
      setProfile(newProfile);
      setNeedsProfile(true);
    }
    // Always update lastLogin
    await updateDoc(ref, { lastLogin: serverTimestamp() }).catch(() => {});
  }

  // Save / update profile fields
  async function saveProfile(fields) {
    if (!user) return;
    const ref = doc(db, 'users', user.uid);
    const updated = { ...fields, profileComplete: true };
    await updateDoc(ref, updated);
    setProfile(prev => ({ ...prev, ...updated }));
    setNeedsProfile(false);
    // Also update Firebase display name
    if (fields.displayName) {
      await updateProfile(auth.currentUser, { displayName: fields.displayName }).catch(() => {});
    }
  }

  // Google sign-in
  async function loginWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  }

  // Email sign-in
  async function loginWithEmail(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  }

  // Email sign-up
  async function signupWithEmail(email, password, displayName) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName });
    return result.user;
  }

  async function logout() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading, needsProfile,
      loginWithGoogle, loginWithEmail, signupWithEmail,
      saveProfile, logout, setNeedsProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
