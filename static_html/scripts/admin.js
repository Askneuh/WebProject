function verifySession() {
    fetch("boorinthe-back.cluster-ig3.igpolytech.fr/verifySession", {
        method: "GET",
        secure: true,
        credentials: "include", // Assurez-vous que les cookies de session sont envoyés
      })
      .then(response => {
        if (response.status === 200) {
          console.log("Utilisateur connecté");
        } else {
          goToLogin();
        }
      })
      .catch(error => {
        console.error("Erreur de vérification d'authentification :", error);
        goToLogin();
      });
}

function goToLogin() {
    console.log("Redirecting to login page");
    window.location.href = "/pages/login.html";
}

verifySession();
async function fetchUsers() {
  const res = await fetch('boorinthe-back.cluster-ig3.igpolytech.fr/admin/users', { credentials: 'include', headers: { 'Content-Type': 'application/json' } });
  if (!res.ok) {
    document.getElementById('message').textContent = "Accès refusé ou erreur serveur.";
    return;
  }
  const users = await res.json();
  const tbody = document.getElementById('users-body');
  tbody.innerHTML = '';
  users.forEach(user => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${user.id}</td><td>${user.username}</td><td><button onclick="deleteUser(${user.id})">Supprimer</button></td>`;
    tbody.appendChild(tr);
  });
}

window.deleteUser = async function(id) {
  if (!confirm('Supprimer cet utilisateur ?')) return;
  const res = await fetch(`boorinthe-back.cluster-ig3.igpolytech.fr/admin/users/${id}`, {
    method: 'DELETE',
    credentials: 'include'
  });
  if (res.ok) {
    document.getElementById('message').textContent = 'Utilisateur supprimé.';
    fetchUsers();
  } else {
    document.getElementById('message').textContent = "Erreur lors de la suppression.";
  }
}

fetchUsers();