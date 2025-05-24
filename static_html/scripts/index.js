export function verifySession() {
    fetch("boorinthe-back.cluster-ig3.igpolytech.fr/verifySession", {
        method: "GET",
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


export async function goToAdmin() {
    fetch("https://boorinthe-back.cluster-ig3.igpolytech.fr/verifyAdmin", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        secure: true,
        credentials: "include", // Assurez-vous que les cookies de session sont envoyés
      })
      .then(response => {
        if (response.status === 200) {
          console.log("Utilisateur autorisé");
          window.location.href = "/pages/admin.html";
        } else {
          alert("Vous n'avez pas accès à cette page.");
        }
      })
      .catch(error => {
        console.error("Erreur de vérification d'authentification :", error);
        goToLogin();
      });
}

// Rendez la fonction accessible dans le scope global pour l'appel inline HTML
window.goToAdmin = goToAdmin;

function goToLogin() {
    console.log("Redirecting to login page");
    window.location.href = "/pages/login.html";
}

verifySession();

