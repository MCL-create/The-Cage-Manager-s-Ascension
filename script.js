let gameState = {
    points: 1300, energy: 15, maxEnergy: 15, week: 1, 
    stable: [], marketFighters: [], matches: [], trophies: 0,
    upgrades: { medical: false, energyHub: false, scout: false },
    gymXP: 0, gymLevel: 1, gymName: "The Cage Gym", 
    gymLogo: null
};

// --- IMAGE UPLOAD LOGIC ---
function handleLogoUpload(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            gameState.gymLogo = e.target.result;
            displayLogo(e.target.result);
            saveData();
        };
        reader.readAsDataURL(file);
    }
}

function displayLogo(data) {
    const img = document.getElementById('gym-logo-img');
    const placeholder = document.getElementById('pic-placeholder');
    if (data && img) {
        img.src = data;
        img.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
    }
}

// --- CORE ENGINE ---
function processWeekReset() {
    if (gameState.week === 24) return triggerClash("GYM");
    if (gameState.week === 48) return triggerClash("ELITE");

    gameState.week++;
    gameState.energy = 15;
    
    gameState.stable.forEach(f => {
        if (f.recoveryWeeks > 0) {
            f.recoveryWeeks--;
            if (f.recoveryWeeks === 0) f.status = "Healthy";
        }
    });
    
    updateUI();
    saveData();
}

function simulateFight(idx) {
    const f = gameState.stable[idx];
    if (gameState.energy < 1) return alert("Out of Energy!");

    gameState.energy--;
    const win = (f.striking + f.grappling) / 2 > (35 + Math.random() * 40);
    
    let prize = win ? 250 : 75;
    gameState.points += prize;
    f.status = "Fatigued";
    f.recoveryWeeks = 1;
    if (win) f.wins++; else f.losses++;

    gameState.matches.unshift({ week: gameState.week, fighter: f.name, result: win ? "WIN" : "LOSS", earnings: prize });
    
    renderStable();
    updateUI();
    saveData();
}

function createFighter() {
    const nameInput = document.getElementById('new-fighter-name');
    if (gameState.points < 500) return alert("Need 💰500");
    
    gameState.stable.push({
        name: nameInput.value || "Recruit",
        striking: 45, grappling: 45, wins: 0, losses: 0,
        status: "Healthy", recoveryWeeks: 0, emoji: "🥊", division: "Middleweight"
    });
    
    gameState.points -= 500;
    nameInput.value = "";
    showView('stable');
    updateUI();
    saveData();
}

// --- CLASH LOGIC ---
let tourneySelection = [];
function triggerClash(type) {
    window.currentClashType = type;
    showView('tournament');
    document.getElementById('tourney-status').innerHTML = `<h2>${type} CLASH (Week ${gameState.week})</h2><p>Select your fighters below:</p>`;
    tourneySelection = [];
    renderTourneyRoster();
}

function renderTourneyRoster() {
    const list = document.getElementById('tourney-roster');
    const startBtn = document.getElementById('start-clash-btn');
    startBtn.style.display = tourneySelection.length > 0 ? 'block' : 'none';

    list.innerHTML = gameState.stable.map((f, i) => `
        <div class="action-card">
            <b>${f.name}</b><br>
            <button onclick="toggleTourneyFighter(${i})">${tourneySelection.includes(i) ? 'REMOVE' : 'SELECT'}</button>
        </div>
    `).join('');
}

function toggleTourneyFighter(idx) {
    if (tourneySelection.includes(idx)) {
        tourneySelection = tourneySelection.filter(id => id !== idx);
    } else {
        if (tourneySelection.length < 6) tourneySelection.push(idx);
    }
    renderTourneyRoster();
}

function runGymClash() {
    const type = window.currentClashType;
    let wins = 0;
    tourneySelection.forEach(idx => {
        const f = gameState.stable[idx];
        if ((f.striking + f.grappling)/2 > (45 + Math.random() * 30)) wins++;
        f.status = "Fatigued"; f.recoveryWeeks = 2;
    });

    const gymWin = wins > (tourneySelection.length / 2);
    if (gymWin) {
        let reward = type === "ELITE" ? 5000 : 1500;
        gameState.points += reward;
        if (type === "ELITE") gameState.trophies++;
        alert(`VICTORY! +💰${reward}`);
    } else {
        alert("DEFEAT!");
    }

    gameState.week = type === "ELITE" ? 1 : gameState.week + 1;
    showView('dashboard');
    updateUI();
}

// --- UI UTILS ---
function showView(v) {
    document.querySelectorAll('.view').forEach(view => view.style.display = 'none');
    document.getElementById('view-' + v).style.display = 'block';
    if (v === 'stable') renderStable();
}

function updateUI() {
    document.getElementById('points-val').innerText = gameState.points.toLocaleString();
    document.getElementById('energy-val').innerText = `${gameState.energy}/15`;
    document.getElementById('week-val').innerText = gameState.week;
    
    const log = document.getElementById('news-feed');
    if (gameState.matches.length > 0) {
        log.innerHTML = gameState.matches.slice(0, 3).map(m => 
            `<div>Wk ${m.week}: ${m.fighter} ${m.result} (+💰${m.earnings})</div>`
        ).join('');
    }

    if (gameState.trophies > 0) {
        document.getElementById('gym-name-display').innerText = `${gameState.gymName} 🏆x${gameState.trophies}`;
    }
}

function renderStable() {
    const list = document.getElementById('stable-list');
    list.innerHTML = gameState.stable.map((f, i) => `
        <div class="action-card">
            <h3>${f.emoji} ${f.name}</h3>
            <p>Status: ${f.status}</p>
            <button onclick="simulateFight(${i})" ${f.status !== 'Healthy' ? 'disabled' : ''}>FIGHT NOW</button>
        </div>
    `).join('');
}

function saveData() { localStorage.setItem('theCageSave', JSON.stringify(gameState)); alert("Game Saved!"); }

window.onload = () => {
    const saved = localStorage.getItem('theCageSave');
    if (saved) {
        gameState = Object.assign(gameState, JSON.parse(saved));
        if (gameState.gymLogo) displayLogo(gameState.gymLogo);
    }
    updateUI();
};
