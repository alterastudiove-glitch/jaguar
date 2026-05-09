import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout/Layout';
import { Home } from './pages/Home';
import { Orders } from './pages/Orders';
import { Cart } from './pages/Cart';
import { Profile } from './pages/Profile';
import { ProductConfigurator } from './pages/ProductConfigurator';
import { AdminDashboard } from './pages/AdminDashboard';
import { Toaster } from 'sonner';
import { RealtimeNotifications } from './components/RealtimeNotifications';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  
  if (!user) return <Navigate to="/profile" />;
  
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" expand={true} richColors />
      <RealtimeNotifications />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="product/:id" element={<ProductConfigurator />} />
            <Route path="orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
            <Route path="cart" element={<Cart />} />
            <Route path="profile" element={<Profile />} />
            <Route path="admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
