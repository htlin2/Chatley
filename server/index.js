const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const path = require('path');

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '/../public')));

const sockets = {};
const users = {};

function sendTo(connection, message) {
  connection.send(message);
}

io.on('connection', (socket) => {
  console.log('user connected');

  socket.on('disconnect', () => {
    console.log('user disconnected');
    if (socket.name) {
      socket.broadcast.to('chatroom').emit('roommessage', { type: 'disconnect', username: socket.name });
      delete sockets[socket.name];
      delete users[socket.name];
    }
  });

  socket.on('message', (data) => {
    switch (data.type) {
      case 'login':
        console.log('User logged', data.name);
        //if anyone is logged in with this username then refuse
        if (sockets[data.name]) {
          sendTo(socket, {
            type: 'login',
            success: false
          });
        } else {
          //save user connection on the server
          var templist = users;
          sockets[data.name] = socket;
          socket.name = data.name;
          sendTo(socket, {
            type: 'login',
            success: true,
            username: data.name,
            userlist: templist,
          });
          socket.broadcast.to('chatroom').emit('roommessage', { type: 'login', username: data.name })
          socket.join('chatroom');
          users[data.name] = socket.id;
        }
        break;
      case 'callUser':
        // chek if user exist
        if (sockets[data.name]) {
          console.log('user called');
          console.log(data.name);
          console.log(data.callername);
          sendTo(sockets[data.name], {
            type: 'answer',
            callername: data.callername
          });
        } else {
          sendTo(socket, {
            type: 'callResponse',
            response: 'offline',
          });
        }
        break;
      default:
        sendTo(socket, {
          type: 'error',
          message: 'Command not found: ' + data.type
        });
        break;
    }
  });
});

server.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});
