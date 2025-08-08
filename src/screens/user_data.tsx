import { auth, db } from "@/firebase/firebase_setup";
import type { User } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";

type Applicant = {
  fullName?: string;
  phone?: string;
  email: string;
  [key: string]: any; // fallback for unknown keys
};

const UserData = () => {
  const [user, setUser] = useState<User | null>(null);
  const [applicantData, setApplicantData] = useState<Applicant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser?.email) {
        const q = query(
          collection(db, "applicants"),
          where("email", "==", firebaseUser.email)
        );

        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          setApplicantData(doc.data() as Applicant);
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <p>Loading user data...</p>;
  if (!user || !applicantData) return <p>No data found.</p>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-2">User Info</h2>
      <ul className="list-disc list-inside text-sm">
        <li>
          <strong>UID:</strong> {user.uid}
        </li>
        <li>
          <strong>Email:</strong> {user.email}
        </li>
        <li>
          <strong>Full Name:</strong> {applicantData.firstName}
        </li>
        <li>
          <strong>Phone:</strong> {applicantData.phone}
        </li>
        {/* Add more fields as needed */}
      </ul>
    </div>
  );
};

export default UserData;
