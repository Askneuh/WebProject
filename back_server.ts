import { Application, Context, Router } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { create, verify } from "https://deno.land/x/djwt/mod.ts";
import { DB } from "https://deno.land/x/sqlite/mod.ts";
import { getUsers } from "./.vscode/libs/SQLHandler.ts"
import { generateMaze} from "./static_html/game/generateMaze.ts";


const db = new DB("game.db");
db.execute(`DROP TABLE IF EXISTS coords;`);

db.execute(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  isAdmin INTEGER DEFAULT 0
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
db.execute(`CREATE TABLE IF NOT EXISTS messages (
  id INTEGER REFERENCES users (id),
  message TEXT NOT NULL,
  PRIMARY KEY (id, message)
  )`);


db.execute(`DELETE FROM coords;`);

const test_users = getUsers(db);
const test_coords = db.query(`SELECT id, x, y FROM coords;`);


const router = new Router();
const app = new Application();
const connections: WebSocket[] = [];
const cooldown = 5 * 1000; // ms
const myarray: any[] = [];
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

async function createJwt(username: string): Promise<string> {
  const header = {
    alg: "HS256",
    typ: "JWT"
  };
  const payload = {
    username: username
  };
  const token = await create(header, payload, secretKey);
  return token
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
      console.log("User pushed")
      const token = await create({ alg: "HS512", typ: "JWT" }, { userName: newUser.username }, secretKey);
      // In login/register routes, use this consistent approach:
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
  try {
    const authToken = await ctx.cookies.get("auth_token") as string;
    if (!authToken) {
      ctx.response.status = 401;
      ctx.response.body = { message: "Unauthorized" };
      return;
    }
    const tokenData = await verify(authToken, secretKey);
    if (tokenData) {
      const username = tokenData.userName;
      const tokenInDB = db.query(`SELECT token FROM tokens WHERE username = ?`, [username]);
      if (tokenInDB.length > 0) {
        ctx.response.status = 200;
        ctx.response.body = { message: "Session is valid", user: { username: username } };
      } else {
        ctx.response.status = 404;
        ctx.response.body = { message: "User not found" };
      }
    } else {
      ctx.response.status = 401;
      ctx.response.body = { message: "Invalid token" };
    }
  } catch (error) {
    console.log("Redirecting to login page");
    ctx.response.status = 401;
  }
});

router.post("/getMaze", async (ctx) => {
  try {
    const authToken = await ctx.cookies.get("auth_token") as string;
    if (!authToken) {
      ctx.response.status = 401;
      ctx.response.body = { message: "Unauthorized" };
      return;
    }
    const tokenData = await verify(authToken, secretKey);
    if (tokenData) {
      const username = tokenData.userName || tokenData.username;
      const tokenInDB = db.query(`SELECT token FROM tokens WHERE username = ?`, [username]);
      if (tokenInDB.length > 0) {
        ctx.response.status = 200;
        ctx.response.body = { message: "Maze generated successfully", maze };
      } else {
        ctx.response.status = 404;
        ctx.response.body = { message: "User not found" };
      }
    } else {
      ctx.response.status = 401;
      ctx.response.body = { message: "Invalid token" };
    }
  } catch (error) {
    console.error("Error in /getMaze:", error);
    ctx.response.status = 500;
    ctx.response.body = { message: "Internal server error" };
  }
});

