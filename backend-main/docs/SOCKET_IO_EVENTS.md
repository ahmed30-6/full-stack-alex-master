# Socket.io Events Documentation

## Overview

This document provides detailed documentation for all Socket.io real-time events in the Adaptive Collaborative Learning Platform.

## Connection

### Establishing Connection

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:5001", {
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});

// Connection successful
socket.on("connect", () => {
  console.log("Connected to server");
  console.log("Socket ID:", socket.id);
});

// Connection failed
socket.on("connect_error", (error) => {
  console.error("Connection error:", error);
});

// Disconnected
socket.on("disconnect", (reason) => {
  console.log("Disconnected:", reason);
});
```

## Authentication

### Client → Server: `authenticate`

Authenticate the socket connection using Firebase ID token.

**When to emit:** Immediately after connection

**Payload:**

```javascript
{
  token: string; // Firebase ID token
}
```

**Example:**

```javascript
socket.on("connect", async () => {
  const token = await firebase.auth().currentUser.getIdToken();
  socket.emit("authenticate", { token });
});
```

**Success Response:** `authenticated` event

**Error Response:** `error` event followed by disconnection

### Server → Client: `authenticated`

Authentication successful. Socket is now authenticated and joined to appropriate rooms.

**Payload:**

```javascript
{
  userId: string,      // Firebase UID
  groups: string[]     // Array of group IDs user is a member of
}
```

**Example:**

```javascript
socket.on("authenticated", (data) => {
  console.log("Authenticated as:", data.userId);
  console.log("Member of groups:", data.groups);

  // Now you can listen for events
  setupEventListeners();
});
```

## Room Management

### Client → Server: `join:group`

Join a group room to receive group-specific events.

**When to emit:** When user wants to join a group room

**Payload:**

```javascript
{
  groupId: string; // Group ID to join
}
```

**Authorization:** User must be a member of the group

**Example:**

```javascript
socket.emit("join:group", { groupId: "group-123" });
```

**Success:** No response (silent success)

**Error:** `error` event if not authorized

### Client → Server: `leave:group`

Leave a group room.

**When to emit:** When user wants to leave a group room

**Payload:**

```javascript
{
  groupId: string; // Group ID to leave
}
```

**Example:**

```javascript
socket.emit("leave:group", { groupId: "group-123" });
```

**Success:** No response (silent success)

## Broadcast Events

### Server → Client: `exam:updated`

Exam data has been updated by admin.

**Broadcast to:** All connected clients

**Payload:**

```javascript
{
  examId: string,
  title: string,
  duration: number,      // Duration in minutes
  questions: Array<{
    id: string,
    text: string,
    options: string[],
    correctAnswer?: number
  }>,
  // ... additional exam fields
}
```

**Example:**

```javascript
socket.on("exam:updated", (examData) => {
  console.log("Exam updated:", examData.title);

  // Update UI with new exam data
  updateExamUI(examData);

  // Show notification to user
  showNotification(`New exam available: ${examData.title}`);
});
```

**Triggered by:** Admin calling `POST /api/admin/exam`

### Server → Client: `news:updated`

News items have been updated by admin.

**Broadcast to:** All connected clients

**Payload:**

```javascript
{
  newsId: string,
  title: string,
  content: string,
  author: string,
  publishedAt: string,   // ISO 8601 date
  // ... additional news fields
}
```

**Example:**

```javascript
socket.on("news:updated", (newsData) => {
  console.log("News updated:", newsData.title);

  // Update news feed
  addNewsItem(newsData);

  // Show notification
  showNotification(`New announcement: ${newsData.title}`);
});
```

**Triggered by:** Admin calling `POST /api/admin/news`

### Server → Client: `group:updated`

Group data has been updated.

**Broadcast to:** Group members only

**Payload:**

```javascript
{
  id: string,
  name: string,
  type: 'single' | 'multi',
  members: string[],     // Array of Firebase UIDs
  level: number,
  createdBy: string,
  createdAt: string,     // ISO 8601 date
  updatedAt: string      // ISO 8601 date
}
```

**Example:**

```javascript
socket.on("group:updated", (groupData) => {
  console.log("Group updated:", groupData.name);

  // Update group information in UI
  updateGroupInfo(groupData);

  // Check if current user is still a member
  if (!groupData.members.includes(currentUserId)) {
    console.log("You have been removed from the group");
    handleGroupRemoval(groupData.id);
  }
});
```

**Triggered by:** Admin calling `POST /api/groups`

### Server → Client: `message:new`

New message posted in group.

**Broadcast to:** Group members only

**Payload:**

```javascript
{
  _id: string,
  activityId: string,
  groupId: string,
  text: string,
  senderUid: string,
  createdAt: string      // ISO 8601 date
}
```

**Example:**

```javascript
socket.on("message:new", (messageData) => {
  console.log("New message from:", messageData.senderUid);

  // Add message to chat UI
  addMessageToChat(messageData);

  // Play notification sound if not from current user
  if (messageData.senderUid !== currentUserId) {
    playNotificationSound();
  }

  // Show desktop notification if window not focused
  if (!document.hasFocus()) {
    showDesktopNotification("New message", messageData.text);
  }
});
```

**Triggered by:** User calling `POST /api/sync/activity/message`

## Error Handling

### Server → Client: `error`

Error occurred during socket operation.

**Payload:**

```javascript
{
  message: string; // Error message
}
```

**Example:**

```javascript
socket.on("error", (error) => {
  console.error("Socket error:", error.message);

  // Handle specific errors
  if (error.message === "Authentication required") {
    // Re-authenticate
    reauthenticate();
  } else if (error.message.includes("Not authorized")) {
    // Handle authorization error
    showError("You do not have permission for this action");
  } else {
    // Generic error handling
    showError("An error occurred. Please try again.");
  }
});
```

**Common error messages:**

- `"Authentication required"` - Socket not authenticated
- `"Authentication failed"` - Invalid token
- `"Not authenticated"` - Trying to join room without authentication
- `"Not authorized to join this group"` - User not a member of group

## Complete Example

### React Component

```javascript
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { auth } from "./firebase";

