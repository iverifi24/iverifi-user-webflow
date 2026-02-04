import { db } from "@/firebase/firebase_setup";
import { doc, getDoc } from "firebase/firestore";

export const checkCredentials = async (credentialRequestId: string): Promise<boolean> => {
  console.log(credentialRequestId);
  try {
    const userDocRef = doc(db, "credential_requests", credentialRequestId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      console.log("No document found");
      return false;
    }
    
    const data = userDoc.data();
    console.log(data);
    const doc_name = data?.credentials?.[0]?.document_type;

    if (!doc_name) return false;

    return true;
  } catch (error: any) {
    console.log("Error in checkCredentials:", error);
    // Handle permissions error - user may not have access to this document yet
    // Firebase permission errors can have different formats:
    // - error.code === "permission-denied"
    // - error.message includes "permissions" or "Missing or insufficient permissions"
    const isPermissionError = 
      error?.code === "permission-denied" || 
      error?.code === "PERMISSION_DENIED" ||
      error?.message?.toLowerCase().includes("permissions") ||
      error?.message?.toLowerCase().includes("missing or insufficient");
    
    if (isPermissionError) {
      // This is expected if credentials haven't been shared yet
      console.log("Permission denied - credentials not shared yet (expected behavior)");
      return false;
    }
    // Re-throw other errors
    throw error;
  }
};