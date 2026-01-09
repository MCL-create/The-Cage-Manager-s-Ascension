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
    { name: "Iron Grip Dojo", coach: "Coach Stone", insult: "Time for a lesson." },
    { name: "Apex MMA", coach: "Manager Viper", insult: "My roster is superior." },
    { name: "Neon Strike", coach: "Sifu Rez", insult: "Probability of your win: 0%." }
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
        // Aging decline
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

// --- FIGHTER MANAGEMENT ---

function createFighter() {
    if (gameState.stable.filter(f => f.isCreated).length >= 8) return alert("Workshop full!");
    if (gameState.points < 500) return alert("Need 💰500.");
    
    let trait = Math.random() < 0.2 ? traits[Math.floor(Math.random() * traits.length)] : null;
    let sBonus = (gameState.specialization === 'Striking') ? 10 : 0;
    let gBonus = (gameState.specialization === 'Grappling') ? 10 : 0;
    
    gameState.stable.push({ 
        name: document.getElementById('new-fighter-name').value || "Recruit", 
        isCreated: true, emoji: trait ? "🌟" : "🥊", age: 20, 
        striking: 45 + gameState.coachingBonus + sBonus, 
        grappling: 45 + gameState.coachingBonus + gBonus, 
        wins: 0, losses: 0, 
        status: "Healthy", // Correctly set Healthy status
        recoveryWeeks: 0, 
        trait: trait, 
        division: divisions[Math.floor(Math.random()*3)]
    });
    
    gameState.points -= 500;
    updateUI(); showView('stable'); saveData();
}

function simulateFight(idx) {
    const f = gameState.stable[idx];
    if (gameState.energy < 1) return alert("No energy! Advance the week.");
    
    gameState.energy--;
    const winChance = ((f.striking + f.grappling) / 2) > (35 + (gameState.week * 0.4) + Math.random() * 30);
    
    let prize = winChance ? 200 : 50;
    if (f.trait && f.trait.effect === "cash_boost") prize *= 2;
    
    gameState.points += prize;
    gameState.gymXP += winChance ? 100 : 25;
    
    // Set to Fatigued so they can't spam fights
    f.status = "Fatigued"; 
    f.recoveryWeeks = 1;
    
    checkLevelUp(); updateUI(); renderStable(); saveData();
}

// --- UI RENDERING ---

function renderStable() {
    const list = document.getElementById('stable-list');
    if (gameState.stable.length === 0) {
        list.innerHTML = "<p style='color: #94a3b8;'>Your gym is empty. Go to 'Create' or 'Market' to sign fighters.</p>";
        return;
    }

    list.innerHTML = gameState.stable.map((f, i) => `
        <div class="action-card" style="border-left: 4px solid ${f.trait ? '#f59e0b' : '#334155'}; opacity: ${f.status === 'Healthy' ? 1 : 0.8}">
            <h3 style="margin:0;">${f.emoji} ${f.name}</h3>
            <p class="weight-tag">⚖️ ${f.division}</p>
            <p style="font-size:0.75rem; color: #94a3b8;">Status: <b style="color:${f.status === 'Healthy' ? '#10b981' : '#ef4444'}">${f.status}</b></p>
            <p style="font-size:0.7rem;">S: ${f.striking} | G: ${f.grappling}</p>
            
            <button onclick="simulateFight(${i})" ${f.status !== 'Healthy' ? 'disabled' : ''}>
                ${f.status === 'Healthy' ? 'TRAIN (-1 ⚡)' : 'RESTING'}
            </button>
            
            <div style="display:flex; gap:4px; margin-top:4px;">
                <button onclick="sellFighter(${i})" class="btn-secondary" style="font-size:0.6rem;">SELL</button>
                ${f.age >= 35 ? `<button onclick="retireToCoach(${i})" style="background:#8b5cf6; color:white; font-size:0.6rem;">RETIRE</button>` : ''}
            </div>
        </div>
    `).join('');
}

// --- UTILS ---

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
    
    const xpNeeded = gameState.gymLevel * 600;
    document.getElementById('xp-bar').style.width = Math.min(100, (gameState.gymXP / xpNeeded) * 100) + "%";
}

function saveData() { localStorage.setItem('theCageSave', JSON.stringify(gameState)); }

window.onload = () => {
    const saved = localStorage.getItem('theCageSave');
    if (saved) {
        gameState = {...gameState, ...JSON.parse(saved)};
    }
    updateUI();
};
