// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyDMF-bq4tpLoZvUYep_G-igmHbK2h-e-Zs",
    authDomain: "rdladder.firebaseapp.com",
    projectId: "rdladder",
    storageBucket: "rdladder.firebasestorage.app",
    messagingSenderId: "152922774046",
    appId: "1:152922774046:web:c14bd25f07ad1aa0366c0f",
    measurementId: "G-MXVPNC0TVJ"
  };

firebase.initializeApp(firebaseConfig);

// Initialize Firebase Authentication
const auth = firebase.auth();
const db = firebase.firestore();

// Register Form Submission
document.getElementById('register-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const registerErrorDiv = document.getElementById('register-error');

    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            const user = userCredential.user;
            console.log("User registered:", user);
            return db.collection('players').doc(user.uid).set({
                username: username,
                email: email,
                points: 0
            });
        })
        .then(() => {
            console.log("User data saved to Firestore");
            alert('Registration successful! You can now log in.');
            document.getElementById('register-form').reset();
        })
        .catch(error => {
            console.error("Error registering user:", error);
            registerErrorDiv.innerHTML = error.message;
        });
});

// Login Form Submission
document.getElementById('login-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const loginErrorDiv = document.getElementById('login-error');

    console.log("Attempting login with email:", email);  // Debugging log

    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            console.log("Login successful for email:", email);  // Debugging log
            alert('Login successful!');
            window.location.href = 'index.html';
        })
        .catch(error => {
            console.error("Error logging in user:", error);
            loginErrorDiv.innerHTML = error.message;
        });
});