let gameState = {
    points: 1300, energy: 15, week: 1, 
    stable: [], matches: [], trophies: 0,
    gymLogo: null
};

// --- IMAGE UPLOAD ---
function handleLogoUpload(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            gameState.gymLogo = e.target.result;
            updateLogoDisplay();
            saveData();
        };
        reader.readAsDataURL(file);
    }
}

function updateLogoDisplay() {
    const img = document.getElementById('gym-logo-img');
    const placeholder = document.getElementById('pic-placeholder');
    if (gameState.gymLogo && img) {
        img.src = gameState.gymLogo;
        img.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
    }
}

// --- FIGHT SYSTEM ---
function simulateFight(idx) {
    const f = gameState.stable[idx];
    if (gameState.energy < 1) return alert("Out of Energy! Advance the week.");

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

// --- CLASH & WEEK SYSTEM ---
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

let tourneySelection = [];
function triggerClash(type) {
    window.currentClashType = type;
    showView('tournament');
    document.getElementById('tourney-status').innerHTML = `
        <h2 style="color:#fbbf24">${type} CLASH</h2>
        <p>Select fighters for the event. Majority wins takes the prize!</p>`;
    tourneySelection = [];
    renderTourneyRoster();
}

function renderTourneyRoster() {
    const list = document.getElementById('tourney-roster');
    const startBtn = document.getElementById('start-clash-btn');
    startBtn.style.display = tourneySelection.length > 0 ? 'block' : 'none';

    list.innerHTML = gameState.stable.map((f, i) => `
        <div class="action-card">
            <b>${f.name}</b>
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
        if ((f.striking + f.grappling)/2 > (45 + Math.random() * 35)) wins++;
        f.status = "Fatigued"; f.recoveryWeeks = 2;
    });

    const gymWin = wins > (tourneySelection.length / 2);
    if (gymWin) {
        let reward = type === "ELITE" ? 5000 : 1500;
        gameState.points += reward;
        if (type === "ELITE") gameState.trophies++;
        alert(`VICTORY! The gym earned 💰${reward}`);
    } else {
        alert("CLASH DEFEAT! Better luck next season.");
    }

    gameState.week = type === "ELITE" ? 1 : gameState.week + 1;
    showView('dashboard');
    updateUI();
    saveData();
}

// --- UTILS ---
function createFighter() {
    const nameVal = document.getElementById('new-fighter-name').value;
    if (gameState.points < 500) return alert("Need 💰500");
    
    gameState.stable.push({
        name: nameVal || "Recruit",
        striking: 45, grappling: 45, wins: 0, losses: 0,
        status: "Healthy", recoveryWeeks: 0, emoji: "🥊"
    });
    
    gameState.points -= 500;
    document.getElementById('new-fighter-name').value = "";
    showView('stable');
    updateUI();
}

function showView(v) {
    document.querySelectorAll('.view').forEach(view => view.style.display = 'none');
    document.getElementById('view-' + v).style.display = 'block';
    if (v === 'stable') renderStable();
}

function updateUI() {
    document.getElementById('points-val').innerText = gameState.points;
    document.getElementById('energy-val').innerText = `${gameState.energy}/15`;
    document.getElementById('week-val').innerText = gameState.week;
    
    const feed = document.getElementById('news-feed');
    if (gameState.matches.length > 0) {
        feed.innerHTML = gameState.matches.slice(0, 4).map(m => 
            `<div class="log-entry">Wk ${m.week}: <b>${m.fighter}</b> - ${m.result} (+💰${m.earnings})</div>`
        ).join('');
    }

    if (gameState.trophies > 0) {
        document.getElementById('trophy-count').innerText = `🏆 x${gameState.trophies}`;
    }
}

function renderStable() {
    const list = document.getElementById('stable-list');
    if (gameState.stable.length === 0) {
        list.innerHTML = "<p>No fighters in stable.</p>";
        return;
    }
    list.innerHTML = gameState.stable.map((f, i) => `
        <div class="action-card">
            <h3>${f.emoji} ${f.name}</h3>
            <p>Rec: ${f.wins}-${f.losses}</p>
            <p>Status: <b style="color:${f.status === 'Healthy' ? '#10b981' : '#ef4444'}">${f.status}</b></p>
            <button onclick="simulateFight(${i})" ${f.status !== 'Healthy' ? 'disabled' : ''}>FIGHT NOW</button>
        </div>
    `).join('');
}

function saveData() { localStorage.setItem('theCageSave', JSON.stringify(gameState)); }

window.onload = () => {
    const saved = localStorage.getItem('theCageSave');
    if (saved) {
        gameState = Object.assign(gameState, JSON.parse(saved));
        updateLogoDisplay();
    }
    updateUI();
};