router.post("/createNewPlayer", async (ctx) => {
  try {
    const body = await ctx.request.body.json(); 
    const { x, y } = body;

    if (typeof x !== "number" || typeof y !== "number") {
      ctx.response.status = 400;
      ctx.response.body = { message: "Invalid request body" };
      return;
    }

    const authToken = await ctx.cookies.get("auth_token") as string;
    if (!authToken) {
      ctx.response.status = 401;
      ctx.response.body = { message: "Unauthorized" };
      return;
    }
    const tokenData = await verify(authToken, secretKey);
    const tokenInDB = db.query(`SELECT token FROM tokens WHERE token = ?`, [authToken]);
    if (tokenInDB.length > 0) {
      const username = db.query(`SELECT username FROM tokens WHERE token = ?`, [authToken]);
      const user = getUsers(db).find(u => u.username === username[0][0]);
      if (!user) {
        ctx.response.status = 404;
        ctx.response.body = { message: "User not found" };
        return;
      }

      const userId = user.id;
      const userExists = db.query(`SELECT id FROM users WHERE id = ?`, [userId]);
      if (userExists.length === 0) {
        ctx.response.status = 404;
        ctx.response.body = { message: "User not found in the database" };
        return;
      }

      const existingCoords = db.query(`SELECT * FROM coords WHERE id = ?`, [userId]);
      if (existingCoords.length > 0) {
        ctx.response.status = 409;
        ctx.response.body = { message: "Player already exists" };
        return;
      }

      db.query(`INSERT INTO coords (id, x, y, facing) VALUES (?, ?, ?, ?)`, [userId, x, y, "down"]);
      console.log("New player created with coordinates:", x, y);

      ctx.response.body = { message: "New player created successfully!", player_id: userId };
      ctx.response.status = 201;
    }
   } catch (error) {
    console.error("Error in /createNewPlayer:", error);
    ctx.response.status = 500;
    ctx.response.body = { message: "Internal server error" };
  }
});

router.get("/verifyAdmin", async (ctx) => {
  try {
    const authToken = await ctx.cookies.get("auth_token") as string;
    if (!authToken) {
      ctx.response.status = 401;
      ctx.response.body = { message: "Unauthorized" };
      return;
    }
    const tokenData = await verify(authToken, secretKey);
    const tokenInDB = db.query(`SELECT token FROM tokens WHERE token = ?`, [authToken]);
    if (tokenInDB.length > 0) {
      const username = db.query(`SELECT username FROM tokens WHERE token = ?`, [authToken]);
      const user = getUsers(db).find(u => u.username === username[0][0]);
      if (!user) {
        ctx.response.status = 404;
        ctx.response.body = { message: "User not found" };
        return;
      }
      const userId = user.id;
      const isAdmin = db.query(`SELECT isAdmin FROM users WHERE id = ?`, [userId]);
      if (isAdmin[0][0] == 1) {
        ctx.response.status = 200;
        ctx.response.body = { message: "User is admin" };
      } else {
        ctx.response.status = 403;
        ctx.response.body = { message: "User is not admin" };
      }
    } else {
      ctx.response.status = 404;
      ctx.response.body = { message: "User not found" };
    }
  } catch (error) {
    console.error("Error in /verifyAdmin:", error);
    ctx.response.status = 500;
    ctx.response.body = { message: "Internal server error" };
  }
});

