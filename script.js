// --- 1. GAME STATE & DATA POOLS ---
let gameState = {
    points: 1000, 
    energy: 10, 
    week: 1, 
    stable: [], 
    matches: [], 
    marketFighters: [], 
    upgrades: { medical: false, lab: false, marketing: false },
    gymXP: 0,
    gymLevel: 1,
    gymName: "The Cage Gym",
    gymLogo: null,           
    bestEverStreak: 0,
    totalGymWins: 0,
    sessionStart: Date.now()
};

const namePool = [
    { n: "Viper", e: "🐍" }, { n: "Titan", e: "🦾" }, { n: "Ghost", e: "👻" }, 
    { n: "Rex", e: "🦖" }, { n: "Shadow", e: "👤" }, { n: "Blade", e: "⚔️" }, 
    { n: "Bear", e: "🐻" }, { n: "Wolf", e: "🐺" }, { n: "Ajax", e: "🛡️" }, { n: "Nova", e: "🌟" }
];

const rivalPool = [
    { name: "Iron Malik", emoji: "👺", striking: 70, grappling: 85, prize: 500, bio: "The Submission King" },
    { name: "Thunder Rex", emoji: "⛈️", striking: 90, grappling: 55, prize: 500, bio: "Knockout Artist" },
    { name: "The Ghost", emoji: "👻", striking: 80, grappling: 80, prize: 700, bio: "Unbeatable Legend" }
];

const bioPool = ["Former Olympian", "Underground legend", "Fast but fragile", "Iron chin", "Technical master"];
const recruitEmojis = ["🥊", "🥋", "👺", "🥷", "🦾", "👊", "🔥", "🏆"];

// --- 2. CUSTOMIZATION LOGIC ---

