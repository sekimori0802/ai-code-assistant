import React from 'react';
import { useParams } from 'react-router-dom';
import ChatInterface from './ChatInterface';
import ChatRoomList from './ChatRoomList';

const ChatPage = () => {
  const { roomId } = useParams();

  return (
    <div className="min-h-screen bg-gray-50">
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
