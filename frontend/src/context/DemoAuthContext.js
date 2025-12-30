import React, { createContext, useContext, useState, useEffect } from 'react';
import { createDemoUsers } from '../utils/demoData';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Demo authentication that works without Firebase
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Demo users storage
  const getDemoUsers = () => {
    const users = localStorage.getItem('demoUsers');
    return users ? JSON.parse(users) : [];
  };

  const saveDemoUsers = (users) => {
    localStorage.setItem('demoUsers', JSON.stringify(users));
  };

  const getCurrentDemoUser = () => {
    const user = localStorage.getItem('currentDemoUser');
    return user ? JSON.parse(user) : null;
  };

  const saveCurrentDemoUser = (user) => {
    if (user) {
      localStorage.setItem('currentDemoUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('currentDemoUser');
    }
  };

  // Register user (with university email validation)
  const register = async (email, password, firstName, lastName, role = 'mentee') => {
    try {
      // Validate Addis Ababa University email - must end with @aau.edu.et
      if (!email.toLowerCase().endsWith('@aau.edu.et')) {
        throw new Error('Please use your Addis Ababa University email address ending with @aau.edu.et');
      }

      const users = getDemoUsers();
      
      // Check if user already exists
      if (users.find(u => u.email === email)) {
        throw new Error('User already exists with this email');
      }

      // Create new user
      const newUser = {
        uid: `user-${Date.now()}`,
        email,
        firstName,
        lastName,
        role,
        approved: role === 'mentee' ? true : false,
        profile: {
          bio: '',
          skills: [],
          courses: [],
          availability: [],
          averageRating: 0,
          totalRatings: 0
        },
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      saveDemoUsers(users);

      // Auto login the new user
      setCurrentUser({ uid: newUser.uid, email: newUser.email });
      setUserData(newUser);
      saveCurrentDemoUser(newUser);

      return { user: { uid: newUser.uid, email: newUser.email } };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  // Login user (with university email validation)
  const login = async (email, password) => {
    try {
      // Validate Addis Ababa University email - must end with @aau.edu.et
      if (!email.toLowerCase().endsWith('@aau.edu.et')) {
        throw new Error('Please use your Addis Ababa University email address ending with @aau.edu.et');
      }

      const users = getDemoUsers();
      const user = users.find(u => u.email === email);

      if (!user) {
        throw new Error('No user found with this email. Please register first.');
      }

      // Set current user
      setCurrentUser({ uid: user.uid, email: user.email });
      setUserData(user);
      saveCurrentDemoUser(user);

      return { user: { uid: user.uid, email: user.email } };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Logout user
  const logout = async () => {
    try {
      setCurrentUser(null);
      setUserData(null);
      saveCurrentDemoUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Get current user data
  const fetchUserData = async (user) => {
    try {
      const users = getDemoUsers();
      const foundUser = users.find(u => u.uid === user.uid);
      if (foundUser) {
        setUserData(foundUser);
      }
    } catch (error) {
      console.error('Fetch user data error:', error);
      setUserData(null);
    }
  };

  // Get demo token for API requests
  const getIdToken = async () => {
    if (currentUser) {
      return `demo-token-${currentUser.uid}`;
    }
    return null;
  };

  // Initialize demo auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Clear old demo data and initialize fresh data
        localStorage.removeItem('demoUsers');
        localStorage.removeItem('currentDemoUser');
        createDemoUsers();
        
        const savedUser = getCurrentDemoUser();
        if (savedUser) {
          setCurrentUser({ uid: savedUser.uid, email: savedUser.email });
          setUserData(savedUser);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const value = {
    currentUser,
    userData,
    register,
    login,
    logout,
    getIdToken,
    fetchUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};