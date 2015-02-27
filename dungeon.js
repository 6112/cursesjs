(function() {
   window.make_dungeon = function(height, width, room_count) {
     var map = [];
     var y, x;
     for (y = 0; y < height; y++) {
       map[y] = [];
       for (x = 0; x < width; x++) {
	 map[y][x] = ' ';
       }
     }
     var rooms = [];
     rooms[0] = {
       y: 10,
       x: 10,
       height: 5,
      width: 5
     };
     var directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
     y = rooms[0].y;
     x = rooms[0].x;
     var i;
     for (i = 0; i < 10; i++) {
       var dir = directions[Math.floor(Math.random() * 4)];
       var dy = dir[0];
       var dx = dir[1];
       y += dy;
       x += dx;
       if (y < 0 || x < 0 || y >= height || x >= height ||
	   map[y][x] === ACS_CKBOARD) {
	 i--;
	 y -= dy;
	 x -= dx;
	 continue;
       }
       map[y][x] = ACS_CKBOARD;
     }
     for (i = 0; i < rooms.length; i++) {
       var room = rooms[i];
       map[room.y][room.x] = ACS_ULCORNER;
       map[room.y][room.x+room.width-1] = ACS_URCORNER;
       map[room.y+room.height-1][room.x] = ACS_LLCORNER;
       map[room.y+room.height-1][room.x+room.width-1] = ACS_LRCORNER;
       for (y = room.y + 1; y < room.y + room.height - 1; y++) {
	 map[y][room.x] = ACS_VLINE;
	map[y][room.x+room.width-1] = ACS_VLINE;
       }
       for (x = room.x + 1; x < room.x + room.width - 1; x++) {
	 map[room.y][x] = ACS_HLINE;
	 map[room.y+room.height-1][x] = ACS_HLINE;
       }
       for (y = room.y + 1; y < room.y + room.height - 1; y++) {
	 for (x = room.x + 1; x < room.x + room.width - 1; x++) {
	   map[y][x] = '.';
	 }
       }
     }
     return map;
   };
})();
