// --- 1. GAME STATE & DATA POOLS ---
let gameState = {
    points: 1000, 
    energy: 10, 
    week: 1, 
    stable: [], 
    matches: [], 
    marketFighters: [], 
    gymXP: 0,
    gymLevel: 1,
    gymName: "The Cage Gym", // Custom Gym Name
    gymLogo: null,           // Base64 Image Data
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

// --- 2. CUSTOMIZATION LOGIC (LOGO & NAME) ---

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
    // Clean up extra spaces or line breaks from contenteditable
    const cleanedName = newName.replace(/\n/g, " ").trim();
    gameState.gymName = cleanedName || "The Cage Gym";
    saveData();
}

// --- 3. CORE PROGRESSION ---

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
    
    let bonusText = "";
    if (gameState.gymLevel >= 3) {
        const bonus = gameState.gymLevel * 100;
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
    
    if (gameState.energy < 4) return alert("Calling out a pro takes 4 Energy (⚡)!");

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
        if (fighter.streak > gameState.bestEverStreak) {
            gameState.bestEverStreak = fighter.streak;
        }
        addGymXP(matchType.includes("Call-out") ? 300 : 150); 
    } else {
        fighter.losses++;
        fighter.streak = 0; 
        addGymXP(50);  
    }
    
    gameState.points += prize;
    gameState.matches.push({
        week: gameState.week,
        fighter: fighter.name,
        result: result,
        earnings: prize,
        type: matchType
    });

    alert(`${result}! ${fighter.name} earned 💰${prize} in a ${matchType}`);
    updateUI();
    renderStable();
    saveData();
}

function trainFighter(index, stat) {
    if (gameState.points < 100) return alert("Not enough points!");
    const gain = Math.floor(Math.random() * 4) + 2;
    gameState.stable[index][stat] += gain;
    gameState.points -= 100;
    
    updateUI();
    renderStable();
    saveData();
}

function retireFighter(index) {
    const fighter = gameState.stable[index];
    if (fighter.wins < 5) return alert("Fighter needs 5 wins to Ascend!");

    if (confirm(`Retire ${fighter.name} to the Hall of Fame?`)) {
        addGymXP(fighter.wins * 100);
        gameState.stable.splice(index, 1);
        renderStable();
        updateUI();
        saveData();
    }
}

// --- 5. RECRUITMENT ---

function createFighter() {
    const nameInput = document.getElementById('new-fighter-name');
    const name = nameInput.value || "Recruit";
    const sliderVal = parseInt(document.getElementById('style-slider').value);

    if (gameState.points < 500) return alert("Need 500 points!");

    const randomEmoji = recruitEmojis[Math.floor(Math.random() * recruitEmojis.length)];

    gameState.stable.push({
        name: name,
        emoji: randomEmoji,
        striking: 40 + Math.floor(sliderVal / 2),
        grappling: 40 + Math.floor((100 - sliderVal) / 2),
        wins: 0, losses: 0, streak: 0
    });

    gameState.points -= 500;
    nameInput.value = "";
    updateUI();
    showView('stable');
    saveData();
}

function generateMarketFighters() {
    gameState.marketFighters = [];
    for (let i = 0; i < 3; i++) {
        const choice = namePool[Math.floor(Math.random() * namePool.length)];
        const strike = 40 + Math.floor(Math.random() * 30) + (gameState.week * 2);
        const grapple = 40 + Math.floor(Math.random() * 30) + (gameState.week * 2);
        
        gameState.marketFighters.push({
            name: choice.n,
            emoji: choice.e,
            striking: strike,
            grappling: grapple,
            cost: 400 + (strike + grapple) * 2,
            bio: bioPool[Math.floor(Math.random() * bioPool.length)]
        });
    }
}

