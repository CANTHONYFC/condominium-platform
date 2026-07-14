import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets'
import { Logger } from '@nestjs/common'
import { Server, Socket } from 'socket.io'

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(EventsGateway.name)

  @WebSocketServer()
  server: Server

  handleConnection (client: Socket) {
    this.logger.log({ msg: 'WebSocket client connected', clientId: client.id })
  }

  emitToTenant (tenantId: string, event: string, payload: unknown) {
    this.server.to(`tenant:${tenantId}`).emit(event, payload)
  }

  emitDashboardUpdate (tenantId: string, kpis: unknown) {
    this.emitToTenant(tenantId, 'dashboard:kpis', kpis)
  }
}
