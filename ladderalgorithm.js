import {
    doc,
    getDoc,
    updateDoc,
    setDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from './firebase-config.js';

// ladderalgorithm.js
export function calculateElo(winnerRating, loserRating, kFactor = 32) {
    const expectedScoreWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
    const expectedScoreLoser = 1 / (1 + Math.pow(10, (winnerRating - loserRating) / 400));

    const newWinnerRating = winnerRating + kFactor * (1 - expectedScoreWinner);
    const newLoserRating = loserRating + kFactor * (0 - expectedScoreLoser);

    return {
        newWinnerRating: Math.round(newWinnerRating),
        newLoserRating: Math.round(newLoserRating)
    };
}

export function assignDefaultEloRating(playerId, playerData) {
    const defaultEloRating = 1200; // Default ELO rating
    if (!playerData.eloRating) {
        db.collection('players').doc(playerId).update({ eloRating: defaultEloRating })
            .then(() => {
                console.log(`Assigned default ELO rating to player ${playerData.username}`);
            })
            .catch(error => {
                console.error('Error assigning default ELO rating:', error);
            });
    }
}

export function updateEloRatings(winnerId, loserId) {
    const playersRef = db.collection('players');

    // Get the current ratings and positions of the winner and loser
    Promise.all([
        playersRef.doc(winnerId).get(),
        playersRef.doc(loserId).get()
    ]).then(([winnerDoc, loserDoc]) => {
        if (winnerDoc.exists && loserDoc.exists) {
            const winnerData = winnerDoc.data();
            const loserData = loserDoc.data();

            console.log(`Current winner data: ${JSON.stringify(winnerData)}`);
            console.log(`Current loser data: ${JSON.stringify(loserData)}`);

            // Assign default ELO rating if not present
            assignDefaultEloRating(winnerId, winnerData);
            assignDefaultEloRating(loserId, loserData);

            const winnerRating = winnerData.eloRating || 1200; // Default ELO rating is 1200
            const loserRating = loserData.eloRating || 1200;

            // Calculate new ELO ratings
            const { newWinnerRating, newLoserRating } = calculateElo(winnerRating, loserRating);

            console.log(`New ELO ratings: Winner (${winnerId}) - ${newWinnerRating}, Loser (${loserId}) - ${newLoserRating}`);

            // Update the ratings in the database
            playersRef.doc(winnerId).update({ eloRating: newWinnerRating })
                .then(() => {
                    console.log(`Updated winner's ELO rating to ${newWinnerRating}`);
                })
                .catch(error => {
                    console.error('Error updating winner\'s ELO rating:', error);
                });

            playersRef.doc(loserId).update({ eloRating: newLoserRating })
                .then(() => {
                    console.log(`Updated loser's ELO rating to ${newLoserRating}`);
                })
                .catch(error => {
                    console.error('Error updating loser\'s ELO rating:', error);
                });

            // Swap positions in the ladder only if the winner's position is lower (higher number) than the loser's position
            const winnerPosition = winnerData.position;
            const loserPosition = loserData.position;

            if (winnerPosition > loserPosition) {
                console.log(`Swapping positions: Winner (${winnerId}) from position ${winnerPosition} to ${loserPosition}, Loser (${loserId}) from position ${loserPosition} to ${winnerPosition}`);

                playersRef.doc(winnerId).update({ position: loserPosition })
                    .then(() => {
                        console.log(`Updated winner's position to ${loserPosition}`);
                    })
                    .catch(error => {
                        console.error('Error updating winner\'s position:', error);
                    });

                playersRef.doc(loserId).update({ position: winnerPosition })
                    .then(() => {
                        console.log(`Updated loser's position to ${winnerPosition}`);
                    })
                    .catch(error => {
                        console.error('Error updating loser\'s position:', error);
                    });

                console.log(`Swapped positions: Winner (${winnerId}) is now at position ${loserPosition}, Loser (${loserId}) is now at position ${winnerPosition}`);
            } else {
                console.log(`No position swap needed: Winner (${winnerId}) is already higher ranked than Loser (${loserId})`);
            }
        } else {
            console.error('One or both players not found in the database.');
        }
    }).catch(error => {
        console.error('Error updating ELO ratings and positions:', error);
    });
}

export function approveReport(reportId, winnerScore, winnerSuicides, winnerComment) {
    // Update to use the modular API syntax
    const pendingMatchRef = doc(db, 'pendingMatches', reportId);
    
    updateDoc(pendingMatchRef, {
        approved: true,
        winnerScore: winnerScore,
        winnerSuicides: winnerSuicides,
        winnerComment: winnerComment
    })
    .then(() => {
        console.log('Report approved successfully.');
        alert('Report approved!');
        
        // Get the report data first
        getDoc(pendingMatchRef).then(doc => {
            if (doc.exists()) {
                const reportData = doc.data();
                const approvedMatchRef = doc(db, 'approvedMatches', reportId);

                // Copy to approved matches
                setDoc(approvedMatchRef, reportData)
                    .then(() => {
                        // Delete from pending matches
                        deleteDoc(pendingMatchRef)
                            .then(() => {
                                console.log('Report processed successfully');
                                // Reset UI elements if needed
                                const reportLightbox = document.getElementById('report-lightbox');
                                if (reportLightbox) {
                                    reportLightbox.style.display = 'none';
                                }
                            });
                    });
            }
        });
    })
    .catch(error => {
        console.error('Error approving report:', error);
        alert('Error approving report. Please try again.');
    });
}

// Example usage: Call this function when a match is reported
// updateEloRatings('winnerPlayerId', 'loserPlayerId');