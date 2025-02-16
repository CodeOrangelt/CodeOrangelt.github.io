// current-user.js
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
//import { app } from './login.js'; // Import the Firebase app instance

const auth = getAuth();
const db = getFirestore();

document.addEventListener('DOMContentLoaded', () => {
    // Check if user is signed in
    onAuthStateChanged(auth, function(user) {
        const currentUserSpan = document.getElementById('current-user');
        const signOutLink = document.getElementById('sign-out');
        const loginRegisterLink = document.getElementById('login-register');

        if (user) {
            // User is signed in.
            // Fetch the username from the 'players' collection
            getDoc(firebase.firestore().collection('players').doc(user.uid)).then((doc) => {
                if (doc.exists) {
                    const username = doc.data().username;
                    currentUserSpan.textContent = username;
                } else {
                    console.log("No such document!");
                    currentUserSpan.textContent = "User"; // Default username
                }
            }).catch((error) => {
                console.log("Error getting document:", error);
                currentUserSpan.textContent = "User"; // Default username
            });

            if (currentUserSpan) {
                currentUserSpan.style.display = 'inline'; // Show the username
            }
            if (signOutLink) {
                signOutLink.style.display = 'inline'; // Show the sign-out link
            }
            if (loginRegisterLink) {
                loginRegisterLink.style.display = 'none'; // Hide login/register
            }
        } else {
            // No user is signed in.
            if (currentUserSpan) {
                currentUserSpan.textContent = '';
                currentUserSpan.style.display = 'none'; // Hide the username
            }
            if (signOutLink) {
                signOutLink.style.display = 'none'; // Hide the sign-out link
            }
            if (loginRegisterLink) {
                loginRegisterLink.style.display = 'inline-block'; // Show login/register
            }
        }
    });
});