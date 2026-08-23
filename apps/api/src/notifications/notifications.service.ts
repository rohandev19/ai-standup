import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { NotificationType, Prisma } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    workspaceId?: string,
    metadata?: Record<string, unknown>,
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        workspaceId,
        metadata: (metadata || {}) as Prisma.InputJsonValue,
      },
    });

    // Count unread for badge update
    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    this.eventsGateway.broadcastToUser(userId, 'notification_count', {
      unreadCount,
    });

    return notification;
  }

  async getUserNotifications(
    userId: string,
    isRead?: boolean,
    limit = 20,
    offset = 0,
  ) {
    const where: import('@prisma/client').Prisma.NotificationWhereInput = {
      userId,
    };
    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { items, total, unreadCount };
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });

    if (notification.count > 0) {
      const unreadCount = await this.prisma.notification.count({
        where: { userId, isRead: false },
      });
      this.eventsGateway.broadcastToUser(userId, 'notification_count', {
        unreadCount,
      });
    }

    return { success: true };
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    this.eventsGateway.broadcastToUser(userId, 'notification_count', {
      unreadCount: 0,
    });

    return { success: true };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async purgeOldNotifications() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo,
        },
      },
    });

    this.logger.log(`Purged ${result.count} old notifications`);
  }
}
