import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { WorkspaceRole } from '@prisma/client';

@Injectable()
export class WorkspaceMembershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Attempt to extract workspaceId from params, query, or body
    let workspaceId =
      request.params?.id ||
      request.params?.workspaceId ||
      request.query?.workspaceId ||
      request.body?.workspaceId;

    // In some cases we might use custom headers
    if (!workspaceId && request.headers['x-workspace-id']) {
      workspaceId = request.headers['x-workspace-id'] as string;
    }

    if (!workspaceId) {
      throw new BadRequestException('workspaceId is missing from request');
    }

    // Verify membership
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: user.id },
      },
    });

    if (!membership || !membership.isActive) {
      await this.prisma.auditLog.create({
        data: {
          workspaceId,
          userId: user.id,
          action: 'SECURITY_VIOLATION',
          entityType: 'Workspace',
          entityId: workspaceId,
          metadataJson: {
            reason: 'unauthorized_access_attempt',
            path: request.route?.path || request.url,
            method: request.method,
          },
        },
      });
      throw new ForbiddenException('You do not have access to this workspace');
    }

    // Check role if specified
    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(membership.role)) {
        await this.prisma.auditLog.create({
          data: {
            workspaceId,
            userId: user.id,
            action: 'SECURITY_VIOLATION',
            entityType: 'Workspace',
            entityId: workspaceId,
            metadataJson: {
              reason: 'insufficient_role',
              requiredRoles,
              actualRole: membership.role,
              path: request.route?.path || request.url,
              method: request.method,
            },
          },
        });
        throw new ForbiddenException(
          'You do not have the required role in this workspace',
        );
      }
    }

    // Attach membership to request for downstream usage
    request.workspaceMembership = membership;

    return true;
  }
}
