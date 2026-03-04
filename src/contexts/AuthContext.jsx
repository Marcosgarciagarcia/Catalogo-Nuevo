import { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

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
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setUser(data.user);
        } else {
          sessionStorage.removeItem('token');
          setUser(null);
        }
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

      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');

      if (!response.ok) {
        let message = 'Error al iniciar sesión';
        if (isJson) {
          try {
            const error = await response.json();
            message = error.error || message;
          } catch {
            // ignore
          }
        } else if (response.status === 404) {
          message = 'API no disponible. En local ejecuta: npx vercel dev';
        } else {
          const text = await response.text();
          if (text) message = text.slice(0, 100);
        }
        throw new Error(message);
      }

      if (!isJson) {
        throw new Error('La API no devolvió JSON. En local ejecuta: npx vercel dev');
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
  const logout = () => {
    sessionStorage.removeItem('token');
    setUser(null);
  };

  // Obtener token para requests autenticados
  const getToken = () => {
    return sessionStorage.getItem('token');
  };

  const value = {
    user,
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

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
