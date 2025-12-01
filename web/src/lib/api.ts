import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (token) {
    localStorage.setItem('access_token', token);
  } else {
    localStorage.removeItem('access_token');
  }
};

export const getAccessToken = () => {
  if (!accessToken) {
    accessToken = localStorage.getItem('access_token');
  }
  return accessToken;
};

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const { access_token, refresh_token } = response.data.data;
          setAccessToken(access_token);
          localStorage.setItem('refresh_token', refresh_token);
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        setAccessToken(null);
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  city?: string;
  bio?: string;
  company?: string;
  website?: string;
  avatar?: string;
  created_at: string;
}

export interface Club {
  id: string;
  owner_user_id: string;
  name: string;
  address?: string;
  phone?: string;
  currency: string;
  created_at: string;
}

export interface Group {
  id: string;
  club_id: string;
  title: string;
  sport?: string;
  capacity?: number;
  price: number;
  description?: string;
  coach_user_id?: string;
  created_at: string;
}

export interface Session {
  id: string;
  group_id: string;
  start_at: string;
  duration_minutes: number;
  location?: string;
  created_at?: string;
}

export interface Student {
  id: string;
  club_id: string;
  name: string;
  birth_date?: string;
  parent_contact?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  notes?: string;
}

export interface Subscription {
  id: string;
  student_id: string;
  group_id: string;
  total_sessions: number;
  remaining_sessions: number;
  price: number;
  starts_at?: string;
  expires_at?: string;
  status: 'pending' | 'active' | 'used' | 'expired' | 'cancelled';
}

export interface Attendance {
  id: string;
  session_id: string;
  student_id: string;
  subscription_id?: string;
  status: 'present' | 'absent' | 'excused';
  noted_at: string;
}

export interface DashboardStats {
  total_students: number;
  active_subscriptions: number;
  upcoming_sessions: number;
  today_sessions: number;
  month_revenue: number;
  pending_payments: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

// Auth API
export const authApi = {
  signup: (data: { email: string; password: string; name: string }) =>
    api.post<ApiResponse<{ user: User; access_token: string; refresh_token: string }>>('/auth/signup', data),
  login: (data: { email: string; password: string }) =>
    api.post<ApiResponse<{ user: User; access_token: string; refresh_token: string }>>('/auth/login', data),
  refresh: (refreshToken: string) =>
    api.post<ApiResponse<{ access_token: string; refresh_token: string }>>('/auth/refresh', { refresh_token: refreshToken }),
  me: () => api.get<ApiResponse<User>>('/auth/me'),
};

// Clubs API
export const clubsApi = {
  list: () => api.get<ApiResponse<Club[]>>('/clubs'),
  get: (id: string) => api.get<ApiResponse<Club>>(`/clubs/${id}`),
  create: (data: Partial<Club>) => api.post<ApiResponse<Club>>('/clubs', data),
  update: (id: string, data: Partial<Club>) => api.put<ApiResponse<Club>>(`/clubs/${id}`, data),
  delete: (id: string) => api.delete(`/clubs/${id}`),
  dashboard: (clubId: string) => api.get<ApiResponse<DashboardStats>>(`/clubs/${clubId}/dashboard`),
};

// Groups API
export const groupsApi = {
  list: (clubId: string) => api.get<ApiResponse<Group[]>>(`/clubs/${clubId}/groups`),
  get: (id: string) => api.get<ApiResponse<Group>>(`/groups/${id}`),
  create: (data: Partial<Group>) => api.post<ApiResponse<Group>>('/groups', data),
  update: (id: string, data: Partial<Group>) => api.put<ApiResponse<Group>>(`/groups/${id}`, data),
  delete: (id: string) => api.delete(`/groups/${id}`),
};

// Sessions API
export const sessionsApi = {
  list: (groupId: string) => api.get<ApiResponse<Session[]>>(`/groups/${groupId}/sessions`),
  get: (id: string) => api.get<ApiResponse<Session>>(`/sessions/${id}`),
  create: (groupId: string, data: { start_at: string; duration_minutes: number; location?: string }) =>
    api.post<ApiResponse<Session>>(`/groups/${groupId}/sessions`, data),
  update: (id: string, data: Partial<Session>) => api.put<ApiResponse<Session>>(`/sessions/${id}`, data),
  delete: (id: string) => api.delete(`/sessions/${id}`),
};

// Students API
export const studentsApi = {
  list: (clubId: string, page = 1, perPage = 20) =>
    api.get<ApiResponse<Student[]>>(`/clubs/${clubId}/students`, { params: { page, per_page: perPage } }),
  search: (clubId: string, query: string) =>
    api.get<ApiResponse<Student[]>>(`/clubs/${clubId}/students/search`, { params: { q: query } }),
  get: (id: string) => api.get<ApiResponse<Student>>(`/students/${id}`),
  create: (data: Partial<Student>) => api.post<ApiResponse<Student>>('/students', data),
  update: (id: string, data: Partial<Student>) => api.put<ApiResponse<Student>>(`/students/${id}`, data),
  delete: (id: string) => api.delete(`/students/${id}`),
};

// Subscriptions API
export const subscriptionsApi = {
  listByClub: (clubId: string, status?: string) =>
    api.get<ApiResponse<Subscription[]>>(`/clubs/${clubId}/subscriptions`, { params: { status } }),
  listByStudent: (studentId: string) =>
    api.get<ApiResponse<Subscription[]>>(`/students/${studentId}/subscriptions`),
  get: (id: string) => api.get<ApiResponse<Subscription>>(`/subscriptions/${id}`),
  create: (data: { student_id: string; group_id: string; total_sessions: number; price: number }) =>
    api.post<ApiResponse<Subscription>>('/subscriptions', data),
  cancel: (id: string) => api.put<ApiResponse<Subscription>>(`/subscriptions/${id}/cancel`),
};

// Attendance API
export const attendanceApi = {
  getBySession: (sessionId: string) =>
    api.get<ApiResponse<Attendance[]>>(`/sessions/${sessionId}/attendance`),
  mark: (data: { session_id: string; student_id: string; status: string }) =>
    api.post<ApiResponse<Attendance>>('/attendance', data),
  bulkMark: (data: { session_id: string; attendances: { student_id: string; status: string }[] }) =>
    api.post<ApiResponse<{ results: Attendance[] }>>('/attendance/bulk', data),
  update: (id: string, data: { status: string }) =>
    api.put<ApiResponse<Attendance>>(`/attendance/${id}`, data),
  delete: (id: string) => api.delete(`/attendance/${id}`),
};

// Payments API
export const paymentsApi = {
  createCheckout: (data: {
    student_id?: string;
    group_id: string;
    subscription: { total_sessions: number; price: number };
    success_url: string;
    cancel_url: string;
  }) => api.post<ApiResponse<{ checkout_url: string; session_id: string }>>('/payments/create-checkout-session', data),
  createManual: (data: { subscription_id: string; amount: number; method: string }) =>
    api.post<ApiResponse<any>>('/payments/manual', data),
};

export default api;

// Public API (no auth required)
export const publicApi = {
  getSchedule: (clubId: string, from?: string, to?: string) =>
    axios.get(`${API_BASE_URL.replace('/api/v1', '')}/public/club/${clubId}/schedule`, { params: { from, to } }),
  getGroups: (clubId: string) =>
    axios.get(`${API_BASE_URL.replace('/api/v1', '')}/public/club/${clubId}/groups`),
};
