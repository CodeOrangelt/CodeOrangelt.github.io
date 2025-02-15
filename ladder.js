document.addEventListener('DOMContentLoaded', () => {
    const ladderTableBody = document.getElementById('ladder').querySelector('tbody');

    function fetchLadder() {
        db.collection('players').orderBy('position', 'asc').get()
            .then(querySnapshot => {
                // Clear existing table rows
                ladderTableBody.innerHTML = '';

                querySnapshot.forEach(doc => {
                    const player = doc.data();
                    const row = document.createElement('tr');
                    const rankCell = document.createElement('td');
                    const usernameCell = document.createElement('td');
                    const pointsCell = document.createElement('td');

                    rankCell.textContent = player.position;
                    usernameCell.textContent = player.username;
                    pointsCell.textContent = player.eloRating;

                    row.appendChild(rankCell);
                    row.appendChild(usernameCell);
                    row.appendChild(pointsCell);
                    ladderTableBody.appendChild(row);
                });
            })
            .catch(error => {
                console.error('Error fetching ladder:', error);
            });
    }

    // Fetch the ladder initially
    fetchLadder();

    // Optionally, set up a listener to refresh the ladder when changes are made
    db.collection('players').orderBy('position', 'asc').onSnapshot(snapshot => {
        fetchLadder();
    });
});
