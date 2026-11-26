import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { QRCodeHandler } from "./components/qr-code-handler";
import { AddToHomeScreenPrompt } from "./components/add-to-home-screen-prompt";
import Connections from "./pages/Connections";
import ConnectionRequestsPage from "./pages/ConnectionRequestsPage";
import ProtectedLayout from "./routes/protected_layout";
import ProtectedRoute from "./routes/protected_routes";
import ConnectionDetails from "./screens/connections/connection_details";
import MyActivity from "./screens/my_activity";
import Login from "./screens/login_screen";
import Signup from "./screens/signup_screen";
import UserData from "./screens/user_data";
import Profile from "./screens/profile";
import ProfileCompletion from "./screens/profile_completion";
import AgeCheckScreen from "./screens/age_check_screen";
import TermsAcceptance from "./screens/terms_acceptance";
import TermsPage from "./screens/terms_page";
import PrivacyPage from "./screens/privacy_page";
import AccountDeletionPage from "./screens/account_deletion_page";
import AadhaarDigiLockerTest from "./screens/documents/aadhaar_digilocker_test";
import FamilyIds from "./screens/family_ids";
import GuestCheckinFlow from "./screens/guest-checkin/guest-checkin-flow";
import HrRequestEntry from "./screens/hr-request/hr_request_entry";
import MobileReturn from "./screens/mobile_return";
import ConsentPage from "./screens/connect/consent_page";
import JourneyPage from "./screens/connect/journey_page";
import { AadhaarAppDialog } from "./components/aadhaar-app-dialog";

const App = () => {
  return (
    <Router>
      <QRCodeHandler>
        <AadhaarAppDialog />
        <Routes>
          {/* Guest check-in funnel — no auth required, manages its own auth internally */}
          <Route path="/checkin" element={<GuestCheckinFlow />} />
          <Route path="/aadhaar-test" element={<AadhaarDigiLockerTest />} />
          {/* DigiLocker return address used by the iVerifi mobile app: hands the result back to the app */}
          <Route path="/mobile-return" element={<MobileReturn />} />
          {/* a business asked this person for consent (iVerifi Connect): the link carries a random token, no sign-in */}
          <Route path="/c/:token" element={<ConsentPage />} />
          {/* a business sent this person a hosted journey (iVerifi Suite): consent and every step on this page, no sign-in */}
          <Route path="/j/:token" element={<JourneyPage />} />

          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/accept-terms" element={<TermsAcceptance />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/account-deletion" element={<AccountDeletionPage />} />

          <Route
            element={
              <ProtectedRoute>
                <ProtectedLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Connections />} />
            <Route path="/home" element={<Connections />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/user-data" element={<UserData />} />
            <Route
              path="/age-check"
              element={<AgeCheckScreen />}
            />
            <Route path="/connections" element={<ConnectionRequestsPage />} />
            <Route path="/connections/:id" element={<ConnectionDetails />} />
            <Route path="/hr-request" element={<HrRequestEntry />} />
            <Route path="/my-activity" element={<MyActivity />} />
            <Route path="/complete-profile" element={<ProfileCompletion />} />
            <Route path="/family-ids" element={<FamilyIds />} />
          </Route>

          <Route path="*" element={<Login />} />
        </Routes>
      </QRCodeHandler>
      <AddToHomeScreenPrompt />
    </Router>
  );
};

export default App;
