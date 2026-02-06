import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import iverifiLogo from "../assets/new_no_bg.png"

export default function PrivacyPage() {
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
                <p className="text-xs text-muted-foreground">Privacy Policy</p>
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
            <div className="bg-green-50 dark:bg-green-950/20 border-l-4 border-green-600 p-3 sm:p-4 mb-4 sm:mb-6 rounded">
              <p className="text-xs sm:text-sm text-green-900 dark:text-green-100 font-semibold mb-1">
                Last Updated: January 5, 2026
              </p>
              <p className="text-xs text-green-800 dark:text-green-200">
                Version 2.0 | Effective Date: January 1, 2026
              </p>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              1. Introduction
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              Welcome to iVerifi. We are committed to protecting your privacy and ensuring the
              security of your personal information. This Privacy Policy explains how we collect,
              use, share, and protect your data when you use our identity verification services.
            </p>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              iVerifi IAM Private Limited ("We", "Us", "Our") operates as a zero-knowledge identity
              verification platform, meaning we do NOT store your identity documents or personal
              details.
            </p>

            <div className="bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800 p-3 sm:p-4 my-3 sm:my-4 rounded">
              <p className="text-xs sm:text-sm font-bold text-blue-900 dark:text-blue-100 mb-2">
                Key Privacy Principles:
              </p>
              <ul className="list-disc list-inside text-blue-800 dark:text-blue-200 text-xs sm:text-sm space-y-1">
                <li>
                  <strong>Zero Storage:</strong> Your documents are never stored on our servers
                </li>
                <li>
                  <strong>Minimal Data:</strong> We collect only essential verification metadata
                </li>
                <li>
                  <strong>User Control:</strong> You can access, delete, or withdraw consent
                  anytime
                </li>
                <li>
                  <strong>Transparency:</strong> Clear disclosure of all data practices
                </li>
                <li>
                  <strong>Security First:</strong> Military-grade encryption and security standards
                </li>
                <li>
                  <strong>Third-Party Partners:</strong> Kwik ID processes verifications under
                  strict data protection
                </li>
              </ul>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              2. Information We Collect
            </h2>
            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              2.1 Verification Metadata (What We DO Collect)
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              When you use iVerifi, we collect minimal metadata necessary for the verification
              service:
            </p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>
                <strong>Verification Timestamp:</strong> Date and time when verification occurred
              </li>
              <li>
                <strong>Document Type:</strong> Type of document verified (e.g., "Aadhaar Card",
                "PAN Card", "Driving License")
              </li>
              <li>
                <strong>Verification Result:</strong> Whether verification was successful or failed
                (Yes/No)
              </li>
              <li>
                <strong>Verification Source:</strong> Which government portal verified the document
                (e.g., "DigiLocker", "e-Filing Portal")
              </li>
              <li>
                <strong>Verification ID:</strong> Unique reference number for the verification
                session
              </li>
              <li>
                <strong>Requester Information:</strong> Name and identifier of hotel/institution
                where verification was initiated
              </li>
            </ul>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              2.2 Session & Transaction Data
            </h3>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>
                <strong>Session ID:</strong> Unique identifier for your verification session
              </li>
              <li>
                <strong>Check-in/Check-out Times:</strong> Timestamps for hotel stays (where
                applicable)
              </li>
              <li>
                <strong>Location:</strong> Hotel/institution location where verification occurred
              </li>
              <li>
                <strong>Booking Reference:</strong> Hotel booking number (provided by hotel, if
                applicable)
              </li>
            </ul>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              2.3 Device & Technical Information
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              For security and fraud prevention:
            </p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>
                <strong>IP Address:</strong> Your internet protocol address
              </li>
              <li>
                <strong>Browser Type:</strong> Type and version of web browser used
              </li>
              <li>
                <strong>Device Type:</strong> Mobile, tablet, or desktop device
              </li>
              <li>
                <strong>Operating System:</strong> OS type and version
              </li>
              <li>
                <strong>User Agent:</strong> Technical information about your browser
              </li>
            </ul>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              2.4 What We DO NOT Collect
            </h3>
            <div className="bg-red-50 dark:bg-red-950/20 border-l-4 border-red-600 p-3 sm:p-4 my-3 sm:my-4 rounded">
              <p className="text-xs sm:text-sm font-bold text-red-900 dark:text-red-100 mb-2">
                We Never Collect or Store:
              </p>
              <ul className="list-disc list-inside text-red-800 dark:text-red-200 text-xs sm:text-sm space-y-1">
                <li>Your actual identity documents (Aadhaar, PAN, Passport, Driving License)</li>
                <li>Document numbers (Aadhaar number, PAN number, DL number, Passport number)</li>
                <li>Personal details (Name, Date of Birth, Address, Gender)</li>
                <li>Photographs from documents</li>
                <li>Biometric information (Fingerprints, Iris scans, Face data)</li>
                <li>Financial information (Bank details, Credit cards)</li>
                <li>Health information</li>
                <li>Social media profiles or contacts</li>
              </ul>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              3. Third-Party Service Providers
            </h2>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              3.1 Kwik ID - Identity Verification Technology Partner
            </h3>
            <div className="bg-purple-50 dark:bg-purple-950/20 border-2 border-purple-300 dark:border-purple-800 rounded-xl p-4 sm:p-5 my-3 sm:my-4">
              <p className="text-sm sm:text-base text-muted-foreground mb-3">
                <strong>iVerifi uses Kwik ID</strong> as our certified KYC verification technology
                partner to authenticate your identity documents with government databases.
              </p>

              <p className="text-xs sm:text-sm font-bold text-purple-900 dark:text-purple-100 mb-2">
                What Kwik ID Does:
              </p>
              <ul className="list-disc list-inside text-xs sm:text-sm text-purple-800 dark:text-purple-200 space-y-1 ml-2">
                <li>Processes verification requests on our behalf</li>
                <li>Connects securely to government databases (DigiLocker, Parivahan, e-Filing)</li>
                <li>Performs document authentication checks</li>
                <li>Returns verification result (verified/not verified) to iVerifi</li>
              </ul>

              <p className="text-xs sm:text-sm font-bold text-purple-900 dark:text-purple-100 mt-3 mb-2">
                What Data Kwik ID Receives from iVerifi:
              </p>
              <ul className="list-disc list-inside text-xs sm:text-sm text-purple-800 dark:text-purple-200 space-y-1 ml-2">
                <li>Verification request metadata (document type, timestamp)</li>
                <li>Session identifier (unique ID for this verification)</li>
                <li>Hotel/institution identifier (where verification initiated)</li>
              </ul>

              <p className="text-xs sm:text-sm font-bold text-purple-900 dark:text-purple-100 mt-3 mb-2">
                What Kwik ID Does NOT Receive:
              </p>
              <ul className="list-disc list-inside text-xs sm:text-sm text-purple-800 dark:text-purple-200 space-y-1 ml-2">
                <li>Your actual identity documents (Aadhaar, PAN, etc.)</li>
                <li>Document numbers or personal details</li>
                <li>Photographs from documents</li>
                <li>Biometric information</li>
                <li>Any data beyond what's needed for verification metadata</li>
              </ul>

              <p className="text-xs sm:text-sm font-bold text-purple-900 dark:text-purple-100 mt-3 mb-2">
                Kwik ID's Data Protection Measures:
              </p>
              <ul className="list-disc list-inside text-xs sm:text-sm text-purple-800 dark:text-purple-200 space-y-1 ml-2">
                <li>ISO 27001 certified for information security management</li>
                <li>DPDP Act 2023 and IT Act 2000 compliant</li>
                <li>Data Processing Agreement (DPA) in place with iVerifi</li>
                <li>256-bit SSL/TLS encryption for all communications</li>
                <li>Immediate data deletion after verification complete</li>
                <li>Cannot use data for any purpose other than verification</li>
                <li>Subject to regular security audits</li>
                <li>Zero-knowledge architecture (no document storage)</li>
              </ul>

              <p className="text-xs sm:text-sm font-bold text-purple-900 dark:text-purple-100 mt-3 mb-1">
                Your Consent:
              </p>
              <p className="text-xs sm:text-sm text-purple-800 dark:text-purple-200">
                By using iVerifi, you consent to Kwik ID processing your verification request
                metadata as our authorized service provider under strict data protection standards.
                Kwik ID acts solely as our data processor and never as an independent data
                controller.
              </p>
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              3.2 Other Service Providers
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              We may share limited data with other trusted service providers:
            </p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>
                <strong>Cloud Hosting (AWS/Azure - India regions):</strong> Encrypted metadata
                storage only
              </li>
              <li>
                <strong>Security Services:</strong> Fraud detection and monitoring (anonymized
                data)
              </li>
              <li>
                <strong>Analytics:</strong> Usage analytics for service improvement (anonymized data
                only)
              </li>
            </ul>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">All service providers are:</p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>✓ Bound by strict Data Processing Agreements (DPAs)</li>
              <li>✓ Required to maintain confidentiality</li>
              <li>✓ Prohibited from using data for their own purposes</li>
              <li>✓ Subject to regular security audits</li>
              <li>✓ Located in India or provide adequate data protection safeguards</li>
            </ul>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              4. How We Use Your Information
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              We use the collected metadata for the following purposes:
            </p>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              4.1 Primary Purposes
            </h3>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>
                <strong>Identity Verification:</strong> Facilitate verification with government
                portals via Kwik ID
              </li>
              <li>
                <strong>Service Delivery:</strong> Enable hotels/institutions to verify guest/student
                identity
              </li>
              <li>
                <strong>Transaction Records:</strong> Maintain records of verification transactions
              </li>
              <li>
                <strong>User Support:</strong> Respond to queries and provide customer service
              </li>
            </ul>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              4.2 Legal & Compliance
            </h3>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>
                <strong>Regulatory Compliance:</strong> Meet requirements under Hotel & Restaurant
                regulations, FRRO rules
              </li>
              <li>
                <strong>Audit Trail:</strong> Maintain records for compliance audits
              </li>
              <li>
                <strong>Authority Requests:</strong> Respond to valid legal requests from law
                enforcement
              </li>
              <li>
                <strong>Fraud Prevention:</strong> Detect and prevent fraudulent activities
              </li>
            </ul>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              4.3 Security & Improvement
            </h3>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>
                <strong>Security Monitoring:</strong> Detect and prevent security threats
              </li>
              <li>
                <strong>Service Improvement:</strong> Analyze usage patterns to improve services
              </li>
              <li>
                <strong>Technical Optimization:</strong> Fix bugs and optimize performance
              </li>
            </ul>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              5. Legal Basis for Processing
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              Under the Digital Personal Data Protection Act, 2023, we process your data based on:
            </p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>
                <strong>Consent:</strong> Your explicit consent to use our verification services
              </li>
              <li>
                <strong>Legitimate Interest:</strong> Fraud prevention, security, and service
                improvement
              </li>
              <li>
                <strong>Legal Obligation:</strong> Compliance with Hotel regulations, FRRO
                requirements, court orders
              </li>
              <li>
                <strong>Performance of Contract:</strong> Delivering the verification service you
                requested
              </li>
            </ul>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              6. How We Share Your Information
            </h2>
            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              6.1 With Service Requesters
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              We share verification results with the entity where you initiated verification:
            </p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>
                <strong>Hotels & Lodging:</strong> Verification status for guest check-in compliance
              </li>
              <li>
                <strong>Educational Institutions:</strong> Verification status for student
                registration
              </li>
              <li>
                <strong>Corporate Entities:</strong> Verification status for employee onboarding
                (where authorized)
              </li>
            </ul>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              <strong>What Gets Shared:</strong> Only verification result (verified/not verified),
              document type, timestamp, and verification source. Never your actual documents or
              personal details.
            </p>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              6.2 With Third-Party Technology Partners
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              As described in Section 3, we share limited metadata with Kwik ID and other service
              providers under strict data protection agreements.
            </p>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              6.3 With Government Authorities
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              We may share information with government authorities when:
            </p>

            <div className="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-400 dark:border-amber-800 p-3 sm:p-4 my-3 sm:my-4 rounded">
              <p className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-100 mb-2">
                Legal Disclosure Requirements:
              </p>
              <ul className="list-disc list-inside text-amber-800 dark:text-amber-200 text-xs sm:text-sm space-y-1">
                <li>
                  <strong>Court Orders:</strong> Valid court orders, subpoenas, or warrants
                </li>
                <li>
                  <strong>Law Enforcement:</strong> Police or investigating agencies with proper
                  authorization
                </li>
                <li>
                  <strong>Statutory Obligations:</strong> Hotel & Restaurant Act compliance, FRRO
                  requirements for foreign guests
                </li>
                <li>
                  <strong>Tax Authorities:</strong> Income Tax Department when mandated by law
                </li>
                <li>
                  <strong>National Security:</strong> When necessary for national security or public
                  safety
                </li>
                <li>
                  <strong>Regulatory Audits:</strong> Government audits by authorized agencies
                </li>
              </ul>
              <p className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-100 mt-3">
                What Gets Shared:
              </p>
              <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200">
                Verification metadata, session information, and device data. We do NOT share your
                actual documents (we don't have them).
              </p>
              <p className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-100 mt-2">
                Your Rights:
              </p>
              <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200">
                Where legally permitted, we will notify you of authority requests unless prohibited
                by law or court order.
              </p>
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              6.4 What We Will NEVER Do
            </h3>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>❌ Sell your data to third parties</li>
              <li>❌ Share data for advertising or marketing purposes</li>
              <li>❌ Provide data to data brokers or aggregators</li>
              <li>❌ Share data with social media platforms</li>
              <li>❌ Allow unauthorized access to your information</li>
            </ul>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              7. Data Retention
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              We retain verification records as follows:
            </p>

            <div className="bg-purple-50 dark:bg-purple-950/20 border-l-4 border-purple-600 p-3 sm:p-4 my-3 sm:my-4 rounded">
              <p className="text-xs sm:text-sm font-bold text-purple-900 dark:text-purple-100 mb-2">
                Retention Periods:
              </p>
              <ul className="list-disc list-inside text-purple-800 dark:text-purple-200 text-xs sm:text-sm space-y-1">
                <li>
                  <strong>Standard Retention:</strong> 3 years from verification date (as required
                  by Hotel & Restaurant regulations)
                </li>
                <li>
                  <strong>Legal Proceedings:</strong> Up to 7 years if involved in legal cases or
                  investigations
                </li>
                <li>
                  <strong>Authority Requirements:</strong> As mandated by valid legal orders
                </li>
              </ul>
              <p className="text-xs sm:text-sm font-bold text-purple-900 dark:text-purple-100 mt-3">
                After Retention Period:
              </p>
              <p className="text-xs sm:text-sm text-purple-800 dark:text-purple-200">
                All records are permanently and securely deleted from our systems and Kwik ID's
                systems using industry-standard data wiping methods.
              </p>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              8. Your Privacy Rights
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              Under Indian data protection laws, you have the following rights:
            </p>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              8.1 Right to Access
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              Request copies of your verification history and all metadata we hold about you.
            </p>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              8.2 Right to Correction
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              Request correction of any inaccurate or incomplete information.
            </p>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              8.3 Right to Deletion
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              Request deletion of your data, subject to legal retention requirements.
            </p>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              8.4 Right to Data Portability
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              Receive your data in a commonly used, machine-readable format (CSV/JSON).
            </p>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              8.5 Right to Withdraw Consent
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              Withdraw consent for future processing at any time (does not affect past verifications).
            </p>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              8.6 Right to Object
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              Object to processing based on legitimate interests.
            </p>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              8.7 Right to Complain
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              Lodge complaints with the Data Protection Authority of India or our Grievance Officer.
            </p>

            <div className="bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800 p-3 sm:p-4 my-3 sm:my-4 rounded">
              <p className="text-xs sm:text-sm font-bold text-blue-900 dark:text-blue-100 mb-2">
                How to Exercise Your Rights:
              </p>
              <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 mb-1">
                <strong>Email:</strong>{" "}
                <a href="mailto:admin@iverifi.io" className="underline">
                  admin@iverifi.io
                </a>
              </p>
              <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 mb-1">
                <strong>Subject Line:</strong> "Data Privacy Request - [Your Request Type]"
              </p>
              <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 mb-1">
                <strong>Include:</strong> Your registered email/phone, specific request, identity
                verification
              </p>
              <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200">
                <strong>Response Time:</strong> Within 30 days (may extend to 60 days for complex
                requests)
              </p>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              9. Security Measures
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              We implement comprehensive security measures to protect your data:
            </p>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              9.1 Technical Security
            </h3>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>
                <strong>256-bit SSL/TLS Encryption:</strong> All data transmission is encrypted
              </li>
              <li>
                <strong>Zero-Knowledge Architecture:</strong> Documents never touch our servers or
                Kwik ID's servers
              </li>
              <li>
                <strong>Secure APIs:</strong> Direct, encrypted connections to government portals
                via Kwik ID
              </li>
              <li>
                <strong>Database Encryption:</strong> All stored metadata is encrypted at rest
              </li>
              <li>
                <strong>Firewall Protection:</strong> Multi-layer firewall architecture
              </li>
              <li>
                <strong>Intrusion Detection:</strong> 24/7 monitoring for security threats
              </li>
            </ul>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              9.2 Organizational Security
            </h3>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>
                <strong>Access Controls:</strong> Role-based access with least privilege principle
              </li>
              <li>
                <strong>Multi-Factor Authentication:</strong> Required for all system access
              </li>
              <li>
                <strong>Audit Logging:</strong> Complete audit trail of all data access
              </li>
              <li>
                <strong>Employee Training:</strong> Regular security and privacy training
              </li>
              <li>
                <strong>Background Checks:</strong> All employees undergo background verification
              </li>
              <li>
                <strong>Confidentiality Agreements:</strong> All staff bound by NDAs
              </li>
            </ul>

            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-4 sm:mt-6 mb-2 sm:mb-3">
              9.3 Compliance & Audits
            </h3>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>
                <strong>ISO 27001:</strong> Information Security Management compliance (iVerifi &
                Kwik ID)
              </li>
              <li>
                <strong>Regular Audits:</strong> Quarterly security audits by third-party firms
              </li>
              <li>
                <strong>Penetration Testing:</strong> Annual penetration tests
              </li>
              <li>
                <strong>Vulnerability Scanning:</strong> Continuous automated scanning
              </li>
              <li>
                <strong>Incident Response Plan:</strong> Documented breach response procedures
              </li>
            </ul>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              10. Data Breach Notification
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              In the unlikely event of a data breach:
            </p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>We will notify affected users within 72 hours</li>
              <li>We will notify the Data Protection Authority as required by law</li>
              <li>We will provide details of the breach, affected data, and remedial actions</li>
              <li>We will offer support and guidance to affected users</li>
            </ul>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              11. International Data Transfers
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              Your data is stored and processed in India. We do NOT transfer data outside India
              except:
            </p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>With your explicit consent</li>
              <li>When required by law</li>
              <li>
                To service providers with adequate data protection safeguards (under strict DPAs)
              </li>
            </ul>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              All international transfers comply with Indian data protection laws and include
              appropriate safeguards. Kwik ID processes all data within India.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              12. Children's Privacy
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              Our Service is not intended for children under 18 years of age. We do not knowingly
              collect information from children. If you are under 18, please obtain parental/guardian
              consent before using our Service.
            </p>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              Parents/guardians can contact us at{" "}
              <a href="mailto:admin@iverifi.io" className="text-primary underline">
                admin@iverifi.io
              </a>{" "}
              to request deletion of any information collected from minors.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              13. Cookies & Tracking
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              We use minimal cookies and tracking technologies:
            </p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>
                <strong>Essential Cookies:</strong> Required for service functionality (session
                management, security)
              </li>
              <li>
                <strong>Analytics Cookies:</strong> Anonymous usage statistics (can be disabled)
              </li>
              <li>
                <strong>Security Cookies:</strong> Fraud detection and prevention
              </li>
            </ul>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              We do NOT use cookies for advertising or third-party tracking. You can disable
              non-essential cookies in your browser settings.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              14. Third-Party Links
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              Our Service links to government portals (DigiLocker, Parivahan, etc.). We are not
              responsible for the privacy practices of these external sites. Please review their
              privacy policies independently.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              15. Changes to Privacy Policy
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              We may update this Privacy Policy to reflect changes in our practices or legal
              requirements. Material changes will be notified through:
            </p>
            <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-1 mb-3 sm:mb-4 ml-2 sm:ml-4">
              <li>Email notification to registered users</li>
              <li>Prominent notice on our Service</li>
              <li>Updated "Last Modified" date</li>
            </ul>
            <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
              We encourage you to review this policy periodically. Continued use after changes
              constitutes acceptance.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              16. Contact Information
            </h2>
            <div className="bg-teal-50 dark:bg-teal-950/20 border-2 border-teal-200 dark:border-teal-800 p-4 sm:p-6 rounded-lg my-3 sm:my-4">
              <h3 className="text-base sm:text-lg font-bold text-teal-900 dark:text-teal-100 mb-3">
                iVerifi IAM Private Limited
              </h3>
              <div className="space-y-2 text-xs sm:text-sm text-teal-800 dark:text-teal-200">
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

                <div className="mt-4 pt-4 border-t border-teal-300 dark:border-teal-700">
                  <p className="font-bold text-teal-900 dark:text-teal-100 mb-2">All Inquiries:</p>
                  <p>
                    <strong>Email:</strong>{" "}
                    <a href="mailto:admin@iverifi.io" className="underline">
                      admin@iverifi.io
                    </a>
                  </p>
                  <p className="text-xs mt-2">
                    For: Data rights requests, Privacy questions, Account deletion, Consent
                    withdrawal, General support
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-teal-300 dark:border-teal-700">
                  <p className="font-bold text-teal-900 dark:text-teal-100 mb-2">
                    Grievance Officer:
                  </p>
                  <p>
                    <strong>Name:</strong> [Name to be appointed]
                  </p>
                  <p>
                    <strong>Email:</strong>{" "}
                    <a href="mailto:admin@iverifi.io" className="underline">
                      admin@iverifi.io
                    </a>
                  </p>
                  <p>
                    <strong>Response Time:</strong> Within 30 days (as per IT Act 2000)
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-teal-300 dark:border-teal-700">
                  <p>
                    <strong>Website:</strong>{" "}
                    <a
                      href="https://iverifi.io"
                      className="underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      https://iverifi.io
                    </a>
                  </p>
                </div>
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-6 sm:mt-8 mb-2 sm:mb-4">
              17. Regulatory Authority
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              If you are not satisfied with our response to your privacy concerns, you may contact:
            </p>
            <div className="bg-muted p-3 sm:p-4 rounded-lg my-2">
              <p className="text-xs sm:text-sm text-muted-foreground">
                <strong>Data Protection Authority of India</strong>
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">Website: [To be announced]</p>
            </div>

            <div className="bg-green-50 dark:bg-green-950/20 border-l-4 border-green-600 p-3 sm:p-4 mt-4 sm:mt-6 rounded">
              <p className="text-xs sm:text-sm font-bold text-green-900 dark:text-green-100 mb-1">
                Your Privacy Matters
              </p>
              <p className="text-xs sm:text-sm text-green-800 dark:text-green-200">
                We are committed to protecting your privacy and handling your data responsibly. If
                you have any questions or concerns, please don't hesitate to contact us at{" "}
                <a href="mailto:admin@iverifi.io" className="underline">
                  admin@iverifi.io
                </a>
                .
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
            I Have Read the Privacy Policy
          </Button>
        </div>
      </footer>
    </div>
  );
}





