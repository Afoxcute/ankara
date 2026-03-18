import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

export interface NotificationPrefs {
  pushoverUserKey: string | null;
}

export const notificationApi = {
  async getPrefs(userAddress: string): Promise<NotificationPrefs> {
    const res = await api.get(`/notification-prefs/${encodeURIComponent(userAddress)}`);
    return res.data.data;
  },

  async setPushoverUserKey(
    userAddress: string,
    pushoverUserKey: string | null
  ): Promise<NotificationPrefs> {
    const res = await api.put("/notification-prefs", {
      userAddress,
      pushoverUserKey: pushoverUserKey || null,
    });
    return res.data.data;
  },
};
