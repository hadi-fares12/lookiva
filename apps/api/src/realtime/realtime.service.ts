import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

@Injectable()
export class RealtimeService {
  private server?: Server;

  attach(server: Server) {
    this.server = server;
  }

  emitUser(userId: string, event: string, payload: unknown) {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }

  emitCompany(companyId: string, event: string, payload: unknown) {
    this.server?.to(`company:${companyId}`).emit(event, payload);
  }

  emitBranch(branchId: string, event: string, payload: unknown) {
    this.server?.to(`branch:${branchId}`).emit(event, payload);
  }

  emitConversation(conversationId: string, event: string, payload: unknown) {
    this.server?.to(`conversation:${conversationId}`).emit(event, payload);
  }

  emitAppointment(appointmentId: string, event: string, payload: unknown) {
    this.server?.to(`appointment:${appointmentId}`).emit(event, payload);
  }
}
