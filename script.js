let gameState = {
    points: 1000, energy: 15, maxEnergy: 15, week: 1, 
    stable: [], marketFighters: [], matches: [],
    upgrades: { medical: false, lab: false, energyHub: false },
    gymXP: 0, gymLevel: 1, gymName: "The Cage Gym"
};

let tourneySelection = [];
const namePool = [{ n: "Viper", e: "🐍" }, { n: "Titan", e: "🦾" }, { n: "Ghost", e: "👻" }, { n: "Rex", e: "🦖" }, { n: "Shadow", e: "👤" }];
const rivalGyms = [
    { name: "Iron Grip Dojo", coach: "Coach Stone", insult: "You're overmatched, rookie." },
    { name: "Apex MMA", coach: "Manager Viper", insult: "Time to show you real talent." }
];

// --- CORE ENGINE ---

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
        // Recovery
        if (f.recoveryWeeks > 0) {
            f.recoveryWeeks--;
            if (f.recoveryWeeks === 0) f.status = "Healthy";
        }
        // Yearly Aging
        if (gameState.week % 52 === 0) {
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

// --- MARKET BANK (Peak Value Logic) ---

function sellFighter(index) {
    const f = gameState.stable[index];
    let statVal = (f.striking + f.grappling) * 10;
    let winVal = f.wins * 60;
    
    // Strategic Peak: Value multiplier based on age
    let ageMult = 1.0;
    if (f.age < 25) ageMult = 0.8;          // Too young, unproven
    else if (f.age <= 29) ageMult = 1.3;    // PRIME VALUE
    else ageMult = 1.0 - ((f.age - 29) * 0.15); // Value drops 15% every year after 29

    let finalVal = Math.max(200, Math.floor((statVal + winVal) * ageMult));

    if (confirm(`Sell ${f.name} to Bank for 💰${finalVal}?\n(Current Market Status: ${f.age >= 30 ? 'Veteran - Dropping Value' : 'Prime - High Value'})`)) {
        gameState.matches.unshift({ name: f.name, emoji: f.emoji, record: `${f.wins}-${f.losses}`, price: finalVal, week: gameState.week });
        gameState.points += finalVal;
        gameState.stable.splice(index, 1);
        updateUI(); renderStable(); saveData();
    }
}

// --- TOURNAMENT (3 Created / 3 Bought) ---

function prepareTournament() {
    tourneySelection = [];
    const rival = rivalGyms[Math.floor(Math.random() * rivalGyms.length)];
    document.getElementById('tourney-week').innerText = gameState.week;
    document.getElementById('tourney-status').innerHTML = `<div class="action-card" style="border: 2px solid #ef4444;"><strong>${rival.coach} (${rival.name}):</strong> "${rival.insult}"</div><p>Select 3 Created and 3 Purchased fighters.</p>`;
    renderTourneyRoster();
}

function renderTourneyRoster() {
    const list = document.getElementById('tourney-roster');
    list.innerHTML = gameState.stable.map((f, i) => {
        const selected = tourneySelection.includes(i);
        const disabled = f.status !== "Healthy" && !selected;
        return `<div class="action-card" style="opacity:${disabled ? 0.4 : 1}; border-left: 4px solid ${f.isCreated ? '#3b82f6' : '#10b981'}">
            <b>${f.name}</b> (${f.isCreated ? 'Created' : 'Bought'})<br>
            Status: ${f.status}<br>
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
        else return alert("Slot limit reached for this fighter type!");
    }
    document.getElementById('start-clash-btn').style.display = tourneySelection.length === 6 ? 'block' : 'none';
    renderTourneyRoster();
}

function runGymClash() {
    let wins = 0;
    tourneySelection.forEach(idx => {
        const f = gameState.stable[idx];
        const difficulty = 45 + (gameState.gymLevel * 5);
        if (((f.striking + f.grappling) / 2) > (difficulty + Math.random() * 20)) wins++;
        
        // Fatigue/Injury after Clash
        if (Math.random() < 0.25) { f.status = "Injured"; f.recoveryWeeks = 3; }
        else { f.status = "Fatigued"; f.recoveryWeeks = 2; }
    });

    const isWin = wins >= 4;
    alert(isWin ? `VICTORY! ${wins}-2. +💰1200` : `DEFEAT. ${wins}-4. +💰300`);
    gameState.points += isWin ? 1200 : 300;
    gameState.gymXP += isWin ? 1000 : 250;
    
    gameState.week++; // Advance to next week immediately
    showView('dashboard'); updateUI(); saveData();
}

// --- UI & HELPERS ---

function updateUI() {
    document.getElementById('points-val').innerText = gameState.points;
    document.getElementById('energy-val').innerText = `${gameState.energy}/${gameState.maxEnergy}`;
    document.getElementById('week-val').innerText = gameState.week;
    document.getElementById('gym-level-val').innerText = gameState.gymLevel;
    
    const created = gameState.stable.filter(f => f.isCreated).length;
    const bought = gameState.stable.filter(f => !f.isCreated).length;
    document.getElementById('created-count').innerText = created;
    document.getElementById('purchased-count').innerText = bought;
    
    const xpNeeded = gameState.gymLevel * 500;
    document.getElementById('xp-bar').style.width = (gameState.gymXP / xpNeeded) * 100 + "%";
}

function renderStable() {
    const list = document.getElementById('stable-list');
    list.innerHTML = gameState.stable.map((f, i) => `
        <div class="action-card" style="opacity: ${f.status === 'Healthy' ? 1 : 0.6}">
            <h3>${f.emoji} ${f.name}</h3>
            <p>${f.status} | Age: ${f.age} | ${f.isCreated ? 'WORKSHOP' : 'CONTRACT'}</p>
            <p>S: ${f.striking} G: ${f.grappling}</p>
            <button onclick="simulateFight(${i})" ${f.status !== 'Healthy' ? 'disabled' : ''}>FIGHT (⚡1)</button>
            <button onclick="sellFighter(${i})" style="background:none; border:1px solid #f59e0b; color:#f59e0b;">SELL</button>
        </div>
    `).join('');
}

function simulateFight(idx) {
    const f = gameState.stable[idx];
    if (gameState.energy < 1) return alert("No energy!");
    gameState.energy--;
    const win = Math.random() > 0.5; // Simple fight logic
    f.wins += win ? 1 : 0;
    f.losses += win ? 0 : 1;
    f.status = "Fatigued"; f.recoveryWeeks = 1;
    gameState.points += win ? 200 : 50;
    gameState.gymXP += win ? 100 : 20;
    alert(win ? "Won!" : "Lost.");
    updateUI(); renderStable(); saveData();
}

function createFighter() {
    if (gameState.stable.filter(f => f.isCreated).length >= 8) return alert("Workshop full!");
    if (gameState.points < 500) return alert("Need 500.");
    gameState.stable.push({ name: document.getElementById('new-fighter-name').value || "Recruit", isCreated: true, emoji: "🥊", age: 20, striking: 45, grappling: 45, wins: 0, losses: 0, status: "Healthy", recoveryWeeks: 0 });
    gameState.points -= 500;
    updateUI(); showView('stable');
}

function generateMarketFighters() {
    gameState.marketFighters = [];
    for (let i = 0; i < 3; i++) {
        gameState.marketFighters.push({ name: namePool[i].n, emoji: namePool[i].e, age: 24+i, striking: 50+gameState.gymLevel*2, grappling: 50+gameState.gymLevel*2, cost: 700 });
    }
}

function buyFighter(idx) {
    const f = gameState.marketFighters[idx];
    if (gameState.stable.filter(f => !f.isCreated).length >= 7) return alert("Contract stable full!");
    gameState.stable.push({ ...f, isCreated: false, wins: 0, losses: 0, status: "Healthy", recoveryWeeks: 0 });
    gameState.points -= f.cost;
    gameState.marketFighters.splice(idx, 1);
    updateUI(); renderMarket();
}

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
        <div class="action-card"><b>${h.name}</b> | Record: ${h.record} | Sold for 💰${h.price}</div>`).join('');
}

function renderShop() {
    const items = [{id:'medical', n:'Medical Wing', c:1500}, {id:'energyHub', n:'Energy Hub', c:1200}];
    document.getElementById('shop-list').innerHTML = items.map(it => `
        <div class="action-card"><h3>${it.n}</h3><button onclick="buyUpgrade('${it.id}', ${it.c})">${gameState.upgrades[it.id]?'OWNED':'BUY 💰'+it.c}</button></div>`).join('');
}

function buyUpgrade(id, c) {
    if (gameState.points >= c && !gameState.upgrades[id]) {
        gameState.points -= c; gameState.upgrades[id] = true;
        updateUI(); renderShop();
    }
}

function saveData() { localStorage.setItem('theCageSave', JSON.stringify(gameState)); }
window.onload = () => {
    const s = localStorage.getItem('theCageSave');
    if (s) gameState = {...gameState, ...JSON.parse(s)};
    generateMarketFighters(); updateUI();
};
function openAdminConsole() { if (prompt("Code:") === "1234") { gameState.points += 5000; updateUI(); } }
