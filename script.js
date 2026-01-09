let gameState = {
    points: 1300, energy: 15, week: 1, 
    stable: [], matches: [], trophies: 0,
    gymLogo: null,
    gymXP: 0, gymLevel: 1 // New Leveling State
};

// --- UPDATED CLASH REWARDS ---
function runGymClash() {
    const type = window.currentClashType;
    let wins = 0;
    tourneySelection.forEach(idx => {
        if (Math.random() > 0.5) wins++;
        gameState.stable[idx].status = "Fatigued";
    });

    if (wins > tourneySelection.length / 2) {
        let reward = type === "ELITE" ? 5000 : 1500;
        let xpGain = type === "ELITE" ? 500 : 200; // Earn XP for victory
        
        gameState.points += reward;
        gameState.gymXP += xpGain;
        
        if (type === "ELITE") gameState.trophies++;
        
        checkLevelUp();
        alert(`CLASH VICTORY! +💰${reward} and +${xpGain} Gym XP!`);
    } else {
        alert("GYM DEFEAT!");
    }
    gameState.week = (type === "ELITE") ? 1 : gameState.week + 1;
    showView('dashboard');
    updateUI();
    saveData();
}

function checkLevelUp() {
    const nextLevelXP = gameState.gymLevel * 1000;
    if (gameState.gymXP >= nextLevelXP) {
        gameState.gymLevel++;
        gameState.gymXP = 0;
        alert(`🏆 GYM LEVEL UP! You are now Level ${gameState.gymLevel}. New equipment unlocked in Shop!`);
    }
}

// --- DYNAMIC SHOP RENDERING ---
function renderShop() {
    const list = document.getElementById('shop-list');
    if (!list) return;

    const items = [
        { name: "Heavy Bag", cost: 1000, req: 1, desc: "+5 Strike to new recruits" },
        { name: "Wrestling Mats", cost: 2000, req: 2, desc: "+5 Grapple to new recruits" },
        { name: "Recovery Spa", cost: 5000, req: 3, desc: "Fighters heal in 1 week" }
    ];

    list.innerHTML = items.map(item => {
        const locked = gameState.gymLevel < item.req;
        return `
            <div class="action-card" style="opacity: ${locked ? 0.5 : 1}">
                <h3>${item.name}</h3>
                <p>${item.desc}</p>
                <p><b>Cost: 💰${item.cost}</b></p>
                <button onclick="buyUpgrade('${item.name}', ${item.cost})" ${locked ? 'disabled' : ''}>
                    ${locked ? `Unlock at Lvl ${item.req}` : 'BUY'}
                </button>
            </div>
        `;
    }).join('');
}
