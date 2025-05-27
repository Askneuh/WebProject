import { Application, Context, Router } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { create, verify } from "https://deno.land/x/djwt/mod.ts";
import { DB } from "https://deno.land/x/sqlite/mod.ts";
import { getUsers } from "./.vscode/libs/SQLHandler.ts"
import { generateMaze} from "./static_html/game/generateMaze.ts";


const db = new DB("game.db");


db.execute(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  isAdmin INTEGER DEFAULT 0,
  isPlaying INTEGER DEFAULT 0
  )`);

db.execute(`CREATE TABLE IF NOT EXISTS coords (
  id INTEGER PRIMARY KEY REFERENCES users (id),
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  facing TEXT NOT NULL DEFAULT 'down'
  )`); 

db.execute(`CREATE TABLE IF NOT EXISTS tokens (
  token TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  FOREIGN KEY (username) REFERENCES users (username)
  )`);
db.execute(`CREATE TABLE IF NOT EXISTS stats (
  id INTEGER PRIMARY KEY REFERENCES users (id),
  username TEXT NOT NULL,
  kills INTEGER DEFAULT 0,
  deaths INTEGER DEFAULT 0)`);

db.execute(`CREATE TABLE IF NOT EXISTS last_activity (
  id INTEGER PRIMARY KEY REFERENCES users (id),
  last_move_timestamp INTEGER NOT NULL
  )`);

db.execute(`DELETE FROM messages;`);
const test_users = getUsers(db);
const test_coords = db.query(`SELECT id, x, y FROM coords;`);


const router = new Router();
const app = new Application();
const connections: WebSocket[] = [];
let updateInterval;
const maze = generateMaze(20, 20);


// Key for the jsonwebtokens
const secretKey = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-512" },
  true,
  ["sign", "verify"]
);

async function getHash(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}


/*
function removeTokenByUser(user: string) {
  for (const token in tokens) {
    if (tokens[token] === user) {
      delete tokens[token];
      //console.log(`Token ${token} removed for user: ${user}`);
      break;
    }
  }
}
*/

async function getVerifiedUser(ctx: any, requireAdmin = false) {
  const authToken = await ctx.cookies.get("auth_token") as string;
  if (!authToken) {
    ctx.response.status = 401;
    ctx.response.body = { message: "Unauthorized" };
    return null;
  }
  let tokenData;
  try {
    tokenData = await verify(authToken, secretKey);
  } catch {
    ctx.response.status = 401;
    ctx.response.body = { message: "Invalid token" };
    return null;
  }
  const username = tokenData.userName || tokenData.username;
  const tokenInDB = db.query(`SELECT token FROM tokens WHERE token = ? OR username = ?`, [authToken, username]);
  if (tokenInDB.length === 0) {
    ctx.response.status = 404;
    ctx.response.body = { message: "User not found" };
    return null;
  }
  const user = getUsers(db).find(u => u.username === username);
  if (!user) {
    ctx.response.status = 404;
    ctx.response.body = { message: "User not found" };
    return null;
  }
  if (requireAdmin) {
    const isAdmin = db.query(`SELECT isAdmin FROM users WHERE id = ?`, [user.id]);
    if (!(isAdmin.length > 0 && isAdmin[0][0] == 1)) {
      ctx.response.status = 403;
      ctx.response.body = { message: "User is not admin" };
      return null;
    }
  }
  return user;
}

router.post("/register", async (ctx) => {
  try {
    const test_users = getUsers(db);
    const body = await ctx.request.body.json(); 
    const { username, password } = body;
    const user = test_users.find(u => u.username === username);
    if (!user){
      const hashedPassword = await getHash(password);
      const newUser = {
        id: (test_users.length + 1),
        username: username,
        password_hash: hashedPassword,
        last_action_date: Date.now(),
      };
      db.query(`INSERT INTO users (username, password_hash) VALUES (?, ?)`, [username, hashedPassword]);
      test_users.push(newUser);
      const token = await create({ alg: "HS512", typ: "JWT" }, { userName: newUser.username }, secretKey);
      ctx.cookies.set("auth_token", token, {
        httpOnly: true,
        sameSite: "Strict",
        maxAge: 60 * 60,
        path: "/"
      });
      ctx.response.status = 201;
      ctx.response.body = { message: "New user registered!"};
    } 
    else {
      ctx.response.status = 405;
      ctx.response.body = {message: "User already exists"}
    }
    
  } catch (error) {
    ctx.response.status = 400;
    ctx.response.body = { message: "Invalid request body" };
  }
});

router.post("/login", async (ctx) => {
  try {
    const body = await ctx.request.body.json(); 
    const { username, password } = body;

    const test_users = getUsers(db);
    const user = test_users.find(u => u.username === username);

    if (user) {
      const isMatch = await bcrypt.compare(password, user.password_hash);

      if (isMatch) {
        const token = await create({ alg: "HS512", typ: "JWT" }, { userName: user.username }, secretKey);
        
        const existingToken = db.query(`SELECT token FROM tokens WHERE username = ?`, [user.username]);
        
        if (existingToken.length > 0) {
          db.query(`UPDATE tokens SET token = ? WHERE username = ?`, [token, user.username]);
          console.log("Token updated in database");
        } else {
          db.query(`INSERT INTO tokens (token, username) VALUES (?, ?)`, [token, user.username]);
          console.log("Added token to db");
        }

        ctx.cookies.set("auth_token", token, {
          httpOnly: true,
          sameSite: "Strict",
          maxAge: 60 * 60,
          path: "/"
        }); 
        
        ctx.response.status = 200;
        ctx.response.body = { message: "Login successful!" };
      } else {
        ctx.response.status = 401;
        ctx.response.body = { message: "Invalid credentials" };
      }
    } else {
      ctx.response.status = 404;
      ctx.response.body = { message: "User not found" };
    }
  } catch (error) {
    console.error("Login error:", error);
    ctx.response.status = 400;
    ctx.response.body = { message: "Invalid request body" };
  }
});

router.get("/verifySession", async (ctx) => {
  const user = await getVerifiedUser(ctx);
  if (!user) return;
  ctx.response.status = 200;
  ctx.response.body = { message: "Session is valid", user: { username: user.username } };
});

router.post("/logout", async (ctx) => {
  const user = await getVerifiedUser(ctx);
  if (user) {
    ctx.cookies.delete("auth_token");
    ctx.response.status = 200;
  }
  else {
    ctx.response.status = 401;
    ctx.response.body = {message : "Log out impossible"}
  }
})

router.post("/getMaze", async (ctx) => {
  const user = await getVerifiedUser(ctx);
  if (!user) return;
  ctx.response.status = 200;
  ctx.response.body = { message: "Maze generated successfully", maze };
});

router.get("/getPlayerPosition", async (ctx) => {
  try {
    const user = await getVerifiedUser(ctx);
    if (!user) {
      ctx.response.status = 401;
      ctx.response.body = { message: "Unauthorized" };
    }
    else {
      const coords = db.query(`SELECT x, y, facing FROM coords WHERE id = ?`, [user.id]);
      if (coords.length > 0) {
        ctx.response.status = 200;
        ctx.response.body = { 
          exists: true,
          x: coords[0][0],
          y: coords[0][1],
          facing: coords[0][2],
          player_id: user.id
        };
      } else {
        ctx.response.status = 200;
        ctx.response.body = { exists: false };
      }
    }
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { message: "Internal server error" };
  }
});

router.post("/createNewPlayer", async (ctx) => {
  const user = await getVerifiedUser(ctx);
  if (!user) {
    ctx.response.status = 401;
    ctx.response.body = { message: "Unauthorized" };
    return;
  }

  try {
    const body = await ctx.request.body.json();
    const { x, y } = body;
    
    if (typeof x !== "number" || typeof y !== "number") {
      ctx.response.status = 400;
      ctx.response.body = { message: "Invalid coordinates" };
      return;
    }

    const userId = user.id;
    const currentTime = Date.now();

    const coordsExists = db.query(`SELECT id FROM coords WHERE id = ?`, [userId]);
    
    const activityExists = db.query(`SELECT id FROM last_activity WHERE id = ?`, [userId]);

    db.query("BEGIN TRANSACTION");
    
    try {
      if (coordsExists.length > 0) {
        db.query(`UPDATE coords SET x = ?, y = ?, facing = ? WHERE id = ?`, 
          [x, y, "down", userId]);
      } else {
        db.query(`INSERT INTO coords (id, x, y, facing) VALUES (?, ?, ?, ?)`, 
          [userId, x, y, "down"]);
        db.query(`UPDATE users SET isPlaying = 1 WHERE id = ?`, [userId]);
      }

      if (activityExists.length > 0) {
        db.query(`UPDATE last_activity SET last_move_timestamp = ? WHERE id = ?`, 
          [currentTime, userId]);
      } else {
        db.query(`INSERT INTO last_activity (id, last_move_timestamp) VALUES (?, ?)`, 
          [userId, currentTime]);
      }

      db.query("COMMIT");
      
      ctx.response.body = { 
        message: coordsExists.length > 0 ? "Player position updated" : "New player created",
        player_id: userId,
        x,
        y,
        facing: "down"
      };
      ctx.response.status = coordsExists.length > 0 ? 200 : 201;
      
    } catch (error) {
      db.query("ROLLBACK");
      throw error;
    }
    
  } catch (error) {
    console.error("Error in /createNewPlayer:", error);
    ctx.response.status = 500;
    ctx.response.body = { 
      message: "Internal server error",
      error: error.message 
    };
  }
});

router.get("/verifyAdmin", async (ctx) => {
  const user = await getVerifiedUser(ctx, true);
  if (user) {
    ctx.response.status = 200;
    ctx.response.body = { message: "User is admin" };
  }
});

router.get("/admin/users", async (ctx) => {
  const user = await getVerifiedUser(ctx, true);
  if (user){
    const users = db.query(`SELECT id, username FROM users`)
      .map(([id, username]) => ({ id, username }));
    ctx.response.status = 200;
    ctx.response.body = users;
  }
});

router.delete("/admin/users/:id", async (ctx) => {
  const user = await getVerifiedUser(ctx, true);
  if (user) {
    const idToDelete = ctx.params.id;
    const adminCheck = db.query(`SELECT isAdmin FROM users WHERE id = ?`, [idToDelete]);
    if (adminCheck.length > 0 && adminCheck[0][0] == 1) {
      ctx.response.status = 403;
      ctx.response.body = { message: "Impossible de supprimer un administrateur." };
    } else {
      try {
        db.query("BEGIN TRANSACTION");
        
        db.query(`DELETE FROM coords WHERE id = ?`, [idToDelete]);
        db.query(`DELETE FROM stats WHERE id = ?`, [idToDelete]);
        db.query(`DELETE FROM last_activity WHERE id = ?`, [idToDelete]);
        db.query(`DELETE FROM tokens WHERE username = (SELECT username FROM users WHERE id = ?)`, [idToDelete]);
        db.query(`DELETE FROM messages WHERE id = ?`, [idToDelete]);
        
        db.query(`DELETE FROM users WHERE id = ?`, [idToDelete]);
        
        db.query("COMMIT");
      } catch (error) {
        db.query("ROLLBACK");
        console.error("Error deleting user:", error);
        ctx.response.status = 500;
        ctx.response.body = { message: "Error deleting user" };
      }
      ctx.response.status = 200;
      ctx.response.body = { message: "User deleted" };
    }   
  }
});

router.post("/boo", async (ctx) => {
  try {
    const user = await getVerifiedUser(ctx);
    if (user) {
    
      const playerPos = db.query(`SELECT x, y, facing FROM coords WHERE id = ?`, [user.id]);
      if (playerPos.length > 0) {
        const [x, y, facing] = playerPos[0];
        let targetX = x;
        let targetY = y;
        if (facing === "up") targetY--;
        else if (facing === "down") targetY++;
        else if (facing === "left") targetX--;
        else if (facing === "right") targetX++;
        
        const target = db.query(`SELECT id FROM coords WHERE x = ? AND y = ? AND id != ?`, [targetX, targetY, user.id]);
        if (target.length > 0) {
          const targetId = target[0][0];
          
          const random_coord_x = Math.floor(Math.random() * 20);
          const random_coord_y = Math.floor(Math.random() * 20);
          const randomFacing = ["up", "down", "left", "right"][Math.floor(Math.random() * 4)];
          
          db.query(`UPDATE coords SET x = ?, y = ?, facing = ? WHERE id = ?`, 
            [random_coord_x, random_coord_y, randomFacing, targetId]);
          
          ctx.response.status = 200;
          ctx.response.body = { message: "Joueur devant trouvé", targetId };
          
          connections.forEach((client) => {
            client.send(JSON.stringify({ 
              type: "boo", 
              targetId: targetId, 
              booer: user.id,
              new_target_x: random_coord_x,
              new_target_y: random_coord_y
            }));
          });
          
          let userStats = db.query(`SELECT kills, deaths FROM stats WHERE id = ?`, [user.id]);
          if (userStats.length === 0) {
            db.query(`INSERT INTO stats (id, username, kills, deaths) VALUES (?, ?, 0, 0)`, [user.id, user.username]);
            userStats = [[0, 0]];
          }
          const targetUser = db.query(`SELECT username FROM users WHERE id = ?`, [targetId]);
          if (targetUser.length === 0) {
            ctx.response.status = 500;
            ctx.response.body = { message: "Target user not found in database" };
          }
          else {
            let targetStats = db.query(`SELECT kills, deaths FROM stats WHERE id = ?`, [targetId]);
            if (targetStats.length === 0) {
              db.query(`INSERT INTO stats (id, username, kills, deaths) VALUES (?, ?, 0, 0)`, [targetId, targetUser[0][0]]);
              targetStats = [[0, 0]];
            }
            db.query(`UPDATE stats SET kills = kills + 1 WHERE id = ?`, [user.id]);
            db.query(`UPDATE stats SET deaths = deaths + 1 WHERE id = ?`, [targetId]);
          }
        } else {
          ctx.response.status = 200;
          ctx.response.body = { message: "Aucun joueur devant" };
        }
      }
    }
  } 
  catch (error) {
    console.error("Error in /getBooed:", error);
    ctx.response.status = 500;
    ctx.response.body = { message: "Internal server error" };
  }
}
);

router.get("/kills", async (ctx) => {
  try {
    const kills = db.query(`SELECT username, kills FROM stats ORDER BY kills DESC, username ASC`)
      .map(([username, kills]) => ({ username, kills }));
    ctx.response.status = 200;
    ctx.response.body = { kills };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur lors de la récupération du classement." };
  }
});



router.get("/", (ctx) => {
  if (!ctx.isUpgradable) {
    ctx.throw(501);
  }


  const ws = ctx.upgrade();

  connections.push(ws);
  console.log(`+ websocket connected (${connections.length})`);
  if (connections.length === 1 && !updateInterval) {
    updateInterval = setInterval(() => {
      const positions = db.query(`SELECT * FROM coords;`);
      console.log(positions)
      const currentTime = Date.now();
      const inactivityThreshold = 3 * 60 * 1000; 
      const inactivePlayers = db.query(
        `SELECT la.id FROM last_activity la
         JOIN users u ON la.id = u.id
         WHERE u.isPlaying = 1 AND ? - la.last_move_timestamp > ?`,
        [currentTime, inactivityThreshold]
      );

      if (inactivePlayers.length > 0) {
        for (const row of inactivePlayers) {
          const playerId = row[0];
          console.log(`Disconnecting inactive player ${playerId} due to inactivity`);
          
          db.query(`DELETE FROM coords WHERE id = ?`, [playerId]);
          
          db.query(`UPDATE users SET isPlaying = 0 WHERE id = ?`, [playerId]);
          connections.forEach((client) => {
            client.send(JSON.stringify({
              type: "disconnectDueToInactivity",
              playerId: playerId,
              message: "You have been disconnected due to inactivity"
            }));
          });
        }
      }
      const json = {
        type: "UpdateAllPlayers",
        positions: positions.map((row) => ({
          id: row[0],
          x: row[1],
          y: row[2],
          facing: row[3],
        })),
      };
      sendCoordsToAllUsers(json);
    }, 100);
  }

  ws.onerror = (_error) => {
    const index = connections.indexOf(ws);
    if (index !== -1) {
      connections.splice(index, 1);
    }
    console.log(`- websocket error`);
  };


  ws.onmessage = async (event) => {
    const message = event.data;
    const data = JSON.parse(message);
    const auth_token = await ctx.cookies.get("auth_token") as string;
    if (!(auth_token && await is_authorized(auth_token))) {
      console.log("sending to login page"); 
      ws.send(JSON.stringify({ go_to_login: true }));
      return;
    }
    const owner = db.query(`SELECT username FROM tokens WHERE token = ?`, [auth_token]);
    const test_users = getUsers(db);
    const user = test_users.find((u) => u.username === owner[0][0]);

    if (!user) {
      console.log("User in token doesn't exist");
      ws.close();
      return; 
    }
    

    if (data.type == "playerMove") {
      console.log("Player moved");
      const coord_x = data.x;
      const coord_y = data.y;
      const player_id = data.player_id;
      const facing = data.facing;
      const coordonnees = db.query(`SELECT id, x, y FROM coords;`);
      if (coord_x > 20 || coord_x < 0 || coord_y > 20 || coord_y < 0) {
          ws.send(JSON.stringify({ error: "invalid coordinates" }));
          return
      }      db.query(`UPDATE coords SET x = ?, y = ?, facing = ? WHERE id = ?`, [coord_x, coord_y, facing, player_id]);
      
      const userExists = db.query(`SELECT id FROM users WHERE id = ?`, [player_id]);
      if (userExists.length > 0) {
        const currentTime = Date.now();
        const activityExists = db.query(`SELECT id FROM last_activity WHERE id = ?`, [player_id]);
        if (activityExists.length > 0) {
          db.query(`UPDATE last_activity SET last_move_timestamp = ? WHERE id = ?`, [currentTime, player_id]);
        } else {
          db.query(`INSERT INTO last_activity (id, last_move_timestamp) VALUES (?, ?)`, [player_id, currentTime]);
        }
      } else {
        console.log(`Warning: Player ID ${player_id} doesn't exist in users table`);
      }
      
      return
    }
    else if (data.type == "playerDirectionChange") {
      console.log("Player direction changed");
      const coord_x = data.x;
      const coord_y = data.y;
      const player_id = data.player_id;
      const facing = data.facing;
      db.query(`UPDATE coords SET facing = ? WHERE id = ? AND x = ? AND y = ?`, [facing, player_id, coord_x, coord_y]);
      const userExists = db.query(`SELECT id FROM users WHERE id = ?`, [player_id]);
      if (userExists.length > 0) {
        const currentTime = Date.now();
      const activityExists = db.query(`SELECT id FROM last_activity WHERE id = ?`, [player_id]);
        if (activityExists.length > 0) {
          db.query(`UPDATE last_activity SET last_move_timestamp = ? WHERE id = ?`, [currentTime, player_id]);
        } else {
          db.query(`INSERT INTO last_activity (id, last_move_timestamp) VALUES (?, ?)`, [player_id, currentTime]);
        }
      }
    
    console.log(`Player ${player_id} changed direction to ${facing} at position (${coord_x}, ${coord_y})`);
    }
    else if (data.type == "playerDisconnect") {
      const player_id = data.player_id;
      
      db.query(`DELETE FROM coords WHERE id = ?`, [player_id]);
      db.query(`UPDATE users SET isPlaying = 0 WHERE id = ?`, [player_id]);
      ws.close();
      console.log("Player disconnected");
      return
    }
    else if (data.type == "message") {
      const { text } = data;
      if (typeof text === "string" && text.trim().length > 0) {
        let lastId = 0;
        const last = db.query(`SELECT MAX(message_id) FROM messages WHERE id = ?`, [user.id]);
        if (last.length > 0 && last[0][0] !== null) {
          lastId = last[0][0];
        }
        const newId = lastId + 1;
        db.query(`INSERT INTO messages (id, message_id, message) VALUES (?, ?, ?)`, [user.id, newId, text]);
        connections.forEach((client) => {
          client.send(JSON.stringify({
            type: "message",
            from: user.username,
            text
          }));
        });
      }
    }
  };
  
  ws.onclose = () => {
    const index = connections.indexOf(ws);
    if (index !== -1) {
      connections.splice(index, 1);
    }
    console.log(`- websocket disconnected (${connections.length})`);
    if (connections.length === 0 && updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null;
    }
  };
});

