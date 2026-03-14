import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/firebase/firebase_setup";
import { doc, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { getRecipientIdFromStorage } from "@/utils/connectionFlow";
import { syncApplicantProfileToBackend } from "@/utils/syncApplicantProfile";
import { useAuth } from "@/context/auth_context";
import { LoadingScreen } from "@/components/loading-screen";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{10}$/;

export default function ProfileCompletion() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const isPhoneUser = Boolean(user?.phoneNumber && !user?.email);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return <LoadingScreen variant="fullPage" />;
  }

  if (!user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Please fill in first name and last name");
      return;
    }

    if (isPhoneUser) {
      if (!email.trim()) {
        toast.error("Please enter your email address");
        return;
      }
      if (!EMAIL_REGEX.test(email.trim())) {
        toast.error("Please enter a valid email address");
        return;
      }
    } else {
      if (!mobileNumber.trim()) {
        toast.error("Please enter your mobile number");
        return;
      }
      if (!PHONE_REGEX.test(mobileNumber.trim())) {
        toast.error("Please enter a valid 10-digit mobile number");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (isPhoneUser) {
        await syncApplicantProfileToBackend({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          profile_completion_level: 2,
        });
      } else {
        await syncApplicantProfileToBackend({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: mobileNumber.trim(),
          profile_completion_level: 2,
        });
      }

      await setDoc(
        doc(db, "applicants", user.uid),
        {
          email: isPhoneUser ? email.trim() : user.email ?? "",
          profile_completion_level: 2,
        },
        { merge: true }
      );
      toast.success("Profile updated successfully!");

      const pendingId = getRecipientIdFromStorage();
      if (pendingId) {
        navigate(`/?code=${pendingId}`);
      } else {
        navigate("/");
      }
    } catch (error: unknown) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Profile</CardTitle>
            <CardDescription>
              {isPhoneUser
                ? "You signed up with your phone number. Please add your email and name to continue."
                : "All fields are required. Please provide your details to continue."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-3">
                <Label htmlFor="firstName">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter your first name"
                  required
                  aria-required="true"
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="lastName">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter your last name"
                  required
                  aria-required="true"
                  disabled={isSubmitting}
                />
              </div>

              {isPhoneUser ? (
                <div className="grid gap-3">
                  <Label htmlFor="email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    aria-required="true"
                    disabled={isSubmitting}
                  />
                </div>
              ) : (
              <div className="grid gap-3">
                <Label htmlFor="mobileNumber">
                  Mobile Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="mobileNumber"
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="Enter your 10-digit mobile number"
                  maxLength={10}
                  required
                  aria-required="true"
                  disabled={isSubmitting}
                />
              </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Continue"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
