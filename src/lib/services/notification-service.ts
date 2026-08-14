import { NotificationRepository } from '../dal/notification-repository';

export class NotificationService {
    static async getUserNotifications(userId: string) {
        return NotificationRepository.getNotifications(userId);
    }

    static async markNotificationAsRead(id: string, ) {
        return NotificationRepository.markAsRead(id);
    }
}
