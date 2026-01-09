import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { api } from '../services/api';
import authService from '../services/authService';

export type UserRole = "student" | "instructor" | "admin";

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  profile?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    avatarPublicId?: string;
    bio?: string;
  };
  progress?: Array<{
    course: string;
    completedLessons: string[];
    progressPercentage: number;
    lastAccessedAt?: string;
  }>;
  enrolledCourses?: string[];
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (userData: User) => Promise<void>;
  signup: (
    username: string,
    email: string,
    password: string,
    role: UserRole
  ) => Promise<boolean>;
  logout: () => void;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("skillforge_token");
      
      if (!token) {
        setUser(null);
        return;
      }

      const response = await api.get('/users/profile');
      const userData = response.data.data?.user || response.data.user;
      
      if (userData) {
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("skillforge_user", JSON.stringify(userData));
        console.log("✅ User refreshed from backend:", userData);
      }
    } catch (error) {
      console.error("❌ Error refreshing user:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("skillforge_token");
      localStorage.removeItem("skillforge_user");
      setUser(null);
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem("token") || localStorage.getItem("skillforge_token");

        if (token) {
          await refreshUser();
        } else {
          console.log("ℹ️ No token found");
        }
      } catch (error) {
        console.error("❌ Error loading user:", error);
        localStorage.clear();
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (userData: User) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("skillforge_user", JSON.stringify(userData));
    console.log("✅ User logged in:", userData);
    
    await refreshUser();
  };

  const signup = async (
    username: string,
    email: string,
    password: string,
    role: UserRole
  ): Promise<boolean> => {
    try {
      const response = await authService.register({
        username,
        email,
        password,
        role
      });
      
      if (response.data?.user) {
        await login(response.data.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error("❌ Signup failed:", error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("skillforge_token");
    localStorage.removeItem("skillforge_user");
    console.log("✅ User logged out");
    window.location.href = "/auth";
  };

  const updateUser = (updatedUser: User | null) => {
    setUser(updatedUser);
    if (updatedUser) {
      localStorage.setItem("user", JSON.stringify(updatedUser));
      localStorage.setItem("skillforge_user", JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        setUser: updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
