
async function login() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const data = {
        username,
        password
    };    try {
        const response = await fetch('https://localhost:3000/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        if (response.ok) {
            const result = await response.json();
            console.log(result.auth_token);
            console.log("Redirecting to index page");
            window.location.href = '/index.html';
            
            
        } else if (response.status === 401) {
            // Handle 401 Unauthorized error
            alert('Unauthorized: Invalid username or password');
        } else {
            // Handle other non-successful response codes
            alert('Login failed: ' + response.statusText);
        }
    } catch (error) {
        alert('Login failed: ' + error.message);
        // Handle other errors
    }
}

function goToRegister() {
    console.log("Redirecting to register page");
    window.location.href = "/pages/register.html";
}