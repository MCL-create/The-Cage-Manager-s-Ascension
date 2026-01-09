let gameState = {
    points: 1300, energy: 15, week: 1, 
    stable: [], matches: [], trophies: 0,
    gymLogo: null
};

// --- IMAGE HANDLING ---
function handleLogoUpload(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            gameState.gymLogo = e.target.result;
            renderLogo();
            saveData();
        };
        reader.readAsDataURL(file);
    }
}

function renderLogo() {
    const img = document.getElementById('gym-logo-img');
    const placeholder = document.getElementById('pic-placeholder');
    if (gameState.gymLogo && img) {
        img.src = gameState.gymLogo;
        img.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
    }
}

// --- CORE LOGIC ---
function processWeekReset() {
    // Check for Clash Weeks
    if (gameState.week === 24) return triggerClash("GYM");
    if (gameState.week === 48) return triggerClash("ELITE");

    gameState.week++;
    gameState.energy = 15;
    
    // Recovery Logic
    gameState.stable.forEach(f => {
        if (f.recoveryWeeks > 0) {
            f.recoveryWeeks--;
            if (f.recoveryWeeks === 0) f.status = "Healthy";
        }
    });
    
    updateUI();
    saveData();
}

function updateUI() {
    document.getElementById('points-val').innerText = gameState.points;
    document.getElementById('energy-val').innerText = gameState.energy + "/15";
    document.getElementById('week-val').innerText = gameState.week;
    
    // Clash Alert Button Color
    const advBtn = document.getElementById('advance-btn');
    if (gameState.week === 24 || gameState.week === 48) {
        advBtn.classList.add('clash-ready');
        advBtn.innerText = "ENTER CLASH!";
    } else {
        advBtn.classList.remove('clash-ready');
        advBtn.innerText = "ADVANCE WEEK";
    }

    // Trophy display
    if (gameState.trophies > 0) {
        document.getElementById('trophy-count').innerText = "🏆 x" + gameState.trophies;
    }

    // History Log
    const feed = document.getElementById('news-feed');
    if (gameState.matches.length > 0) {
        feed.innerHTML = gameState.matches.slice(0, 3).map(m => 
            `<div style="border-bottom: 1px solid #1e293b; padding: 3px 0;">Wk ${m.week}: <b>${m.fighter}</b> ${m.result}</div>`
        ).join('');
    }
}

// --- FIGHTING ---
function simulateFight(idx) {
    const f = gameState.stable[idx];
    if (gameState.energy < 1) return alert("Out of Energy!");

    gameState.energy--;
    const win = Math.random() > 0.5;
    let prize = win ? 250 : 75;
    gameState.points += prize;
    
    f.status = "Fatigued";
    f.recoveryWeeks = 1;
    if (win) f.wins++; else f.losses++;

    gameState.matches.unshift({ week: gameState.week, fighter: f.name, result: win ? "WIN" : "LOSS" });
    
    renderStable();
    updateUI();
    saveData();
}

// --- CLASH SYSTEM ---
let tourneySelection = [];
function triggerClash(type) {
    window.currentClashType = type;
    showView('tournament');
    document.getElementById('tourney-status').innerHTML = `<h2 style="color:#fbbf24">${type} CLASH</h2><p>Select your squad:</p>`;
    tourneySelection = [];
    renderTourneyRoster();
}

function renderTourneyRoster() {
    const list = document.getElementById('tourney-roster');
    const btn = document.getElementById('start-clash-btn');
    btn.style.display = tourneySelection.length > 0 ? 'block' : 'none';
    list.innerHTML = gameState.stable.map((f, i) => `
        <div class="action-card">
            <b>${f.name}</b>
            <button onclick="toggleTourneyFighter(${i})">${tourneySelection.includes(i) ? 'REMOVE' : 'SELECT'}</button>
        </div>`).join('');
}

function toggleTourneyFighter(idx) {
    if (tourneySelection.includes(idx)) {
        tourneySelection = tourneySelection.filter(id => id !== idx);
    } else if (tourneySelection.length < 6) {
        tourneySelection.push(idx);
    }
    renderTourneyRoster();
}

function runGymClash() {
    const type = window.currentClashType;
    let wins = 0;
    tourneySelection.forEach(idx => {
        if (Math.random() > 0.5) wins++;
        gameState.stable[idx].status = "Fatigued";
    });

    if (wins > tourneySelection.length / 2) {
        let reward = type === "ELITE" ? 5000 : 1500;
        gameState.points += reward;
        if (type === "ELITE") gameState.trophies++;
        alert("GYM VICTORY! +💰" + reward);
    } else {
        alert("GYM DEFEAT!");
    }
    gameState.week = (type === "ELITE") ? 1 : gameState.week + 1;
    showView('dashboard');
    updateUI();
}

// --- HELPERS ---
function forceHeal() {
    gameState.energy = 15;
    gameState.stable.forEach(f => { f.status = "Healthy"; f.recoveryWeeks = 0; });
    updateUI();
    renderStable();
    alert("Gym Refreshed!");
}

function showView(v) {
    document.querySelectorAll('.view').forEach(view => view.style.display = 'none');
    document.getElementById('view-' + v).style.display = 'block';
    if (v === 'stable') renderStable();
}

function createFighter() {
    if (gameState.points < 500) return alert("Need 💰500");
    const name = document.getElementById('new-fighter-name').value || "Recruit";
    gameState.stable.push({ name, wins:0, losses:0, status: "Healthy", recoveryWeeks: 0 });
    gameState.points -= 500;
    document.getElementById('new-fighter-name').value = "";
    showView('stable');
}

function renderStable() {
    const list = document.getElementById('stable-list');
    list.innerHTML = gameState.stable.map((f, i) => `
        <div class="action-card">
            <h3>🥊 ${f.name}</h3>
            <p>Record: ${f.wins}-${f.losses}</p>
            <p>Status: <b style="color:${f.status === 'Healthy' ? '#10b981' : '#ef4444'}">${f.status}</b></p>
            <button onclick="simulateFight(${i})" ${f.status !== 'Healthy' ? 'disabled' : ''}>FIGHT NOW</button>
        </div>`).join('');
}

function saveData() { localStorage.setItem('theCageSave', JSON.stringify(gameState)); }

window.onload = () => {
    const saved = localStorage.getItem('theCageSave');
    if (saved) gameState = Object.assign(gameState, JSON.parse(saved));
    renderLogo();
    updateUI();
};
