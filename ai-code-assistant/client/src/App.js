import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import PrivateRoute from './components/layout/PrivateRoute';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ChatInterface from './components/chat/ChatInterface';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Layout>
          <Routes>
            {/* パブリックルート */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* プライベートルート */}
            <Route
              path="/chat"
              element={
                <PrivateRoute>
                  <ChatInterface />
                </PrivateRoute>
              }
            />

            {/* その他のルートをチャットページにリダイレクト */}
            <Route
              path="/"
              element={<Navigate to="/chat" replace />}
            />
          </Routes>
        </Layout>
      </AuthProvider>
    </Router>
  );
}

export default App;
