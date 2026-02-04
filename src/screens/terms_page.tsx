import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import iverifiLogo from "../assets/new_no_bg.png"

export default function TermsPage() {
  const navigate = useNavigate();

  const handleClose = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <header className="bg-background shadow-md sticky top-0 z-10">
        <div
          className="h-1"
          style={{
            background: "linear-gradient(to right, #FF9933 0%, #FFFFFF 50%, #138808 100%)",
          }}
        />
        <div className="max-w-4xl mx-auto px-4 py-2 sm:py-0">
          <div className="flex items-center justify-between">
            <div className="flex justify-center items-center mb-0 sm:mb-0">
              <div className="text-primary-foreground p-2 sm:p-3 md:p-4 rounded-full">
                <img 
                  src={iverifiLogo} 
                  alt="Iverifi Icon"
                  className="w-12 h-12 md:w-12 md:h-12 object-contain" 
                />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-foreground">iVerifi</h1>
                <p className="text-xs text-muted-foreground">Terms & Conditions</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
              className="text-xs sm:text-sm"
            >
              Close
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-4 sm:py-6 pb-20 sm:pb-24">
        <Card className="p-4 sm:p-6 md:p-8">
          <div className="max-w-none">
            <div className="bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-600 p-3 sm:p-4 mb-4 sm:mb-6 rounded">
              <p className="text-xs sm:text-sm text-blue-900 dark:text-blue-100 font-semibold mb-1">
                Last Updated: January 5, 2026
              </p>
              <p className="text-xs text-blue-800 dark:text-blue-200">
                Version 2.0 | Effective Date: January 1, 2026
              </p>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              By accessing and using iVerifi services ("Service"), you agree to be bound by these
              Terms & Conditions and our Privacy Policy. If you do not agree to these terms, you
              must not use our Service.
            </p>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              These Terms constitute a legally binding agreement between you ("User", "You") and
              iVerifi IAM Private Limited ("iVerifi", "We", "Us", "Our").
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              2. Service Description
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-2 sm:mb-3">
              iVerifi provides identity verification services using advanced KYC (Know Your
              Customer) technology. Our Service facilitates real-time connections to official
              government portals and databases including:
            </p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>DigiLocker (Ministry of Electronics & IT)</li>
              <li>Parivahan (Ministry of Road Transport & Highways)</li>
              <li>e-Filing Portal (Income Tax Department)</li>
              <li>Passport Seva (Ministry of External Affairs)</li>
              <li>Other authorized government sources</li>
            </ul>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              Our Service enables hotels, educational institutions, and other authorized entities to
              verify user identity for legitimate purposes such as check-in, registration, and
              compliance with legal requirements.
            </p>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              2.1 Third-Party Verification Technology
            </h3>
            <div className="bg-purple-50 dark:bg-purple-950/20 border-2 border-purple-200 dark:border-purple-800 rounded-xl p-3 sm:p-4 my-3 sm:my-4">
              <p className="text-sm sm:text-base text-muted-foreground mb-2">
                <strong>iVerifi uses Kwik ID</strong> as our certified KYC verification technology
                partner to authenticate your identity documents with government databases.
              </p>

              <p className="text-xs sm:text-sm font-bold text-purple-900 dark:text-purple-100 mt-3 mb-2">
                How It Works:
              </p>
              <ol className="list-decimal list-inside text-xs sm:text-sm text-purple-800 dark:text-purple-200 space-y-1 ml-2">
                <li>You initiate verification at a hotel or institution</li>
                <li>iVerifi sends your verification request to Kwik ID</li>
                <li>Kwik ID securely connects to government portals (DigiLocker, Parivahan, e-Filing)</li>
                <li>Government portal authenticates your document</li>
                <li>Kwik ID receives result (verified ✓ or not verified ✗)</li>
                <li>Kwik ID sends result back to iVerifi</li>
                <li>iVerifi shares result with the requesting hotel/institution</li>
              </ol>

              <p className="text-xs sm:text-sm font-bold text-purple-900 dark:text-purple-100 mt-3 mb-2">
                Data Protection:
              </p>
              <ul className="list-disc list-inside text-xs sm:text-sm text-purple-800 dark:text-purple-200 space-y-1 ml-2">
                <li>Kwik ID operates under a strict Data Processing Agreement with iVerifi</li>
                <li>Kwik ID is ISO 27001 certified for information security</li>
                <li>Kwik ID complies with DPDP Act 2023 and IT Act 2000</li>
                <li>Kwik ID does NOT store your identity documents</li>
                <li>Kwik ID deletes verification data immediately after processing</li>
              </ul>

              <p className="text-xs sm:text-sm font-bold text-purple-900 dark:text-purple-100 mt-3 mb-1">
                Your Consent:
              </p>
              <p className="text-xs sm:text-sm text-purple-800 dark:text-purple-200">
                By using iVerifi, you consent to Kwik ID processing your verification request as our
                authorized service provider under strict data protection standards.
              </p>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              3. Eligibility
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">You must be:</p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>At least 18 years of age, or have parental/guardian consent</li>
              <li>A resident or citizen of India</li>
              <li>Capable of entering into a legally binding agreement</li>
              <li>In possession of valid government-issued identity documents</li>
            </ul>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              4. User Registration & Account
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">To use our Service, you must:</p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Promptly update any changes to your information</li>
              <li>Notify us immediately of any unauthorized access</li>
            </ul>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              You are responsible for all activities that occur under your account.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              5. How iVerifi Works
            </h2>
            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              5.1 Verification Process
            </h3>
            <ol className="list-decimal list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>You initiate verification at a partner location (hotel, institution)</li>
              <li>You provide consent to verify your identity</li>
              <li>iVerifi sends request to Kwik ID verification platform</li>
              <li>Kwik ID redirects you to official government portal (DigiLocker, etc.)</li>
              <li>You authenticate with your government credentials (OTP, Aadhaar, etc.)</li>
              <li>Government portal verifies your document authenticity</li>
              <li>Kwik ID receives verification result from government portal</li>
              <li>Verification result (verified/not verified) is returned to iVerifi</li>
              <li>iVerifi shares result with the requester (hotel/institution)</li>
              <li>Your document data is NOT stored by iVerifi or Kwik ID</li>
            </ol>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              5.2 Zero-Knowledge Architecture
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              iVerifi and Kwik ID operate on a zero-knowledge architecture:
            </p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>We do NOT store your identity documents</li>
              <li>We do NOT store document numbers, photos, or personal details</li>
              <li>We do NOT store biometric information</li>
              <li>Verification happens directly between you and government portals</li>
              <li>We receive only a verification status (success/failure)</li>
            </ul>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              6. Data Collection & Processing
            </h2>
            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              6.1 What We Collect
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              We collect and process the following information:
            </p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>
                <strong>Verification Metadata:</strong> Timestamp, document type (Aadhaar/PAN/DL),
                verification result (success/failure), verification source (DigiLocker/e-Filing)
              </li>
              <li>
                <strong>Session Information:</strong> Unique session ID, hotel/institution
                identifier, location of verification
              </li>
              <li>
                <strong>Device Information:</strong> IP address, browser type, device type,
                operating system (for security and fraud prevention)
              </li>
              <li>
                <strong>Transaction Records:</strong> Check-in time, check-out time (where
                applicable)
              </li>
            </ul>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              6.2 What We DO NOT Collect
            </h3>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>Your actual identity documents (Aadhaar, PAN, Passport, Driving License)</li>
              <li>Document numbers or identification numbers</li>
              <li>Personal details (name, date of birth, address)</li>
              <li>Photographs from documents</li>
              <li>Biometric information (fingerprints, iris scans)</li>
              <li>Financial information</li>
            </ul>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              7. Data Sharing & Disclosure
            </h2>
            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              7.1 Sharing with Service Providers
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              We share verification results with:
            </p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>
                <strong>Hotels & Lodging Facilities:</strong> Verification status for guest
                check-in compliance
              </li>
              <li>
                <strong>Educational Institutions:</strong> Verification status for student
                registration
              </li>
              <li>
                <strong>Other Authorized Requesters:</strong> Only entities where you initiated
                verification
              </li>
            </ul>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              <strong>Important:</strong> Only verification status (verified/not verified) is
              shared, never your actual documents.
            </p>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              7.2 Sharing with Third-Party Technology Partners
            </h3>
            <div className="bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-500 p-3 sm:p-4 my-3 sm:my-4 rounded">
              <p className="text-xs sm:text-sm font-bold text-blue-900 dark:text-blue-100 mb-2">
                Kwik ID - Identity Verification Partner
              </p>
              <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 mb-2">
                We share limited data with Kwik ID to perform identity verification:
              </p>

              <p className="text-xs sm:text-sm font-bold text-blue-900 dark:text-blue-100 mb-1">
                Data Shared with Kwik ID:
              </p>
              <ul className="list-disc list-inside text-xs sm:text-sm text-blue-800 dark:text-blue-200 space-y-1 ml-2">
                <li>Verification request metadata (document type, timestamp)</li>
                <li>Session identifier</li>
                <li>Hotel/institution identifier</li>
              </ul>

              <p className="text-xs sm:text-sm font-bold text-blue-900 dark:text-blue-100 mt-2 mb-1">
                Data NOT Shared with Kwik ID:
              </p>
              <ul className="list-disc list-inside text-xs sm:text-sm text-blue-800 dark:text-blue-200 space-y-1 ml-2">
                <li>Your actual identity documents</li>
                <li>Document numbers or personal details</li>
                <li>Biometric information</li>
              </ul>

              <p className="text-xs sm:text-sm font-bold text-blue-900 dark:text-blue-100 mt-2 mb-1">
                Kwik ID's Obligations:
              </p>
              <ul className="list-disc list-inside text-xs sm:text-sm text-blue-800 dark:text-blue-200 space-y-1 ml-2">
                <li>Bound by Data Processing Agreement (DPA) with iVerifi</li>
                <li>ISO 27001 certified for information security</li>
                <li>Must delete data immediately after verification</li>
                <li>Cannot use data for any purpose other than verification</li>
                <li>Subject to regular security audits</li>
              </ul>
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              7.3 Sharing with Government Authorities
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              We may disclose verification records to government authorities when:
            </p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>
                <strong>Legal Orders:</strong> Court orders, subpoenas, or warrants require
                disclosure
              </li>
              <li>
                <strong>Law Enforcement:</strong> Valid requests from police or investigating
                agencies
              </li>
              <li>
                <strong>Statutory Obligations:</strong> Compliance with Hotel & Restaurant
                regulations, FRRO requirements
              </li>
              <li>
                <strong>Tax Authorities:</strong> When mandated by tax laws or regulations
              </li>
              <li>
                <strong>National Security:</strong> When necessary for national security or public
                safety
              </li>
              <li>
                <strong>Government Audits:</strong> Compliance audits by regulatory authorities
              </li>
            </ul>

            <div className="bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 p-3 sm:p-4 my-3 sm:my-4 rounded">
              <p className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-100 mb-1">
                What Gets Shared with Authorities:
              </p>
              <ul className="list-disc list-inside text-amber-800 dark:text-amber-200 text-xs sm:text-sm space-y-1">
                <li>Verification metadata (timestamp, result, source)</li>
                <li>Session information (hotel, location, dates)</li>
                <li>Device information (IP address, for investigations)</li>
              </ul>
              <p className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-100 mt-2">
                What Does NOT Get Shared:
              </p>
              <ul className="list-disc list-inside text-amber-800 dark:text-amber-200 text-xs sm:text-sm space-y-1">
                <li>Your actual documents or document numbers</li>
                <li>Personal details beyond what's necessary</li>
                <li>Biometric information (we don't have it)</li>
              </ul>
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              7.4 No Third-Party Marketing
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">We will NEVER:</p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>Sell your data to third parties</li>
              <li>Share data for marketing purposes</li>
              <li>Allow unauthorized access to your information</li>
              <li>Share data with advertisers or data brokers</li>
            </ul>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              8. Data Retention
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              Verification records are retained as follows:
            </p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>
                <strong>Standard Retention:</strong> 3 years from date of verification (as required
                by Hotel & Restaurant regulations)
              </li>
              <li>
                <strong>Extended Retention:</strong> Up to 7 years if involved in legal proceedings
                or investigations
              </li>
              <li>
                <strong>Automatic Deletion:</strong> After the retention period expires, all records
                are permanently deleted
              </li>
              <li>
                <strong>User Request:</strong> You may request early deletion subject to legal
                retention requirements
              </li>
            </ul>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              9. Security Measures
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              We implement industry-standard security measures:
            </p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>
                <strong>Encryption:</strong> 256-bit SSL/TLS encryption for all data transmission
              </li>
              <li>
                <strong>Secure APIs:</strong> Direct, encrypted connections to government portals
                via Kwik ID
              </li>
              <li>
                <strong>Access Controls:</strong> Role-based access, multi-factor authentication
              </li>
              <li>
                <strong>Audit Logging:</strong> Complete audit trail of all data access
              </li>
              <li>
                <strong>Regular Audits:</strong> Quarterly security audits and penetration testing
              </li>
              <li>
                <strong>ISO 27001:</strong> Compliance with information security standards
              </li>
              <li>
                <strong>Data Minimization:</strong> Only essential metadata is stored
              </li>
            </ul>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              10. Your Rights
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              Under Indian data protection laws, you have the right to:
            </p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>
                <strong>Access:</strong> Request copies of your verification history and metadata
              </li>
              <li>
                <strong>Correction:</strong> Request correction of inaccurate information
              </li>
              <li>
                <strong>Deletion:</strong> Request deletion of your data (subject to legal
                retention requirements)
              </li>
              <li>
                <strong>Portability:</strong> Receive your data in a machine-readable format
              </li>
              <li>
                <strong>Withdrawal:</strong> Withdraw consent for future processing (does not
                affect past verifications)
              </li>
              <li>
                <strong>Complaint:</strong> Lodge complaints with the Data Protection Authority of
                India
              </li>
              <li>
                <strong>Objection:</strong> Object to processing based on legitimate interests
              </li>
            </ul>

            <div className="bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-500 p-3 sm:p-4 my-3 sm:my-4 rounded">
              <p className="text-xs sm:text-sm font-bold text-blue-900 dark:text-blue-100 mb-2">
                To Exercise Your Rights:
              </p>
              <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200">
                Email:{" "}
                <a href="mailto:admin@iverifi.io" className="underline">
                  admin@iverifi.io
                </a>
              </p>
              <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200">
                Response Time: Within 30 days
              </p>
              <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 mt-2">
                Please include: Your registered email/phone, specific request, verification of
                identity
              </p>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              11. User Obligations
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">You agree to:</p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>Provide accurate and truthful information</li>
              <li>Use the Service only for lawful purposes</li>
              <li>Not attempt to circumvent security measures</li>
              <li>Not reverse engineer or tamper with the Service</li>
              <li>Not use the Service to commit fraud or identity theft</li>
              <li>Comply with all applicable laws and regulations</li>
              <li>Maintain confidentiality of your credentials</li>
            </ul>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              12. Prohibited Uses
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              You may NOT use iVerifi to:
            </p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>Impersonate another person or provide false information</li>
              <li>Attempt to gain unauthorized access to systems or data</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Use automated tools to access the Service (bots, scrapers)</li>
              <li>Collect or harvest user information without consent</li>
              <li>Violate any applicable laws or regulations</li>
            </ul>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              13. Intellectual Property
            </h2>
            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              13.1 Ownership
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              All intellectual property rights in the Service, including but not limited to:
            </p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>Software, algorithms, and source code</li>
              <li>Trademarks, logos, and branding ("iVerifi")</li>
              <li>Website design, user interface, and graphics</li>
              <li>Documentation and content</li>
            </ul>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              belong exclusively to iVerifi IAM Private Limited or our licensors.
            </p>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              13.2 Limited License
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              We grant you a limited, non-exclusive, non-transferable, revocable license to use the
              Service solely for its intended purpose of identity verification. This license does
              not include any right to:
            </p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>Copy, modify, or create derivative works</li>
              <li>Reverse engineer, decompile, or disassemble the Service</li>
              <li>Use our trademarks or branding without written permission</li>
              <li>Remove any copyright or proprietary notices</li>
            </ul>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              14. Limitation of Liability
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">iVerifi is not liable for:</p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>
                <strong>Third-Party Services:</strong> Downtime or errors from government portals
                (DigiLocker, Parivahan, etc.) or Kwik ID platform
              </li>
              <li>
                <strong>Data Accuracy:</strong> Incorrect data provided by government sources
              </li>
              <li>
                <strong>Service Interruptions:</strong> Temporary unavailability due to maintenance
                or technical issues
              </li>
              <li>
                <strong>Consequential Damages:</strong> Loss of business, profits, or opportunities
              </li>
              <li>
                <strong>Partner Actions:</strong> Actions taken by hotels or institutions based on
                verification results
              </li>
              <li>
                <strong>User Error:</strong> Mistakes or misrepresentations by users
              </li>
            </ul>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              <strong>Maximum Liability:</strong> Our total liability shall not exceed ₹10,000 (ten
              thousand rupees) or the fees paid by you (if applicable), whichever is lower.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              15. Indemnification
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              You agree to indemnify and hold harmless iVerifi, Kwik ID, and our respective
              officers, directors, employees, and partners from any claims, damages, losses, or
              expenses arising from:
            </p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>Your violation of these Terms</li>
              <li>Your violation of any laws or regulations</li>
              <li>Your violation of any third-party rights</li>
              <li>Your use or misuse of the Service</li>
              <li>Your provision of false or misleading information</li>
            </ul>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              16. Force Majeure
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              iVerifi shall not be liable for any failure or delay in performance due to
              circumstances beyond our reasonable control, including but not limited to:
            </p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>Natural disasters (floods, earthquakes, pandemics)</li>
              <li>Government actions, regulations, or orders</li>
              <li>Internet, telecommunications, or network outages</li>
              <li>Government portal downtime (DigiLocker, Parivahan, e-Filing, etc.)</li>
              <li>Kwik ID platform unavailability</li>
              <li>War, terrorism, riots, or civil unrest</li>
              <li>Acts of God or other unforeseeable events</li>
            </ul>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              In such events, our obligations will be suspended for the duration of the force
              majeure event.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              17. Service Modifications
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">We reserve the right to:</p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>Modify, suspend, or discontinue the Service at any time</li>
              <li>Update features, functionality, or user interface</li>
              <li>Change or remove content from the Service</li>
              <li>Impose limits on certain features</li>
              <li>Change third-party verification partners</li>
            </ul>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              We will provide reasonable notice for material changes.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              18. Termination
            </h2>
            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              18.1 By You
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              You may stop using the Service at any time. You may request account deletion by
              contacting{" "}
              <a href="mailto:admin@iverifi.io" className="text-primary underline">
                admin@iverifi.io
              </a>
              .
            </p>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              18.2 By Us
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              We may suspend or terminate your access if:
            </p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>You violate these Terms</li>
              <li>You engage in fraudulent or illegal activities</li>
              <li>You pose a security risk</li>
              <li>We are required to do so by law</li>
            </ul>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              18.3 Effect of Termination
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">Upon termination:</p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>Your right to use the Service immediately ceases</li>
              <li>Historical verification records remain subject to retention policies</li>
              <li>You remain responsible for any outstanding obligations</li>
            </ul>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              19. Legal Compliance
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">This Service complies with:</p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>
                <strong>Digital Personal Data Protection Act, 2023:</strong> User consent, data
                subject rights, purpose limitation
              </li>
              <li>
                <strong>Information Technology Act, 2000:</strong> Electronic records, security
                practices, data protection
              </li>
              <li>
                <strong>Aadhaar Act, 2016:</strong> Voluntary usage, purpose specification, no
                unauthorized storage
              </li>
              <li>
                <strong>Hotel & Restaurant Act:</strong> Guest record retention, authority
                compliance
              </li>
              <li>
                <strong>IT (Reasonable Security Practices) Rules, 2011:</strong> Security standards
                and protocols
              </li>
            </ul>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              20. Dispute Resolution
            </h2>
            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              20.1 Grievance Officer
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              For complaints or grievances, contact:
            </p>
            <div className="bg-muted p-3 sm:p-4 rounded-lg my-2">
              <p className="text-xs sm:text-sm text-muted-foreground">
                <strong>Grievance Officer:</strong> [Name to be appointed]
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                <strong>Email:</strong>{" "}
                <a href="mailto:admin@iverifi.io" className="text-primary underline">
                  admin@iverifi.io
                </a>
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                <strong>Response Time:</strong> Within 30 days
              </p>
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              20.2 Governing Law
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              These Terms are governed by the laws of India. Any disputes shall be subject to the
              exclusive jurisdiction of courts in Bangalore, Karnataka.
            </p>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              20.3 Arbitration
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              Any dispute arising from these Terms shall first be attempted to be resolved through
              good faith negotiations. If unresolved within 30 days, disputes may be referred to
              arbitration under the Arbitration and Conciliation Act, 1996.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              21. Changes to Terms
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              We may update these Terms from time to time. Changes will be notified through:
            </p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>Email notification to registered users</li>
              <li>Prominent notice on the Service</li>
              <li>Updated "Last Modified" date</li>
            </ul>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              Continued use of the Service after changes constitutes acceptance of the new Terms.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              22. Severability
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              If any provision of these Terms is found to be invalid or unenforceable, the remaining
              provisions shall continue in full force and effect.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              23. Entire Agreement
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              These Terms, together with our Privacy Policy, constitute the entire agreement
              between you and iVerifi regarding the Service.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              24. Contact Information
            </h2>
            <div className="bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800 p-4 sm:p-6 rounded-lg my-3 sm:my-4">
              <h3 className="text-base sm:text-lg font-bold text-blue-900 dark:text-blue-100 mb-3">
                iVerifi IAM Private Limited
              </h3>
              <div className="space-y-2 text-xs sm:text-sm text-blue-800 dark:text-blue-200">
                <p>
                  <strong>Registered Office:</strong> B-401,BCM City,Navalakha Square, AB Road,
                  Indire, MP 452001
                </p>
                <p>
                  <strong>CIN:</strong> U62099MP2023PTC066602
                </p>
                <p>
                  <strong>Phone:</strong> +91 7022573737
                </p>

                <div className="mt-4 pt-4 border-t border-blue-300 dark:border-blue-700">
                  <p className="font-bold text-blue-900 dark:text-blue-100 mb-2">
                    All Inquiries:
                  </p>
                  <p>
                    <strong>Email:</strong>{" "}
                    <a href="mailto:admin@iverifi.io" className="underline">
                      admin@iverifi.io
                    </a>
                  </p>
                  <p className="text-xs mt-2">
                    For: General support, Data rights requests, Account deletion, Grievances, Legal
                    notices
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-blue-300 dark:border-blue-700">
                  <p>
                    <strong>Website:</strong>{" "}
                    <a href="https://iverifi.io" className="underline" target="_blank" rel="noopener noreferrer">
                      https://iverifi.io
                    </a>
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-950/20 border-l-4 border-green-600 p-3 sm:p-4 mt-4 sm:mt-6 rounded">
              <p className="text-xs sm:text-sm font-bold text-green-900 dark:text-green-100 mb-1">
                Acknowledgment
              </p>
              <p className="text-xs sm:text-sm text-green-800 dark:text-green-200">
                By using iVerifi, you acknowledge that you have read, understood, and agree to be
                bound by these Terms & Conditions.
              </p>
            </div>

            <div className="text-center mt-6 sm:mt-8 pt-4 sm:pt-6 border-t-2 border-border">
              <p className="text-xs text-muted-foreground">
                <strong>Document Version:</strong> 2.0 |<strong>Last Updated:</strong> January 5,
                2026 |<strong>Effective Date:</strong> January 1, 2026
              </p>
            </div>
          </div>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-3 sm:py-4 fixed bottom-0 left-0 right-0 z-10">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Button onClick={handleClose} className="w-full sm:w-auto">
            I Have Read the Terms
          </Button>
        </div>
      </footer>
    </div>
  );
}

