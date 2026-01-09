let gameState = {
    points: 1000, energy: 15, maxEnergy: 15, week: 1, 
    stable: [], marketFighters: [], matches: [],
    upgrades: { medical: false, energyHub: false, scout: false },
    gymXP: 0, gymLevel: 1, gymName: "The Cage Gym", 
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
    { name: "Iron Grip Dojo", coach: "Coach Stone", insult: "Yoga class is over." },
    { name: "Apex MMA", coach: "Manager Viper", insult: "I only fight the best." },
    { name: "Neon Strike", coach: "Sifu Rez", insult: "Data says you'll lose." }
];

let tourneySelection = [];
let currentDiff = { label: "Amateur", mult: 1, bonus: 0 };

// --- CORE ENGINE ---

function processWeekReset() {
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
        if (gameState.week % 52 === 1) {
            f.age++;
            if (f.age >= 33) {
                let d = gameState.upgrades.medical ? 1 : 3;
                f.striking = Math.max(10, f.striking - d);
                f.grappling = Math.max(10, f.grappling - d);
            }
        }
    });
    generateMarketFighters();
    updateUI();
    saveData();
}

// --- LOGO UPLOAD ---

function handleLogoUpload(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            gameState.gymLogo = e.target.result;
            displayLogo(gameState.gymLogo);
            saveData();
        };
        reader.readAsDataURL(file);
    }
}

function displayLogo(imgData) {
    const imgEl = document.getElementById('gym-logo-img');
    const placeholder = document.getElementById('pic-placeholder');
    if (imgData) {
        imgEl.src = imgData;
        imgEl.style.display = 'block';
        placeholder.style.display = 'none';
    }
}

// --- CLASH SYSTEM ---

function setDiff(l, m, b) {
    currentDiff = { label: l, mult: m, bonus: b };
    prepareTournament();
}

function prepareTournament() {
    tourneySelection = [];
    const rival = rivalGyms[Math.floor(Math.random() * rivalGyms.length)];
    document.getElementById('tourney-week').innerText = gameState.week;
    document.getElementById('tourney-status').innerHTML = `
        <div class="action-card" style="border: 2px solid #ef4444;">
            <strong>${rival.coach}:</strong> "${rival.insult}"
        </div>
        <div style="display:flex; gap:5px; margin:10px 0;">
            <button class="btn-diff ${currentDiff.label==='Amateur'?'active':''}" onclick="setDiff('Amateur',1,0)">AMATEUR</button>
            <button class="btn-diff ${currentDiff.label==='Pro'?'active':''}" onclick="setDiff('Pro',1.5,500)">PRO</button>
            <button class="btn-diff ${currentDiff.label==='Elite'?'active':''}" onclick="setDiff('Elite',2.5,1500)">ELITE</button>
        </div>
    `;
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
        else return alert("Slot Limit: 3 Created / 3 Purchased");
    }
    document.getElementById('start-clash-btn').style.display = tourneySelection.length === 6 ? 'block' : 'none';
    renderTourneyRoster();
}

function runGymClash() {
    let wins = 0;
    let totalCredits = currentDiff.bonus;

    tourneySelection.forEach(idx => {
        const f = gameState.stable[idx];
        const rivalPower = 45 + (gameState.gymLevel * 4) + (currentDiff.mult * 12);
        let playerPower = (f.striking + f.grappling) / 2;
        if (f.trait && f.trait.effect === "win_boost") playerPower += 12;

        if (playerPower > (rivalPower + Math.random()*20)) {
            wins++;
            let boutReward = 250 * currentDiff.mult;
            if (playerPower < rivalPower) boutReward += 200; // Underdog Bonus
            totalCredits += boutReward;
        } else {
            totalCredits += 75;
        }
        f.status = "Fatigued"; f.recoveryWeeks = 2;
    });

    const gymWin = wins >= 4;
    if (gymWin) totalCredits += 1000 * currentDiff.mult;

    alert(`${gymWin ? '🏆 GYM WIN' : '❌ GYM LOSS'}! Earned: 💰${Math.floor(totalCredits)}`);
    gameState.points += Math.floor(totalCredits);
    gameState.gymXP += gymWin ? (600 * currentDiff.mult) : 150;
    
    gameState.week++; 
    checkLevelUp(); showView('dashboard'); updateUI(); saveData();
}

// --- FIGHTER MANAGEMENT ---