function useSocket() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    // Create socket connection
    const newSocket = io("http://localhost:5001", {
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    // Connection events
    newSocket.on("connect", async () => {
      console.log("Connected to server");
      setConnected(true);

      // Authenticate
      try {
        const token = await auth.currentUser.getIdToken();
        newSocket.emit("authenticate", { token });
      } catch (error) {
        console.error("Failed to get token:", error);
      }
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
      setConnected(false);
      setAuthenticated(false);
    });

    // Authentication
    newSocket.on("authenticated", (data) => {
      console.log("Authenticated:", data.userId);
      setAuthenticated(true);
    });

    // Error handling
    newSocket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      newSocket.close();
    };
  }, []);

  return { socket, connected, authenticated };
}

function ChatComponent({ groupId }) {
  const { socket, authenticated } = useSocket();
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!socket || !authenticated) return;

    // Join group room
    socket.emit("join:group", { groupId });

    // Listen for new messages
    socket.on("message:new", (message) => {
      if (message.groupId === groupId) {
        setMessages((prev) => [...prev, message]);
      }
    });

    // Cleanup
    return () => {
      socket.emit("leave:group", { groupId });
      socket.off("message:new");
    };
  }, [socket, authenticated, groupId]);

  const sendMessage = (text) => {
    // Send via HTTP API (not socket)
    fetch("/api/sync/activity/message", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        activityId: "activity-1",
        groupId,
        text,
      }),
    });
  };

  return (
    <div>
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg._id}>{msg.text}</div>
        ))}
      </div>
      <button onClick={() => sendMessage("Hello!")}>Send Message</button>
    </div>
  );
}
```

### Vue Component

```javascript
<template>
  <div>
    <div v-if="!connected">Connecting...</div>
    <div v-else-if="!authenticated">Authenticating...</div>
    <div v-else>
      <div v-for="message in messages" :key="message._id">
        {{ message.text }}
      </div>
    </div>
  </div>
</template>

<script>
import { io } from 'socket.io-client';
import { auth } from './firebase';

export default {
  data() {
    return {
      socket: null,
      connected: false,
      authenticated: false,
      messages: []
    };
  },
  mounted() {
    this.initSocket();
  },
  beforeUnmount() {
    if (this.socket) {
      this.socket.close();
    }
  },
  methods: {
    async initSocket() {
      this.socket = io('http://localhost:5001');

      this.socket.on('connect', async () => {
        this.connected = true;
        const token = await auth.currentUser.getIdToken();
        this.socket.emit('authenticate', { token });
      });

      this.socket.on('authenticated', (data) => {
        this.authenticated = true;
        this.socket.emit('join:group', { groupId: this.groupId });
      });

      this.socket.on('message:new', (message) => {
        this.messages.push(message);
      });

      this.socket.on('disconnect', () => {
        this.connected = false;
        this.authenticated = false;
      });
    }
  }
};
</script>
```

## Best Practices

### 1. Authentication

```javascript
// ✅ Good: Authenticate immediately after connection
socket.on("connect", async () => {
  const token = await getToken();
  socket.emit("authenticate", { token });
});

