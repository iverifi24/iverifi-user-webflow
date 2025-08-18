import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import ProtectedLayout from "./routes/protected_layout";
import ProtectedRoute from "./routes/protected_routes";
import ConnectionDetails from "./screens/connections/connection_details";
import ConnectionsRouter from "./screens/connections/connections_router";
import AddDocuments from "./screens/documents/add_documents";
import Documents from "./screens/documents/documents";
import HomePage from "./screens/home/home_page";
import Signup from "./screens/login_screen";
import UserData from "./screens/user_data";

const App = () => {
  return (
    <Router>
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
          <Route path="/connections" element={<ConnectionsRouter />} />
          {/* <Route path="/connections/add" element={<AddConnection />} /> */}
          <Route path="/connections/:id" element={<ConnectionDetails />} />
        </Route>

        <Route path="*" element={<Signup />} />
      </Routes>
    </Router>
  );
};

export default App;
