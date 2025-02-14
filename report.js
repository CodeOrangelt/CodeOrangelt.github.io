document.addEventListener('DOMContentLoaded', () => {
    // Handle authentication state changes
    auth.onAuthStateChanged(user => {
        if (user) {
            fetchUsername(user.uid).then(username => {
                document.getElementById('loser-username').textContent = username;
                document.getElementById('loser-username-confirm').textContent = username;
                populateWinnerDropdown();
                checkForOutstandingReport(username);
            }).catch(error => {
                console.error('Error fetching username:', error);
            });
        } else {
            document.getElementById('auth-warning').style.display = 'block';
            document.getElementById('report-form').style.display = 'none';
            document.getElementById('confirm-form').style.display = 'none';
        }
    });

    // Handle report form submission
    document.getElementById('report-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const loserUsername = document.getElementById('loser-username').textContent;
        const winnerUsername = document.getElementById('winner-username').value;
        const finalScore = document.getElementById('final-score').value;
        const suicides = document.getElementById('suicides').value;
        const mapPlayed = document.getElementById('map-played').value;
        const loserComment = document.getElementById('loser-comment').value;

        db.collection('reports').add({
            loserUsername,
            winnerUsername,
            finalScore,
            suicides,
            mapPlayed,
            loserComment,
            approved: false,
        }).then(() => {
            document.getElementById('report-form').reset();
            alert('Game reported successfully.');
        }).catch(error => {
            console.error('Error reporting game:', error);
            document.getElementById('report-error').textContent = 'Error reporting game. Please try again.';
        });
    });

    // Handle confirm form submission
    document.getElementById('confirm-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const loserUsername = document.getElementById('loser-username-confirm').textContent;
        const winnerUsername = document.getElementById('winner-username-confirm').textContent;
        const finalScoreConfirm = document.getElementById('final-score-confirm').textContent;
        const suicidesConfirm = document.getElementById('suicides-confirm').textContent;
        const mapPlayedConfirm = document.getElementById('map-played-confirm').textContent;
        const loserCommentConfirm = document.getElementById('loser-comment-confirm').textContent;
        const winnerScore = document.getElementById('winner-score').value;
        const winnerSuicides = document.getElementById('winner-suicides').value;
        const winnerComment = document.getElementById('winner-comment').value;

        const query = db.collection('reports').where('loserUsername', '==', loserUsername)
                        .where('winnerUsername', '==', winnerUsername)
                        .where('approved', '==', false);

        query.get().then(snapshot => {
            if (!snapshot.empty) {
                const reportDoc = snapshot.docs[0];
                reportDoc.ref.update({
                    winnerScore,
                    winnerSuicides,
                    winnerComment,
                    approved: true,
                }).then(() => {
                    document.getElementById('confirm-form').reset();
                    alert('Game confirmed successfully.');
                }).catch(error => {
                    console.error('Error confirming game:', error);
                    document.getElementById('report-error').textContent = 'Error confirming game. Please try again.';
                });
            } else {
                alert('No matching report found to confirm.');
            }
        }).catch(error => {
            console.error('Error finding report to confirm:', error);
            document.getElementById('report-error').textContent = 'Error finding report to confirm. Please try again.';
        });
    });
});

function fetchUsername(uid) {
    return db.collection('players').doc(uid).get().then(doc => {
        if (doc.exists) {
            return doc.data().username;
        } else {
            throw new Error('No such document!');
        }
    }).catch(error => {
        console.error('Error getting document:', error);
    });
}

function populateWinnerDropdown() {
    const winnerDropdown = document.getElementById('winner-username');
    db.collection('players').get().then(querySnapshot => {
        querySnapshot.forEach(doc => {
            const username = doc.data().username;
            const option = document.createElement('option');
            option.value = username;
            option.textContent = username;
            winnerDropdown.appendChild(option);
        });
    }).catch(error => {
        console.error('Error fetching players:', error);
    });
}

function checkForOutstandingReport(username) {
    db.collection('reports')
        .where('loserUsername', '==', username)
        .where('approved', '==', false)
        .get()
        .then(querySnapshot => {
            if (!querySnapshot.empty) {
                // Outstanding report found
                document.getElementById('confirm-form').style.display = 'block';
                document.getElementById('report-form').style.display = 'none';

                const reportData = querySnapshot.docs[0].data();
                // Populate confirm form fields with report data
                document.getElementById('loser-username-confirm').textContent = reportData.loserUsername;
                document.getElementById('winner-username-confirm').textContent = reportData.winnerUsername;
                document.getElementById('final-score-confirm').textContent = reportData.finalScore;
                document.getElementById('suicides-confirm').textContent = reportData.suicides;
                document.getElementById('map-played-confirm').textContent = reportData.mapPlayed;
                document.getElementById('loser-comment-confirm').textContent = reportData.loserComment;
            } else {
                // No outstanding report, show report form
                document.getElementById('report-form').style.display = 'block';
                document.getElementById('confirm-form').style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error fetching reports: ', error);
        });
}
