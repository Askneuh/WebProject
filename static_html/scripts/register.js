async function register() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const data = {
        username,
        password
    };    try {
        const response = await fetch('https://localhost:3000/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            credentials: 'include'
        });

        if (response.ok) {
            const result = await response.json();
            console.log("response ok");
            window.location.href = '/index.html';
            console.log(localStorage);
        } else if (response.status === 401) {
            alert('Unauthorized: Invalid username or password');
        } 
        else if (response.status === 405){
            alert('User already exists')
        }
        else {
            alert('Register failed: ' + response.statusText);
        }
    } catch (error) {
        alert('Register failed: ' + error.message);
    }
}

function goToLogin() {
    console.log("Redirecting to login page");
    window.location.href = "/pages/login.html";
}
