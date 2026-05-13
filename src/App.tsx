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
import ProfileCompletion from "./screens/profile_completion";
import AgeCheckScreen from "./screens/age_check_screen";
import TermsAcceptance from "./screens/terms_acceptance";
import TermsPage from "./screens/terms_page";
import PrivacyPage from "./screens/privacy_page";
import AadhaarDigiLockerTest from "./screens/documents/aadhaar_digilocker_test";
import FamilyIds from "./screens/family_ids";
import GuestCheckinFlow from "./screens/guest-checkin/guest-checkin-flow";

const App = () => {
  return (
    <Router>
      <QRCodeHandler>
        <Routes>
          {/* Guest check-in funnel — no auth required, manages its own auth internally */}
          <Route path="/checkin" element={<GuestCheckinFlow />} />

          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/accept-terms" element={<TermsAcceptance />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />

          <Route
            element={
              <ProtectedRoute>
                <ProtectedLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Connections />} />
            <Route path="/home" element={<Connections />} />
            <Route path="/user-data" element={<UserData />} />
            <Route
              path="/age-check"
              element={<AgeCheckScreen />}
            />
            <Route path="/connections" element={<ConnectionRequestsPage />} />
            <Route path="/connections/:id" element={<ConnectionDetails />} />
            <Route path="/my-activity" element={<MyActivity />} />
            <Route path="/complete-profile" element={<ProfileCompletion />} />
            <Route path="/aadhaar-test" element={<AadhaarDigiLockerTest />} />
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
