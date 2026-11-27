import { Download, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { aadhaarAppStoreLink, isAndroidBrowser } from "@/utils/aadhaarApp";

/**
 * How a person shares their Aadhaar: the code on screen is read by the Aadhaar App. Most people are on their phone, so they save (or screenshot) the code and pick it
 * from the gallery inside the Aadhaar App; on a computer they scan it with the phone camera in the app. There is no link that opens the app for them (the address
 * VSign returns points at a domain that is not UIDAI's), so this is the way, with a way to install the app first.
 */
export function AadhaarQrSteps({ image }: { image: string | null }) {
  const store = aadhaarAppStoreLink();
  const phone = typeof navigator !== "undefined" && /android|iphone|ipad|ipod/i.test(navigator.userAgent);
  return (
    <div className="space-y-4">
      {image ? (
        <>
          <img src={image} alt="QR code for the Aadhaar App" className="mx-auto h-52 w-52 rounded-lg border bg-white p-1" />
          <Button asChild variant="outline" className="w-full">
            <a href={image} download="aadhaar-share-code.png">
              <Download className="mr-2 h-4 w-4" /> Save this code to my phone
            </a>
          </Button>
        </>
      ) : (
        <p className="text-sm text-red-600">The code could not be shown. Please try again.</p>
      )}

      <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
        {phone ? (
          <>
            <li>Save the code above, or take a screenshot of it.</li>
            <li>Open the Aadhaar App and choose Scan QR.</li>
            <li>In the scanner, choose the gallery option and select the saved code.</li>
          </>
        ) : (
          <>
            <li>Open the Aadhaar App on your phone and choose Scan QR.</li>
            <li>Point the camera at the code above.</li>
          </>
        )}
        <li>Agree to share, then come back to this page.</li>
      </ol>

      <div className="rounded-lg border bg-slate-50 p-3 text-sm">
        <p className="font-medium text-slate-800">Do not have the Aadhaar App?</p>
        <p className="mt-0.5 text-muted-foreground">Install the Aadhaar App from UIDAI, sign in with your Aadhaar, then come back to this page and scan the code.</p>
        {store ? (
          <Button asChild size="sm" className="mt-2">
            <a href={store} target="_blank" rel="noreferrer">
              <Smartphone className="mr-2 h-4 w-4" /> Install the Aadhaar App
            </a>
          </Button>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">{isAndroidBrowser() ? "" : "On an iPhone, search for “Aadhaar” by UIDAI on the App Store."}</p>
        )}
      </div>

      <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Waiting for you to share. This stays open for 10 minutes.
      </p>
    </div>
  );
}
