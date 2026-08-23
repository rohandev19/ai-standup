import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('users/me/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(
    @Req() req: { user: { id: string; sub?: string } },
    @Query('isRead') isRead?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const isReadBool =
      isRead === 'true' ? true : isRead === 'false' ? false : undefined;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const offset = (pageNum - 1) * limitNum;
    const userId = req.user.id || req.user.sub || '';

    return this.notificationsService.getUserNotifications(
      userId,
      isReadBool,
      limitNum,
      offset,
    );
  }

  @Patch(':id/read')
  async markAsRead(
    @Req() req: { user: { id: string; sub?: string } },
    @Param('id') id: string,
  ) {
    const userId = req.user.id || req.user.sub || '';
    return this.notificationsService.markAsRead(userId, id);
  }

  @Post('read-all')
  async markAllAsRead(@Req() req: { user: { id: string; sub?: string } }) {
    const userId = req.user.id || req.user.sub || '';
    return this.notificationsService.markAllAsRead(userId);
  }
}
