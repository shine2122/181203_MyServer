const uuidv4 = require('uuid/v4');

module.exports = function(server) {

    //방정보
    var rooms = [];

    var io = require('socket.io')(server, {
        transports: ['websocket'], //통신을 websocket으로만 하도록 정의
    });

    //socket.on은 client 단위, io.on은 전체 입출력 업무를 처리하는 함수라고 생각하면 됨
    io.on('connection', function(socket) {
        //socket.id는 접촉한 client의 id(자동생성됨)를 의미
        console.log('Connection : ' + socket.id);     

        if (rooms.length > 0) { //방이 있으면
            var rId = rooms.shift();
            socket.join(rId, function(){
                socket.emit('joinRoom', {room : rId});
                io.to(rId).emit("startGame"); //특정한 방에 전체 client에 메시지 전달
            });
        } else { //방이 없으면
            var roomName = uuidv4();
            socket.join(roomName, function(){//클라이언트 현재 열린 방에 조인시킴, 없으면 방생성
                socket.emit('createRoom', { room : roomName});
                rooms.push(roomName); //생성된 roomName을 rooms 배열에 추가
            }); 
        }

        //disconnected된 유저를 감지
        socket.on('disconnecting', function(reson) {
            console.log('Disconnected: ' + socket.id);

            var socketRooms = Object.keys(socket.rooms).filter(item => item != socket.id);
            console.dir(socketRooms);

            socketRooms.forEach(function(room) {
                socket.broadcast.to(room).emit('exitRoom');

                 //혼자 만든 방의 유저가 disconnect되면 그 방을 제거
                 var idx = room.indexOf(room);
                 if (idx != -1){ //못찾으면 -1를 반환, 따라서 찾았다면 의미          
                     rooms.splice(idx, 1); //그 방의 인덱스부터 1개만 지워라
                 }
            });
        });

        socket.on("doPlayer", function(playerInfo){
            var roomId = playerInfo.room;
            var cellIndex = playerInfo.position;

            socket.broadcast.to(roomId).emit('doOpponent', {position: cellIndex});
            //socket.broadcast,to('방이름');
        });

        socket.on('message', function(msg) {
            console.dir(msg);
            socket.broadcast.emit('chat', msg);
        });
    });
};