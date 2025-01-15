import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const ChatRoomList = () => {
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [searchRoomId, setSearchRoomId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchError, setSearchError] = useState(null);
  const navigate = useNavigate();

  // チャットルーム一覧の取得
  const fetchRooms = async () => {
    try {
      const response = await api.chat.getRooms();
      if (response.data.status === 'success') {
        setRooms(response.data.data.rooms);
        setError(null);
      } else {
        throw new Error('Failed to fetch rooms');
      }
    } catch (err) {
      console.error('チャットルーム一覧の取得エラー:', err);
      if (err.response?.status === 401) {
        // 認証エラーの場合は再認証を試みる
        try {
          await api.auth.verifyToken();
          // 再認証成功したら再度ルーム一覧を取得
          const retryResponse = await api.chat.getRooms();
          if (retryResponse.data.status === 'success') {
            setRooms(retryResponse.data.data.rooms);
            setError(null);
            return;
          }
        } catch (retryErr) {
          console.error('再認証エラー:', retryErr);
        }
      }
      setError('チャットルーム一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // コンポーネントのマウント時とトークン更新時にチャットルーム一覧を取得
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchRooms();
    } else {
      setLoading(false);
    }
  }, []);

  // 新しいチャットルームの作成
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    try {
      const response = await api.chat.createRoom(newRoomName.trim());
      if (response.data.status === 'success') {
        setNewRoomName('');
        fetchRooms(); // 一覧を更新
        // 作成したルームに移動
        navigate(`/chat/${response.data.data.id}`);
      } else {
        throw new Error('Failed to create room');
      }
    } catch (err) {
      console.error('チャットルーム作成エラー:', err);
      setError('チャットルームの作成に失敗しました');
    }
  };

  // チャットルームを開く
  const handleOpenRoom = (roomId) => {
    navigate(`/chat/${roomId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-primary-600 rounded-full animate-bounce" />
          <div className="w-3 h-3 bg-primary-600 rounded-full animate-bounce delay-100" />
          <div className="w-3 h-3 bg-primary-600 rounded-full animate-bounce delay-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">AIチャット</h2>
        <p className="text-gray-600 mb-4">
          新しいチャットを開始するか、既存のチャットを続けることができます。
        </p>

        {/* チャットルーム作成フォーム */}
        {/* ルームID検索フォーム */}
        <div className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchRoomId}
              onChange={(e) => setSearchRoomId(e.target.value)}
              placeholder="ルームIDを入力して参加"
              className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={async () => {
                if (!searchRoomId.trim()) return;
                try {
                  const response = await api.chat.joinRoom(searchRoomId.trim());
                  if (response.data.status === 'success') {
                    navigate(`/chat/${searchRoomId.trim()}`);
                    setSearchError(null);
                  }
                } catch (err) {
                  console.error('ルーム参加エラー:', err);
                  setSearchError('指定されたルームが見つからないか、参加できません');
                }
              }}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors duration-200"
            >
              参加
            </button>
          </div>
          {searchError && (
            <div className="mt-2 text-sm text-red-600">{searchError}</div>
          )}
        </div>

        {/* チャットルーム作成フォーム */}
        <form onSubmit={handleCreateRoom} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="新しいチャットの名前"
              className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
            <button
              type="submit"
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors duration-200"
            >
              新規チャット
            </button>
          </div>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* チャットルーム一覧 */}
        <div className="space-y-3">
          {rooms.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              チャット履歴がありません
            </div>
          ) : (
            rooms.map((room) => (
              <div
                key={room.id}
                onClick={() => handleOpenRoom(room.id)}
                className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors duration-200"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {room.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          ID: {room.id}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(room.id);
                            const toast = document.createElement('div');
                            toast.className = 'fixed bottom-4 right-4 bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in-out';
                            toast.textContent = 'ルームIDをコピーしました';
                            document.body.appendChild(toast);
                            setTimeout(() => {
                              toast.remove();
                            }, 2000);
                          }}
                          className="text-sm text-blue-500 hover:text-blue-700 flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          コピー
                        </button>
                      </div>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(room.updated_at || room.created_at).toLocaleString()}
                  </span>
                </div>
                {room.last_message && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {room.last_message}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatRoomList;
