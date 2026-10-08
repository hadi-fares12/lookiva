import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import type { AuthenticatedUser } from '../auth/types/request-with-user';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from './realtime.service';

type AuthedSocket = Socket & { data: { user?: AuthenticatedUser } };

@WebSocketGateway({
  namespace: '/realtime',
  transports: ['websocket', 'polling'],
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  afterInit(server: Server) {
    this.realtime.attach(server);
  }

  async handleConnection(client: AuthedSocket) {
    try {
      const token = this.extractToken(client);
      if (!token) throw new Error('Missing token');
      const payload = await this.jwt.verifyAsync<{ sub: string; jti?: string }>(token);
      const user = await this.auth.validateAccessToken(payload);
      if (!user) throw new Error('Invalid token');
      client.data.user = user;
      await client.join(`user:${user.id}`);

      for (const scope of user.roleScopes) {
        if (scope.companyId && String(scope.scopeType) === 'company') await client.join(`company:${scope.companyId}`);
        if (scope.branchId) await client.join(`branch:${scope.branchId}`);
      }

      client.emit('realtime:ready', {
        userId: user.id,
        connectedAt: new Date().toISOString(),
      });
    } catch {
      client.emit('realtime:error', { code: 'unauthorized' });
      client.disconnect(true);
    }
  }

  @SubscribeMessage('conversation:join')
  async joinConversation(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId?: string },
  ) {
    const user = this.requireUser(client);
    const conversationId = body?.conversationId?.trim();
    if (!conversationId) throw new WsException('conversationId is required');
    const count = await this.prisma.conversation_members.count({
      where: { conversation_id: conversationId, user_id: user.id, left_at: null },
    });
    if (!count) throw new WsException('Conversation access denied');
    await client.join(`conversation:${conversationId}`);
    return { joined: true, conversationId };
  }

  @SubscribeMessage('conversation:leave')
  async leaveConversation(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId?: string },
  ) {
    this.requireUser(client);
    const conversationId = body?.conversationId?.trim();
    if (conversationId) await client.leave(`conversation:${conversationId}`);
    return { left: true, conversationId };
  }

  @SubscribeMessage('appointment:join')
  async joinAppointment(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { appointmentId?: string },
  ) {
    const user = this.requireUser(client);
    const appointmentId = body?.appointmentId?.trim();
    if (!appointmentId) throw new WsException('appointmentId is required');
    const appointment = await this.prisma.appointments.findUnique({
      where: { id: appointmentId },
      select: { id: true, customer_user_id: true, company_id: true, branch_id: true },
    });
    if (!appointment) throw new WsException('Appointment not found');
    if (
      appointment.customer_user_id !== user.id &&
      !this.canAccessBusinessScope(user, appointment.company_id, appointment.branch_id)
    ) {
      throw new WsException('Appointment access denied');
    }
    await client.join(`appointment:${appointmentId}`);
    return { joined: true, appointmentId };
  }

  @SubscribeMessage('branch:join')
  async joinBranch(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { branchId?: string },
  ) {
    const user = this.requireUser(client);
    const branchId = body?.branchId?.trim();
    if (!branchId) throw new WsException('branchId is required');
    const branch = await this.prisma.branches.findUnique({
      where: { id: branchId },
      select: { id: true, company_id: true },
    });
    if (!branch || !this.canAccessBusinessScope(user, branch.company_id, branch.id)) {
      throw new WsException('Branch access denied');
    }
    await client.join(`branch:${branchId}`);
    return { joined: true, branchId };
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) return authToken.trim();
    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.toLowerCase().startsWith('bearer ')) {
      return header.slice(7).trim();
    }
    return null;
  }

  private requireUser(client: AuthedSocket): AuthenticatedUser {
    const user = client.data.user;
    if (!user) throw new WsException('Unauthorized');
    return user;
  }

  private canAccessBusinessScope(
    user: AuthenticatedUser,
    companyId: string,
    branchId?: string | null,
  ) {
    const platformRoles = new Set(['super_admin', 'platform_admin', 'country_manager']);
    if (user.roleScopes.some((scope) => platformRoles.has(String(scope.roleKey)))) return true;
    return user.roleScopes.some((scope) => {
      if (scope.companyId === companyId && String(scope.scopeType) === 'company') return true;
      if (branchId && (scope.branchId === branchId || scope.scopeId === branchId)) return true;
      return false;
    });
  }
}
