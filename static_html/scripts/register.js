async function register() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const data = {
        username,
        password
    };

    try {
        const response = await fetch('http://localhost:3000/register', {
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
            localStorage.setItem('auth_token', result.auth_token);

            // Redirect or perform other actions based on successful register
            window.location.href = 'http://localhost:8080/pages/login.html';
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
