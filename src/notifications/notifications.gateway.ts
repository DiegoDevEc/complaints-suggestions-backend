import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
@WebSocketGateway({ cors: { origin: '*' } })
export class NotificationsGateway {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @WebSocketServer()
  server: Server; // 👈 aseguramos el tipo correcto

  sendNotification(event: string, data: any) {
    if (this.server) {
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