router.post("/boo", async (ctx) => {
  try {
    const authToken = await ctx.cookies.get("auth_token") as string;
    if (!authToken) {
      ctx.response.status = 401;
      ctx.response.body = { message: "Unauthorized" };
      return;
    }
    const tokenData = await verify(authToken, secretKey);
    if (tokenData) {
      const username = tokenData.userName || tokenData.username;
      const tokenInDB = db.query(`SELECT token FROM tokens WHERE username = ?`, [username]);
      if (tokenInDB.length > 0) {
        const user = getUsers(db).find(u => u.username === username);
        if (!user) {
          ctx.response.status = 404;
          return;
        }
        
        // Vérifier si le joueur est juste devant quelqu'un
        // On récupère la position et la direction du joueur courant
        const playerPos = db.query(`SELECT x, y, facing FROM coords WHERE id = ?`, [user.id]);
        if (playerPos.length > 0) {
          const [x, y, facing] = playerPos[0];
          let targetX = x;
          let targetY = y;
          if (facing === "up") targetY--;
          else if (facing === "down") targetY++;
          else if (facing === "left") targetX--;
          else if (facing === "right") targetX++;
          // Chercher un joueur à cette position
          const target = db.query(`SELECT id FROM coords WHERE x = ? AND y = ? AND id != ?`, [targetX, targetY, user.id]);
          if (target.length > 0) {
            const targetId = target[0][0];
            ctx.response.status = 200;
            ctx.response.body = { message: "Joueur devant trouvé", targetId };
            connections.forEach((client) => {
              client.send(JSON.stringify({ type: "boo", targetId: targetId, booer: user.id }));
            });
            // Vérifier si les stats existent pour le booer (user)
            let userStats = db.query(`SELECT kills, deaths FROM stats WHERE id = ?`, [user.id]);
            if (userStats.length === 0) {
              db.query(`INSERT INTO stats (id, username, kills, deaths) VALUES (?, ?, 0, 0)`, [user.id, user.username]);
              userStats = [[0, 0]];
            }
            // Vérifier si les stats existent pour la cible (targetId)
            const targetUser = db.query(`SELECT username FROM users WHERE id = ?`, [targetId]);
            if (targetUser.length === 0) {
              // La cible n'existe pas, on ne fait rien de plus
              return;
            }
            let targetStats = db.query(`SELECT kills, deaths FROM stats WHERE id = ?`, [targetId]);
            if (targetStats.length === 0) {
              db.query(`INSERT INTO stats (id, username, kills, deaths) VALUES (?, ?, 0, 0)`, [targetId, targetUser[0][0]]);
              targetStats = [[0, 0]];
            }
            // Incrémenter les kills du booer et les morts de la cible
            db.query(`UPDATE stats SET kills = kills + 1 WHERE id = ?`, [user.id]);
            db.query(`UPDATE stats SET deaths = deaths + 1 WHERE id = ?`, [targetId]);
            return;
          } else {
            ctx.response.status = 200;
            ctx.response.body = { message: "Aucun joueur devant" };
            return;
          }
        }
      } else {
        ctx.response.status = 404;
        ctx.response.body = { message: "User not found" };
      }
    } else {
      ctx.response.status = 401;
      ctx.response.body = { message: "Invalid token" };
    }
  } catch (error) {
    console.error("Error in /getBooed:", error);
    ctx.response.status = 500;
    ctx.response.body = { message: "Internal server error" };
  }
}
);

// Route GET /admin/users : liste tous les utilisateurs (admin only)
router.get("/admin/users", async (ctx) => {
  try {
    const authToken = await ctx.cookies.get("auth_token") as string;
    if (!authToken) {
      ctx.response.status = 401;
      ctx.response.body = { message: "Unauthorized" };
      return;
    }
    const tokenData = await verify(authToken, secretKey);
    const tokenInDB = db.query(`SELECT token FROM tokens WHERE token = ?`, [authToken]);
    if (tokenInDB.length > 0) {
      const username = db.query(`SELECT username FROM tokens WHERE token = ?`, [authToken]);
      const user = getUsers(db).find(u => u.username === username[0][0]);
      if (!user) {
        ctx.response.status = 404;
        ctx.response.body = { message: "User not found" };
        return;
      }
      const userId = user.id;
      const isAdmin = db.query(`SELECT isAdmin FROM users WHERE id = ?`, [userId]);
      if (isAdmin[0][0] == 1) {
        // Récupérer tous les utilisateurs
        const users = db.query(`SELECT id, username FROM users`)
          .map(([id, username]) => ({ id, username }));
        ctx.response.status = 200;
        ctx.response.body = users;
      } else {
        ctx.response.status = 403;
        ctx.response.body = { message: "User is not admin" };
      }
    } else {
      ctx.response.status = 404;
      ctx.response.body = { message: "User not found" };
    }
  } catch (error) {
    console.error("Error in /admin/users:", error);
    ctx.response.status = 500;
    ctx.response.body = { message: "Internal server error" };
  }
});

