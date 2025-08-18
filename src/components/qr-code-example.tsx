import { useAuth } from "@/context/auth_context";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isValidQRCode } from "@/utils/qr-code-utils";

/**
 * Example component to demonstrate QR code flow
 * This can be used for testing or as a reference
 */
export function QRCodeExample() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();

  const code = searchParams.get("code");
  const isAuthenticated = !!user;
  const hasValidCode = isValidQRCode(code);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>Loading authentication state...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>QR Code Flow Status</CardTitle>
          <CardDescription>Current state of the QR code authentication flow</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Authentication Status:</strong>
              <span className={`ml-2 ${isAuthenticated ? "text-green-600" : "text-red-600"}`}>
                {isAuthenticated ? "Authenticated" : "Not Authenticated"}
              </span>
            </div>
            <div>
              <strong>QR Code Present:</strong>
              <span className={`ml-2 ${hasValidCode ? "text-green-600" : "text-gray-600"}`}>
                {hasValidCode ? "Yes" : "No"}
              </span>
            </div>
            {code && (
              <div className="col-span-2">
                <strong>Code Value:</strong>
                <span className="ml-2 font-mono bg-gray-100 px-2 py-1 rounded">{code}</span>
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2">Expected Behavior:</h4>
            <ul className="text-sm space-y-1">
              {!isAuthenticated && hasValidCode && (
                <li className="text-blue-600">→ Should redirect to /signup?code={code}</li>
              )}
              {isAuthenticated && hasValidCode && (
                <li className="text-green-600">→ Should redirect to /connections?code={code}</li>
              )}
              {!hasValidCode && <li className="text-gray-600">→ No QR code flow triggered</li>}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test QR Code URLs</CardTitle>
          <CardDescription>Use these URLs to test the QR code flow</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm">
            <strong>Company QR Code:</strong>
            <div className="font-mono bg-gray-100 p-2 rounded mt-1 text-xs">
              {window.location.origin}/home?code=COMP_12345
            </div>
          </div>
          <div className="text-sm">
            <strong>Individual QR Code:</strong>
            <div className="font-mono bg-gray-100 p-2 rounded mt-1 text-xs">
              {window.location.origin}/home?code=IND_67890
            </div>
          </div>
          <div className="text-sm">
            <strong>Invalid QR Code:</strong>
            <div className="font-mono bg-gray-100 p-2 rounded mt-1 text-xs">
              {window.location.origin}/home?code=INVALID
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Flow Details</CardTitle>
          <CardDescription>How the QR code flow works</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm space-y-2">
            <div>
              <strong>Case 1 (Not Authenticated):</strong>
              <ul className="ml-4 mt-1 space-y-1">
                <li>• User opens URL with code parameter</li>
                <li>• Redirected to /signup?code=xxx</li>
                <li>• After login, redirected to /connections?code=xxx</li>
                <li>• API called in /connections page</li>
                <li>• On success, navigate to /connections/xxx</li>
              </ul>
            </div>
            <div>
              <strong>Case 2 (Already Authenticated):</strong>
              <ul className="ml-4 mt-1 space-y-1">
                <li>• User opens URL with code parameter</li>
                <li>• Redirected to /connections?code=xxx</li>
                <li>• API called in /connections page</li>
                <li>• On success, navigate to /connections/xxx</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