function sendCoordsToAllUsers(json: any) {
  connections.forEach((client) => {
    client.send(JSON.stringify(json));
  });
}


if (Deno.args.length < 1) {
  console.log(`Usage: $ deno run --allow-net --allow-read server.ts PORT [CERT_PATH KEY_PATH]`);
  Deno.exit();
}

const port = parseInt(Deno.args[0]);
let listenOptions: any = { port };

if (Deno.args.length >= 3) {
  const cert = await Deno.readTextFile(Deno.args[1]);
  const key = await Deno.readTextFile(Deno.args[2]);
  
  listenOptions = {
    port,
    secure: true,
    cert, 
    key    
  };
  console.log(`SSL conf ready (use https)`);
}

console.log(`Server is running on https://localhost:${port}`);



app.use(
  oakCors({
    origin: "https://localhost:8080",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


const is_authorized = async (auth_token: string) => {
  try{
    if (!auth_token) {
      return false;
    }
    const tokenData = await verify(auth_token, secretKey);
    const tokenInDB = db.query(`SELECT token FROM tokens WHERE token = ?`, [auth_token]);
    if (tokenInDB.length > 0) {
      const username = db.query(`SELECT username FROM tokens WHERE token = ?`, [auth_token]);
      const user = getUsers(db).find(u => u.username === username[0][0]);
      if (!user) {
        return false;
      }
      return true;
    }
    else {
      return false;
    }
  }
  catch (error) {
    return false;
  }
};

app.use(router.routes());
app.use(router.allowedMethods());

await app.listen(listenOptions);
