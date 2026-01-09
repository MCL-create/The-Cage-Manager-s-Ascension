let gameState = {
    points: 1000, energy: 15, maxEnergy: 15, week: 1, 
    stable: [], marketFighters: [], matches: [],
    upgrades: { medical: false, lab: false, marketing: false, energyHub: false },
    gymXP: 0, gymLevel: 1, gymName: "The Cage Gym",
    totalGymWins: 0
};

let tourneySelection = [];
const namePool = [{ n: "Viper", e: "🐍" }, { n: "Titan", e: "🦾" }, { n: "Ghost", e: "👻" }, { n: "Rex", e: "🦖" }, { n: "Shadow", e: "👤" }];
const recruitEmojis = ["🥊", "🥋", "👺", "🥷", "🦾", "👊"];
const rivalGyms = [
    { name: "Iron Grip Dojo", coach: "Coach Stone", insult: "Yoga class is down the street, kid." },
    { name: "Apex MMA", coach: "Manager Viper", insult: "I've sold better fighters than your whole roster." }
];

// --- CORE LOOP ---

function processWeekReset() {
    if (gameState.week % 12 === 0 && gameState.week !== 0) {
        alert("🚨 TOURNAMENT WEEK!");
        showView('tournament');
        prepareTournament();
        return;
    }

    gameState.week++;
    gameState.energy = gameState.upgrades.energyHub ? 25 : 15;
    gameState.maxEnergy = gameState.upgrades.energyHub ? 25 : 15;

    // Aging & Recovery
    gameState.stable.forEach(f => {
        if (gameState.week % 52 === 0) {
            f.age++;
            if (f.age >= 33) {
                let decline = gameState.upgrades.medical ? 1 : 3;
                f.striking = Math.max(10, f.striking - decline);
                f.grappling = Math.max(10, f.grappling - decline);
            }
        }
        if (f.recoveryWeeks > 0) {
            f.recoveryWeeks--;
            if (f.recoveryWeeks === 0) f.status = "Healthy";
        }
    });

    if (Math.random() < 0.2) triggerRandomEvent();
    generateMarketFighters();
    updateUI();
    saveData();
}

function triggerRandomEvent() {
    const events = [
        { msg: "👟 Sponsorship deal!", effect: () => gameState.points += 300 },
        { msg: "🥤 Energy delivery!", effect: () => gameState.energy = Math.min(gameState.maxEnergy, gameState.energy + 5) }
    ];
    const e = events[Math.floor(Math.random() * events.length)];
    e.effect();
    alert(`EVENT: ${e.msg}`);
}

// --- FIGHT & TOURNAMENT ---

function simulateFight(index) {
    const f = gameState.stable[index];
    if (gameState.energy < 1 || f.status !== "Healthy") return alert("Cannot fight!");
    
    gameState.energy -= 1;
    const winChance = ((f.striking + f.grappling)/2) / (((f.striking + f.grappling)/2) + (35 + gameState.week * 1.2));
    const isWin = Math.random() < winChance;
    
    if (isWin) { f.wins++; gameState.gymXP += 150; gameState.points += 200; }
    else { f.losses++; gameState.gymXP += 50; gameState.points += 50; }

    applyStrain(f, false);
    checkLevelUp();
    updateUI(); renderStable(); saveData();
    alert(isWin ? "Winner!" : "Defeat.");
}

function applyStrain(f, isTourney) {
    const injuryChance = isTourney ? 0.3 : 0.15;
    if (Math.random() < injuryChance) {
        f.status = "Injured";
        f.recoveryWeeks = isTourney ? 3 : 2;
    } else {
        f.status = "Fatigued";
        f.recoveryWeeks = 1;
    }
}

function prepareTournament() {
    tourneySelection = [];
    const rival = rivalGyms[Math.floor(Math.random() * rivalGyms.length)];
    document.getElementById('tourney-week').innerText = gameState.week;
    document.getElementById('tourney-status').innerHTML = `<div class="action-card" style="border: 2px solid #ef4444;"><b>${rival.coach}:</b> "${rival.insult}"</div>`;
    renderTourneyRoster();
}

