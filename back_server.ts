import { Application, Context, Router } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { create, verify } from "https://deno.land/x/djwt/mod.ts";
import { DB } from "https://deno.land/x/sqlite/mod.ts";
import test from "node:test";
import { getUsers } from "./.vscode/libs/SQLHandler.ts"


const db = new DB("game.db");
db.execute(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL
  )`);

db.execute(`CREATE TABLE IF NOT EXISTS coords (
  id INTEGER PRIMARY KEY REFERENCES users (id),
  x INTEGER NOT NULL,
  y INTEGER NOT NULL
  )`); 

db.execute(`DELETE FROM coords;`);
const test_users = getUsers(db);
const test_coords = db.query(`SELECT id, x, y FROM coords;`);
console.log(test_coords);


const router = new Router();
const app = new Application();
const tokens: { [key: string]: string } = {};
const connections: WebSocket[] = [];
const cooldown = 5 * 1000; // ms
const myarray: any[] = [];



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

function removeTokenByUser(user: string) {
  for (const token in tokens) {
    if (tokens[token] === user) {
      delete tokens[token];
      //console.log(`Token ${token} removed for user: ${user}`);
      break;
    }
  }
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
      console.log("User pushed")
      const token = await create({ alg: "HS512", typ: "JWT" }, { userName: newUser.username }, secretKey);
      ctx.cookies.set("token", token, {
        httpOnly: true,
        sameSite: "Strict",
        maxAge: 60 * 60,
      });
      ctx.response.status = 201;
      ctx.response.body = { message: "New user registered!", auth_token: token};
      tokens[token] = username;
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
    //console.log(body);

    // Check if the username exists
    const test_users = getUsers(db);
    const user = test_users.find(u => u.username === username);
    //console.log(user)
    if (user) {
      // Verify the password
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (isMatch) {
        //removeTokenByUser(username)
        const token = await create({ alg: "HS512", typ: "JWT" }, { userName: user.username }, secretKey);
        ctx.cookies.set("token", token, {
          httpOnly: true,
          sameSite: "Strict",
          maxAge: 60 * 60,
        });
        ctx.response.status = 200;
        ctx.response.body = { message: "Login successful!", auth_token: token};
        tokens[token] = username;
      } else {
        ctx.response.status = 401;
        ctx.response.body = { message: "Invalid credentials" };
      }
    } 
  } catch (error) {
    ctx.response.status = 400;
    ctx.response.body = { message: "Invalid request body" };
  }
  
});

router.post("/createNewPlayer", async (ctx) => {
  try {
    const body = await ctx.request.body.json(); 
    const {x, y } = body; // Destructure the required fields from the body
    console.log(body);
    if (x === undefined || y === undefined) {
      ctx.response.status = 400;
      ctx.response.body = { message: "Invalid request body" };
      return;
    }
    const authToken = ctx.request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!authToken || !(authToken in tokens)) {
      ctx.response.status = 401;
      ctx.response.body = { message: "Unauthorized" };
      return;
    }
    console.log("Auth token:", authToken);
    const username = tokens[authToken];
    const user = getUsers(db).find(u => u.username === username);
    if (!user) {
      ctx.response.status = 404;
      ctx.response.body = { message: "User not found" };
      return;
    }
    const userId = user.id;
    // Perform your logic here, e.g., creating a new player
    const userExists = db.query(`SELECT id FROM users WHERE id = ?`, [userId]);
    if (userExists.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { message: "User not found in the database" };
      return;
    }
    db.query(`INSERT INTO coords (id, x, y) VALUES (?, ?, ?)`, [userId, x, y]);
    console.log("New player created with coordinates:", x, y);
    ctx.response.body = { message: "New player created successfully!", player_id: userId };
    ctx.response.status = 201;
  } catch (error) {
    console.error(error);
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
    console.log("Message received:", data);
    console.log(data.auth_token in tokens);
    if (!("auth_token" in data && await is_authorized(data.auth_token))) {
      ws.send(JSON.stringify({ go_to_login: true }));
      return;
    }

    const owner = tokens[data.auth_token];
    const test_users = getUsers(db)
    const user = test_users.find((u) => u.username === owner);

    // Check if user exists, if not send an error and disconnect the websocket
    if (!user) {
      console.log("? user in token doesn't exist");
      ws.close();
      return; 
    }
    

    if (data.type == "playerMove") {
      const coord_x = data.x;
      const coord_y = data.y;
      const player_id = data.player_id;
      if (coord_x > 20 || coord_x < 0 || coord_y > 20 || coord_y < 0) {
          ws.send(JSON.stringify({ error: "invalid coordinates" }));
          return
      }
      db.query(`UPDATE coords SET x = ?, y = ? WHERE id = ?`, [coord_x, coord_y, player_id]);
      return
    }
    else if (data.type == "playerDisconnect") {
      const player_id = data.player_id;
      db.query(`DELETE FROM coords WHERE id = ?`, [player_id]);
      console.log("Player disconnected");
      return
    }
    setInterval(() => {
      const positions = db.query(`SELECT * FROM coords;`);
      console.log(positions)
      const json = {
        type: "UpdateAllPlayers",
        positions: positions.map((row) => ({
          id: row[0],
          x: row[2],
          y: row[3],
        })),
      };
      sendCoordsToAllUsers(json);
      const test_coords = db.query(`SELECT id, x, y FROM coords;`);
      //console.log(test_coords);
      //console.log("\n");
  });
}
  ws.onclose = () => {
    const index = connections.indexOf(ws);
    if (index !== -1) {
      connections.splice(index, 1);
    }
    console.log(`- websocket disconnected (${connections.length})`);
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
  if (!auth_token) {
    return false;
  }

  if (auth_token in tokens) {
    try {
      const payload = await verify(auth_token, secretKey);
      if (payload.userName === tokens[auth_token]) {
        return true;
      }
    } catch {
      console.log("verify token failed");
      return false;
    }
  }
  console.log("Unknown token");
  return false;
};

// Middleware to verify JWT token
const authorizationMiddleware = async (ctx: Context, next: () => Promise<unknown>) => {
  const cookie = ctx.request.headers.get("cookie");
  const authToken = cookie?.split("; ").find(row => row.startsWith("auth_token="))?.split('=')[1];

  if (!authToken) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized: Missing token" };
    return;
  }

  try {
    // Verify the token
    const tokenData = await verify(authToken, secretKey);
    ctx.state.tokenData = tokenData; // Store data in ctx.state for use in other middlewares/routes
    await next();
  } catch {
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized: Invalid token" };
  }
};

app.use(router.routes());
app.use(router.allowedMethods());

await app.listen(options);


