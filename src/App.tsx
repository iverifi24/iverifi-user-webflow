import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./routes/protected_routes";
import AddConnection from "./screens/connections/add_connection";
import ConnectionDetails from "./screens/connections/connection_details";
import ConnectionsRouter from "./screens/connections/connections_router";
import Signup from "./screens/login_screen";
import UserData from "./screens/user_data";
import ProtectedLayout from "./routes/protected_layout";
import HomePage from "./screens/home/home_page";
import Documents from "./screens/documents/documents";
import AddDocuments from "./screens/documents/add_documents";
import { QRCodeHandler } from "./components/qr-code-handler";
import Connections from "./pages/Connections";

const App = () => {
  return (
    <Router>
      <QRCodeHandler>
        <Routes>
          <Route path="/signup" element={<Signup />} />

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
          </Route>

          <Route path="*" element={<Signup />} />
        </Routes>
      </QRCodeHandler>
    </Router>
  );
};

export default App;
