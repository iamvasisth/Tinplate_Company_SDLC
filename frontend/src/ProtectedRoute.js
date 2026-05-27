import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { FullPageLoader } from "./components/Loader";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // ✅ Wait until auth check finishes
  if (loading) {
    return <FullPageLoader />;
  }

  // ✅ Only redirect AFTER loading is done
  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #ccc",
    borderTop: "4px solid #4a90e2",
    borderRadius: "50%",
    animation: "spin 1s linear infinite"
  }
};

export default ProtectedRoute;