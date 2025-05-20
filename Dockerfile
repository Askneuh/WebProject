# Utilise une image officielle Deno
FROM denoland/deno:alpine-1.40.4

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers du projet
COPY . .

# Optionnel : cache les dépendances si tu as un deps.ts
# RUN deno cache deps.ts

# Ouvre le port 8080 (Dokku l'exige)
EXPOSE 8080

# Commande pour lancer ton app Deno
CMD ["run", "--allow-net", "--allow-read", "--allow-env", "--allow-write", "back_server.ts"]
