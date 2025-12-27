/**
 * RealtimeService
 *
 * Manages Socket.io connections and real-time event broadcasting for admin updates.
 * Handles authentication, room management, and event emission to appropriate clients.
 */

import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import admin from "firebase-admin";

interface AuthenticatedSocket extends Socket {
  userId?: string;
  mongoId?: any;
  userEmail?: string;
  userGroups?: string[];
}

class RealtimeService {
  private io: SocketIOServer | null = null;
  private authenticatedSockets: Map<string, AuthenticatedSocket> = new Map();

  /**
   * Initialize Socket.io server
   */
  initialize(httpServer: HttpServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: true,
        credentials: true,
      },
      transports: ["polling"],
    });

    this.io.on("connection", (socket: Socket) => {
      this.handleConnection(socket as AuthenticatedSocket);
    });

    console.log("✅ Socket.io initialized");
  }

  /**
   * Handle new socket connection
   */
  handleConnection(socket: AuthenticatedSocket): void {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Handle authentication
    socket.on("authenticate", async (data: { token: string }) => {
      try {
        if (!data.token) {
          socket.emit("error", { message: "Authentication token required" });
          return;
        }

        // Verify Firebase token
        const decoded = await admin.auth().verifyIdToken(data.token);
        socket.userId = decoded.uid;
        socket.userEmail = decoded.email;

        // Resolve MongoDB ID
        const { User } = await import("../models/User");
        const user = await User.findOne({ firebaseUid: decoded.uid }).select("_id").lean();

        if (!user) {
          console.warn(`⚠️ Socket auth: User ${decoded.uid} not found in MongoDB`);
          socket.emit("error", { message: "User profile not found" });
          return;
        }

        socket.mongoId = user._id;

        // Store authenticated socket
        this.authenticatedSockets.set(socket.id, socket);

        // Join user-specific room
        socket.join(`user:${decoded.uid}`);

        // Get user's groups and join group rooms
        try {
          const { GroupService } = await import("./GroupService");
          const userGroups = await GroupService.getUserGroups(user._id);
          socket.userGroups = userGroups;

          // Join all group rooms
          userGroups.forEach((groupId) => {
            socket.join(`group:${groupId}`);
          });

          console.log(
            `✅ Socket authenticated: ${socket.id} (user: ${decoded.uid}, mongoId: ${user._id}, groups: ${userGroups.length})`
          );

          socket.emit("authenticated", {
            userId: decoded.uid,
            mongoId: user._id.toString(),
            groups: userGroups,
          });
        } catch (err) {
          console.error("Error loading user groups:", err);
          socket.emit("authenticated", {
            userId: decoded.uid,
            mongoId: user._id.toString(),
            groups: [],
          });
        }
      } catch (err) {
        console.error("Socket authentication error:", err);
        socket.emit("error", { message: "Authentication failed" });
        socket.disconnect();
      }
    });

    // Handle join group room
    socket.on("join:group", async (data: { groupId: string }) => {
      if (!socket.userId) {
        socket.emit("error", { message: "Not authenticated" });
        return;
      }

      try {
        const { GroupService } = await import("./GroupService");
        const isValid = await GroupService.validateGroupMembership(
          socket.mongoId,
          data.groupId
        );

        if (isValid) {
          socket.join(`group:${data.groupId}`);
          if (!socket.userGroups) socket.userGroups = [];
          if (!socket.userGroups.includes(data.groupId)) {
            socket.userGroups.push(data.groupId);
          }
          console.log(`✅ Socket ${socket.id} joined group:${data.groupId}`);
        } else {
          socket.emit("error", {
            message: "Not authorized to join this group",
          });
        }
      } catch (err) {
        console.error("Error joining group:", err);
        socket.emit("error", { message: "Failed to join group" });
      }
    });

    // Handle leave group room
    socket.on("leave:group", (data: { groupId: string }) => {
      socket.leave(`group:${data.groupId}`);
      if (socket.userGroups) {
        socket.userGroups = socket.userGroups.filter(
          (id) => id !== data.groupId
        );
      }
      console.log(`✅ Socket ${socket.id} left group:${data.groupId}`);
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      this.handleDisconnection(socket);
    });
  }

  /**
   * Handle socket disconnection
   */
  handleDisconnection(socket: AuthenticatedSocket): void {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
    this.authenticatedSockets.delete(socket.id);
  }

  /**
   * Emit exam update to all connected students
   */
  emitExamUpdated(examData: any): void {
    if (!this.io) {
      console.warn("Socket.io not initialized");
      return;
    }

    console.log("📢 Broadcasting exam:updated to all clients");
    this.io.emit("exam:updated", examData);
  }

  /**
   * Emit news update to all connected students
   */
  emitNewsUpdated(newsData: any): void {
    if (!this.io) {
      console.warn("Socket.io not initialized");
      return;
    }

    console.log("📢 Broadcasting news:updated to all clients");
    this.io.emit("news:updated", newsData);
  }

  /**
   * Emit group update to specific group members only
   */
  emitGroupUpdated(groupId: string, groupData: any): void {
    if (!this.io) {
      console.warn("Socket.io not initialized");
      return;
    }

    const room = `group:${groupId}`;
    console.log(`📢 Broadcasting group:updated to room: ${room}`);
    this.io.to(room).emit("group:updated", groupData);
  }

  /**
   * Emit new message to group members
   */
  emitMessageNew(groupId: string, messageData: any): void {
    if (!this.io) {
      console.warn("Socket.io not initialized");
      return;
    }

    const room = `group:${groupId}`;
    console.log(`📢 Broadcasting message:new to room: ${room}`);
    this.io.to(room).emit("message:new", messageData);
  }

  /**
   * Emit to all connected clients
   */
  emitToAll(event: string, data: any): void {
    if (!this.io) {
      console.warn("Socket.io not initialized");
      return;
    }

    console.log(`📢 Broadcasting ${event} to all clients`);
    this.io.emit(event, data);
  }

  /**
   * Emit to specific group
   */
  emitToGroup(groupId: string, event: string, data: any): void {
    if (!this.io) {
      console.warn("Socket.io not initialized");
      return;
    }

    const room = `group:${groupId}`;
    console.log(`📢 Broadcasting ${event} to room: ${room}`);
    this.io.to(room).emit(event, data);
  }

  /**
   * Emit to specific user
   */
  emitToUser(userId: string, event: string, data: any): void {
    if (!this.io) {
      console.warn("Socket.io not initialized");
      return;
    }

    const room = `user:${userId}`;
    console.log(`📢 Broadcasting ${event} to room: ${room}`);
    this.io.to(room).emit(event, data);
  }

  /**
   * Get Socket.io server instance
   */
  getIO(): SocketIOServer | null {
    return this.io;
  }

  /**
   * Get count of authenticated sockets
   */
  getAuthenticatedSocketCount(): number {
    return this.authenticatedSockets.size;
  }

  /**
   * Get all authenticated socket IDs
   */
  getAuthenticatedSocketIds(): string[] {
    return Array.from(this.authenticatedSockets.keys());
  }
}

export default new RealtimeService();
