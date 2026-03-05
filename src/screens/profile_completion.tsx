import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth, db } from "@/firebase/firebase_setup";
import { doc, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { getRecipientIdFromStorage } from "@/utils/connectionFlow";
import { syncApplicantProfileToBackend } from "@/utils/syncApplicantProfile";

export default function ProfileCompletion() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !mobileNumber.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    // Basic mobile number validation
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(mobileNumber)) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    setIsSubmitting(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("User not authenticated");
        navigate("/login");
        return;
      }

      // Sync PII to backend (encrypted at rest); backend writes to applicants/{uid}
      await syncApplicantProfileToBackend({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: mobileNumber.trim(),
        profile_completion_level: 2,
      });

      // Keep email and profile_completion_level in Firestore for local reads (non-PII)
      const userDocRef = doc(db, "applicants", user.uid);
      await setDoc(
        userDocRef,
        {
          email: user.email ?? "",
          profile_completion_level: 2,
        },
        { merge: true }
      );

      toast.success("Profile updated successfully!");

      // Check if there's a pending connection code
      const pendingId = getRecipientIdFromStorage();

      if (pendingId) {
        // Navigate to home (Connections) with the code
        navigate(`/?code=${pendingId}`);
      } else {
        navigate("/");
      }
    } catch (error: unknown) {
      console.error("Error updating profile:", error);
      if (error && typeof error === "object" && "code" in error) {
        console.error("Firebase error:", (error as { code?: string }).code, (error as { message?: string }).message);
      }
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
              All fields are required. Please provide your details to continue.
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
