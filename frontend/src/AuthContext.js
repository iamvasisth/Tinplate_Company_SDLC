/**
 * AuthContext.js – Global auth state provider
 * Dependencies: apiRequest, React Context
 */
//iimport files
import { createContext, useContext, useEffect, useState } from "react";
import { apiRequest } from "./api";
// create context and provider
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(undefined);
  const [loading, setLoading] = useState(true);
// on mount, check if user is logged in
  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await apiRequest("/profile");
        if (data && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);
// return provider with user state and loading state
  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
// custom hook for easy access to auth context
export const useAuth = () => useContext(AuthContext);