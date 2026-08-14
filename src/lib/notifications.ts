import { sendNotification } from '@/actions/notification-actions';

interface NotificationOptions {
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    link?: string;
}

export async function createNotification(userId: string, options: NotificationOptions) {
    try {
        await sendNotification({
            userId,
            title: options.title,
            message: options.message,
            type: options.type,
            link: options.link
        });
    } catch (error) {
        console.error("Failed to create notification:", error);
    }
}

export const createActionNotification = createNotification;
