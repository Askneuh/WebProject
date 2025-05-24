FROM denoland/deno:latest
WORKDIR /app

COPY . .

CMD ["deno", "run", "--allow-read", "--allow-net", "--allow-env", "server.ts"]