FROM denoland/deno:latest
WORKDIR /app

COPY . .

EXPOSE 8080

CMD ["deno", "run", "--allow-read", "--allow-net", "--allow-env", "server.ts"]