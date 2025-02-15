document.addEventListener('DOMContentLoaded', () => {
    // Initialize Firebase (make sure firebase-config.js is included and configured properly)
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            const loserUsername = document.getElementById('loser-username');
            loserUsername.textContent = user.displayName || user.email; // Use display name if available, otherwise use email

            // Show the report form
            document.getElementById('report-form').style.display = 'block';

            // Fetch and populate the winner dropdown with player list from Firestore
            populateWinnerDropdown();

            // Check for outstanding reports for the current user
            checkForOutstandingReports(user.displayName || user.email);
        } else {
            // No user is signed in, show the authentication warning
            document.getElementById('auth-warning').style.display = 'block';
        }
    });

    // Get form elements
    const reportForm = document.getElementById('report-form');
    const winnerUsername = document.getElementById('winner-username');
    const finalScore = document.getElementById('final-score');
    const suicides = document.getElementById('suicides');
    const mapPlayed = document.getElementById('map-played');
    const loserComment = document.getElementById('loser-comment');

    // Listen for the form submission
    reportForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Prevent form from submitting the default way

        // Get the values from the form inputs
        const reportData = {
            loserUsername: document.getElementById('loser-username').textContent,
            winnerUsername: winnerUsername.value,
            finalScore: finalScore.value,
            suicides: suicides.value,
            mapPlayed: mapPlayed.value,
            loserComment: loserComment.value,
            approved: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Log the form data to the console (for debugging purposes)
        console.log('Report Data:', reportData);

        // Send the reportData to your Firebase Firestore
        db.collection('reports').add(reportData)
            .then(() => {
                console.log('Report successfully added to Firestore.');
                reportForm.reset(); // Reset form fields after submission
                alert('Game reported successfully.');
            })
            .catch((error) => {
                console.error('Error adding report to Firestore: ', error);
                document.getElementById('report-error').textContent = 'Error reporting game. Please try again.';
            });
    });

    // Function to populate the winner dropdown with player list from Firestore
    function populateWinnerDropdown() {
        db.collection('players').get().then(querySnapshot => {
            querySnapshot.forEach(doc => {
                const player = doc.data();
                const option = document.createElement('option');
                option.value = player.username; // Adjust according to your data structure
                option.textContent = player.username;
                winnerUsername.appendChild(option);
            });
        }).catch(error => {
            console.error('Error fetching players: ', error);
        });
    }

    // Function to check for outstanding reports for the current user
    function checkForOutstandingReports(username) {
        const confirmationNotification = document.createElement('div');
        confirmationNotification.id = 'confirmation-notification';
        confirmationNotification.style.display = 'none';
        confirmationNotification.style.marginTop = '10px';
        document.querySelector('.container').appendChild(confirmationNotification);

        db.collection('reports')
            .where('winnerUsername', '==', username)
            .where('approved', '==', false)
            .get()
            .then(snapshot => {
                if (!snapshot.empty) {
                    confirmationNotification.style.display = 'block'; // Show the notification button
                    confirmationNotification.innerHTML = `<button id="confirm-report-button" class="btn">You have reports to confirm</button>`;
                    console.log('Outstanding reports found');

                    // Add click event to the button
                    document.getElementById('confirm-report-button').addEventListener('click', () => {
                        alert('Please check your outstanding reports.');
                    });
                }
            })
            .catch(error => {
                console.error('Error checking for outstanding reports:', error);
            });
    }
});
