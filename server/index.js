const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const open = require('open');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const io = require('socket.io')(server);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '/../public')));

function sendTo(connection, message) {
  connection.send(message);
}

io.on('connection', (socket) => {
  console.log('user connected');

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

  socket.on('message', (message) => {
    console.log('Message Received : ' + message);
    sendTo(socket, message);
  });
});

server.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});
