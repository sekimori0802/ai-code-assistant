import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// APIクライアントの作成
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
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
  sendMessage: (message) => apiClient.post('/api/chat/send', { message }),
  getHistory: () => apiClient.get('/api/chat/history'),
  deleteMessage: (id) => apiClient.delete(`/api/chat/history/${id}`),
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

// トークルーム関連のAPI
export const chatRoom = {
  create: (name) => apiClient.post('/api/chat-rooms', { name }),
  getAll: () => apiClient.get('/api/chat-rooms'),
  addMember: (roomId, userId) => apiClient.post('/api/chat-rooms/member', { roomId, userId }),
  sendMessage: (roomId, message) => apiClient.post('/api/chat-rooms/message', { roomId, message }),
  getMessages: (roomId) => apiClient.get(`/api/chat-rooms/${roomId}/messages`),
};

// APIクライアントのエクスポート
const api = {
  auth,
  chat,
  admin,
  chatRoom
};

export default api;
