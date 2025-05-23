FROM denoland/deno:alpine-1.42.0

# Configuration essentielle
WORKDIR /app
COPY . ./

# Cache des dépendances (améliore les rebuilds)
RUN deno cache ./back_server.ts

# Paramètres Dokku spécifiques
ENV DENO_DIR=/app/.deno_cache
ENV PORT=8080  # Dokku utilise cette variable par défaut

EXPOSE 8080

# Commande de démarrage adaptée
CMD ["run", "--allow-net", "--allow-read", "--allow-env", "--allow-write", "back_server.ts"]
