import { cn } from "@/lib/utils";
import { PhoneLoginForm } from "@/components/phone-login-form";
import { auth, db } from "@/firebase/firebase_setup";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import {
  getRecipientIdFromStorage,
  saveRecipientIdForLater,
  peekRecipientIdFromStorage,
} from "@/utils/connectionFlow";
import { saveUserDetailsToFirestore } from "@/utils/userRegistration";
import { isTermsAccepted } from "@/utils/terms";
import { useAddConnectionMutation } from "@/redux/api";
import { doc, getDoc } from "firebase/firestore";

export function SignupForm({
  className,
  navigate,
  ...props
}: React.ComponentProps<"div"> & {
  navigate?: (path: string, options?: { replace?: boolean }) => void;
}) {
  const defaultNavigate = useNavigate();
  const nav = (navigate ?? defaultNavigate) as (
    path: string,
    options?: { replace?: boolean }
  ) => void;
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

  const postSignupCheck = async () => {
    const user = auth.currentUser;
    if (!user) {
      nav("/", { replace: true });
      return;
    }

    const termsAccepted = await isTermsAccepted(user.uid);

    if (!termsAccepted) {
      const code =
        searchParams.get("code") ||
        searchParams.get("recipientId") ||
        peekRecipientIdFromStorage();
      const redirectUrl = code
        ? `/accept-terms?code=${code}`
        : "/accept-terms";
      nav(redirectUrl, { replace: true });
      return;
    }

    const pendingId = getRecipientIdFromStorage();
    if (pendingId) {
      try {
        await addConnection({ document_id: pendingId, type: "Company" }).unwrap();
        nav(`/?code=${pendingId}`, { replace: true });
      } catch (err) {
        console.error("Failed to add connection after signup", err);
        nav("/", { replace: true });
      }
    } else {
      nav("/", { replace: true });
    }
  };

  const handlePhoneSignupSuccess = async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        const userDocRef = doc(db, "applicants", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          await saveUserDetailsToFirestore(user);
        }
      } catch (e) {
        console.error("Error saving user details after phone signup:", e);
      }
    }
    await postSignupCheck();
  };

  return (
    <div className={cn("flex flex-col gap-4", className)} {...props}>
      <PhoneLoginForm onSuccess={handlePhoneSignupSuccess} />
      <p className="text-center text-[10px] leading-snug text-slate-500 sm:text-[11px] md:text-xs">
        Data protected under DPDP Act 2023.
      </p>
    </div>
  );
}
