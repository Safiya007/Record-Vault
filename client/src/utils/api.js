import axios from "axios";

const api = axios.create({
  // In local dev, "/api" is relative and gets proxied to localhost:5000 by
  // CRA's "proxy" field in package.json. In production, frontend and
  // backend are usually on different domains, so REACT_APP_API_URL must be
  // set (e.g. https://your-backend.onrender.com/api) at build time.
  baseURL: process.env.REACT_APP_API_URL || "/api",
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// The current socket's id, set by SocketContext once connected. Sent as a
// header on every request so the server can tag broadcast events with the
// originating client — lets clients skip toasting their own actions while
// still toasting other users' actions.
let currentSocketId = null;
export const setSocketId = (id) => {
  currentSocketId = id;
};

api.interceptors.request.use((config) => {
  if (currentSocketId) config.headers["x-socket-id"] = currentSocketId;
  return config;
});

// Response interceptor for consistent error handling
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message =
      err.response?.data?.error || err.message || "Network error";
    return Promise.reject(new Error(message));
  }
);

export const recordsApi = {
  getAll: (params = {}) => api.get("/records", { params }),
  getById: (id) => api.get(`/records/${id}`),
  getStats: () => api.get("/records/stats"),
  create: (data) => api.post("/records", data),
  update: (id, data) => api.put(`/records/${id}`, data),
  delete: (id) => api.delete(`/records/${id}`),
  recalculateAll: () => api.post("/records/recalculate/all"),
  sendAlert: (id) => api.post(`/records/${id}/send-alert`),
  uploadAttachment: (id, file, onProgress) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/records/${id}/attachment`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: onProgress
        ? (evt) => onProgress(Math.round((evt.loaded * 100) / evt.total))
        : undefined,
    });
  },
  deleteAttachment: (id) => api.delete(`/records/${id}/attachment`),
  attachmentDownloadUrl: (id) =>
    `${process.env.REACT_APP_API_URL || "/api"}/records/${id}/attachment`,
};

export const activityApi = {
  getRecent: (limit = 50) => api.get("/activity", { params: { limit } }),
};

export const emailImportApi = {
  getStatus: () => api.get("/email-import/status"),
  scan: (limit = 20) => api.post("/email-import/scan", { limit }),
};

export default api;
