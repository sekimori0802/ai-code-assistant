import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ChatInterface from './ChatInterface';
import ChatRoomList from './ChatRoomList';

const ChatPage = () => {
  const { roomId } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">AI Code Assistant</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {roomId ? (
            // チャットインターフェース（特定のルームが選択されている場合）
            <div className="border-2 border-gray-200 rounded-lg h-[calc(100vh-12rem)]">
              <ChatInterface roomId={roomId} />
            </div>
          ) : (
            // チャットルーム一覧（ルームが選択されていない場合）
            <div className="border-2 border-gray-200 rounded-lg h-[calc(100vh-12rem)] overflow-y-auto">
              <ChatRoomList />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ChatPage;
