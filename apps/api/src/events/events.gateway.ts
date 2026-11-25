import { OnEvent } from '@nestjs/event-emitter';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayInit,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import { UsersService } from '../users/users.service';
import type { AccessTokenClaims } from '../users/users.service';

interface SocketSession {
  user?: AccessTokenClaims;
  timeoutId?: NodeJS.Timeout;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  afterInit(server: Server) {
    server.use((client, next) => {
      void this.authenticateSocket(client).then(
        () => next(),
        () => next(new Error('Session is no longer valid')),
      );
    });
  }

  private async authenticateSocket(client: Socket) {
    const token = (client.handshake.auth.token ??
      client.handshake.query.token) as unknown;
    if (typeof token !== 'string') throw new Error('Missing access token');

    const claims = this.jwtService.verify<AccessTokenClaims>(token);
    if (!claims.exp || !(await this.usersService.findActiveSession(claims))) {
      throw new Error('Session is no longer valid');
    }
    (client.data as SocketSession).user = claims;
  }

  handleConnection(client: Socket) {
    const data = client.data as SocketSession;
    const user = data.user;
    if (!user || user.exp * 1000 <= Date.now()) {
      client.disconnect();
      return;
    }

    data.timeoutId = setTimeout(
      () => {
        client.emit('token_expired', {
          message: 'Your session has expired. Please reconnect.',
        });
        client.disconnect();
      },
      user.exp * 1000 - Date.now(),
    );
    void client.join(`user_${user.sub}`);
  }

  handleDisconnect(client: Socket) {
    const { timeoutId } = client.data as SocketSession;
    if (timeoutId) clearTimeout(timeoutId);
  }

  @OnEvent('auth.sessions_revoked')
  async handleSessionsRevoked(payload: {
    userId: string;
    sessionVersion: number;
  }) {
    const sockets = await this.server
      .in(`user_${payload.userId}`)
      .fetchSockets();
    for (const socket of sockets) {
      const { user } = socket.data as SocketSession;
      if ((user?.sessionVersion ?? 0) < payload.sessionVersion) {
        socket.disconnect(true);
      }
    }
  }

  @SubscribeMessage('join_workspace')
  async handleJoinWorkspace(
    @MessageBody() data: { workspaceId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = (client.data as SocketSession).user;
    if (!user || !data?.workspaceId)
      return {
        status: 'error',
        message: 'Unauthorized or missing workspaceId',
      };

    // Tenant Isolation: Verify membership before allowing join to room
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: data.workspaceId,
          userId: user.sub,
        },
        isActive: true,
        user: {
          isEmailVerified: true,
          sessionVersion: user.sessionVersion ?? 0,
        },
      },
      select: { id: true },
    });

    if (!membership || !client.connected) {
      return {
        status: 'error',
        message: 'You are not a member of this workspace',
      };
    }

    await client.join(`workspace_${data.workspaceId}`);
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

  // Utility to broadcast events to a specific user
  broadcastToUser(userId: string, event: string, payload: any) {
    this.server.to(`user_${userId}`).emit(event, payload);
  }

  @OnEvent('standup.submitted')
  handleStandupSubmitted(payload: {
    workspaceId: string;
    userId: string;
    status: string;
  }) {
    this.broadcastToWorkspace(payload.workspaceId, 'presence_update', {
      userId: payload.userId,
      status: payload.status,
    });
  }

  @OnEvent('member.removed')
  handleMemberRemoved(payload: { workspaceId: string; userId: string }) {
    this.server
      .in(`user_${payload.userId}`)
      .socketsLeave(`workspace_${payload.workspaceId}`);
    this.broadcastToWorkspace(payload.workspaceId, 'member_removed', {
      userId: payload.userId,
    });
  }

  @OnEvent('member.joined')
  handleMemberJoined(payload: { workspaceId: string; member: any }) {
    this.broadcastToWorkspace(payload.workspaceId, 'member_joined', {
      member: payload.member,
    });
  }
}
