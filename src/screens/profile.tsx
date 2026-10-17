import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, CalendarDays, History, Lock, Mail, Phone, ShieldCheck, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LivePhotoCard } from "@/components/live-photo-card";
import { PhotoCheckChip } from "@/components/photo-check-chip";
import { auth } from "@/firebase/firebase_setup";
import { useLivePhotoAvatar } from "@/hooks/use-live-photo-avatar";
import { useGetCredentialsQuery } from "@/redux/api";
import { getApplicantProfileFromBackend } from "@/utils/syncApplicantProfile";
import { verifiedViaLabel } from "@/utils/verificationSource";

interface Profile {
  name: string;
  email: string;
  phone: string;
  dob: string;
  dobSource: string;
}

interface CredentialRow {
  id: string;
  document_type?: string | null;
  verification_status?: string;
  verified_via?: string | null;
  photo_check?: string | null;
  photo_user_answer?: boolean | null;
  is_family_member?: boolean;
}

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
/** dates are shown as DD-MM-YYYY whatever shape they are stored in */
const asDdMmYyyy = (v: string) => {
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  return iso ? `${iso[3]}-${iso[2]}-${iso[1]}` : v;
};
const docLabel = (t?: string | null) => (t ? t.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "Document");
const initialsOf = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  return (parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0].slice(0, 2)).toUpperCase();
};

function Detail({ icon: Icon, label, value, hint }: { icon: typeof Mail; label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/40 p-3.5">
      <Icon className="h-4 w-4 shrink-0 text-teal-600" />
      <div className="min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className="truncate text-sm font-semibold text-foreground">{value || "Not added"}</div>
        {value && hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
      </div>
    </div>
  );
}

/** The person's profile: photo, details, live photo and verified documents in one place. */
export default function ProfilePage() {
  const navigate = useNavigate();
  const livePhoto = useLivePhotoAvatar();
  const { data: creds } = useGetCredentialsQuery();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [googlePhoto, setGooglePhoto] = useState("");

  useEffect(() => {
    let cancelled = false;
    const user = auth.currentUser;
    setGooglePhoto(user?.photoURL || "");
    getApplicantProfileFromBackend()
      .then((p) => {
        if (cancelled) return;
        const name = [text(p.firstName), text(p.lastName)].filter(Boolean).join(" ") || text(p.name) || user?.displayName || "";
        setProfile({ name, email: text(p.email) || user?.email || "", phone: text(p.phone) || text(p.phoneNumber) || user?.phoneNumber || "", dob: asDdMmYyyy(text(p.dob)), dobSource: text(p.dob_source) });
      })
      .catch(() => {
        if (!cancelled) setProfile({ name: user?.displayName || "", email: user?.email || "", phone: user?.phoneNumber || "", dob: "", dobSource: "" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const documents = ((creds?.data?.credential ?? []) as CredentialRow[]).filter((c) => !c.is_family_member && (c.verification_status === "auto_approved" || c.verification_status === "approved"));

  return (
    <div className="mx-auto min-h-0 w-full max-w-2xl flex-1 space-y-6 text-foreground">
      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20 rounded-2xl border border-border">
          <AvatarImage src={livePhoto || googlePhoto} alt={profile?.name || "You"} className="object-cover" />
          <AvatarFallback className="rounded-2xl bg-sky-500/20 text-2xl font-black text-foreground">{initialsOf(profile?.name || "")}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-black tracking-tight">{profile?.name || "Your profile"}</h1>
          <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Identity vault active</span>
          </div>
          {!livePhoto && <p className="mt-1 text-xs text-muted-foreground">Add a live photo below and it becomes your profile picture.</p>}
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Details</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Detail icon={Mail} label="Email" value={profile?.email ?? ""} />
          <Detail icon={Phone} label="Mobile" value={profile?.phone ?? ""} />
          <Detail icon={CalendarDays} label="Date of birth" value={profile?.dob ?? ""} hint={profile?.dobSource ? `From your verified ${profile.dobSource}` : undefined} />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Live photo</h2>
        <LivePhotoCard />
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Verified documents</h2>
        {documents.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card/60 p-4 text-sm text-muted-foreground">No verified documents yet.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card/60">
            {documents.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <BadgeCheck className="h-4 w-4 text-emerald-500" />
                  {docLabel(d.document_type)}
                  {verifiedViaLabel(d.verified_via) && <span className="text-xs font-normal text-muted-foreground">via {verifiedViaLabel(d.verified_via)}</span>}
                </div>
                <PhotoCheckChip decision={d.photo_check} userAnswer={d.photo_user_answer} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {[
          { to: "/my-activity", label: "My activity", icon: History },
          { to: "/family-ids", label: "Family IDs", icon: Users },
          { to: "/user-data", label: "Privacy & data", icon: Lock },
        ].map(({ to, label, icon: Icon }) => (
          <button key={to} type="button" onClick={() => navigate(to)} className="flex items-center gap-2 rounded-2xl border border-border bg-card/60 p-3 text-left text-sm font-semibold hover:bg-muted">
            <Icon className="h-4 w-4 text-teal-600" />
            {label}
          </button>
        ))}
      </section>
    </div>
  );
}
