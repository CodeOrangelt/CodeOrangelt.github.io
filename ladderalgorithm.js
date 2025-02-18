import { 
    collection,
    doc, 
    getDoc, 
    getDocs,
    updateDoc, 
    setDoc, 
    deleteDoc,
    writeBatch,
    query,
    where,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db, auth } from './firebase-config.js';
import { recordEloChange } from './elo-history.js';
import { PromotionHandler } from './promotion-handler.js';
import { isAdmin } from './admin-check.js';

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

export async function approveReport(reportId, winnerScore, winnerSuicides, winnerComment) {
    try {
        const pendingMatchRef = doc(db, 'pendingMatches', reportId);
        const reportSnapshot = await getDoc(pendingMatchRef);
        
        if (reportSnapshot.exists()) {
            const reportData = reportSnapshot.data();
            const currentUser = auth.currentUser;

            if (!currentUser) {
                throw new Error('You must be logged in to report matches');
            }

            // Updated participant check to use player usernames
            const userDoc = await getDoc(doc(db, 'players', currentUser.uid));
            const currentUsername = userDoc.exists() ? userDoc.data().username : null;

            const isParticipant = currentUsername === reportData.winnerUsername || 
                                 currentUsername === reportData.loserUsername;
            const userIsAdmin = isAdmin(currentUser.email);

            if (!isParticipant && !userIsAdmin) {
                throw new Error('Only match participants or admins can modify match reports');
            }

            // Get both players' data
            const playersRef = collection(db, 'players');
            const winnerQuery = query(playersRef, where('username', '==', reportData.winnerUsername));
            const loserQuery = query(playersRef, where('username', '==', reportData.loserUsername));
            
            const [winnerDocs, loserDocs] = await Promise.all([
                getDocs(winnerQuery),
                getDocs(loserQuery)
            ]);

            const winnerDoc = winnerDocs.docs[0];
            const loserDoc = loserDocs.docs[0];

            // Get current ELO and positions
            const winnerCurrentElo = winnerDoc.data().eloRating || 1200;
            const loserCurrentElo = loserDoc.data().eloRating || 1200;
            const winnerPosition = winnerDoc.data().position || Number.MAX_SAFE_INTEGER;
            const loserPosition = loserDoc.data().position || 1;

            // Calculate new ELO ratings
            const { newWinnerRating, newLoserRating } = calculateElo(winnerCurrentElo, loserCurrentElo);

            // Start batch update
            const batch = writeBatch(db);

            // Update ELO ratings immediately
            batch.update(winnerDoc.ref, {
                eloRating: newWinnerRating
            });

            batch.update(loserDoc.ref, {
                eloRating: newLoserRating
            });

            // Record ELO changes in history
            await Promise.all([
                recordEloChange(
                    reportData.winnerUsername,
                    winnerCurrentElo,
                    newWinnerRating,
                    reportData.loserUsername,
                    'win'
                ),
                recordEloChange(
                    reportData.loserUsername,
                    loserCurrentElo,
                    newLoserRating,
                    reportData.winnerUsername,
                    'loss'
                )
            ]);

            // Update the pending match status
            await updateDoc(pendingMatchRef, {
                winnerScore: winnerScore,
                winnerSuicides: winnerSuicides,
                winnerComment: winnerComment,
                reportedBy: currentUser.email,
                reportedAt: serverTimestamp(),
                approved: userIsAdmin ? true : false,
                pendingApproval: !userIsAdmin,
                winnerOldElo: winnerCurrentElo,
                winnerNewElo: newWinnerRating,
                loserOldElo: loserCurrentElo,
                loserNewElo: newLoserRating
            });

            // Only update positions if admin is approving
            if (userIsAdmin) {
                // Update positions
                batch.update(winnerDoc.ref, {
                    position: Math.min(winnerPosition, loserPosition)
                });
                batch.update(loserDoc.ref, {
                    position: Math.max(winnerPosition, loserPosition)
                });

                // Update positions for players between
                const playersToUpdate = query(
                    playersRef,
                    where('position', '>', Math.min(winnerPosition, loserPosition)),
                    where('position', '<', Math.max(winnerPosition, loserPosition))
                );

                const playersBetween = await getDocs(playersToUpdate);
                playersBetween.forEach(playerDoc => {
                    const currentPosition = playerDoc.data().position;
                    if (currentPosition) {
                        batch.update(playerDoc.ref, {
                            position: currentPosition + 1
                        });
                    }
                });

                // Move to approved matches
                const approvedMatchRef = doc(db, 'approvedMatches', reportId);
                await setDoc(approvedMatchRef, {
                    ...reportData,
                    approvedAt: serverTimestamp()
                });
                
                await deleteDoc(pendingMatchRef);
            }

            // Commit all updates
            await batch.commit();

            // Check for promotions after ELO updates
            await Promise.all([
                PromotionHandler.checkPromotion(winnerDoc.id, newWinnerRating, winnerCurrentElo),
                PromotionHandler.checkPromotion(loserDoc.id, newLoserRating, loserCurrentElo)
            ]);

            return true;
        }
    } catch (error) {
        console.error('Error in approveReport:', error);
        throw error;
    }
}

async function updatePlayerElo(userId, oldElo, newElo) {
    // Update player's ELO in database
    await setDoc(doc(db, 'players', userId), {
        ...playerData,
        eloRating: newElo
    });

    // Check for promotion
    await PromotionHandler.checkPromotion(userId, newElo, oldElo);
}