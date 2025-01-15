import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// APIクライアントの作成
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// リクエストインターセプター
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('APIリクエスト:', {
      url: config.url,
      method: config.method,
      hasToken: !!token
    });

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('APIリクエストエラー:', error);
    return Promise.reject(error);
  }
);

// レスポンスインターセプター
apiClient.interceptors.response.use(
  (response) => {
    console.log('APIレスポンス:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  async (error) => {
    console.error('APIエラー:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });

    // 認証エラーの場合
    if (error.response?.status === 401) {
      console.log('認証エラーを検出、ログアウト処理を実行');
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

// 認証関連のAPI
export const auth = {
  register: (data) => apiClient.post('/api/auth/register', data),
  login: (data) => apiClient.post('/api/auth/login', data),
  logout: () => {
    console.log('ログアウト処理を実行');
    localStorage.removeItem('token');
    return Promise.resolve();
  },
  resetPassword: (data) => apiClient.post('/api/auth/reset-password', data),
  verifyToken: () => apiClient.get('/api/auth/verify'),
};

// チャット関連のAPI
export const chat = {
  // AIとのチャット（ストリーミング対応）
  sendMessage: (message, roomId, onChunk, aiType) => {
    return new Promise((resolve, reject) => {
      const token = localStorage.getItem('token');
      const eventSource = new EventSource(
        `${API_URL}/api/chat/send?message=${encodeURIComponent(message)}&roomId=${encodeURIComponent(roomId)}&token=${encodeURIComponent(token)}&aiType=${encodeURIComponent(aiType || 'code_generation')}`
      );

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received message:', data);

          if (data.error) {
            console.error('Server error:', data.error);
            eventSource.close();
            reject(new Error(data.error));
            return;
          }

          // 完了イベントの確認
          if (data.type === 'ai_response_complete') {
            console.log('Stream complete');
            eventSource.close();
            resolve(data);
            return;
          }

          onChunk(data);
        } catch (error) {
          console.error('Error parsing message:', error);
          eventSource.close();
          reject(error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        eventSource.close();
        reject(new Error('Stream connection failed'));
      };
    });
  },
  getHistory: (roomId) => apiClient.get(`/api/chat/history?roomId=${roomId}`),
  deleteMessage: (id, roomId) => apiClient.delete(`/api/chat/history/${id}?roomId=${roomId}`),
  
  // チャットルーム管理
  createRoom: (data) => apiClient.post('/api/chat-rooms', data),
  getRooms: () => apiClient.get('/api/chat-rooms'),
  getRoom: (roomId) => apiClient.get(`/api/chat-rooms/${roomId}`),
  joinRoom: (roomId) => apiClient.post(`/api/chat-rooms/${roomId}/join`),
  updateRoom: (roomId, data) => apiClient.put(`/api/chat-rooms/${roomId}`, data),
  deleteRoom: (roomId) => apiClient.delete(`/api/chat-rooms/${roomId}`),
};

// 管理者用API
export const admin = {
  getUsers: () => apiClient.get('/api/admin/users'),
  deleteUser: (id) => apiClient.delete(`/api/admin/users/${id}`),
  resetUserPassword: (id, newPassword) =>
    apiClient.post(`/api/admin/reset-password/${id}`, { newPassword }),
  updateLLMSettings: (settings) => apiClient.post('/api/admin/llm-settings', settings),
  getChatLogs: () => apiClient.get('/api/admin/chat-logs'),
};

// APIクライアントのエクスポート
const api = {
  auth,
  chat,
  admin
};

export default api;
