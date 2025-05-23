
async function login() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const data = {
        username,
        password
    };    try {
        const response = await fetch('boorinthe-back.cluster-ig3.igpolytech.fr/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            credentials: 'include'
        });

        console.log("ici", response.status);

        if (response.ok) {
            const result = await response.json();
            console.log("response ok");
            console.log(result.auth_token);
            //localStorage.setItem('auth_token', result.auth_token); (askip ça le fait automatiquement)            // Redirect or perform other actions based on successful login
            console.log("Redirecting to index page");
            window.location.href = '/pages/index.html';
            
            
        } else if (response.status === 401) {
            // Handle 401 Unauthorized error
            alert('Unauthorized: Invalid username or password');
        } else {
            console.log("wtf");
            // Handle other non-successful response codes
            alert('Login failed: ' + response.statusText);
        }
    } catch (error) {
        console.log("la");
        alert('Login failed: ' + error.message);
        // Handle other errors
    }
}

function goToRegister() {
    console.log("Redirecting to register page");
    window.location.href = "/pages/register.html";
}