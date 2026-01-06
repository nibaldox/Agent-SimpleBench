import { WebSocket } from 'ws';

export class ConnectionManager {
  private activeConnections: Set<WebSocket> = new Set();

  connect(websocket: WebSocket): void {
    this.activeConnections.add(websocket);
    console.log('DEBUG: WebSocket Connected');
  }

  disconnect(websocket: WebSocket): void {
    this.activeConnections.delete(websocket);
    console.log('DEBUG: WebSocket Disconnected');
  }

  async broadcast(message: any): Promise<void> {
    const messageStr = JSON.stringify(message);

    for (const connection of this.activeConnections) {
      if (connection.readyState === WebSocket.OPEN) {
        connection.send(messageStr);
      }
    }
  }

  getConnectionCount(): number {
    return this.activeConnections.size;
  }
}

export const manager = new ConnectionManager();
