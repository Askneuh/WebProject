import { Application } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { Status } from "https://deno.land/std@0.178.0/http/http_status.ts";

const app = new Application();
const ROOT = `${Deno.cwd()}/`;

// Logger middleware
app.use(async (ctx, next) => {
  await next();
  const rt = ctx.response.headers.get("X-Response-Time");
  console.log(`${ctx.request.method} ${ctx.request.url} - ${rt}`);
});

// Timing middleware
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.response.headers.set("X-Response-Time", `${ms}ms`);
});

// Middleware pour ignorer les méthodes HTTP inconnues
app.use(async (ctx, next) => {
  const allowedMethods = ["GET", "HEAD"];
  if (!allowedMethods.includes(ctx.request.method)) {
    ctx.response.status = Status.MethodNotAllowed;
    ctx.response.body = `Method ${ctx.request.method} not allowed.`;
    return;
  }
  await next();
});

// Static file middleware
app.use(async (ctx) => {
  try {
    const path = ctx.request.url.pathname === "/" 
      ? "/pages/index.html" 
      : ctx.request.url.pathname;
    
    const filePath = `${ROOT}${path}`;
    const fileInfo = await Deno.stat(filePath);
    
    if (fileInfo.isFile) {
      // Set appropriate content type based on file extension
      const ext = path.substring(path.lastIndexOf(".") + 1);
      let contentType = "text/plain";
      
      switch (ext) {
        case "html": contentType = "text/html"; break;
        case "css": contentType = "text/css"; break;
        case "js": contentType = "application/javascript"; break;
        case "json": contentType = "application/json"; break;
        case "png": contentType = "image/png"; break;
        case "jpg": case "jpeg": contentType = "image/jpeg"; break;
        case "gif": contentType = "image/gif"; break;
      }
      
      ctx.response.headers.set("Content-Type", contentType);
      ctx.response.body = await Deno.readFile(filePath);
      ctx.response.status = Status.OK;
    } else {
      throw new Error("Not a file");
    }
  } catch (e) {
    console.error(e);
    ctx.response.status = Status.NotFound;
    ctx.response.body = "404 File not found";
  }
});

if (Deno.args.length < 1) {
  console.log(`Usage: $ deno run --allow-net --allow-read=./ server.ts PORT [CERT_PATH KEY_PATH]`);
  Deno.exit();
}

const port = Number(Deno.args[0]);
let listenOptions: any = { port };

if (Deno.args.length >= 3) {
  try {
    listenOptions = {
      port,
      secure: true
    };
    console.log(`SSL conf ready (use https)`);
  } catch (error) {
    console.error("Error loading certificates:", error);
    Deno.exit(1);
  }
}
else {
  listenOptions = {
    port: Number(Deno.args[0]),
    secure: true,
  };
}

console.log(`Oak static server running on ${listenOptions.secure ? 'https' : 'http'}://localhost:${port} for the files in ${ROOT}`);

try {
  await app.listen({port: port, secure: true});
} catch (error) {
  console.error("Server error:", error);
}