function setupWebSocketConnection() {
  connectWebSocket((message) => {
    if (message.type === "UpdateAllPlayers") {
      positions = message.positions;
      if (player && player.player_id) {
        updateAllPlayers(message.positions, scene, maze, player.player_id);
      }
    } else if (message.type === "mazeUpdate") {
      console.log("Maze updated:", message.maze);
    } else if (message.type === "boo") {
      console.log("Boo message received:", message);
      //const booSound = new Audio('/static_html/sounds/boo.mp3');
      //booSound.play();
      
      // Si ce joueur est la cible du boo
      if (message.targetId === player.player_id) {
        alert("Boo! You have been scared!");
        
        // Utiliser les coordonnées envoyées par le serveur
        if (message.newX !== undefined && message.newY !== undefined) {
          console.log("Teleporting to server-provided position:", message.newX, message.newY);
          player.moveTo(message.newX, message.newY);
          player.faceTowards(message.newFacing || player.facingTowards);
        }
      }
      
      // Forcer une mise à jour immédiate des sprites de tous les joueurs
      // en demandant les dernières positions au serveur
      setTimeout(() => {
        const updatedPositions = message.positions || positions;
        console.log("Forcing player update after boo");
        updateAllPlayers(updatedPositions, scene, maze, player.player_id);
      }, 100);
    } else if (message.type === "message") {
      // Affiche le message dans le chat
      const chatMessages = document.getElementById('chat-messages');
      if (chatMessages) {
        const div = document.createElement('div');
        div.innerHTML = `<b>${message.from} :</b> ${message.text}`;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    } else {
      console.log("Message reçu:", message);
    }
  });
}
