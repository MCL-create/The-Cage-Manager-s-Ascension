let gameState = {
    points: 1000, energy: 15, maxEnergy: 15, week: 1, 
    stable: [], marketFighters: [], matches: [],
    upgrades: { medical: false, lab: false, energyHub: false },
    gymXP: 0, gymLevel: 1, gymName: "The Cage Gym", coachingBonus: 0
};

let tourneySelection = [];
const namePool = [{ n: "Viper", e: "🐍" }, { n: "Titan", e: "🦾" }, { n: "Ghost", e: "👻" }, { n: "Rex", e: "🦖" }, { n: "Shadow", e: "👤" }];
const rivalGyms = [
    { name: "Iron Grip Dojo", coach: "Coach Stone", insult: "Yoga class is over. Welcome to the cage." },
    { name: "Apex MMA", coach: "Manager Viper", insult: "I only fight gyms worth my time. Prove you are one." },
    { name: "Neon Strike", coach: "Sifu Rez", insult: "My data shows your fighters are obsolete." }
];

// --- CORE GAME LOOP ---

function processWeekReset() {
    if (gameState.week % 12 === 0 && gameState.week !== 0) {
        showView('tournament');
        prepareTournament();
        return;
    }

    gameState.week++;
    gameState.energy = gameState.upgrades.energyHub ? 25 : 15;
    gameState.maxEnergy = gameState.upgrades.energyHub ? 25 : 15;

    gameState.stable.forEach(f => {
        // Recovery Logic
        if (f.recoveryWeeks > 0) {
            f.recoveryWeeks--;
            if (f.recoveryWeeks === 0) f.status = "Healthy";
        }
        // Yearly Aging Logic
        if (gameState.week % 52 === 1 && gameState.week > 1) {
            f.age++;
            if (f.age >= 33) {
                let decline = gameState.upgrades.medical ? 1 : 3;
                f.striking = Math.max(10, f.striking - decline);
                f.grappling = Math.max(10, f.grappling - decline);
            }
        }
    });

    generateMarketFighters();
    updateUI();
    saveData();
}

// --- MARKET & RETIREMENT LOGIC ---

function sellFighter(index) {
    const f = gameState.stable[index];
    let statVal = (f.striking + f.grappling) * 10;
    let winVal = f.wins * 60;
    
    // Strategic Age Value Curve
    let ageMult = 1.0;
    if (f.age < 25) ageMult = 0.8; 
    else if (f.age <= 29) ageMult = 1.3; // PRIME
    else ageMult = Math.max(0.3, 1.0 - ((f.age - 29) * 0.15));

    let finalVal = Math.floor((statVal + winVal) * ageMult);

    if (confirm(`Sell ${f.name} to Market Bank for 💰${finalVal}?`)) {
        gameState.matches.unshift({ name: f.name, emoji: f.emoji, record: `${f.wins}-${f.losses}`, price: `Sold: 💰${finalVal}`, week: gameState.week });
        gameState.points += finalVal;
        gameState.stable.splice(index, 1);
        updateUI(); renderStable(); saveData();
    }
}

function retireToCoach(index) {
    const f = gameState.stable[index];
    if (confirm(`Retire ${f.name} as a Gym Coach?\n\nBENEFIT: Permanent +2 Stats to all FUTURE recruits.\n(Note: No payout for retirement)`)) {
        gameState.coachingBonus += 2;
        gameState.matches.unshift({ name: f.name, emoji: "🎓", record: `${f.wins}-${f.losses}`, price: "RETIRED AS COACH", week: gameState.week });
        gameState.stable.splice(index, 1);
        alert(`${f.name} is now coaching your team! Recruit bonus increased.`);
        updateUI(); renderStable(); saveData();
    }
}

// --- TOURNAMENT SYSTEM ---

function prepareTournament() {
    tourneySelection = [];
    const rival = rivalGyms[Math.floor(Math.random() * rivalGyms.length)];
    document.getElementById('tourney-week').innerText = gameState.week;
    document.getElementById('tourney-status').innerHTML = `
        <div class="action-card" style="border: 2px solid #ef4444;">
            <strong>${rival.coach} (${rival.name}):</strong><br>"${rival.insult}"
        </div>`;
    renderTourneyRoster();
}

function renderTourneyRoster() {
    const list = document.getElementById('tourney-roster');
    list.innerHTML = gameState.stable.map((f, i) => {
        const selected = tourneySelection.includes(i);
        const disabled = (f.status !== "Healthy" && !selected);
        return `
        <div class="action-card" style="opacity:${disabled ? 0.4 : 1}; border-left: 4px solid ${f.isCreated ? '#3b82f6' : '#10b981'}">
            <b>${f.name}</b> (${f.isCreated ? 'Created' : 'Bought'})<br>
            S:${f.striking} G:${f.grappling} | ${f.status}<br>
            <button onclick="toggleTourneyFighter(${i})" ${disabled ? 'disabled' : ''}>${selected ? 'Remove' : 'Select'}</button>
        </div>`;
    }).join('');
}

