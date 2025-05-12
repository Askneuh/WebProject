
export function verifySession() {
    fetch("http://localhost:3000/verifySession", {
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

      
function goToLogin() {
    console.log("Redirecting to login page");
    window.location.href = "/pages/login.html";
}

verifySession();

