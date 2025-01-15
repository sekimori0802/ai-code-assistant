import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import MessageContent from './MessageContent';

const ChatInterface = ({ roomId }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [roomData, setRoomData] = useState(null);
  const messagesEndRef = useRef(null);
  const { user, isAuthenticated } = useAuth();

  // チャットルームの情報を取得
  const fetchRoomData = useCallback(async () => {
    if (!roomId) return;
    try {
      const response = await api.chat.getRoom(roomId);
      if (response.data.status === 'success') {
        setRoomData(response.data.data);
      }
    } catch (error) {
      console.error('チャットルーム情報の取得エラー:', error);
    }
  }, [roomId]);

  useEffect(() => {
    fetchRoomData();
  }, [fetchRoomData]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = useCallback(async () => {
    if (!isAuthenticated || !user || !roomId) {
      console.log('認証状態:', { isAuthenticated, user, roomId });
      return;
    }

    try {
      setError('');
      console.log('チャット履歴を取得中...');
      const response = await api.chat.getHistory(roomId);
      console.log('サーバーレスポンス:', response);
      
      if (response?.data?.status === 'success' && Array.isArray(response.data.data?.history)) {
        console.log('チャット履歴:', response.data.data.history);
        const formattedHistory = response.data.data.history.map(item => ({
          id: item.id,
          type: item.user_id === 'system' ? 'ai' : 'user',
          content: item.message,
          timestamp: item.created_at,
          userId: item.user_id,
          userEmail: item.user_email
        }));
        setMessages(formattedHistory);
      } else {
        console.log('チャット履歴が空または無効な形式');
        setMessages([]);
      }
    } catch (error) {
      console.error('チャット履歴の取得エラー:', error);
      console.error('エラーの詳細:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setError('チャット履歴の取得に失敗しました。ページを再読み込みしてください。');
    }
  }, [isAuthenticated, user, roomId]);

  useEffect(() => {
    if (isAuthenticated && roomId) {
      console.log('認証状態またはルームIDが変更されたため、チャット履歴を再取得');
      loadChatHistory();
    } else {
      console.log('未認証またはルームIDが未設定のため、メッセージをクリア');
      setMessages([]);
    }
  }, [isAuthenticated, roomId, loadChatHistory]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || !isAuthenticated || !user || !roomId) return;

    const userMessage = {
      type: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
      userId: user.id,
      userEmail: user.email
    };

    setInput('');
    setIsLoading(true);
    setError('');

    try {
      console.log('メッセージを送信中:', { message: userMessage.content, roomId });

      // 一時的なユーザーメッセージを追加
      const tempUserMessage = {
        ...userMessage,
        isTemp: true
      };
      setMessages(prev => [...prev, tempUserMessage]);

      // メッセージを送信
      await api.chat.sendMessage(
        userMessage.content,
        roomId,
        async (data) => {
          if (data.type === 'error') {
            console.error('AIエラー:', data.data);
            setError(data.data.message || 'AIの応答生成中にエラーが発生しました');
            // エラーメッセージを表示し、AIの応答メッセージを削除
            setMessages(prev => {
              const newMessages = prev.filter(msg => !msg.isTemp);
              return newMessages;
            });
            return;
          }

          if (data.type === 'user_message_saved') {
            // 一時的なメッセージを永続的なメッセージに置き換え
            const updatedMessage = {
              id: data.data.id,
              type: 'user',
              content: data.data.message,
              timestamp: data.data.timestamp,
              userId: user.id,
              userEmail: user.email
            };

            setMessages(prev => {
              const newMessages = prev.filter(msg => !msg.isTemp);
              return [...newMessages, updatedMessage];
            });

            // AIの応答が必要な場合のみ、応答用のメッセージを追加
            if (data.data.shouldCallAI) {
              const aiMessage = {
                type: 'ai',
                content: '',
                timestamp: new Date().toISOString(),
                userId: 'system',
                userEmail: 'System',
                isStreaming: true
              };
              setMessages(prev => [...prev, aiMessage]);
            } else {
              setIsLoading(false);
              await loadChatHistory();
            }
          } else if (data.type === 'ai_response_chunk') {
            // AIの応答を段階的に更新
            setMessages(prev => {
              const lastMessage = prev[prev.length - 1];
              if (lastMessage && lastMessage.type === 'ai' && lastMessage.isStreaming) {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  ...lastMessage,
                  id: data.data.id,
                  content: data.data.fullContent,
                  timestamp: data.data.timestamp
                };
                return newMessages;
              }
              return prev;
            });
          } else if (data.type === 'ai_response_complete') {
            // ストリーミング完了時の処理
            await loadChatHistory();
            setIsLoading(false);
          }
        }
      , roomData?.ai_type);
    } catch (error) {
      console.error('メッセージの送信エラー:', error);
      console.error('エラーの詳細:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setError('メッセージの送信に失敗しました。もう一度お試しください。');
      // 失敗したメッセージを削除
      setMessages(prev => prev.filter(msg => !msg.isTemp));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="text-gray-500 mb-4">
            ログインしてチャットを開始してください。
          </div>
          <div className="text-sm text-gray-400">
            アカウントをお持ちでない場合は、新規登録してください。
          </div>
        </div>
      </div>
    );
  }

  if (!roomId) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="text-gray-500 mb-4">
            チャットルームを選択してください。
          </div>
          <div className="text-sm text-gray-400">
            または新しいチャットを開始してください。
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-50">
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg relative mb-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}
        <div className="flex flex-col space-y-4">
          {messages.map((message, index) => (
            <div
              key={`${message.type}-${index}`}
              className={`flex ${
                message.type === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div className="flex flex-col">
                <div className="text-sm text-gray-500 mb-1">
                  {message.type === 'user' ? message.userEmail : 'AI Assistant'}
                </div>
                <div
                  className={`max-w-[70%] rounded-lg p-4 shadow-sm ${
                    message.type === 'user'
                      ? 'bg-primary-100 text-primary-900 border border-primary-200'
                      : message.type === 'error'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-white text-gray-800'
                  }`}
                >
                  <MessageContent content={message.content} />
                  <div
                    className={`text-xs mt-2 ${
                      message.type === 'user'
                        ? 'text-primary-600'
                        : message.type === 'error'
                        ? 'text-red-500'
                        : 'text-gray-500'
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {isLoading && (
          <div className="flex justify-start mt-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t bg-white p-4 shadow-lg">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex space-x-4">
            <div className="relative flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() && !isLoading && isAuthenticated && roomId) {
                      handleSubmit(e);
                    }
                  }
                }}
                placeholder="メッセージを入力してください... (Shift + Enter で改行, @AI でAIを呼び出し)"
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 resize-none min-h-[2.5rem] max-h-32 overflow-y-auto"
                disabled={isLoading || !isAuthenticated || !roomId}
                rows={1}
                style={{ height: 'auto', minHeight: '2.5rem' }}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !isAuthenticated || !roomId || !input.trim()}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 transition-colors duration-200"
            >
              送信
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
