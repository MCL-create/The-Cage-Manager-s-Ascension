let gameState = {
    points: 1300, energy: 15, maxEnergy: 15, week: 1, 
    stable: [], marketFighters: [], matches: [], trophies: 0,
    upgrades: { medical: false, energyHub: false, scout: false },
    gymXP: 0, gymLevel: 1, gymName: "The Cage Gym", 
    coachingBonus: 0, specialization: null, gymLogo: null
};

// --- CORE CYCLE ---

function processWeekReset() {
    // End of Year (Week 48) = ELITE CLASH
    if (gameState.week === 48) {
        triggerClash("ELITE");
        return;
    }
    // Mid-Season (Week 24) = GYM CLASH
    if (gameState.week === 24) {
        triggerClash("GYM");
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

// --- FIGHTING SYSTEM ---

function simulateFight(idx) {
    const f = gameState.stable[idx];
    if (gameState.energy < 1) return alert("Out of Energy! Advance the week.");

    gameState.energy--;
    const win = ((f.striking + f.grappling) / 2) > (35 + (gameState.week * 0.4) + Math.random() * 30);
    
    let prize = win ? 250 : 75;
    gameState.points += prize;
    gameState.gymXP += win ? 100 : 30;

    f.status = "Fatigued";
    f.recoveryWeeks = 1;
    if (win) f.wins++; else f.losses++;

    gameState.matches.unshift({ week: gameState.week, fighter: f.name, result: win ? "WIN" : "LOSS", earnings: prize });
    
    updateUI();
    renderStable();
    saveData();
}

// --- CLASH SYSTEM ---

function triggerClash(type) {
    showView('tournament');
    const rival = rivalGyms[Math.floor(Math.random() * rivalGyms.length)];
    const isElite = type === "ELITE";
    
    document.getElementById('tourney-status').innerHTML = `
        <div class="action-card" style="border: 2px solid ${isElite ? '#f59e0b' : '#ef4444'};">
            <h2 style="color:${isElite ? '#f59e0b' : 'white'}">${type} CLASH</h2>
            <p>Coach Stone: "Time for a lesson."</p>
        </div>
    `;
    
    // Pass the type to the run function
    window.currentClashType = type;
    renderTourneyRoster();
}

function runGymClash() {
    let wins = 0;
    const type = window.currentClashType;
    const isElite = type === "ELITE";

    tourneySelection.forEach(idx => {
        const f = gameState.stable[idx];
        const difficulty = isElite ? 1.5 : 1.0;
        const rivalPower = (45 + (gameState.gymLevel * 5)) * difficulty;
        if ((f.striking + f.grappling)/2 > (rivalPower + Math.random()*20)) wins++;
        f.status = "Fatigued"; f.recoveryWeeks = 2;
    });

    const gymWin = wins > (tourneySelection.length / 2);
    let reward = isElite ? 5000 : 1500;
    
    if (gymWin) {
        gameState.points += reward;
        if (isElite) {
            gameState.trophies++;
            alert(`🏆 ELITE CHAMPIONS! Earned 💰${reward} and a Trophy!`);
        } else {
            alert(`✅ GYM CLASH VICTORY! Earned 💰${reward}`);
        }
    } else {
        alert("❌ Clash Defeat. Your gym needs more training.");
    }

    gameState.week = isElite ? 1 : gameState.week + 1; // Reset year if Elite
    showView('dashboard');
    updateUI();
    saveData();
}

// --- UI UPDATES ---

function renderStable() {
    const list = document.getElementById('stable-list');
    list.innerHTML = gameState.stable.map((f, i) => `
        <div class="action-card">
            <h3>${f.emoji} ${f.name}</h3>
            <p style="font-size:0.75rem; color:#94a3b8;">${f.division} | Rec: ${f.wins}-${f.losses}</p>
            <button onclick="simulateFight(${i})" ${f.status !== 'Healthy' ? 'disabled' : ''}>
                ${f.status === 'Healthy' ? 'FIGHT NOW (-1 ⚡)' : 'RECOVERING'}
            </button>
            <button onclick="sellFighter(${i})" class="btn-secondary">SELL</button>
        </div>
    `).join('');
}

function updateUI() {
    document.getElementById('points-val').innerText = gameState.points.toLocaleString();
    document.getElementById('energy-val').innerText = `${gameState.energy}/${gameState.maxEnergy}`;
    document.getElementById('week-val').innerText = gameState.week;
    
    // Display trophies on dashboard
    const trophyDisplay = document.getElementById('gym-name-display');
    if (gameState.trophies > 0) {
        trophyDisplay.innerHTML = `${gameState.gymName} 🏆x${gameState.trophies}`;
    }
}