function createFighter() {
    if (gameState.stable.filter(f => f.isCreated).length >= 8) return alert("Workshop full!");
    if (gameState.points < 500) return alert("Need 500.");
    
    let trait = Math.random() < 0.2 ? traits[Math.floor(Math.random() * traits.length)] : null;
    let sBonus = (gameState.specialization === 'Striking') ? 10 : 0;
    let gBonus = (gameState.specialization === 'Grappling') ? 10 : 0;
    
    gameState.stable.push({ 
        name: document.getElementById('new-fighter-name').value || "Recruit", 
        isCreated: true, emoji: trait ? "🌟" : "🥊", age: 20, 
        striking: 45 + gameState.coachingBonus + sBonus, 
        grappling: 45 + gameState.coachingBonus + gBonus, 
        wins: 0, losses: 0, status: "Healthy", recoveryWeeks: 0, 
        trait: trait, division: divisions[Math.floor(Math.random()*3)]
    });
    
    gameState.points -= 500;
    updateUI(); showView('stable'); saveData();
}

function simulateFight(idx) {
    const f = gameState.stable[idx];
    if (gameState.energy < 1) return alert("No energy!");
    gameState.energy--;
    const win = ((f.striking + f.grappling) / 2) > (35 + (gameState.week * 0.4) + Math.random() * 30);
    let prize = win ? 200 : 50;
    if (f.trait && f.trait.effect === "cash_boost") prize *= 2;
    gameState.points += prize;
    gameState.gymXP += win ? 100 : 25;
    f.status = "Fatigued"; f.recoveryWeeks = 1;
    checkLevelUp(); updateUI(); renderStable(); saveData();
}

function sellFighter(idx) {
    const f = gameState.stable[idx];
    let ageMult = (f.age <= 29) ? 1.3 : Math.max(0.3, 1.0 - ((f.age - 29) * 0.15));
    let val = Math.floor(((f.striking + f.grappling) * 10 + f.wins * 60) * ageMult);
    if (confirm(`Sell ${f.name} for 💰${val}?`)) {
        gameState.matches.unshift({ name: f.name, emoji: f.emoji, record: `${f.wins}-${f.losses}`, price: `Sold: ${val}`, week: gameState.week });
        gameState.points += val;
        gameState.stable.splice(idx, 1);
        updateUI(); renderStable(); saveData();
    }
}

function retireToCoach(idx) {
    const f = gameState.stable[idx];
    if (confirm(`Retire ${f.name} as Coach? (+2 permanent recruit stats)`)) {
        gameState.coachingBonus += 2;
        gameState.matches.unshift({ name: f.name, emoji: "🎓", record: `${f.wins}-${f.losses}`, price: "COACH", week: gameState.week });
        gameState.stable.splice(idx, 1);
        updateUI(); renderStable(); saveData();
    }
}

// --- MARKET & SHOP ---

function generateMarketFighters() {
    gameState.marketFighters = [];
    for (let i = 0; i < 3; i++) {
        let t = Math.random() < (gameState.gymLevel > 10 ? 0.3 : 0.15) ? traits[Math.floor(Math.random() * traits.length)] : null;
        let base = 50 + (gameState.gymLevel * 2);
        gameState.marketFighters.push({ 
            name: "Pro " + (i+1), emoji: t ? "🌟" : "🥋", age: 24+i, striking: base, grappling: base, 
            cost: 700 + (gameState.gymLevel * 50), trait: t, division: divisions[Math.floor(Math.random()*3)]
        });
    }
}

function buyFighter(idx) {
    const f = gameState.marketFighters[idx];
    if (gameState.stable.filter(x => !x.isCreated).length >= 7) return alert("Contract stable full!");
    if (gameState.points < f.cost) return alert("Not enough points!");
    gameState.stable.push({ ...f, isCreated: false, wins: 0, losses: 0, status: "Healthy", recoveryWeeks: 0 });
    gameState.points -= f.cost;
    gameState.marketFighters.splice(idx, 1);
    updateUI(); renderMarket(); saveData();
}

// --- UI UTILS ---

function showView(v) {
    document.querySelectorAll('.view').forEach(view => view.style.display = 'none');
    document.getElementById('view-'+v).style.display = 'block';
    if (v === 'stable') renderStable();
    if (v === 'market') renderMarket();
    if (v === 'history') renderHistory();
    if (v === 'shop') renderShop();
}

function updateUI() {
    document.getElementById('points-val').innerText = gameState.points.toLocaleString();
    document.getElementById('energy-val').innerText = `${gameState.energy}/${gameState.maxEnergy}`;
    document.getElementById('week-val').innerText = gameState.week;
    document.getElementById('gym-level-val').innerText = gameState.gymLevel;
    document.getElementById('coach-bonus-val').innerText = `+${gameState.coachingBonus}`;
    document.getElementById('spec-tag').innerText = gameState.specialization ? gameState.specialization.toUpperCase() : "";
    if (gameState.gymLevel >= 5 && !gameState.specialization) document.getElementById('spec-picker').style.display = 'block';
    const xpNeeded = gameState.gymLevel * 600;
    document.getElementById('xp-bar').style.width = Math.min(100, (gameState.gymXP / xpNeeded) * 100) + "%";
}

