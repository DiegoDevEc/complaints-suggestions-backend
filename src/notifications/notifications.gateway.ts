import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { log } from 'node:console';
import { Server } from 'socket.io';

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
@WebSocketGateway({ cors: { origin: '*' } })
export class NotificationsGateway {
  afterInit() {
    console.log('🚀 WebSocket Gateway inicializado');
  }

  handleConnection(client: any) {
    console.log('🔌 Cliente conectado:', client);
  }

  handleDisconnect(client: any) {
    console.log('❌ Cliente desconectado:', client);
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @WebSocketServer()
  server: Server; // 👈 aseguramos el tipo correcto

  sendNotification(event: string, data: any) {
    if (this.server) {
      log(`Enviando notificación: ${event} con datos:`, data);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      this.server.emit(event, data);
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @SubscribeMessage('ping')
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  handlePing(@MessageBody() data: string) {
    return { event: 'pong', data };
  }
}
