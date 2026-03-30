import { cn } from "@/lib/utils";
import { PhoneLoginForm } from "@/components/phone-login-form";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import {
  getRecipientIdFromStorage,
  saveRecipientIdForLater,
  peekRecipientIdFromStorage,
} from "@/utils/connectionFlow";
import { useAddConnectionMutation } from "@/redux/api";
import { isTermsAccepted } from "@/utils/terms";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/firebase_setup";
import { saveUserDetailsToFirestore } from "@/utils/userRegistration";

export function LoginForm({
  className,
  navigate,
  ...props
}: React.ComponentProps<"div"> & { navigate?: (path: string) => void }) {
  const defaultNavigate = useNavigate();
  const nav = navigate || defaultNavigate;
  const [searchParams] = useSearchParams();
  const [addConnection] = useAddConnectionMutation();

  useEffect(() => {
    const codeFromUrl =
      searchParams.get("code") || searchParams.get("recipientId");
    if (codeFromUrl) {
      try {
        saveRecipientIdForLater(codeFromUrl);
      } catch (e) {
        console.error("Failed to persist code:", e);
      }
    }
  }, [searchParams]);

  const postLoginCheck = async () => {
    const user = auth.currentUser;
    if (!user) {
      nav("/");
      return;
    }

    const termsAccepted = await isTermsAccepted(user.uid);

    if (!termsAccepted) {
      const pendingId = peekRecipientIdFromStorage();
      const redirectUrl = pendingId
        ? `/accept-terms?code=${pendingId}`
        : "/accept-terms";
      nav(redirectUrl);
      return;
    }

    const pendingId = getRecipientIdFromStorage();
    if (pendingId) {
      try {
        await addConnection({ document_id: pendingId, type: "Company" }).unwrap();
        nav(`/?code=${pendingId}`);
      } catch (err) {
        console.error("Failed to add connection after login", err);
        nav("/");
      }
    } else {
      nav("/");
    }
  };

  const handlePhoneSuccess = async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        const userDocRef = doc(db, "applicants", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          await saveUserDetailsToFirestore(user);
        }
      } catch (e) {
        console.error("Error saving user details after phone login:", e);
      }
    }
    await postLoginCheck();
  };

  return (
    <div className={cn("flex flex-col gap-4", className)} {...props}>
      <PhoneLoginForm onSuccess={handlePhoneSuccess} />
      <p className="text-center text-[10px] leading-snug text-slate-500 sm:text-[11px] md:text-xs">
        Data protected under DPDP Act 2023.
      </p>
    </div>
  );
}
