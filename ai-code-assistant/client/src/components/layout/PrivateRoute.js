import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-primary-600 rounded-full animate-bounce" />
          <div className="w-3 h-3 bg-primary-600 rounded-full animate-bounce delay-100" />
          <div className="w-3 h-3 bg-primary-600 rounded-full animate-bounce delay-200" />
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;
