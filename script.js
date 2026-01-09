let gameState = {
    points: 1000, energy: 15, maxEnergy: 15, week: 1, 
    stable: [], marketFighters: [], matches: [],
    upgrades: { medical: false, lab: false, energyHub: false, scout: false }, // Added Scout here
    gymXP: 0, gymLevel: 1, gymName: "The Cage Gym", coachingBonus: 0
};

let tourneySelection = [];
const namePool = [{ n: "Viper", e: "🐍" }, { n: "Titan", e: "🦾" }, { n: "Ghost", e: "👻" }, { n: "Rex", e: "Rex" }, { n: "Shadow", e: "👤" }];
const rivalGyms = [
    { name: "Iron Grip Dojo", coach: "Coach Stone", insult: "Yoga class is over. Welcome to the cage." },
    { name: "Apex MMA", coach: "Manager Viper", insult: "I only fight gyms worth my time." },
    { name: "Neon Strike", coach: "Sifu Rez", insult: "Your roster is logically inferior." }
];

const traits = [
    { name: "Iron Chin", desc: "Lower injury risk", effect: "injury_resist" },
    { name: "Fast Learner", desc: "Training gives +2 stats", effect: "xp_boost" },
    { name: "Fan Favorite", desc: "Earns 2x cash per fight", effect: "cash_boost" },
    { name: "KO Artist", desc: "Clash win bonus", effect: "win_boost" }
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
        if (f.recoveryWeeks > 0) {
            f.recoveryWeeks--;
            if (f.recoveryWeeks === 0) f.status = "Healthy";
        }
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

// --- FIGHT & CLASH ---

function simulateFight(idx) {
    const f = gameState.stable[idx];
    if (gameState.energy < 1) return alert("No energy!");
    gameState.energy--;
    
    const difficulty = 35 + (gameState.week * 0.4);
    const win = ((f.striking + f.grappling) / 2) > (difficulty + Math.random() * 30);
    
    f.wins += win ? 1 : 0;
    f.losses += win ? 0 : 1;
    
    let prize = win ? 200 : 50;
    if (f.trait && f.trait.effect === "cash_boost") prize *= 2;
    
    gameState.points += prize;
    gameState.gymXP += win ? 100 : 25;
    
    applyStrain(f, false);
    checkLevelUp();
    alert(win ? `Victory! +${prize}` : "Match Lost.");
    updateUI(); renderStable(); saveData();
}

function applyStrain(f, isTourney) {
    let injuryChance = isTourney ? 0.3 : 0.15;
    if (f.trait && f.trait.effect === "injury_resist") injuryChance /= 2;
    
    if (Math.random() < injuryChance) {
        f.status = "Injured";
        f.recoveryWeeks = isTourney ? 3 : 2;
    } else {
        f.status = "Fatigued";
        f.recoveryWeeks = 1;
    }
}

function runGymClash() {
    let wins = 0;
    tourneySelection.forEach(idx => {
        const f = gameState.stable[idx];
        let power = (f.striking + f.grappling) / 2;
        if (f.trait && f.trait.effect === "win_boost") power += 10;
        
        const difficulty = 45 + (gameState.gymLevel * 5) + (Math.random() * 15);
        if (power > difficulty) wins++;
        applyStrain(f, true);
    });

    const win = wins >= 4;
    alert(win ? `Victory! (${wins}-2)` : `Defeat (${wins}-4)`);
    gameState.points += win ? 1200 : 300;
    gameState.gymXP += win ? 1000 : 250;
    
    gameState.week++; 
    showView('dashboard'); updateUI(); saveData();
}

// --- RECRUITMENT & MANAGEMENT ---

function createFighter() {
    if (gameState.stable.filter(f => f.isCreated).length >= 8) return alert("Workshop full!");
    if (gameState.points < 500) return alert("Need 500.");
    
    let fighterTrait = Math.random() < 0.20 ? traits[Math.floor(Math.random() * traits.length)] : null;
    const bonus = gameState.coachingBonus || 0;
    
    gameState.stable.push({ 
        name: document.getElementById('new-fighter-name').value || "Recruit", 
        isCreated: true, emoji: fighterTrait ? "🌟" : "🥊", age: 20, 
        striking: 45 + bonus, grappling: 45 + bonus, 
        wins: 0, losses: 0, status: "Healthy", recoveryWeeks: 0, trait: fighterTrait 
    });
    
    gameState.points -= 500;
    if (fighterTrait) alert(`Special Talent: ${fighterTrait.name}!`);
    updateUI(); showView('stable'); saveData();
}

function sellFighter(index) {
    const f = gameState.stable[index];
    let ageMult = (f.age <= 29) ? 1.3 : Math.max(0.3, 1.0 - ((f.age - 29) * 0.15));
    let val = Math.floor(((f.striking + f.grappling) * 10 + f.wins * 60) * ageMult);

    if (confirm(`Sell ${f.name} to Bank for ${val}?`)) {
        gameState.matches.unshift({ name: f.name, emoji: f.emoji, record: `${f.wins}-${f.losses}`, price: `Sold: ${val}`, week: gameState.week });
        gameState.points += val;
        gameState.stable.splice(index, 1);
        updateUI(); renderStable(); saveData();
    }
}

function retireToCoach(index) {
    const f = gameState.stable[index];
    if (confirm(`Retire ${f.name} as a Coach? (+2 permanent recruit stats)`)) {
        gameState.coachingBonus += 2;
        gameState.matches.unshift({ name: f.name, emoji: "🎓", record: `${f.wins}-${f.losses}`, price: "COACH", week: gameState.week });
        gameState.stable.splice(index, 1);
        updateUI(); renderStable(); saveData();
    }
}

// --- UI HANDLERS ---

function updateUI() {
    document.getElementById('points-val').innerText = gameState.points.toLocaleString();
    document.getElementById('energy-val').innerText = `${gameState.energy}/${gameState.maxEnergy}`;
    document.getElementById('week-val').innerText = gameState.week;
    document.getElementById('gym-level-val').innerText = gameState.gymLevel;
    document.getElementById('coach-bonus-val').innerText = `+${gameState.coachingBonus}`;
    document.getElementById('created-count').innerText = gameState.stable.filter(f => f.isCreated).length;
    document.getElementById('purchased-count').innerText = gameState.stable.filter(f => !f.isCreated).length;
    
    const xpNeeded = gameState.gymLevel * 500;
    document.getElementById('xp-bar').style.width = Math.min(100, (gameState.gymXP / xpNeeded) * 100) + "%";
}

function renderStable() {
    const list = document.getElementById('stable-list');
    list.innerHTML = gameState.stable.map((f, i) => `
        <div class="action-card" style="opacity: ${f.status === 'Healthy' ? 1 : 0.6}; border-left: 4px solid ${f.trait ? '#f59e0b' : '#334155'};">
            <h3 style="margin-bottom:0;">${f.emoji} ${f.name}</h3>
            ${f.trait ? `<p style="color:#f59e0b; font-size:0.6rem; margin-bottom:5px;"><b>${f.trait.name}:</b> ${f.trait.desc}</p>` : ''}
            <p style="font-size:0.7rem;">${f.status} | Age: ${f.age} | ${f.isCreated ? 'Workshop' : 'Market'}</p>
            <p>S: ${f.striking} | G: ${f.grappling}</p>
            <button onclick="simulateFight(${i})" ${f.status !== 'Healthy' ? 'disabled' : ''}>FIGHT</button>
            <div style="display:flex; gap:4px; margin-top:4px;">
                <button onclick="sellFighter(${i})" style="flex:1; background:none; border:1px solid #f59e0b; color:#f59e0b; font-size:0.6rem;">SELL</button>
                ${f.age >= 35 ? `<button onclick="retireToCoach(${i})" style="flex:1; background:#8b5cf6; color:white; font-size:0.6rem;">RETIRE</button>` : ''}
            </div>
        </div>
    `).join('');
}

// --- MARKET & SHOP (With Scout Logic) ---

function generateMarketFighters() {
    gameState.marketFighters = [];
    for (let i = 0; i < 3; i++) {
        let t = Math.random() < 0.15 ? traits[Math.floor(Math.random() * traits.length)] : null;
        gameState.marketFighters.push({ 
            name: namePool[Math.floor(Math.random()*namePool.length)].n, 
            emoji: t ? "🌟" : "🥋",
            age: 23 + i, 
            striking: 50 + gameState.gymLevel * 2, 
            grappling: 50 + gameState.gymLevel * 2, 
            cost: 700 + (gameState.gymLevel * 40), 
            trait: t 
        });
    }
}

function renderMarket() {
    document.getElementById('market-list').innerHTML = gameState.marketFighters.map((f, i) => {
        // If scouted, show the trait name. If not, show "Unknown"
        const traitHint = gameState.upgrades.scout ? 
            (f.trait ? `<p style="color:#f59e0b; font-size:0.6rem;">Trait: ${f.trait.name}</p>` : `<p style="color:#94a3b8; font-size:0.6rem;">No Trait</p>`) : 
            `<p style="color:#64748b; font-size:0.6rem;">Trait: ??? (Requires Scout)</p>`;

        return `
        <div class="action-card">
            <h3>${f.name}</h3>
            ${traitHint}
            <p>Cost: ${f.cost}</p>
            <button onclick="buyFighter(${i})">SIGN</button>
        </div>`;
    }).join('');
}

function buyFighter(idx) {
    const f = gameState.marketFighters[idx];
    if (gameState.stable.filter(f => !f.isCreated).length >= 7) return alert("Contract stable full!");
    if (gameState.points < f.cost) return alert("Insufficient points!");
    
    gameState.stable.push({ ...f, isCreated: false, wins: 0, losses: 0, status: "Healthy", recoveryWeeks: 0 });
    gameState.points -= f.cost;
    gameState.marketFighters.splice(idx, 1);
    updateUI(); renderMarket(); saveData();
}

function renderShop() {
    const items = [
        {id:'medical', n:'Medical Wing', c:1500, d:'Reduces age decline.'}, 
        {id:'energyHub', n:'Energy Hub', c:1200, d:'25 Max Energy per week.'},
        {id:'scout', n:'Pro Scout', c:2000, d:'Reveal Fighter Traits in Market.'}
    ];
    document.getElementById('shop-list').innerHTML = items.map(it => `
        <div class="action-card">
            <h3>${it.n}</h3><p style="font-size:0.6rem;">${it.d}</p>
            <button onclick="buyUpgrade('${it.id}', ${it.c})">${gameState.upgrades[it.id]?'OWNED':'BUY '+it.c}</button>
        </div>`).join('');
}

function buyUpgrade(id, c) {
    if (gameState.points >= c && !gameState.upgrades[id]) {
        gameState.points -= c; gameState.upgrades[id] = true;
        updateUI(); renderShop(); saveData();
    }
}

// --- TOURNAMENT / SYSTEM UTILS ---

function showView(v) {
    document.querySelectorAll('.view').forEach(view => view.style.display = 'none');
    document.getElementById('view-'+v).style.display = 'block';
    if (v === 'stable') renderStable();
    if (v === 'market') renderMarket();
    if (v === 'history') renderHistory();
    if (v === 'shop') renderShop();
}

function prepareTournament() {
    tourneySelection = [];
    const rival = rivalGyms[Math.floor(Math.random() * rivalGyms.length)];
    document.getElementById('tourney-week').innerText = gameState.week;
    document.getElementById('tourney-status').innerHTML = `<div class="action-card" style="border: 2px solid #ef4444;"><strong>${rival.coach} (${rival.name}):</strong><br>"${rival.insult}"</div>`;
    renderTourneyRoster();
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
        else return alert("Limit: 3 Created and 3 Purchased.");
    }
    document.getElementById('start-clash-btn').style.display = tourneySelection.length === 6 ? 'block' : 'none';
    renderTourneyRoster();
}