function uploadGymLogo(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            gameState.gymLogo = e.target.result;
            document.getElementById('gym-logo-img').src = e.target.result;
            saveData();
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function updateGymName(newName) {
    const cleanedName = newName.replace(/\n/g, " ").trim();
    gameState.gymName = cleanedName || "The Cage Gym";
    saveData();
}

// --- 3. CORE PROGRESSION & AGING ---

function addGymXP(amount) {
    const xpNeeded = gameState.gymLevel * 500; 
    gameState.gymXP += amount;

    if (gameState.gymXP >= xpNeeded) {
        gameState.gymXP = 0;
        gameState.gymLevel++;
        alert(`🎉 LEVEL UP! Your gym is now Level ${gameState.gymLevel}!`);
        gameState.points += 500; 
    }
    updateUI();
    saveData();
}

function processWeekReset() {
    gameState.week++;
    gameState.energy = 10;
    
    // YEARLY AGING LOGIC (Every 52 weeks)
    if (gameState.week > 1 && (gameState.week - 1) % 52 === 0) {
        gameState.stable.forEach(f => {
            f.age = (f.age || 20) + 1;
            if (f.age >= 33) {
                // Medical Wing reduces decline from 3 points to 1 point
                const decline = gameState.upgrades.medical ? 1 : 3;
                f.striking = Math.max(10, f.striking - decline);
                f.grappling = Math.max(10, f.grappling - decline);
            }
        });
        alert("📅 A YEAR HAS PASSED!");
    }

    let bonusText = "";
    if (gameState.gymLevel >= 3) {
        let bonus = gameState.gymLevel * 100;
        // Marketing Suite doubles sponsorship
        if (gameState.upgrades.marketing) bonus *= 2;
        gameState.points += bonus;
        bonusText = ` + 💰${bonus} Sponsorship!`;
    }

    generateMarketFighters();
    document.getElementById('news-feed').innerText = `Week ${gameState.week} begins!${bonusText}`;
    updateUI();
    saveData();
}

// --- 4. FIGHT & TRAINING ---

function simulateFight(index) {
    const fighter = gameState.stable[index];
    if (gameState.energy < 2) return alert("Too tired! Advance the week.");
    const difficulty = 40 + (gameState.week * 2);
    const fighterPower = (fighter.striking + fighter.grappling) / 2;
    const opponentPower = Math.random() * 20 + difficulty;
    const winChance = fighterPower / (fighterPower + opponentPower);
    gameState.energy -= 2;
    processFightResult(fighter, winChance, 200, 50, "Standard Match");
}

function callOutFight(fighterIndex, rivalIndex) {
    const fighter = gameState.stable[fighterIndex];
    const rival = rivalPool[rivalIndex];
    if (gameState.energy < 4) return alert("Requires 4 Energy (⚡)!");
    const fighterPower = (fighter.striking + fighter.grappling) / 2;
    const rivalPower = (rival.striking + rival.grappling) / 2;
    const winChance = fighterPower / (fighterPower + rivalPower);
    gameState.energy -= 4;
    processFightResult(fighter, winChance, rival.prize, 75, `Call-out: ${rival.name}`);
}

function processFightResult(fighter, winChance, winPrize, lossPrize, matchType) {
    const isWin = Math.random() < winChance;
    const result = isWin ? "WIN" : "LOSS";
    const prize = isWin ? winPrize : lossPrize;
    if (isWin) {
        fighter.wins++;
        gameState.totalGymWins++; 
        fighter.streak = (fighter.streak || 0) + 1; 
        if (fighter.streak > gameState.bestEverStreak) gameState.bestEverStreak = fighter.streak;
        addGymXP(matchType.includes("Call-out") ? 300 : 150); 
    } else {
        fighter.losses++;
        fighter.streak = 0; 
        addGymXP(50);  
    }
    gameState.points += prize;
    gameState.matches.push({ week: gameState.week, fighter: fighter.name, result: result, earnings: prize, type: matchType });
    alert(`${result}! ${fighter.name} earned 💰${prize}`);
    updateUI();
    renderStable();
    saveData();
}

function trainFighter(index, stat) {
    if (gameState.points < 100) return alert("Not enough points!");
    const age = gameState.stable[index].age || 20;
    const agePenalty = age > 30 ? 1 : 0;
    // Performance Lab adds +1 to training
    const labBonus = gameState.upgrades.lab ? 1 : 0;
    const gain = Math.max(1, (Math.floor(Math.random() * 4) + 2) - agePenalty + labBonus);
    gameState.stable[index][stat] += gain;
    gameState.points -= 100;
    updateUI();
    renderStable();
    saveData();
}

function retireFighter(index) {
    const fighter = gameState.stable[index];
    if (fighter.wins < 5) return alert("Needs 5 wins!");
    if (confirm(`Retire ${fighter.name}?`)) {
        addGymXP(fighter.wins * 100);
        gameState.stable.splice(index, 1);
        renderStable();
        updateUI();
        saveData();
    }
}

// --- 5. RECRUITMENT & SHOP ---

function createFighter() {
    const nameInput = document.getElementById('new-fighter-name');
    if (gameState.points < 500) return alert("Need 500 points!");
    gameState.stable.push({
        name: nameInput.value || "Recruit",
        emoji: recruitEmojis[Math.floor(Math.random() * recruitEmojis.length)],
        age: 18 + Math.floor(Math.random() * 4),
        striking: 40 + Math.floor(Math.random() * 20),
        grappling: 40 + Math.floor(Math.random() * 20),
        wins: 0, losses: 0, streak: 0
    });
    gameState.points -= 500;
    nameInput.value = "";
    updateUI();
    showView('stable');
    saveData();
}

function buyUpgrade(type, cost) {
    if (gameState.points < cost) return alert("Not enough points!");
    if (gameState.upgrades[type]) return alert("Already owned!");
    gameState.points -= cost;
    gameState.upgrades[type] = true;
    updateUI();
    renderShop();
    saveData();
}

function generateMarketFighters() {
    gameState.marketFighters = [];
    for (let i = 0; i < 3; i++) {
        const choice = namePool[Math.floor(Math.random() * namePool.length)];
        const strike = 40 + Math.floor(Math.random() * 30) + (gameState.week * 2);
        const grapple = 40 + Math.floor(Math.random() * 30) + (gameState.week * 2);
        gameState.marketFighters.push({ name: choice.n, emoji: choice.e, age: 19 + Math.floor(Math.random() * 10), striking: strike, grappling: grapple, cost: 400 + (strike + grapple) * 2, bio: bioPool[Math.floor(Math.random() * bioPool.length)] });
    }
}

function buyFighter(index) {
    const fighter = gameState.marketFighters[index];
    if (gameState.points < fighter.cost) return alert("Not enough points!");
    gameState.stable.push({ name: fighter.name, emoji: fighter.emoji, age: fighter.age, striking: fighter.striking, grappling: fighter.grappling, wins: 0, losses: 0, streak: 0 });
    gameState.points -= fighter.cost;
    gameState.marketFighters.splice(index, 1);
    updateUI();
    renderMarket();
    saveData();
}

// --- 6. UI & SYSTEM ---

function updateUI() {
    document.getElementById('points-val').innerText = gameState.points.toLocaleString();
    document.getElementById('energy-val').innerText = `${gameState.energy}/10`;
    document.getElementById('week-val').innerText = gameState.week;
    const xpNeeded = gameState.gymLevel * 500;
    const xpBar = document.getElementById('xp-bar');
    if (xpBar) xpBar.style.width = (gameState.gymXP / xpNeeded) * 100 + "%";
    if (document.getElementById('gym-level-val')) document.getElementById('gym-level-val').innerText = gameState.gymLevel;
    if (document.getElementById('best-streak-val')) document.getElementById('best-streak-val').innerText = gameState.bestEverStreak;
    if (document.getElementById('total-wins-val')) document.getElementById('total-wins-val').innerText = gameState.totalGymWins;
    if (document.getElementById('gym-name-display')) document.getElementById('gym-name-display').innerText = gameState.gymName;
    if (gameState.gymLogo && document.getElementById('gym-logo-img')) document.getElementById('gym-logo-img').src = gameState.gymLogo;
}

function renderStable() {
    const list = document.getElementById('stable-list');
    if (gameState.stable.length === 0) { list.innerHTML = `<p class="text-muted">No fighters.</p>`; return; }
    list.innerHTML = gameState.stable.map((f, i) => {
        const isVeteran = (f.age || 20) >= 33;
        return `
            <div class="action-card" style="text-align:center;">
                <div style="font-size: 3rem;">${f.emoji || '🥋'}</div>
                <h3 style="color:#f59e0b;">${f.name}</h3>
                <p style="font-size: 0.7rem; color: ${isVeteran ? '#ef4444' : '#94a3b8'};"><b>Age: ${f.age}</b></p>
                <p>💥 ${f.striking} | 🤼 ${f.grappling}</p>
                <button class="btn-primary" onclick="trainFighter(${i}, 'striking')" style="background:#3b82f6;">Strike</button>
                <button class="btn-primary" onclick="trainFighter(${i}, 'grappling')" style="background:#8b5cf6;">Grapple</button>
                <button class="btn-primary" onclick="simulateFight(${i})" style="background:#10b981; width:100%; margin-top:5px;">Fight (⚡2)</button>
                ${f.wins >= 5 ? `<button onclick="retireFighter(${i})" style="color:#ef4444; background:none; border:none; cursor:pointer;">Ascend</button>` : ''}
            </div>`;
    }).join('');
}

function renderShop() {
    const list = document.getElementById('shop-list');
    const items = [
        { id: 'medical', name: 'Medical Wing', cost: 1500, desc: 'Reduces veteran stat decline.' },
        { id: 'lab', name: 'Performance Lab', cost: 2000, desc: 'Increases training efficiency (+1).' },
        { id: 'marketing', name: 'Marketing Suite', cost: 1000, desc: 'Double Sponsorship points.' }
    ];
    list.innerHTML = items.map(item => `
        <div class="action-card" style="text-align:center;">
            <h3>${item.name}</h3>
            <p style="font-size:0.8rem; color:#94a3b8;">${item.desc}</p>
            <button class="btn-primary" onclick="buyUpgrade('${item.id}', ${item.cost})" 
                style="width:100%; background:${gameState.upgrades[item.id] ? '#475569' : '#10b981'};">
                ${gameState.upgrades[item.id] ? 'OWNED' : 'BUY (💰' + item.cost + ')'}
            </button>
        </div>
    `).join('');
}

function renderMarket() {
    const list = document.getElementById('market-list');
    list.innerHTML = gameState.marketFighters.map((f, i) => `
        <div class="action-card" style="text-align:center;">
            <h3>${f.name}</h3>
            <p>Age: ${f.age} | Cost: 💰${f.cost}</p>
            <button class="btn-primary" onclick="buyFighter(${i})" style="background:#10b981; width:100%;">Sign</button>
        </div>`).join('');
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById('view-' + viewId).style.display = 'block';
    if (viewId === 'stable') renderStable();
    if (viewId === 'shop') renderShop();
    if (viewId === 'market') renderMarket();
}

function saveData() { localStorage.setItem('theCageSave', JSON.stringify(gameState)); }

window.onload = () => {
    const saved = localStorage.getItem('theCageSave');
    if (saved) gameState = {...gameState, ...JSON.parse(saved)};
    if (gameState.marketFighters.length === 0) generateMarketFighters();
    updateUI();
};

const COACH_CODE = "1234";
function openAdminConsole() {
    if (prompt("Enter Coach Access Code:") === COACH_CODE) {
        const action = prompt("1: Give 💰1,000\n2: Refill ⚡\n3: Reset");
        if (action === "1") gameState.points += 1000;
        else if (action === "2") gameState.energy = 10;
        else if (action === "3") { localStorage.removeItem('theCageSave'); location.reload(); return; }
        updateUI(); saveData();
    }
}
