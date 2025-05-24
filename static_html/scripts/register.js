async function register() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const data = {
        username,
        password
    };    try {
        const response = await fetch('https://boorinthe-back.cluster-ig3.igpolytech.fr/register', {
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
            window.location.href = '/pages/login.html';
            console.log(localStorage);
        } else if (response.status === 401) {
            // Handle 401 Unauthorized error
            alert('Unauthorized: Invalid username or password');
        } 
        else if (response.status === 405){
            alert('User already exists')
        }
        else {
            // Handle other non-successful response codes
            alert('Register failed: ' + response.statusText);
        }
    } catch (error) {
        alert('Register failed: ' + error.message);
        // Handle other errors
    }
}

function goToLogin() {
    console.log("Redirecting to register page");
    window.location.href = "/pages/login.html";
}