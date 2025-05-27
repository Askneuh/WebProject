export function verifySession() {
    fetch("https://localhost:3000/verifySession", {
        method: "GET",
        credentials: "include", 
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

export async function logout() {
  fetch("https://localhost:3000/logout", {
    method: "POST", 
    headers : { "Content-Type": "application/json"}, 
    secure: true, 
    credentials : "include"
  })
  .then(response => {
    if (response.status === 200) {
      window.location.href = "/pages/login.html";
    }
    else {
      alert(response.body.message);
    }
  })
  .catch(error => {
        console.error("Erreur de vérification d'authentification :", error);
        goToLogin();
      });
}
window.logout = logout;



export async function goToAdmin() {
    fetch("https://localhost:3000/verifyAdmin", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        secure: true,
        credentials: "include", 
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

window.goToAdmin = goToAdmin;

function goToLogin() {
    console.log("Redirecting to login page");
    window.location.href = "/pages/login.html";
}

verifySession();

