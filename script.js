// Initial State
let gameState = {
    points: 1300, energy: 15, week: 12, 
    stable: [], matches: [], trophies: 0,
    gymName: "The Cage Gym", gymLogo: null
};

// --- IMAGE UPLOAD FIX ---
function handleLogoUpload(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = e.target.result;
            gameState.gymLogo = data;
            
            const img = document.getElementById('gym-logo-img');
            const placeholder = document.getElementById('pic-placeholder');
            
            if (img) {
                img.src = data;
                img.style.display = 'block';
                if (placeholder) placeholder.style.display = 'none';
            }
            saveData();
        };
        reader.readAsDataURL(file);
    }
}

// --- FIGHT SYSTEM ---
function simulateFight(idx) {
    const f = gameState.stable[idx];
    if (gameState.energy < 1) return alert("Out of Energy!");

    gameState.energy--;
    // Simple win logic: 50/50 chance for testing
    const win = Math.random() > 0.5;
    
    let prize = win ? 250 : 75;
    gameState.points += prize;
    f.status = "Fatigued";
    f.recoveryWeeks = 1;
    
    // Log the fight
    gameState.matches.unshift({ 
        week: gameState.week, 
        fighter: f.name, 
        result: win ? "WIN" : "LOSS" 
    });

    updateUI();
    renderStable();
    saveData();
}

// --- CORE UI UPDATES ---
function updateUI() {
    // Update top bar stats
    const pVal = document.getElementById('points-val');
    const wVal = document.getElementById('week-val');
    const eVal = document.getElementById('energy-val');

    if (pVal) pVal.innerText = gameState.points;
    if (wVal) wVal.innerText = gameState.week;
    if (eVal) eVal.innerText = gameState.energy + "/15";

    // Update News Feed
    const feed = document.getElementById('news-feed');
    if (feed && gameState.matches.length > 0) {
        feed.innerHTML = gameState.matches.slice(0, 3).map(m => 
            `<div>Wk ${m.week}: ${m.fighter} ${m.result}</div>`
        ).join('');
    }
}

function renderStable() {
    const list = document.getElementById('stable-list');
    if (!list) return;

    list.innerHTML = gameState.stable.map((f, i) => `
        <div class="action-card">
            <h3>${f.name}</h3>
            <p>Status: ${f.status}</p>
            <button onclick="simulateFight(${i})" ${f.status !== 'Healthy' ? 'disabled' : ''}>
                FIGHT NOW
            </button>
        </div>
    `).join('');
}

// --- DATA PERSISTENCE ---
function saveData() {
    localStorage.setItem('theCageSave', JSON.stringify(gameState));
}

function loadData() {
    const saved = localStorage.getItem('theCageSave');
    if (saved) {
        const parsed = JSON.parse(saved);
        gameState = Object.assign(gameState, parsed);
        
        // Re-apply logo if it exists
        if (gameState.gymLogo) {
            const img = document.getElementById('gym-logo-img');
            if (img) {
                img.src = gameState.gymLogo;
                img.style.display = 'block';
                const placeholder = document.getElementById('pic-placeholder');
                if (placeholder) placeholder.style.display = 'none';
            }
        }
    }
    updateUI();
}

// Initialize
window.onload = loadData;
