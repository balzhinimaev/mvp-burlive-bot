import axios, { AxiosResponse } from 'axios';
import { config } from './config';
import { LeadData, ApiResponse } from './types';

const apiClient = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: 3000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
      data: config.data ? JSON.stringify(config.data).substring(0, 200) : null,
    });
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error.message);
    return Promise.reject(error);
  }
);

// Response interceptor for logging
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API] Response ${response.status}`, {
      url: response.config.url,
      statusText: response.statusText,
    });
    return response;
  },
  (error) => {
    console.error(`[API] Response error:`, {
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
    });
    return Promise.reject(error);
  }
);

export class ApiService {
  /**
   * Отправка лида на бэкенд (идемпотентный upsert)
   */
  static async sendLead(leadData: LeadData): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await apiClient.post(
        '/leads/bot_start',
        leadData
      );
      
      return response.data;
    } catch (error: any) {
      console.error(`[API] Failed to send lead for user ${leadData.userId}:`, {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      
      // Возвращаем ошибку, но не блокируем UX
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Проверка состояния API
   */
  static async healthCheck(): Promise<boolean> {
    try {
      await apiClient.get('/health');
      return true;
    } catch {
      return false;
    }
  }
}
