import { auth, db } from "@/firebase/firebase_setup";
import type { User } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { LoadingScreen } from "@/components/loading-screen";
import { ShieldCheck, Mail, Phone, KeyRound, Download, Trash2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type Applicant = {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone?: string;
  email: string;
  [key: string]: any;
};

const UserData = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [applicantData, setApplicantData] = useState<Applicant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser?.email) {
        try {
          const q = query(
            collection(db, "applicants"),
            where("email", "==", firebaseUser.email)
          );
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            setApplicantData(doc.data() as Applicant);
          }
        } catch (e) {
          console.warn("Could not fetch applicant profile:", e);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDownloadData = () => {
    if (!user) return;
    const exportPayload = {
      user_id: user.uid,
      email: user.email,
      phone: applicantData?.phone || user.phoneNumber || null,
      full_name:
        applicantData?.fullName ||
        [applicantData?.firstName, applicantData?.lastName].filter(Boolean).join(" ") ||
        "Verified Citizen",
      dpdp_compliance: {
        act: "Digital Personal Data Protection Act 2023",
        storage_policy: "Zero retention of unmasked Aadhaar or raw biometric templates",
        export_timestamp: new Date().toISOString(),
      },
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iverifi-profile-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Profile data export downloaded successfully.");
  };

  if (loading) return <LoadingScreen variant="fullPage" message="Loading profile..." />;
  if (!user) return <p className="text-center text-muted-foreground p-8">No user session found.</p>;

  const displayName =
    applicantData?.fullName ||
    [applicantData?.firstName, applicantData?.lastName].filter(Boolean).join(" ") ||
    "Verified iVerifi Citizen";

  return (
    <div className="min-h-0 flex-1 w-full max-w-2xl mx-auto space-y-6 text-foreground">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-700 dark:text-cyan-300 mb-2">
          <ShieldCheck className="h-3.5 w-3.5 text-teal-600 dark:text-cyan-400" />
          DPDP Act 2023 Digital Citizen Portal
        </div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          Account & Privacy Rights
        </h1>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Manage your verified credentials profile, inspect your stored identifier metadata, and exercise your privacy rights under India's DPDP Act 2023.
        </p>
      </div>

      {/* Profile Card */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm backdrop-blur-xl flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center text-white text-xl font-black shadow-md shadow-teal-500/20">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">{displayName}</h2>
            <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Identity Vault Active</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/50 text-xs">
          <div className="rounded-2xl bg-muted/40 p-3.5 border border-border/60 flex items-center gap-3">
            <Mail className="h-4 w-4 text-teal-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Email Address</span>
              <div className="font-semibold text-foreground truncate">{user.email || "Not linked"}</div>
            </div>
          </div>

          <div className="rounded-2xl bg-muted/40 p-3.5 border border-border/60 flex items-center gap-3">
            <Phone className="h-4 w-4 text-teal-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Mobile Number</span>
              <div className="font-semibold text-foreground truncate">{applicantData?.phone || user.phoneNumber || "Verified via OTP"}</div>
            </div>
          </div>

          <div className="rounded-2xl bg-muted/40 p-3.5 border border-border/60 flex items-center gap-3 col-span-1 sm:col-span-2">
            <KeyRound className="h-4 w-4 text-teal-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Anonymous User ID (UID)</span>
              <div className="font-mono text-[11px] text-muted-foreground truncate">{user.uid}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Security & Cryptographic Privacy Disclosure */}
      <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
          <Lock className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          <span>Zero Knowledge & Storage Architecture</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          iVerifi adheres to strict data minimization. We never store raw 12-digit Aadhaar numbers or unencrypted identity documents. All credentials remain encrypted, and recipients only receive cryptographic verification proofs for the agreed duration.
        </p>
      </div>

      {/* Action Buttons: Export & Delete */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <Button
          type="button"
          onClick={handleDownloadData}
          variant="outline"
          className="w-full sm:w-auto flex-1 h-11 rounded-xl text-xs font-bold border-border gap-2 cursor-pointer hover:bg-muted"
        >
          <Download className="h-4 w-4 text-teal-600 dark:text-cyan-400" />
          <span>Download My Data (JSON)</span>
        </Button>

        <Button
          type="button"
          onClick={() => navigate("/account-deletion")}
          variant="ghost"
          className="w-full sm:w-auto h-11 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 gap-2 cursor-pointer"
        >
          <Trash2 className="h-4 w-4" />
          <span>Request Account Deletion</span>
        </Button>
      </div>
    </div>
  );
};

export default UserData;
