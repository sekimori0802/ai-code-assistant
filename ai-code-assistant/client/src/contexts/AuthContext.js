import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth as authApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    let retryTimeout;

    const verifyToken = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('保存されているトークン:', token ? '存在します' : '存在しません');

        if (!token) {
          console.log('トークンが見つからないため、未認証状態に設定');
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        // トークンの検証
        console.log('トークンを検証中...');
        const response = await authApi.verifyToken();
        console.log('トークン検証結果:', response.data);

        if (response.data?.status === 'success' && response.data.data?.user) {
          console.log('トークンが有効、ユーザー情報を設定:', response.data.data.user);
          if (mounted) {
            setUser(response.data.data.user);
            setLoading(false);
          }
        } else {
          console.log('トークン検証に失敗');
          throw new Error('Invalid token verification response');
        }
      } catch (error) {
        console.error('トークン検証エラー:', error);
        
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          if (mounted) {
            setUser(null);
            setLoading(false);
            navigate('/login');
          }
          return;
        }

        // ネットワークエラーの場合はリトライ
        if (retryCount < maxRetries && mounted) {
          console.log(`認証リトライ (${retryCount + 1}/${maxRetries})`);
          retryCount++;
          retryTimeout = setTimeout(verifyToken, 1000 * retryCount);
          return;
        }

        if (mounted) {
          setUser(null);
          setLoading(false);
          navigate('/login');
        }
      }
    };

    verifyToken();

    return () => {
      mounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [navigate]);

  const login = async (token, userData) => {
    console.log('ログイン処理を開始:', { token: !!token, userData });

    try {
      if (!token || !userData || !userData.id || !userData.email) {
        throw new Error('Invalid login data');
      }

      localStorage.setItem('token', token);
      setUser(userData);
      console.log('ログイン成功、チャットページへ遷移');
      navigate('/chat');
    } catch (error) {
      console.error('ログインエラー:', error);
      localStorage.removeItem('token');
      setUser(null);
      throw error;
    }
  };

  const logout = () => {
    console.log('ログアウト処理を実行');
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
  };

  console.log('認証状態:', {
    isAuthenticated: !!user,
    loading,
    hasUser: !!user
  });

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
