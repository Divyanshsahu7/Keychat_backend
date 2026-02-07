const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8080 });

const rooms = {};

wss.on("connection", (ws) => {

  ws.on("message", (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch (e) {
      return;
    }

    /* -------- JOIN ROOM -------- */
    if (msg.type === "join") {
      ws.roomId = msg.roomId;

      if (!rooms[ws.roomId]) {
        rooms[ws.roomId] = [];
      }

      // max 2 users
      if (rooms[ws.roomId].length >= 2) {
        ws.send(JSON.stringify({
          type: "error",
          text: "Room already full"
        }));
        return;
      }

      rooms[ws.roomId].push(ws);

      // notify status
      rooms[ws.roomId].forEach(client => {
        client.send(JSON.stringify({
          type: "status",
          count: rooms[ws.roomId].length
        }));
      });
    }

    /* -------- CHAT & MEDIA -------- */
    if (msg.type === "chat" || msg.type === "media") {
      const room = rooms[ws.roomId] || [];

      room.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(msg));
        }
      });
    }
  });

  ws.on("close", () => {
    const roomId = ws.roomId;
    if (!roomId || !rooms[roomId]) return;

    rooms[roomId] = rooms[roomId].filter(c => c !== ws);

    rooms[roomId].forEach(client => {
      client.send(JSON.stringify({
        type: "status",
        count: rooms[roomId].length
      }));
    });

    if (rooms[roomId].length === 0) {
      delete rooms[roomId];
    }
  });
});

console.log("✅ KeyChat WebSocket server running on ws://localhost:8080");