function buyFighter(index) {
    const fighter = gameState.marketFighters[index];
    if (gameState.points < fighter.cost) return alert("Not enough points!");
    gameState.stable.push({
        name: fighter.name,
        emoji: fighter.emoji,
        striking: fighter.striking,
        grappling: fighter.grappling,
        wins: 0, losses: 0, streak: 0
    });
    gameState.points -= fighter.cost;
    gameState.marketFighters.splice(index, 1);
    updateUI();
    renderMarket();
    saveData();
}

// --- 6. UI & SYSTEM ---

function updateUI() {
    // Header Stats
    document.getElementById('points-val').innerText = gameState.points.toLocaleString();
    document.getElementById('energy-val').innerText = `${gameState.energy}/10`;
    document.getElementById('week-val').innerText = gameState.week;

    // Gym XP & Rank
    const xpNeeded = gameState.gymLevel * 500;
    const percentage = (gameState.gymXP / xpNeeded) * 100;
    const xpBar = document.getElementById('xp-bar');
    if (xpBar) xpBar.style.width = percentage + "%";
    
    if (document.getElementById('gym-level-val')) document.getElementById('gym-level-val').innerText = gameState.gymLevel;
    if (document.getElementById('best-streak-val')) document.getElementById('best-streak-val').innerText = gameState.bestEverStreak;
    if (document.getElementById('total-wins-val')) document.getElementById('total-wins-val').innerText = gameState.totalGymWins;

    // Customization Load
    if (document.getElementById('gym-name-display')) document.getElementById('gym-name-display').innerText = gameState.gymName;
    if (gameState.gymLogo && document.getElementById('gym-logo-img')) {
        document.getElementById('gym-logo-img').src = gameState.gymLogo;
    }

    let rank = "Rookie Gym";
    if (gameState.gymLevel >= 3) rank = "Pro Center";
    if (gameState.gymLevel >= 5) rank = "Elite Academy";
    if (document.getElementById('gym-rank-text')) document.getElementById('gym-rank-text').innerText = rank;
}

function renderStable() {
    const list = document.getElementById('stable-list');
    if (gameState.stable.length === 0) {
        list.innerHTML = `<p class="text-muted">No fighters signed yet.</p>`;
        return;
    }

    list.innerHTML = gameState.stable.map((f, i) => {
        const isChamp = f.streak >= 5;
        const rivalOptions = rivalPool.map((r, ri) => 
            `<option value="${ri}">${r.emoji} ${r.name} (S:${r.striking}/G:${r.grappling})</option>`
        ).join('');

        return `
            <div class="action-card" style="text-align:center; border: ${isChamp ? '2px solid #f59e0b' : '1px solid #334155'};">
                <div style="font-size: 3rem; margin-bottom: 5px;">${f.emoji || '🥋'}</div>
                <h3 style="color:#f59e0b; margin-bottom:2px;">${f.name} ${isChamp ? '🏆' : ''}</h3>
                <p style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 10px;">Streak: ${f.streak || 0}</p>
                <p>💥 ${f.striking} | 🤼 ${f.grappling}</p>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-top:10px;">
                    <button class="btn-primary" onclick="trainFighter(${i}, 'striking')" style="background:#3b82f6; font-size:0.6rem;">Train Strike</button>
                    <button class="btn-primary" onclick="trainFighter(${i}, 'grappling')" style="background:#8b5cf6; font-size:0.6rem;">Train Grapple</button>
                </div>

                <button class="btn-primary" onclick="simulateFight(${i})" style="background:#10b981; margin-top:10px; width:100%;">Standard Fight (⚡2)</button>
                
                <div style="margin-top:15px; border-top:1px solid #334155; padding-top:10px;">
                    <p style="font-size:0.7rem; color:#f59e0b;"><b>CALL OUT RIVAL (⚡4)</b></p>
                    <select id="rival-select-${i}" style="width:100%; background:#1e293b; color:white; border:1px solid #f59e0b; padding:5px; border-radius:5px; font-size:0.7rem;">
                        ${rivalOptions}
                    </select>
                    <button class="btn-primary" onclick="callOutFight(${i}, document.getElementById('rival-select-${i}').value)" style="background:#ef4444; margin-top:5px; width:100%; font-size:0.7rem;">Challenge Rival</button>
                </div>

                ${f.wins >= 5 ? `<button onclick="retireFighter(${i})" style="background:transparent; color:#ef4444; border:none; font-size:0.6rem; margin-top:10px; cursor:pointer;">Ascend to Hall of Fame</button>` : ''}
            </div>
        `;
    }).join('');
}