function renderTourneyRoster() {
    const list = document.getElementById('tourney-roster');
    list.innerHTML = gameState.stable.map((f, i) => {
        const selected = tourneySelection.includes(i);
        const disabled = (f.status !== "Healthy" && !selected);
        return `
        <div class="action-card" style="opacity:${disabled ? 0.4 : 1}; border-left: 4px solid ${f.isCreated ? '#3b82f6' : '#10b981'}">
            <b>${f.name}</b><br>
            S:${f.striking} G:${f.grappling} | ${f.status}<br>
            <button onclick="toggleTourneyFighter(${i})" ${disabled ? 'disabled' : ''}>${selected ? 'Remove' : 'Select'}</button>
        </div>`;
    }).join('');
}

function renderHistory() {
    document.getElementById('history-list').innerHTML = gameState.matches.map(h => `
        <div class="action-card" style="font-size:0.8rem;">
            <b>Week ${h.week}: ${h.emoji} ${h.name}</b><br>Record: ${h.record} | ${h.price}
        </div>`).join('');
}

function checkLevelUp() {
    const xpNeeded = gameState.gymLevel * 500;
    if (gameState.gymXP >= xpNeeded) {
        gameState.gymXP -= xpNeeded; gameState.gymLevel++; gameState.points += 500;
        alert(`LEVEL UP! Gym Level ${gameState.gymLevel}.`);
    }
}

function saveData() { localStorage.setItem('theCageSave', JSON.stringify(gameState)); }

window.onload = () => {
    const s = localStorage.getItem('theCageSave');
    if (s) {
        const data = JSON.parse(s);
        // Ensure upgrades object has the new scout property
        if (data.upgrades && data.upgrades.scout === undefined) data.upgrades.scout = false;
        gameState = {...gameState, ...data};
    }
    if (gameState.marketFighters.length === 0) generateMarketFighters();
    updateUI();
};

function updateGymName(n) { gameState.gymName = n; saveData(); }
function openAdminConsole() { if (prompt("Code:") === "1234") { gameState.points += 5000; updateUI(); saveData(); } }
