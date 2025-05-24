
async function login() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const data = {
        username,
        password
    };    try {
        const response = await fetch('https://boorinthe-back.cluster-ig3.igpolytech.fr/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            credentials: 'include'
        });


        if (response.ok) {
            const result = await response.json();
            console.log("Redirecting to index page");
            window.location.href = '/pages/index.html';
            
            
        } else if (response.status === 401) {
            alert('Unauthorized: Invalid username or password');
        } else {
            console.log("wtf");
            alert('Login failed: ' + response.statusText);
        }
    } catch (error) {
        console.log("la");
        alert('Login failed: ' + error.message);
    }
}

function goToRegister() {
    console.log("Redirecting to register page");
    window.location.href = "/pages/register.html";
}