function renderMarket() {
    const list = document.getElementById('market-list');
    if (!gameState.marketFighters || gameState.marketFighters.length === 0) {
        list.innerHTML = `<p class="text-muted">No fighters available.</p>`;
        return;
    }
    list.innerHTML = gameState.marketFighters.map((f, i) => `
        <div class="action-card" style="text-align:center;">
            <div style="font-size: 3.5rem; margin-bottom: 5px;">${f.emoji || '👤'}</div>
            <h3 style="color:#f59e0b; margin-bottom:2px;">${f.name}</h3>
            <p>💥 ${f.striking} | 🤼 ${f.grappling}</p>
            <button class="btn-primary" onclick="buyFighter(${i})" style="background:#10b981; margin-top:10px; width:100%;">Sign (💰${f.cost})</button>
        </div>
    `).join('');
}

function renderHistory() {
    const list = document.getElementById('history-list');
    if (!gameState.matches || gameState.matches.length === 0) {
        list.innerHTML = `<p class="text-muted">No history yet.</p>`;
        return;
    }
    list.innerHTML = gameState.matches.slice().reverse().map(m => `
        <div class="action-card" style="border-left: 5px solid ${m.result === 'WIN' ? '#10b981' : '#ef4444'}">
            <div style="display:flex; justify-content:space-between; font-size:0.8rem;">
                <strong>${m.fighter}</strong>
                <span style="color:#f59e0b">${m.type}</span>
            </div>
            <p style="margin-top:5px; font-size:0.7rem;">Result: <b>${m.result}</b> | Earnings: 💰${m.earnings}</p>
        </div>
    `).join('');
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    const targetView = document.getElementById('view-' + viewId);
    if (targetView) targetView.style.display = 'block';
    if (viewId === 'stable') renderStable();
    if (viewId === 'history') renderHistory();
    if (viewId === 'market') renderMarket();
}

function saveData() { 
    localStorage.setItem('theCageSave', JSON.stringify(gameState)); 
}

window.onload = () => {
    const saved = localStorage.getItem('theCageSave');
    if (saved) {
        const parsed = JSON.parse(saved);
        // Merge saved data into default gameState
        gameState = {...gameState, ...parsed}; 
    }
    if (gameState.marketFighters.length === 0) generateMarketFighters();
    updateUI();
// --- COACH ADMIN CONSOLE ---
const COACH_CODE = "1234"; // You can change this to your own secret code

function openAdminConsole() {
    const code = prompt("Enter Coach Access Code:");
    
    if (code === COACH_CODE) {
        const action = prompt(
            "COACH CONSOLE LOADED\n" +
            "1: Give 💰1,000 Points\n" +
            "2: Refill ⚡ Energy\n" +
            "3: Reset Gym (Wipe Everything)"
        );

        if (action === "1") {
            gameState.points += 1000;
            alert("💰 1,000 Points added to the budget.");
        } else if (action === "2") {
            gameState.energy = 10;
            alert("⚡ Energy fully restored.");
        } else if (action === "3") {
            if (confirm("Are you sure? This will delete ALL progress.")) {
                localStorage.removeItem('theCageSave');
                location.reload();
                return;
            }
        }
        
        updateUI();
        saveData();
    } else {
        alert("Access Denied: Incorrect Coach Code.");
    }
}
};

