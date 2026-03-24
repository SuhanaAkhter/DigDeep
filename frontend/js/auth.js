// Function to handle Signup Redirects
const signupForm = document.getElementById('signupForm');

if (signupForm) {
    signupForm.addEventListener('submit', function (e) {
        e.preventDefault(); // Stops the page from refreshing

        // 1. Grab the selected role from the dropdown
        const role = document.getElementById('role').value;

        // 2. Logic to redirect based on the role
        if (role === 'coach') {
            window.location.href = "../coach/coach-dashboard.html";
        } else if (role === 'player') {
            window.location.href = "../player/player-dashboard.html";
        } else {
            // This runs if they click the arrow without picking a role
            alert("please select a role first!");
        }
    });
}

// Function to handle Login Redirects
const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        
        // For now, let's assume login goes to the player dashboard 
        // until you add actual user authentication.
        window.location.href = "player-dashboard.html";
    });
}