function renderTourneyRoster() {
    const list = document.getElementById('tourney-roster');
    list.innerHTML = gameState.stable.filter(f => f.status === "Healthy").map((f, i) => {
        const globalIndex = gameState.stable.indexOf(f);
        const selected = tourneySelection.includes(globalIndex);
        return `<div class="action-card" style="opacity:${selected?0.5:1}">
            <b>${f.name}</b> (${f.isCreated?'Created':'Bought'})<br>
            <button onclick="toggleTourneyFighter(${globalIndex})">${selected?'Remove':'Select'}</button>
        </div>`;
    }).join('');
}

function toggleTourneyFighter(idx) {
    const f = gameState.stable[idx];
    const createdSelected = tourneySelection.filter(id => gameState.stable[id].isCreated).length;
    const boughtSelected = tourneySelection.filter(id => !gameState.stable[id].isCreated).length;

    if (tourneySelection.includes(idx)) {
        tourneySelection = tourneySelection.filter(id => id !== idx);
    } else {
        if (f.isCreated && createdSelected < 3) tourneySelection.push(idx);
        else if (!f.isCreated && boughtSelected < 3) tourneySelection.push(idx);
        else alert("Slot limit reached (Max 3 Created, 3 Bought)");
    }
    document.getElementById('start-clash-btn').style.display = tourneySelection.length === 6 ? 'block' : 'none';
    renderTourneyRoster();
}

function runGymClash() {
    let wins = 0;
    tourneySelection.forEach(idx => {
        const f = gameState.stable[idx];
        if (((f.striking + f.grappling)/2) > (45 + gameState.gymLevel * 5)) wins++;
        applyStrain(f, true);
    });
    const bonus = wins >= 4 ? 1000 : 200;
    gameState.points += bonus; gameState.gymXP += bonus;
    alert(wins >= 4 ? "Gym Victory!" : "Gym Defeat.");
    gameState.week++; // Move to week 13
    showView('dashboard'); updateUI(); saveData();
}

// --- MANAGEMENT ---
// Updated Sell Function to record legacy
function sellFighter(index) {
    const f = gameState.stable[index];
    let val = Math.max(200, Math.floor(((f.striking + f.grappling) * 8) + (f.wins * 50) - (f.age > 30 ? (f.age-30)*100 : 0)));
    
    if (confirm(`Sell ${f.name} to Bank for 💰${val}?`)) {
        // Record the fighter in Match History / Hall of Fame
        const legacyEntry = {
            name: f.name,
            emoji: f.emoji,
            record: `${f.wins}-${f.losses}`,
            finalStats: `S:${f.striking} G:${f.grappling}`,
            salePrice: val,
            weekSold: gameState.week
        };
        
        if (!gameState.matches) gameState.matches = []; 
        gameState.matches.unshift(legacyEntry); // Add to the top of the history list
        
        gameState.points += val;
        gameState.stable.splice(index, 1);
        
        updateUI();
        renderStable();
        saveData();
        alert(`${f.name} has joined the Hall of Fame.`);
    }
}

// Function to display the Hall of Fame
function renderHistory() {
    const list = document.getElementById('history-list');
    if (!gameState.matches || gameState.matches.length === 0) {
        list.innerHTML = `<p class="text-muted">No legends yet. Sell your first fighter to begin your legacy.</p>`;
        return;
    }

    list.innerHTML = gameState.matches.map(h => `
        <div class="action-card" style="border-left: 4px solid #f59e0b; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <span style="font-size: 1.5rem;">${h.emoji}</span>
                <strong style="color: #f59e0b;">${h.name}</strong>
                <p style="font-size: 0.7rem; margin: 0; color: #94a3b8;">Record: ${h.record} | ${h.finalStats}</p>
            </div>
            <div style="text-align: right;">
                <p style="margin: 0; font-weight: bold;">💰${h.salePrice}</p>
                <p style="font-size: 0.6rem; color: #64748b;">Week ${h.weekSold}</p>
            </div>
        </div>
    `).join('');
}


function createFighter() {
    if (gameState.points < 500 || gameState.stable.filter(f => f.isCreated).length >= 8) return alert("Limit reached or no funds.");
    gameState.stable.push({ name: document.getElementById('new-fighter-name').value || "Recruit", isCreated: true, emoji: recruitEmojis[Math.floor(Math.random()*6)], age: 19, striking: 45, grappling: 45, wins: 0, losses: 0, status: "Healthy", recoveryWeeks: 0 });
    gameState.points -= 500;
    updateUI(); showView('stable');
}