// Route DELETE /admin/users/:id : supprime un utilisateur (admin only)
router.delete("/admin/users/:id", async (ctx) => {
  try {
    const authToken = await ctx.cookies.get("auth_token") as string;
    if (!authToken) {
      ctx.response.status = 401;
      ctx.response.body = { message: "Unauthorized" };
      return;
    }
    const tokenData = await verify(authToken, secretKey);
    const tokenInDB = db.query(`SELECT token FROM tokens WHERE token = ?`, [authToken]);
    if (tokenInDB.length > 0) {
      const username = db.query(`SELECT username FROM tokens WHERE token = ?`, [authToken]);
      const user = getUsers(db).find(u => u.username === username[0][0]);
      if (!user) {
        ctx.response.status = 404;
        ctx.response.body = { message: "User not found" };
        return;
      }
      const userId = user.id;
      const isAdmin = db.query(`SELECT isAdmin FROM users WHERE id = ?`, [userId]);
      if (isAdmin[0][0] == 1) {
        const idToDelete = ctx.params.id;
        // Vérifier si l'utilisateur à supprimer est admin
        const adminCheck = db.query(`SELECT isAdmin FROM users WHERE id = ?`, [idToDelete]);
        if (adminCheck.length > 0 && adminCheck[0][0] == 1) {
          ctx.response.status = 403;
          ctx.response.body = { message: "Impossible de supprimer un administrateur." };
          return;
        }
        db.query(`DELETE FROM users WHERE id = ?`, [idToDelete]);
        ctx.response.status = 200;
        ctx.response.body = { message: "User deleted" };
      } else {
        ctx.response.status = 403;
        ctx.response.body = { message: "User is not admin" };
      }
    } else {
      ctx.response.status = 404;
      ctx.response.body = { message: "User not found" };
    }
  } catch (error) {
    console.error("Error in DELETE /admin/users/:id:", error);
    ctx.response.status = 500;
    ctx.response.body = { message: "Internal server error" };
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
      console.log("? user in token doesn't exist");
      ws.close();
      return; 
    }
    

    if (data.type == "playerMove") {
      console.log("Player moved");
      const coord_x = data.x;
      const coord_y = data.y;
      const player_id = data.player_id;
      const facing = data.facing;
      if (coord_x > 20 || coord_x < 0 || coord_y > 20 || coord_y < 0) {
          ws.send(JSON.stringify({ error: "invalid coordinates" }));
          return
      }
      db.query(`UPDATE coords SET x = ?, y = ?, facing = ? WHERE id = ?`, [coord_x, coord_y, facing, player_id]);
      return
    }
    else if (data.type == "playerDisconnect") {
      const player_id = data.player_id;
      
      db.query(`DELETE FROM coords WHERE id = ?`, [player_id]);
      console.log("Player disconnected");
      return
    }
    
}
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

// deno-lint-ignore no-explicit-any
function sendCoordsToAllUsers(json: any) {
  connections.forEach((client) => {
    client.send(JSON.stringify(json));
  });
}


if (Deno.args.length < 1) {
  console.log(`Usage: $ deno run --allow-net server.ts PORT [CERT_PATH KEY_PATH]`);
  Deno.exit();
}

const options = {port: Deno.args[0]}

if (Deno.args.length >= 3) {
  options.secure = true;
  options.cert = await Deno.readTextFile(Deno.args[1]);
  options.key = await Deno.readTextFile(Deno.args[2]);
  console.log(`SSL conf ready (use https)`);
}

console.log(`Oak back server running on port ${options.port}`);

app.use(
  oakCors({
    origin: 'http://localhost:8080', // Allow requests from this origin
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Specify allowed methods
    allowedHeaders: ["Content-Type", "Authorization"], // Specify allowed headers
    credentials: true, // Allow credentials like cookies
  })
);


// Function to check the tokens received by websocket messages
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
/*
// Middleware to verify JWT token
const authorizationMiddleware = async (ctx: Context, next: () => Promise<unknown>) => {
  const cookie = ctx.request.headers.get("cookie");
  const authToken = ctx.cookies.get("auth_token");

  if (!authToken) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized: Missing token" };
    return;
  }

  try {
    const tokenData = await verify(authToken, secretKey);
    ctx.state.tokenData = tokenData;
    await next();
  } catch {
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized: Invalid token" };
  }
};
*/
app.use(router.routes());
app.use(router.allowedMethods());

await app.listen(options);

