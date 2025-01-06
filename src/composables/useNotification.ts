import { ref } from 'vue';

export interface Notification {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timeout?: number;
}

export function useNotifications() {
  const notifications = ref<Notification[]>([]);

  const addNotification = (
    message: string,
    type: Notification['type'] = 'info',
    timeout = 5000
  ) => {
    const id = Date.now();
    notifications.value.push({ id, type, message });

    if (timeout > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, timeout);
    }
  };

  const removeNotification = (id: number) => {
    notifications.value = notifications.value.filter(n => n.id !== id);
  };

  return {
    notifications,
    addNotification,
    removeNotification
  };
}