function toggleTourneyFighter(idx) {
    const f = gameState.stable[idx];
    if (tourneySelection.includes(idx)) {
        tourneySelection = tourneySelection.filter(id => id !== idx);
    } else {
        const createdCount = tourneySelection.filter(id => gameState.stable[id].isCreated).length;
        const boughtCount = tourneySelection.filter(id => !gameState.stable[id].isCreated).length;
        if (f.isCreated && createdCount < 3) tourneySelection.push(idx);
        else if (!f.isCreated && boughtCount < 3) tourneySelection.push(idx);
        else return alert("Selection limits: Max 3 Created and 3 Purchased.");
    }
    document.getElementById('start-clash-btn').style.display = tourneySelection.length === 6 ? 'block' : 'none';
    renderTourneyRoster();
}

function runGymClash() {
    let wins = 0;
    tourneySelection.forEach(idx => {
        const f = gameState.stable[idx];
        const difficulty = 45 + (gameState.gymLevel * 5) + (Math.random() * 20);
        if (((f.striking + f.grappling) / 2) > difficulty) wins++;
        
        // Post-Tournament Fatigue
        if (Math.random() < 0.2) { f.status = "Injured"; f.recoveryWeeks = 3; }
        else { f.status = "Fatigued"; f.recoveryWeeks = 2; }
    });

    const win = wins >= 4;
    alert(win ? `🏆 VICTORY! Your gym won ${wins}-2.` : `❌ DEFEAT. Rival gym won ${6-wins}-${wins}.`);
    gameState.points += win ? 1200 : 300;
    gameState.gymXP += win ? 1000 : 250;
    
    gameState.week++; 
    showView('dashboard'); updateUI(); saveData();
}

// --- FIGHTING & TRAINING ---

function simulateFight(idx) {
    const f = gameState.stable[idx];
    if (gameState.energy < 1) return alert("No energy left!");
    gameState.energy--;
    
    const difficulty = 35 + (gameState.week * 0.5);
    const win = ((f.striking + f.grappling) / 2) > (difficulty + Math.random() * 30);
    
    f.wins += win ? 1 : 0;
    f.losses += win ? 0 : 1;
    f.status = "Fatigued"; f.recoveryWeeks = 1;
    gameState.points += win ? 200 : 50;
    gameState.gymXP += win ? 100 : 25;
    
    checkLevelUp();
    alert(win ? "Match Won!" : "Match Lost.");
    updateUI(); renderStable(); saveData();
}

// --- MANAGEMENT UI ---

function updateUI() {
    document.getElementById('points-val').innerText = gameState.points.toLocaleString();
    document.getElementById('energy-val').innerText = `${gameState.energy}/${gameState.maxEnergy}`;
    document.getElementById('week-val').innerText = gameState.week;
    document.getElementById('gym-level-val').innerText = gameState.gymLevel;
    document.getElementById('coach-bonus-val').innerText = `+${gameState.coachingBonus}`;
    
    const created = gameState.stable.filter(f => f.isCreated).length;
    const bought = gameState.stable.filter(f => !f.isCreated).length;
    document.getElementById('created-count').innerText = created;
    document.getElementById('purchased-count').innerText = bought;
    
    const xpNeeded = gameState.gymLevel * 500;
    document.getElementById('xp-bar').style.width = Math.min(100, (gameState.gymXP / xpNeeded) * 100) + "%";
}

function renderStable() {
    const list = document.getElementById('stable-list');
    list.innerHTML = gameState.stable.map((f, i) => `
        <div class="action-card" style="opacity: ${f.status === 'Healthy' ? 1 : 0.6}">
            <h3 style="color:#f59e0b;">${f.emoji} ${f.name}</h3>
            <p style="font-size:0.7rem;">${f.status} | Age: ${f.age} | ${f.isCreated ? 'Workshop' : 'Contract'}</p>
            <p>💥 ${f.striking} | 🤼 ${f.grappling}</p>
            <button onclick="simulateFight(${i})" ${f.status !== 'Healthy' ? 'disabled' : ''}>FIGHT (⚡1)</button>
            <div style="display:flex; gap:5px; margin-top:5px;">
                <button onclick="sellFighter(${i})" style="flex:1; background:none; border:1px solid #f59e0b; color:#f59e0b; font-size:0.6rem;">SELL</button>
                ${f.age >= 35 ? `<button onclick="retireToCoach(${i})" style="flex:1; background:#8b5cf6; color:white; font-size:0.6rem;">RETIRE</button>` : ''}
            </div>
        </div>
    `).join('');
}

