# Labyrinthe Multijoueur 3D

## Description du Projet

Ce projet est un jeu de labyrinthe multijoueur, développé sans framework avec JavaScript vanilla et Deno. Il répond aux contraintes d'un projet web mettant l'accent sur la sécurité, une architecture backend robuste et les communications en temps réel.

## Fonctionnalités Principales et Contraintes Réalisées

### Fonctionnalités du jeu
- 👾 **Jeu Multijoueur en Temps Réel** : Exploration simultanée du labyrinthe par plusieurs joueurs
- 🗺️ **Génération Dynamique de Labyrinthes** : Création procédurale de labyrinthes
- 🎮 **Système de "Boo"** : Mécanique d'interaction permettant de téléporter les autres joueurs
- 🏆 **Classement des Joueurs** : Système de points basé sur les éliminations
- 💬 **Chat en Temps Réel** : Communication entre joueurs pendant la partie

### Architecture
- ⚙️ **Sans Framework** : Développement avec JavaScript vanilla et Deno
- 🔐 **Authentification Complète** : Système de login/register avec gestion des sessions
- 💾 **Base de données** : SQLite avec plus de 5 tables (users, coords, tokens, stats, etc.)
- 🛣️ **API REST** : Implémentation CRUD pour la gestion des ressources
- 🔌 **WebSockets** : Communication bidirectionnelle en temps réel pour le jeu multijoueur
- 🔄 **Middleware & Routage** : Gestion des requêtes structurée avec Oak
- 👤 **Section Admin** : Accès restreint aux fonctionnalités d'administration

## Technologies Utilisées et Sécurité

### Technologies
- **Frontend** :
  - Three.js pour la visualisation 3D
  - JavaScript vanilla pour la logique client (sans framework)
  - WebSockets pour la communication en temps réel

- **Backend** :
  - Deno comme environnement d'exécution
  - SQLite avec 5+ tables pour la persistance des données
  - API REST pour les opérations CRUD
  - WebSockets pour les communications bidirectionnelles
  - Oak pour le middleware et le routage

### Sécurité (OWASP)
- 🔒 **Authentification Sécurisée** : Hachage des mots de passe avec bcrypt
- 🔑 **Gestion des Sessions** : Implémentation de JWT (JSON Web Tokens)
- 🛡️ **HTTPS** : Communication chiffrée avec certificats SSL
- 🚫 **Contrôle d'Accès** : Protection des routes sensibles et panel admin
- 🌐 **Gestion CORS** : Configuration pour le déploiement séparé front/back

## Installation et Démarrage

### Prérequis

- [Deno](https://deno.land/) v2.0 ou supérieur

### Lancement du Serveur

1. **Serveur Backend** :
```bash
deno run --allow-net --watch --allow-read --allow-write back_server.ts 3000 cert.crt cert.key
```

2. **Serveur Frontend** :
```bash
cd static_html/
deno run --allow-net --allow-read --watch server.ts 8080 ../cert.crt ../cert.key
```

3. Accédez au jeu via votre navigateur à l'adresse : `https://localhost:8080`

## Comment Jouer

- Créez un compte ou connectez-vous
- Utilisez les touches Z, Q, S, D pour vous déplacer dans le labyrinthe
- Appuyez sur E face à un autre joueur pour utiliser l'attaque "Boo"
- Consultez votre score et celui des autres joueurs dans le classement
- Utilisez le chat pour communiquer avec les autres joueurs

## Structure du Projet

- `back_server.ts` : Serveur backend avec API REST, WebSockets et authentification
- `static_html/` : Contient le frontend du jeu
  - `game/` : Logique du jeu côté client
  - `scripts/` : Gestion des WebSockets et interactions utilisateur
  - `pages/` : Pages HTML du site (login, register, admin, jeu)
  - `styles/` : Feuilles de style CSS

## Architecture de la Base de Données

Le projet utilise SQLite avec les tables suivantes :
1. `users` : Informations des utilisateurs (id, username, password_hash, isAdmin, isPlaying)
2. `coords` : Positions des joueurs dans le jeu (id, x, y, facing)
3. `tokens` : Jetons d'authentification (token, username)
4. `stats` : Statistiques de jeu (id, username, kills, deaths)
5. `maze` : Données du labyrinthe (structure, dimensions, etc.)

