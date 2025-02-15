document.addEventListener('DOMContentLoaded', () => {
    let confirmationNotification; // Declare it here
    let outstandingReportData = null; // Store outstanding report data

    firebase.auth().onAuthStateChanged(user => {
        const authWarning = document.getElementById('auth-warning');
        if (user) {
            console.log('User signed in:', user.email || user.displayName);
            if (authWarning) {
                authWarning.style.display = 'none'; // Hide the warning
            }

            const loserUsername = document.getElementById('loser-username');
            loserUsername.textContent = user.displayName || user.email;

            document.getElementById('report-form').style.display = 'block';
            populateWinnerDropdown(); // Move this line up
            checkForOutstandingReports(user.email || user.displayName);
        } else {
            console.log('No user signed in');
            if (authWarning) {
                authWarning.style.display = 'block'; // Show the warning
            }
            document.getElementById('report-form').style.display = 'none';
        }
    });

    const reportForm = document.getElementById('report-form');
    const winnerUsername = document.getElementById('winner-username');
    const loserScore = document.getElementById('loser-score');
    const suicides = document.getElementById('suicides');
    const mapPlayed = document.getElementById('map-played');
    const loserComment = document.getElementById('loser-comment');

    reportForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const matchId = db.collection('pendingMatches').doc().id;

        console.log("Winner Username Value:", winnerUsername.value); // ADD THIS LINE

        const reportData = {
            matchId: matchId,
            loserUsername: document.getElementById('loser-username').textContent,
            winnerUsername: winnerUsername.value,
            loserScore: loserScore.value,
            suicides: suicides.value,
            mapPlayed: mapPlayed.value,
            loserComment: loserComment.value,
            approved: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        console.log("Report data being written:", reportData); // ADD THIS LINE

        db.collection('pendingMatches').doc(matchId).set(reportData)
            .then(() => {
                console.log('Report successfully added to pendingMatches.');
                console.log("Report data after write:", reportData); // ADD THIS LINE
                reportForm.reset();
                alert('Game reported successfully.');

                // Check for outstanding reports for the LOSER (logged-in user)
                checkForOutstandingReports(document.getElementById('loser-username').textContent);
            })
            .catch((error) => {
                console.error('Error adding report to Firestore:', error);
                document.getElementById('report-error').textContent = 'Error reporting game. Please try again.';
            });
    });

    function populateWinnerDropdown() {
        db.collection('players').get().then(querySnapshot => {
            querySnapshot.forEach(doc => {
                const player = doc.data();
                const option = document.createElement('option');
                option.value = player.email; // Store the email address as the value
                option.textContent = player.username; // Display the username
                winnerUsername.appendChild(option);
            });
        }).catch(error => {
            console.error('Error fetching players:', error);
        });
    }

    function checkForOutstandingReports(username) {
        console.log("Checking for outstanding reports for username:", username); // ADD THIS LINE
    
        if (!confirmationNotification) {
            confirmationNotification = document.createElement('div');
            confirmationNotification.id = 'confirmation-notification';
            confirmationNotification.classList.add('notification-banner');
            confirmationNotification.style.display = 'none';
            confirmationNotification.style.marginTop = '10px';
            document.querySelector('.container').prepend(confirmationNotification);
        }
    
        db.collection('pendingMatches')
            .where('winnerUsername', '==', username)
            .where('approved', '==', false)
            .limit(1)
            .get()
            .then(snapshot => {
                console.log("Snapshot size:", snapshot.size); // ADD THIS LINE
                if (!snapshot.empty) {
                    snapshot.forEach(doc => {
                        outstandingReportData = doc.data();
                        outstandingReportData.id = doc.id;
                        console.log("Outstanding report data:", outstandingReportData); // ADD THIS LINE
                    });
    
                    confirmationNotification.style.display = 'block';
                    confirmationNotification.innerHTML = `
                        <div>
                            You have an outstanding report to confirm. <a href="#" id="auto-fill-report">Click here to review and approve</a>
                        </div>
                    `;
                    console.log('Outstanding reports found');
    
                    document.getElementById('auto-fill-report').addEventListener('click', function(e) {
                        e.preventDefault();
                        autoFillReportForm(outstandingReportData);
                    });
                } else {
                    confirmationNotification.style.display = 'none';
                    console.log('No outstanding reports found');
                    outstandingReportData = null;
                }
            })
            .catch(error => {
                console.error('Error checking for outstanding reports:', error);
            });
    }

    function autoFillReportForm(reportData) {
        console.log("Report Data in autoFillReportForm:", reportData); // ADD THIS LINE
        if (reportData) {
            // Fetch the username from the players collection
            db.collection('players')
                .where('email', '==', reportData.winnerUsername)
                .get()
                .then(querySnapshot => {
                    if (!querySnapshot.empty) {
                        // Get the username from the document
                        const winnerDoc = querySnapshot.docs[0];
                        const winnerUsername = winnerDoc.data().username;

                         db.collection('players')
                            .where('email', '==', reportData.loserUsername)
                            .get()
                            .then(loserQuerySnapshot => {
                                if (!loserQuerySnapshot.empty) {
                                    const loserDoc = loserQuerySnapshot.docs[0];
                                    const loserUsernameDisplay = loserDoc.data().username;

                                    // Populate the lightbox
                                    document.getElementById('lightbox-winner').textContent = winnerUsername;
                                    document.getElementById('lightbox-loser').textContent = loserUsernameDisplay;
                                    document.getElementById('lightbox-loser-score').textContent = reportData.loserScore;
                                    document.getElementById('lightbox-suicides').textContent = reportData.suicides;
                                    document.getElementById('lightbox-map').textContent = reportData.mapPlayed;
                                    document.getElementById('lightbox-comment').textContent = reportData.loserComment;

                                    // Show the lightbox
                                    document.getElementById('report-lightbox').style.display = 'block';

                                    // Add event listener to the Approve button
                                    const approveButton = document.getElementById('approve-button'); // Get the button element
                                    const approveReportHandler = function() { // Store the function in a variable
                                        // Get the winner's input values
                                        const winnerComment = document.getElementById('winner-comment').value;

                                        approveReport(reportData.id, winnerComment);
                                        document.getElementById('report-lightbox').style.display = 'none'; // Hide lightbox after approval
                                        approveButton.removeEventListener('click', approveReportHandler); // Remove the event listener
                                    };
                                    approveButton.addEventListener('click', approveReportHandler); // Add the event listener

                                    // Add event listener to the Cancel button
                                    document.getElementById('cancel-button').addEventListener('click', function() {
                                        document.getElementById('report-lightbox').style.display = 'none'; // Hide lightbox
                                    });
                                } else {
                                    console.error('No loser found with email:', reportData.loserUsername);
                                    alert('Error: No loser found with that email.');
                                }
                            })
                            .catch(error => {
                                console.error('Error fetching loser:', error);
                                alert('Error fetching loser. Please try again.');
                            });
                    } else {
                        console.error('No player found with email:', reportData.winnerUsername);
                        alert('Error: No player found with that email.');
                    }
                })
                .catch(error => {
                    console.error('Error fetching player:', error);
                    alert('Error fetching player. Please try again.');
                });
        }
    }

    function approveReport(reportId, winnerComment) {
        db.collection('pendingMatches').doc(reportId).update({
            approved: true,
            winnerComment: winnerComment
        })
            .then(() => {
                console.log('Report approved successfully.');
                alert('Report approved!');
                // Clean up the form
                reportForm.reset();
                winnerUsername.disabled = false;
                loserScore.disabled = false;
                suicides = false;
                mapPlayed = false;
                loserComment = false;
                document.getElementById('approve-report').remove();
                confirmationNotification.style.display = 'none';
                outstandingReportData = null;
            })
            .catch(error => {
                console.error('Error approving report:', error);
                alert('Error approving report. Please try again.');
            });
    }
});