function buyFighter(idx) {
    const f = gameState.marketFighters[idx];
    if (gameState.points < f.cost || gameState.stable.filter(f => !f.isCreated).length >= 7) return alert("Limit reached or no funds.");
    gameState.stable.push({ ...f, isCreated: false, wins: 0, losses: 0, status: "Healthy", recoveryWeeks: 0 });
    gameState.points -= f.cost;
    gameState.marketFighters.splice(idx, 1);
    updateUI(); renderMarket();
}

// --- UTILS ---

function updateUI() {
    document.getElementById('points-val').innerText = gameState.points;
    document.getElementById('energy-val').innerText = `${gameState.energy}/${gameState.maxEnergy}`;
    document.getElementById('week-val').innerText = gameState.week;
    document.getElementById('created-count').innerText = gameState.stable.filter(f => f.isCreated).length;
    document.getElementById('purchased-count').innerText = gameState.stable.filter(f => !f.isCreated).length;
    const xpNeeded = gameState.gymLevel * 500;
    document.getElementById('xp-bar').style.width = (gameState.gymXP / xpNeeded) * 100 + "%";
}

function renderStable() {
    const list = document.getElementById('stable-list');
    list.innerHTML = gameState.stable.map((f, i) => `
        <div class="action-card" style="opacity: ${f.status==='Healthy'?1:0.6}">
            <h3>${f.emoji} ${f.name}</h3>
            <p>${f.status} | Age: ${f.age}</p>
            <p>S: ${f.striking} G: ${f.grappling}</p>
            <button onclick="simulateFight(${i})" ${f.status!=='Healthy'?'disabled':''}>FIGHT</button>
            <button onclick="sellFighter(${i})" style="border:1px solid #f59e0b; background:none; color:#f59e0b;">SELL</button>
        </div>
    `).join('');
}

function showView(v) {
    document.querySelectorAll('.view').forEach(view => view.style.display = 'none');
    document.getElementById('view-'+v).style.display = 'block';
    if (v === 'stable') renderStable();
    if (v === 'market') renderMarket();
    if (v === 'shop') renderShop();
    if (v === 'history') renderHistory(); // Add this line
}

function generateMarketFighters() {
    gameState.marketFighters = [];
    for (let i = 0; i < 3; i++) {
        const c = namePool[Math.floor(Math.random()*5)];
        gameState.marketFighters.push({ name: c.n, emoji: c.e, age: 22, striking: 50+gameState.gymLevel*2, grappling: 50+gameState.gymLevel*2, cost: 600+gameState.gymLevel*50 });
    }
}

function renderMarket() {
    document.getElementById('market-list').innerHTML = gameState.marketFighters.map((f, i) => `
        <div class="action-card">
            <h3>${f.name}</h3>
            <p>Cost: 💰${f.cost}</p>
            <button onclick="buyFighter(${i})">SIGN</button>
        </div>
    `).join('');
}

function renderShop() {
    const items = [{id:'medical', name:'Medical Wing', cost:1500}, {id:'lab', name:'Lab', cost:2000}, {id:'energyHub', name:'Energy Hub', cost:1200}];
    document.getElementById('shop-list').innerHTML = items.map(item => `
        <div class="action-card">
            <h3>${item.name}</h3>
            <button onclick="buyUpgrade('${item.id}', ${item.cost})">${gameState.upgrades[item.id]?'OWNED':'BUY 💰'+item.cost}</button>
        </div>
    `).join('');
}

function buyUpgrade(id, cost) {
    if (gameState.points >= cost && !gameState.upgrades[id]) {
        gameState.points -= cost; gameState.upgrades[id] = true;
        updateUI(); renderShop(); saveData();
    }
}

function checkLevelUp() {
    const xpNeeded = gameState.gymLevel * 500;
    if (gameState.gymXP >= xpNeeded) {
        gameState.gymXP -= xpNeeded; gameState.gymLevel++; gameState.points += 500;
        alert("GYM LEVEL UP!");
    }
}

function saveData() { localStorage.setItem('theCageSave', JSON.stringify(gameState)); }
window.onload = () => {
    const s = localStorage.getItem('theCageSave');
    if (s) gameState = {...gameState, ...JSON.parse(s)};
    generateMarketFighters(); updateUI();
};
function updateGymName(n) { gameState.gymName = n; saveData(); }
function openAdminConsole() { if (prompt("Code:") === "1234") { gameState.points += 5000; updateUI(); } }

