import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/firebase/firebase_setup";
import { logoutUser } from "@/firebase_auth_service";
import { isSessionExpired, clearSession, fetchPinStatus, PIN_SET_MARKER, clearPinUnlock, PIN_REQUIRED_EVENT } from "@/utils/pin";

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
  /** The server could not be asked whether a PIN exists: stay locked and offer a retry (never "set a new PIN") */
  pinCheckFailed: boolean;
  retryPinCheck: () => Promise<void>;
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
  pinCheckFailed: false,
  retryPinCheck: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinLocked, setPinLockedState] = useState(false);
  // Locking also forgets the unlock token, so the data endpoints are closed again, not just the screen.
  const setPinLocked = (v: boolean) => {
    if (v) clearPinUnlock();
    setPinLockedState(v);
  };
  const [needsPinSetup, setNeedsPinSetup] = useState(false);
  const [pinHash, setPinHash] = useState<string | null>(null);
  const [pinCheckFailed, setPinCheckFailed] = useState(false);

  const applyPinStatus = async () => {
    const status = await fetchPinStatus();
    if (status === "error") {
      // Unknown: keep the app locked behind the PIN screen and let the user retry, instead of offering a new PIN.
      setPinCheckFailed(true);
      setPinHash(PIN_SET_MARKER);
      setNeedsPinSetup(false);
      setPinLocked(true);
      return;
    }
    setPinCheckFailed(false);
    const hash = status === "set" ? PIN_SET_MARKER : null;
    setPinHash(hash);
    setNeedsPinSetup(hash === null);
    setPinLocked(hash !== null); // require unlock on every fresh page load
  };

  // The backend said the unlock expired (403 PIN_REQUIRED): show the PIN screen.
  useEffect(() => {
    const onRequired = () => setPinLocked(true);
    window.addEventListener(PIN_REQUIRED_EVENT, onRequired);
    return () => window.removeEventListener(PIN_REQUIRED_EVENT, onRequired);
  }, []);

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

        // Ask the server whether this account has a PIN
        await applyPinStatus();
        setUser(firebaseUser);
      } else {
        clearPinUnlock();
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
        pinCheckFailed,
        retryPinCheck: applyPinStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
