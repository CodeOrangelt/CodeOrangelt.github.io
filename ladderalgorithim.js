// ELO rating calculation function
function calculateElo(winnerRating, loserRating, kFactor = 32) {
    const expectedScoreWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
    const expectedScoreLoser = 1 / (1 + Math.pow(10, (winnerRating - loserRating) / 400));

    const newWinnerRating = winnerRating + kFactor * (1 - expectedScoreWinner);
    const newLoserRating = loserRating + kFactor * (0 - expectedScoreLoser);

    return {
        newWinnerRating: Math.round(newWinnerRating),
        newLoserRating: Math.round(newLoserRating)
    };
}

// Function to update ELO ratings after a match
function updateEloRatings(winnerId, loserId) {
    const playersRef = db.collection('players');

    // Get the current ratings of the winner and loser
    Promise.all([
        playersRef.doc(winnerId).get(),
        playersRef.doc(loserId).get()
    ]).then(([winnerDoc, loserDoc]) => {
        if (winnerDoc.exists && loserDoc.exists) {
            const winnerData = winnerDoc.data();
            const loserData = loserDoc.data();

            const winnerRating = winnerData.eloRating || 1200; // Default ELO rating is 1200
            const loserRating = loserData.eloRating || 1200;

            // Calculate new ELO ratings
            const { newWinnerRating, newLoserRating } = calculateElo(winnerRating, loserRating);

            // Update the ratings in the database
            playersRef.doc(winnerId).update({ eloRating: newWinnerRating });
            playersRef.doc(loserId).update({ eloRating: newLoserRating });

            console.log(`Updated ELO ratings: Winner (${winnerId}) - ${newWinnerRating}, Loser (${loserId}) - ${newLoserRating}`);
        } else {
            console.error('One or both players not found in the database.');
        }
    }).catch(error => {
        console.error('Error updating ELO ratings:', error);
    });
}

// Example usage: Call this function when a match is reported
// updateEloRatings('winnerPlayerId', 'loserPlayerId');