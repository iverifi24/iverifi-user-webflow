import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { QRCodeHandler } from "./components/qr-code-handler";
import Connections from "./pages/Connections";
import ProtectedLayout from "./routes/protected_layout";
import ProtectedRoute from "./routes/protected_routes";
import ConnectionDetails from "./screens/connections/connection_details";
import AddDocuments from "./screens/documents/add_documents";
import Documents from "./screens/documents/documents";
import HomePage from "./screens/home/home_page";
import Login from "./screens/login_screen";
import Signup from "./screens/signup_screen";
import UserData from "./screens/user_data";
import ProfileCompletion from "./screens/profile_completion";
import TermsAcceptance from "./screens/terms_acceptance";
import TermsPage from "./screens/terms_page";
import PrivacyPage from "./screens/privacy_page";

const App = () => {
  return (
    <Router>
      <QRCodeHandler>
        <Routes>
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
            <Route path="/home" element={<HomePage />} />
            <Route path="/user-data" element={<UserData />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/add-documents" element={<AddDocuments />} />
            <Route path="/connections" element={<Connections />} />
            <Route path="/connections/:code" element={<Connections />} />
            {/* <Route path="/connections/add" element={<AddConnection />} /> */}
            <Route path="/connections/:id" element={<ConnectionDetails />} />
            <Route path="/complete-profile" element={<ProfileCompletion />} />
          </Route>

          <Route path="*" element={<Login />} />
        </Routes>
      </QRCodeHandler>
    </Router>
  );
};

export default App;
