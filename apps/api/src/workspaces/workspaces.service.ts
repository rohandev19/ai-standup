import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  private generateSlug(name: string): string {
    return (
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') +
      '-' +
      crypto.randomBytes(4).toString('hex')
    );
  }

  async createWorkspace(name: string, ownerId: string) {
    const slug = this.generateSlug(name);

    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name,
          slug,
          members: {
            create: {
              userId: ownerId,
              role: 'OWNER',
            },
          },
          teams: {
            create: {
              name: 'General',
            },
          },
        },
      });
      return workspace;
    });
  }

  async findWorkspaceById(id: string) {
    return this.prisma.workspace.findUnique({ where: { id } });
  }

  async inviteMember(workspaceId: string, email: string, inviterId: string) {
    const workspace = await this.findWorkspaceById(workspaceId);
    if (!workspace) throw new NotFoundException('Workspace not found');

    // Check if user is already a member
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      const member = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId: existingUser.id },
        },
      });
      if (member) throw new BadRequestException('User is already a member');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Delete any pending invite for this email in this workspace
    await this.prisma.workspaceInvite.deleteMany({
      where: { workspaceId, email, usedAt: null },
    });

    const invite = await this.prisma.workspaceInvite.create({
      data: {
        workspaceId,
        email,
        token,
        invitedById: inviterId,
        expiresAt,
      },
    });

    // TODO: Trigger Email Queue to send the invite link
    return { message: 'Invitation sent', inviteId: invite.id };
  }

  async joinWorkspace(token: string, userId: string) {
    const invite = await this.prisma.workspaceInvite.findUnique({
      where: { token },
    });

    if (!invite) throw new NotFoundException('Invalid invitation token');
    if (invite.usedAt) throw new BadRequestException('Invitation already used');
    if (invite.expiresAt < new Date())
      throw new BadRequestException('Invitation expired');

    // Ensure the user email matches the invite email
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.email !== invite.email) {
      throw new BadRequestException('Email does not match invitation');
    }

    // Add user as MEMBER and mark token as used
    return this.prisma.$transaction(async (tx) => {
      await tx.workspaceInvite.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      });

      const membership = await tx.workspaceMember.create({
        data: {
          workspaceId: invite.workspaceId,
          userId,
          role: 'MEMBER',
        },
      });

      return membership;
    });
  }
}
