import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '../../context/CustomerAuthContext';

export const CustomerGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useCustomerAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FBF7F0' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 border-3 border-t-transparent rounded-full animate-spin"
            style={{ border: '3px solid #EDE8DF', borderTopColor: '#C9732A' }} />
          <p className="text-sm font-medium" style={{ color: '#C9732A' }}>Loading your account…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/customer/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
