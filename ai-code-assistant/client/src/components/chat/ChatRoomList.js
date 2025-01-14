import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const ChatRoomList = () => {
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // トークルーム一覧の取得
  const fetchRooms = async () => {
    try {
      const response = await api.chatRoom.getAll();
      setRooms(response.data.data.rooms);
      setError(null);
    } catch (err) {
      console.error('トークルーム一覧の取得エラー:', err);
      setError('トークルーム一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // コンポーネントのマウント時にトークルーム一覧を取得
  useEffect(() => {
    fetchRooms();
  }, []);

  // 新しいトークルームの作成
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    try {
      await api.chatRoom.create(newRoomName.trim());
      setNewRoomName('');
      fetchRooms(); // 一覧を更新
    } catch (err) {
      console.error('トークルーム作成エラー:', err);
      setError('トークルームの作成に失敗しました');
    }
  };

  // トークルームへの参加（チャットページへの遷移）
  const handleJoinRoom = (roomId) => {
    navigate(`/chat-room/${roomId}`);
  };

  if (loading) {
    return <div className="p-4">読み込み中...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">トークルーム一覧</h2>

      {/* トークルーム作成フォーム */}
      <form onSubmit={handleCreateRoom} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="新しいトークルーム名"
            className="flex-1 p-2 border rounded"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            作成
          </button>
        </div>
      </form>

      {/* トークルーム一覧 */}
      <div className="space-y-4">
        {rooms.length === 0 ? (
          <p className="text-gray-500">トークルームがありません</p>
        ) : (
          rooms.map((room) => (
            <div
              key={room.id}
              className="p-4 border rounded hover:bg-gray-50 cursor-pointer"
              onClick={() => handleJoinRoom(room.id)}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">{room.name}</h3>
                <span className="text-sm text-gray-500">
                  メンバー: {room.member_count}人
                </span>
              </div>
              <div className="text-sm text-gray-500 mt-1">
                作成日時: {new Date(room.created_at).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatRoomList;
