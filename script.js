let gameState = {
    points: 1300, energy: 15, maxEnergy: 15, week: 12, 
    stable: [], marketFighters: [], 
    matches: [], // This serves as your Fight History Log
    upgrades: { medical: false, energyHub: false, scout: false },
    gymXP: 0, gymLevel: 2, gymName: "The Cage Gym", 
    coachingBonus: 0, specialization: null, gymLogo: null
};

const divisions = ["Lightweight", "Middleweight", "Heavyweight"];
const traits = [
    { name: "Iron Chin", effect: "injury_resist", desc: "Lower injury risk" },
    { name: "Fast Learner", effect: "xp_boost", desc: "Gains stats faster" },
    { name: "Fan Favorite", effect: "cash_boost", desc: "Double fight income" },
    { name: "KO Artist", effect: "win_boost", desc: "Clash win bonus" }
];

const rivalGyms = [
    { name: "Iron Grip Dojo", coach: "Coach Stone", insult: "Time for a lesson." },
    { name: "Apex MMA", coach: "Manager Viper", insult: "My roster is superior." },
    { name: "Neon Strike", coach: "Sifu Rez", insult: "Probability of your win: 0%." }
];

let tourneySelection = [];
let currentDiff = { label: "Amateur", mult: 1, bonus: 0 };

// --- CORE ENGINE ---

function processWeekReset() {
    // Check if it's Week 12 for the Gym Clash
    if (gameState.week % 12 === 0 && gameState.week !== 0) {
        showView('tournament');
        prepareTournament();
        return;
    }
    
    gameState.week++;
    gameState.energy = gameState.upgrades.energyHub ? 25 : 15;
    
    gameState.stable.forEach(f => {
        if (f.recoveryWeeks > 0) {
            f.recoveryWeeks--;
            if (f.recoveryWeeks === 0) f.status = "Healthy";
        }
    });
    
    generateMarketFighters();
    updateUI();
    saveData();
}

// --- FIGHT SYSTEMS ---

function simulateFight(idx) {
    const f = gameState.stable[idx];
    
    if (gameState.energy < 1) {
        alert("Out of Energy! Advance the week to recover.");
        return;
    }

    gameState.energy--;
    
    // Win Logic
    const playerPower = (f.striking + f.grappling) / 2;
    const opponentPower = 35 + (gameState.week * 0.5) + (Math.random() * 30);
    const win = playerPower > opponentPower;

    // Rewards
    let prize = win ? 250 : 75;
    if (f.trait && f.trait.effect === "cash_boost") prize *= 2;
    
    gameState.points += prize;
    gameState.gymXP += win ? 100 : 30;

    // Update Fighter Status
    f.status = "Fatigued";
    f.recoveryWeeks = 1;
    if (win) f.wins++; else f.losses++;

    // Add to History Log
    const logEntry = {
        week: gameState.week,
        fighter: f.name,
        result: win ? "WIN" : "LOSS",
        earnings: prize,
        type: "Gym Bout"
    };
    gameState.matches.unshift(logEntry); // Add to start of array
    if (gameState.matches.length > 10) gameState.matches.pop(); // Keep last 10

    updateUI();
    renderStable();
    renderFightLog();
    saveData();
}

// --- UI RENDERING ---

function renderFightLog() {
    const logContainer = document.getElementById('news-feed');
    if (!logContainer) return;

    if (gameState.matches.length === 0) {
        logContainer.innerHTML = "No recent fights. Go to the Stable to start a bout.";
        return;
    }

    let logHTML = "<h4 style='margin: 10px 0 5px 0; color: #f59e0b;'>RECENT FIGHTS</h4>";
    logHTML += "<div style='max-height: 150px; overflow-y: auto; font-size: 0.75rem;'>";
    
    gameState.matches.forEach(m => {
        const color = m.result === "WIN" ? "#4ade80" : "#f87171";
        logHTML += `<div style="border-bottom: 1px solid #334155; padding: 4px 0;">
            Week ${m.week}: <b>${m.fighter}</b> <span style="color: ${color}">${m.result}</span> (+💰${m.earnings})
        </div>`;
    });
    
    logHTML += "</div>";
    logContainer.innerHTML = logHTML;
}

function renderStable() {
    const list = document.getElementById('stable-list');
    if (gameState.stable.length === 0) {
        list.innerHTML = "<h3>Stable is empty. Recruit someone!</h3>";
        return;
    }

    list.innerHTML = gameState.stable.map((f, i) => `
        <div class="action-card">
            <h3>${f.emoji} ${f.name}</h3>
            <p style="font-size: 0.8rem; color: #94a3b8;">${f.division} | Rec: ${f.wins}-${f.losses}</p>
            <p>Status: <b style="color: ${f.status === 'Healthy' ? '#4ade80' : '#f87171'}">${f.status}</b></p>
            
            <button onclick="simulateFight(${i})" ${f.status !== 'Healthy' ? 'disabled' : ''}>
                ${f.status === 'Healthy' ? 'FIGHT NOW (-1 ⚡)' : 'RECOVERING...'}
            </button>
            
            <button onclick="sellFighter(${i})" class="btn-secondary" style="font-size: 0.7rem;">SELL</button>
        </div>
    `).join('');
}

// --- TOURNAMENT (WEEK 12) ---

function prepareTournament() {
    tourneySelection = [];
    const rival = rivalGyms[Math.floor(Math.random() * rivalGyms.length)];
    const statusDiv = document.getElementById('tourney-status');
    
    statusDiv.innerHTML = `
        <div class="action-card" style="border: 2px solid #ef4444;">
            <h3>CLASH VS ${rival.name}</h3>
            <p><i>"${rival.insult}"</i></p>
        </div>
        <p>Select 6 fighters to enter the cage.</p>
    `;
    renderTourneyRoster();
}

// --- HELPERS ---

function updateUI() {
    document.getElementById('points-val').innerText = gameState.points.toLocaleString();
    document.getElementById('energy-val').innerText = `${gameState.energy}/${gameState.maxEnergy}`;
    document.getElementById('week-val').innerText = gameState.week;
    document.getElementById('gym-level-val').innerText = gameState.gymLevel;
    
    const xpNeeded = gameState.gymLevel * 600;
    document.getElementById('xp-bar').style.width = Math.min(100, (gameState.gymXP / xpNeeded) * 100) + "%";
    
    renderFightLog(); // Keep the home log updated
}

function showView(v) {
    document.querySelectorAll('.view').forEach(view => view.style.display = 'none');
    document.getElementById('view-'+v).style.display = 'block';
    if (v === 'stable') renderStable();
}

function saveData() { localStorage.setItem('theCageSave', JSON.stringify(gameState)); }

window.onload = () => {
    const saved = localStorage.getItem('theCageSave');
    if (saved) {
        gameState = {...gameState, ...JSON.parse(saved)};
    }
    updateUI();
};
