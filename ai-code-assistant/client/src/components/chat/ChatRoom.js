import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const ChatRoom = () => {
  const { roomId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // メッセージ一覧の取得
  const fetchMessages = async () => {
    try {
      const response = await api.chatRoom.getMessages(roomId);
      setMessages(response.data.data.messages);
      setError(null);
    } catch (err) {
      console.error('メッセージ一覧の取得エラー:', err);
      if (err.response?.status === 403) {
        navigate('/chat-rooms');
        return;
      }
      setError('メッセージの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 定期的にメッセージを更新
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); // 5秒ごとに更新

    return () => clearInterval(interval);
  }, [roomId]);

  // 新しいメッセージが追加されたら自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // メッセージの送信
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await api.chatRoom.sendMessage(roomId, newMessage.trim());
      setNewMessage('');
      fetchMessages();
    } catch (err) {
      console.error('メッセージ送信エラー:', err);
      setError('メッセージの送信に失敗しました');
    }
  };

  if (loading) {
    return <div className="p-4">読み込み中...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center">メッセージがありません</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.user_id === currentUser.id ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-lg ${
                  message.user_id === currentUser.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100'
                }`}
              >
                <div className="text-sm text-gray-500 mb-1">
                  {message.user_email}
                </div>
                <div className="break-words">{message.message}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(message.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* メッセージ入力フォーム */}
      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="メッセージを入力"
            className="flex-1 p-2 border rounded"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            送信
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatRoom;
