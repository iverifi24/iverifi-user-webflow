import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/firebase/firebase_setup";
import { logoutUser } from "@/firebase_auth_service";
import { isSessionExpired, clearSession, fetchPinHash } from "@/utils/pin";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  pinLocked: boolean;
  needsPinSetup: boolean;
  /** SHA-256 hash of the PIN fetched from Firestore; null = no PIN set yet */
  pinHash: string | null;
  setPinLocked: (v: boolean) => void;
  setNeedsPinSetup: (v: boolean) => void;
  /** Called after saving a new PIN so context updates without a re-fetch */
  setPinHash: (hash: string) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  pinLocked: false,
  needsPinSetup: false,
  pinHash: null,
  setPinLocked: () => {},
  setNeedsPinSetup: () => {},
  setPinHash: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinLocked, setPinLocked] = useState(false);
  const [needsPinSetup, setNeedsPinSetup] = useState(false);
  const [pinHash, setPinHash] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Enforce 30-day session expiry
        if (isSessionExpired(firebaseUser.uid)) {
          clearSession();
          await logoutUser();
          setUser(null);
          setPinHash(null);
          setPinLocked(false);
          setNeedsPinSetup(false);
          setLoading(false);
          return;
        }

        // Fetch PIN hash from Firestore (source of truth)
        const hash = await fetchPinHash(firebaseUser.uid);
        setPinHash(hash);
        setNeedsPinSetup(hash === null);
        setPinLocked(hash !== null); // require unlock on every fresh page load
        setUser(firebaseUser);
      } else {
        setUser(null);
        setPinHash(null);
        setPinLocked(false);
        setNeedsPinSetup(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        pinLocked,
        needsPinSetup,
        pinHash,
        setPinLocked,
        setNeedsPinSetup,
        setPinHash,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