function createFighter() {
    if (gameState.stable.filter(f => f.isCreated).length >= 8) return alert("Workshop full (Max 8).");
    if (gameState.points < 500) return alert("Need 💰500.");
    
    const bonus = gameState.coachingBonus || 0;
    gameState.stable.push({ 
        name: document.getElementById('new-fighter-name').value || "Recruit", 
        isCreated: true, emoji: "🥊", age: 20, striking: 45 + bonus, grappling: 45 + bonus, 
        wins: 0, losses: 0, status: "Healthy", recoveryWeeks: 0 
    });
    gameState.points -= 500;
    updateUI(); showView('stable'); saveData();
}

function generateMarketFighters() {
    gameState.marketFighters = [];
    for (let i = 0; i < 3; i++) {
        const c = namePool[Math.floor(Math.random()*namePool.length)];
        gameState.marketFighters.push({ 
            name: c.n, emoji: c.e, age: 23 + i, 
            striking: 50 + gameState.gymLevel * 2, 
            grappling: 50 + gameState.gymLevel * 2, 
            cost: 650 + (gameState.gymLevel * 40) 
        });
    }
}

function buyFighter(idx) {
    const f = gameState.marketFighters[idx];
    if (gameState.stable.filter(f => !f.isCreated).length >= 7) return alert("Contract stable full (Max 7).");
    if (gameState.points < f.cost) return alert("Not enough points!");
    
    gameState.stable.push({ ...f, isCreated: false, wins: 0, losses: 0, status: "Healthy", recoveryWeeks: 0 });
    gameState.points -= f.cost;
    gameState.marketFighters.splice(idx, 1);
    updateUI(); renderMarket(); saveData();
}

// --- SYSTEM UTILS ---

function showView(v) {
    document.querySelectorAll('.view').forEach(view => view.style.display = 'none');
    document.getElementById('view-'+v).style.display = 'block';
    if (v === 'stable') renderStable();
    if (v === 'market') renderMarket();
    if (v === 'history') renderHistory();
    if (v === 'shop') renderShop();
}

function renderMarket() {
    document.getElementById('market-list').innerHTML = gameState.marketFighters.map((f, i) => `
        <div class="action-card"><h3>${f.name}</h3><p>Cost: 💰${f.cost}</p><button onclick="buyFighter(${i})">SIGN</button></div>`).join('');
}

function renderHistory() {
    document.getElementById('history-list').innerHTML = gameState.matches.map(h => `
        <div class="action-card" style="font-size:0.8rem;">
            <b>Week ${h.week}: ${h.emoji} ${h.name}</b><br>Record: ${h.record} | ${h.price}
        </div>`).join('');
}

function renderShop() {
    const items = [
        {id:'medical', n:'Medical Wing', c:1500, d:'Reduces age decline.'}, 
        {id:'energyHub', n:'Energy Hub', c:1200, d:'25 Max Energy per week.'}
    ];
    document.getElementById('shop-list').innerHTML = items.map(it => `
        <div class="action-card">
            <h3>${it.n}</h3><p style="font-size:0.6rem;">${it.d}</p>
            <button onclick="buyUpgrade('${it.id}', ${it.c})">${gameState.upgrades[it.id]?'OWNED':'BUY 💰'+it.c}</button>
        </div>`).join('');
}

function buyUpgrade(id, c) {
    if (gameState.points >= c && !gameState.upgrades[id]) {
        gameState.points -= c; gameState.upgrades[id] = true;
        updateUI(); renderShop(); saveData();
    }
}

function checkLevelUp() {
    const xpNeeded = gameState.gymLevel * 500;
    if (gameState.gymXP >= xpNeeded) {
        gameState.gymXP -= xpNeeded; gameState.gymLevel++; gameState.points += 500;
        alert(`LEVEL UP! Your gym is now Level ${gameState.gymLevel}.`);
    }
}

function saveData() { localStorage.setItem('theCageSave', JSON.stringify(gameState)); }

window.onload = () => {
    const s = localStorage.getItem('theCageSave');
    if (s) {
        const data = JSON.parse(s);
        gameState = {...gameState, ...data};
    }
    if (gameState.marketFighters.length === 0) generateMarketFighters();
    updateUI();
};

function updateGymName(n) { gameState.gymName = n; saveData(); }
function openAdminConsole() { if (prompt("Code:") === "1234") { gameState.points += 5000; updateUI(); saveData(); } }
