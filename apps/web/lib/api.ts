// Typed API client — wraps all backend calls
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function createClient(): AxiosInstance {
  const client = axios.create({ baseURL: BASE, withCredentials: true });

  client.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (r) => r,
    async (error) => {
      const orig = error.config;
      if (error.response?.status === 401 && !orig._retry) {
        orig._retry = true;
        const refresh = localStorage.getItem('refresh_token');
        if (refresh) {
          try {
            const { data } = await axios.post(`${BASE}/api/auth/refresh`, { refreshToken: refresh });
            
            localStorage.setItem('access_token', data.accessToken);
            orig.headers.Authorization = `Bearer ${data.accessToken}`;
            return client(orig);
          } catch { logout(); }
        }
      }
      return Promise.reject(error);
    }
  );
  return client;
}

export function logout(): void {
  console.log("AUTH STORE LOGOUT CALLED");
  console.trace();

  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
  }
}

export const api = createClient();

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }).then(r => r.data),
  refresh: (refreshToken: string) =>
    api.post('/api/auth/refresh', { refreshToken }).then(r => r.data),
  logout: () => api.post('/api/auth/logout'),
  me: () => api.get('/api/auth/me').then(r => r.data),
};

// ── Complaints ────────────────────────────────────────────────
export const complaintsApi = {
  list: (params?: Record<string, any>) =>
    api.get('/api/complaints', { params }).then(r => r.data),
  mine: () => api.get('/api/complaints/mine').then(r => r.data),
  track: (number: string) =>
    api.get(`/api/complaints/track/${number}`).then(r => r.data),
  get: (id: string) => api.get(`/api/complaints/${id}`).then(r => r.data),
  create: (form: FormData) =>
    api.post('/api/complaints', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),
  updateStatus: (id: string, status: string, notes?: string) =>
    api.patch(`/api/complaints/${id}/status`, { status, notes }).then(r => r.data),
  assign: (id: string, workerId: string, dueAt?: string) =>
    api.post(`/api/complaints/${id}/assign`, { workerId, dueAt }).then(r => r.data),
};

// ── Dashboard ─────────────────────────────────────────────────
export const dashboardApi = {
  summary: () => api.get('/api/dashboard/summary').then(r => r.data),
  wardStats: () => api.get('/api/dashboard/ward-stats').then(r => r.data),
  slaReport: () => api.get('/api/dashboard/sla-report').then(r => r.data),
  categoryTrend: (days = 30) =>
    api.get('/api/dashboard/category-trend', { params: { days } }).then(r => r.data),
  workers: () => api.get('/api/dashboard/workers').then(r => r.data),
};

// ── GIS ───────────────────────────────────────────────────────
export const gisApi = {
  wards: () => api.get('/api/gis/wards').then(r => r.data),
  heatmap: () => api.get('/api/gis/complaints/heatmap').then(r => r.data),
  complaintPoints: (params?: Record<string, any>) =>
    api.get('/api/gis/complaints/points', { params }).then(r => r.data),
  drains: () => api.get('/api/gis/drains').then(r => r.data),
  trees: (wardId?: string) =>
    api.get('/api/gis/trees', { params: { wardId } }).then(r => r.data),
  waterPipes: () => api.get('/api/gis/water-pipes').then(r => r.data),
};

// ── Trees ─────────────────────────────────────────────────────
export const treesApi = {
  list: (params?: Record<string, any>) =>
    api.get('/api/trees', { params }).then(r => r.data),
  stats: () => api.get('/api/trees/stats').then(r => r.data),
  carbon: () => api.get('/api/trees/carbon').then(r => r.data),
  create: (data: Record<string, any>) =>
    api.post('/api/trees', data).then(r => r.data),
  update: (id: string, data: Record<string, any>) =>
    api.patch(`/api/trees/${id}`, data).then(r => r.data),
};

// ── Drains ────────────────────────────────────────────────────
export const drainsApi = {
  list: () => api.get('/api/drains').then(r => r.data),
  get: (id: string) => api.get(`/api/drains/${id}`).then(r => r.data),
  history: (id: string, hours = 72) =>
    api.get(`/api/drains/${id}/history`, { params: { hours } }).then(r => r.data),
  alerts: () => api.get('/api/drains/alerts').then(r => r.data),
};

// ── Water ─────────────────────────────────────────────────────
export const waterApi = {
  sensors: () => api.get('/api/water').then(r => r.data),
  leaks: () => api.get('/api/water/leaks').then(r => r.data),
  pipes: () => api.get('/api/water/pipes').then(r => r.data),
  summary: () => api.get('/api/water/summary').then(r => r.data),
};

// ── Field Tasks ───────────────────────────────────────────────
export const tasksApi = {
  myTasks: () => api.get('/api/tasks/mine').then(r => r.data),
  complete: (assignmentId: string, form: FormData) =>
    api.post(`/api/tasks/${assignmentId}/complete`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),
  start: (assignmentId: string) =>
    api.post(`/api/tasks/${assignmentId}/start`).then(r => r.data),
};

// ── Users ────────────────────────────────────────────────────
export const usersApi = {
  list: (params?: Record<string, any>) =>
    api.get('/api/users', { params }).then(r => r.data),
  workers: () => api.get('/api/users', { params: { role: 'FIELD_WORKER' } }).then(r => r.data.data),
  create: (data: Record<string, any>) =>
    api.post('/api/users', data).then(r => r.data),
  update: (id: string, data: Record<string, any>) =>
    api.patch(`/api/users/${id}`, data).then(r => r.data),
  deactivate: (id: string) =>
    api.patch(`/api/users/${id}`, { isActive: false }),
};

// ── AI ────────────────────────────────────────────────────────
export const aiApi = {
  triage: (description: string, category?: string) =>
    api.post('/api/ai/triage', { description, category }).then(r => r.data),
  duplicateCheck: (description: string, locationLat?: number, locationLng?: number) =>
    api.post('/api/ai/duplicate-check', { description, locationLat, locationLng }).then(r => r.data),
};