function renderStable() {
    const list = document.getElementById('stable-list');
    list.innerHTML = gameState.stable.map((f, i) => `
        <div class="action-card" style="opacity: ${f.status === 'Healthy' ? 1 : 0.6}; border-left: 4px solid ${f.trait ? '#f59e0b' : '#334155'};">
            <h3 style="margin:0;">${f.emoji} ${f.name}</h3>
            <p class="weight-tag">⚖️ ${f.division}</p>
            ${f.trait ? `<p class="trait-tag">✨ ${f.trait.name}</p>` : ''}
            <p style="font-size:0.7rem;">S: ${f.striking} | G: ${f.grappling}</p>
            <button onclick="simulateFight(${i})" ${f.status !== 'Healthy' ? 'disabled' : ''}>FIGHT</button>
            <div style="display:flex; gap:4px; margin-top:4px;">
                <button onclick="sellFighter(${i})" style="flex:1; background:none; border:1px solid #f59e0b; color:#f59e0b; font-size:0.6rem;">SELL</button>
                ${f.age >= 35 ? `<button onclick="retireToCoach(${i})" style="flex:1; background:#8b5cf6; color:white; font-size:0.6rem;">RETIRE</button>` : ''}
            </div>
        </div>
    `).join('');
}

function renderTourneyRoster() {
    const list = document.getElementById('tourney-roster');
    list.innerHTML = gameState.stable.map((f, i) => {
        const selected = tourneySelection.includes(i);
        const disabled = (f.status !== "Healthy" && !selected);
        return `<div class="action-card" style="opacity:${disabled ? 0.4 : 1};">
            <b>${f.name}</b><br><span class="weight-tag">${f.division}</span><br>
            <button onclick="toggleTourneyFighter(${i})" ${disabled ? 'disabled' : ''}>${selected ? 'REMOVE' : 'SELECT'}</button>
        </div>`;
    }).join('');
}

function renderMarket() {
    document.getElementById('market-list').innerHTML = gameState.marketFighters.map((f, i) => {
        const t = gameState.upgrades.scout ? (f.trait ? f.trait.name : "None") : "???";
        return `<div class="action-card"><h3>${f.name}</h3><p class="weight-tag">${f.division}</p><p style="font-size:0.6rem;">Trait: ${t}</p><button onclick="buyFighter(${i})">SIGN ${f.cost}</button></div>`;
    }).join('');
}

function renderShop() {
    const items = [
        {id:'medical', n:'Medical Wing', c:1500, d:'Reduces age decline.'}, 
        {id:'energyHub', n:'Energy Hub', c:1200, d:'25 Max Energy.'},
        {id:'scout', n:'Pro Scout', c:2000, d:'Reveal Market Traits.'}
    ];
    document.getElementById('shop-list').innerHTML = items.map(it => `<div class="action-card"><h3>${it.n}</h3><p style="font-size:0.6rem;">${it.d}</p><button onclick="buyUpgrade('${it.id}', ${it.c})">${gameState.upgrades[it.id]?'OWNED':'BUY '+it.c}</button></div>`).join('');
}

function renderHistory() {
    document.getElementById('history-list').innerHTML = gameState.matches.map(h => `<div class="action-card"><b>Wk ${h.week}: ${h.emoji} ${h.name}</b><br>${h.record} | ${h.price}</div>`).join('');
}

function setSpecialization(type) { gameState.specialization = type; document.getElementById('spec-picker').style.display = 'none'; updateUI(); saveData(); }
function buyUpgrade(id, c) { if (gameState.points >= c && !gameState.upgrades[id]) { gameState.points -= c; gameState.upgrades[id] = true; updateUI(); renderShop(); saveData(); } }
function checkLevelUp() { const xpN = gameState.gymLevel * 600; if (gameState.gymXP >= xpN) { gameState.gymXP -= xpN; gameState.gymLevel++; alert(`PRESTIGE UP: LVL ${gameState.gymLevel}`); } }
function saveData() { localStorage.setItem('theCageSave', JSON.stringify(gameState)); }
function updateGymName(n) { gameState.gymName = n; saveData(); }

window.onload = () => {
    const s = localStorage.getItem('theCageSave');
    if (s) {
        const data = JSON.parse(s);
        gameState = {...gameState, ...data};
        if (gameState.gymLogo) displayLogo(gameState.gymLogo);
    }
    generateMarketFighters(); updateUI();
};
