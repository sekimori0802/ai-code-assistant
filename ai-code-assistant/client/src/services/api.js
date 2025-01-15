import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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

    const originalRequest = error.config;

    // ネットワークエラーの場合はリトライ
    if (!error.response && !originalRequest._retry) {
      originalRequest._retry = true;
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

      if (originalRequest._retryCount <= 3) {
        console.log(`APIリクエストをリトライ (${originalRequest._retryCount}/3)`);
        await new Promise(resolve => setTimeout(resolve, 1000 * originalRequest._retryCount));
        return apiClient(originalRequest);
      }
    }

    // 認証エラーの場合
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // トークン検証エンドポイントの場合は直接ログアウト
      if (originalRequest.url === '/api/auth/verify') {
        console.log('トークン検証に失敗、ログアウト処理を実行');
        localStorage.removeItem('token');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        // トークンの再検証を試みる
        await apiClient.get('/api/auth/verify');
        return apiClient(originalRequest);
      } catch (verifyError) {
        console.log('トークン再検証に失敗、ログアウト処理を実行');
        localStorage.removeItem('token');
        window.location.href = '/login';
        return Promise.reject(error);
      }
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
      if (!token) {
        reject(new Error('認証トークンが見つかりません'));
        return;
      }

      const url = new URL(`${API_URL}/api/chat/send`);
      url.searchParams.append('message', message);
      url.searchParams.append('roomId', roomId);
      url.searchParams.append('token', token);
      url.searchParams.append('aiType', aiType || 'code_generation');

      let eventSource = null;
      let reconnectAttempts = 0;
      const maxReconnectAttempts = 3;
      let hasReceivedUserMessage = false;
      let isClosing = false;

      const connect = () => {
        if (isClosing) return;

        eventSource = new EventSource(url.toString());
        console.log('EventSource接続を開始:', url.toString());

        eventSource.onopen = () => {
          console.log('EventSource接続が確立されました');
          reconnectAttempts = 0;
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('メッセージを受信:', data);

            if (data.error) {
              console.error('サーバーエラー:', data.error);
              closeConnection();
              reject(new Error(data.error));
              return;
            }

            // ユーザーメッセージが保存された場合
            if (data.type === 'user_message_saved') {
              hasReceivedUserMessage = true;
              onChunk(data);
              // AIの応答が不要な場合はここで終了
              if (!data.data.shouldCallAI) {
                closeConnection();
                resolve(data);
                return;
              }
            }
            // AIの応答チャンクまたは完了イベント
            else if (hasReceivedUserMessage) {
              onChunk(data);
              if (data.type === 'ai_response_complete') {
                console.log('ストリーミングが完了しました');
                closeConnection();
                resolve(data);
              }
            }
          } catch (error) {
            console.error('メッセージのパースエラー:', error);
            closeConnection();
            reject(error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('EventSourceエラー:', error);
          
          if (reconnectAttempts < maxReconnectAttempts && !hasReceivedUserMessage) {
            console.log(`再接続を試みます (${reconnectAttempts + 1}/${maxReconnectAttempts})`);
            eventSource.close();
            reconnectAttempts++;
            setTimeout(connect, 1000 * reconnectAttempts);
          } else {
            closeConnection();
            if (!hasReceivedUserMessage) {
              reject(new Error('ストリーム接続に失敗しました'));
            }
          }
        };
      };

      const closeConnection = () => {
        if (eventSource) {
          isClosing = true;
          eventSource.close();
          eventSource = null;
        }
      };

      // 接続を開始
      connect();

      // クリーンアップ用のタイムアウト
      const timeout = setTimeout(() => {
        if (eventSource && !hasReceivedUserMessage) {
          console.error('接続タイムアウト');
          closeConnection();
          reject(new Error('接続がタイムアウトしました'));
        }
      }, 30000); // 30秒でタイムアウト

      // クリーンアップ関数を返す
      return () => {
        clearTimeout(timeout);
        closeConnection();
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
