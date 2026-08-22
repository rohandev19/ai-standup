import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: '*', // Di production sebaiknya spesifik domain front-end
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const token = (client.handshake.auth.token ||
        client.handshake.query.token) as string;
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify<{ sub?: string; id?: string }>(
        token,
      );
      client.data.user = payload;
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect() {
    // client disconnected
  }

  @SubscribeMessage('join_workspace')
  async handleJoinWorkspace(
    @MessageBody() data: { workspaceId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user as { sub?: string; id?: string } | undefined;
    if (!user || !data.workspaceId)
      return {
        status: 'error',
        message: 'Unauthorized or missing workspaceId',
      };

    // Tenant Isolation: Verify membership before allowing join to room
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: data.workspaceId,
          userId: (user.sub || user.id) as string,
        },
      },
    });

    if (!membership || !membership.isActive) {
      return {
        status: 'error',
        message: 'You are not a member of this workspace',
      };
    }

    void client.join(`workspace_${data.workspaceId}`);
    return {
      status: 'success',
      message: `Joined workspace ${data.workspaceId}`,
    };
  }

  @SubscribeMessage('leave_workspace')
  handleLeaveWorkspace(
    @MessageBody() data: { workspaceId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (data.workspaceId) {
      void client.leave(`workspace_${data.workspaceId}`);
      return { status: 'success' };
    }
  }

  // Utility to broadcast events to a workspace
  broadcastToWorkspace(workspaceId: string, event: string, payload: any) {
    this.server.to(`workspace_${workspaceId}`).emit(event, payload);
  }
}
