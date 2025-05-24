FROM denoland/deno:alpine

WORKDIR /app


# Copie le reste
COPY . .

# Port exposé (remplacez par votre port)
EXPOSE 8080

# Commande de lancement (adaptez à votre cas)
CMD ["run", "--allow-net", "--allow-read", "server.ts"]