import { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // Verificar si hay una sesión activa al cargar
  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (token) {
      verifyToken(token);
    }
  }, []);

  // Verificar validez del token
  const verifyToken = async (token) => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        sessionStorage.removeItem('token');
        setUser(null);
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      sessionStorage.removeItem('token');
      setUser(null);
    }
  };

  // Login
  const login = async (username, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      
      // Guardar token en sessionStorage (no persiste entre sesiones)
      sessionStorage.setItem('token', data.token);
      setUser(data.user);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  // Logout
  const logout = async () => {
    try {
      const token = sessionStorage.getItem('token');
      
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      sessionStorage.removeItem('token');
      setUser(null);
    }
  };

  // Obtener token para requests autenticados
  const getToken = () => {
    return sessionStorage.getItem('token');
  };

  const value = {
    user,
    loading,
    login,
    logout,
    getToken,
    isAuthenticated: !!user,
    isAdmin: user?.isAdmin || false,
    isStaff: user?.isStaff || false
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