// ❌ Bad: Delay authentication
socket.on("connect", () => {
  setTimeout(() => {
    // Token might be stale
    socket.emit("authenticate", { token: oldToken });
  }, 5000);
});
```

### 2. Room Management

```javascript
// ✅ Good: Join room after authentication
socket.on("authenticated", () => {
  socket.emit("join:group", { groupId });
});

// ❌ Bad: Join room before authentication
socket.on("connect", () => {
  socket.emit("join:group", { groupId }); // Will fail
});
```

### 3. Event Cleanup

```javascript
// ✅ Good: Remove listeners on unmount
useEffect(() => {
  socket.on("message:new", handleMessage);

  return () => {
    socket.off("message:new", handleMessage);
  };
}, []);

// ❌ Bad: Don't remove listeners
useEffect(() => {
  socket.on("message:new", handleMessage);
  // Memory leak!
}, []);
```

### 4. Error Handling

```javascript
// ✅ Good: Handle all error cases
socket.on("error", (error) => {
  if (error.message === "Authentication required") {
    reauthenticate();
  } else {
    showError(error.message);
  }
});

// ❌ Bad: Ignore errors
socket.on("error", () => {
  // Silent failure
});
```

### 5. Reconnection

```javascript
// ✅ Good: Re-authenticate on reconnection
socket.on("connect", async () => {
  const token = await getToken();
  socket.emit("authenticate", { token });
});

// ❌ Bad: Assume authentication persists
socket.on("connect", () => {
  // Assuming still authenticated
  socket.emit("join:group", { groupId });
});
```

## Troubleshooting

### Issue: Not receiving events

**Possible causes:**

1. Not authenticated
2. Not joined to room
3. Event listener not set up
4. Socket disconnected

**Solution:**

```javascript
// Check connection status
console.log("Connected:", socket.connected);

// Check if authenticated
socket.on("authenticated", () => {
  console.log("Authenticated successfully");
});

// Verify event listener
socket.on("message:new", (data) => {
  console.log("Received message:", data);
});
```

### Issue: Authentication fails

**Possible causes:**

1. Invalid token
2. Expired token
3. Firebase not initialized

**Solution:**

```javascript
// Get fresh token
const token = await firebase.auth().currentUser.getIdToken(true);
socket.emit("authenticate", { token });
```

### Issue: Disconnects frequently

**Possible causes:**

1. Network issues
2. Server restart
3. Token expiration

**Solution:**

```javascript
// Enable reconnection
const socket = io("http://localhost:5001", {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});

// Re-authenticate on reconnect
socket.on("connect", async () => {
  const token = await getToken();
  socket.emit("authenticate", { token });
});
```

## Security Considerations

### 1. Token Security

- Never log tokens
- Refresh tokens before expiration
- Use HTTPS in production

### 2. Room Authorization

- Server validates group membership
- Cannot join rooms without authorization
- Automatic room cleanup on disconnection

### 3. Event Validation

- Server validates all event payloads
- Invalid events are rejected
- Error messages don't leak sensitive data

## Performance Tips

### 1. Event Throttling

```javascript
// Throttle frequent events
const throttledHandler = throttle((data) => {
  handleMessage(data);
}, 100);

socket.on("message:new", throttledHandler);
```

### 2. Selective Listening

```javascript
// Only listen to events you need
socket.on("message:new", handleMessage);

// Don't listen to unused events
// socket.on('exam:updated', ...); // Not needed
```

### 3. Cleanup

```javascript
// Remove listeners when not needed
socket.off("message:new", handleMessage);

// Disconnect when not needed
socket.disconnect();
```

## Additional Resources

- [Socket.io Client Documentation](https://socket.io/docs/v4/client-api/)
- [API Reference](./API_REFERENCE.md)
- [Real-Time Summary](./TASK_08_REALTIME_SUMMARY.md)
