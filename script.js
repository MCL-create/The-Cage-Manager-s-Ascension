let gameState = {
    points: 1300, energy: 15, week: 1, 
    stable: [], matches: [], trophies: 0,
    gymLogo: null, gymLevel: 1, gymXP: 0
};

// --- IMAGE HANDLING ---
function handleLogoUpload(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = e => { gameState.gymLogo = e.target.result; renderLogo(); saveData(); };
        reader.readAsDataURL(file);
    }
}

function renderLogo() {
    const img = document.getElementById('gym-logo-img');
    const placeholder = document.getElementById('pic-placeholder');
    if (gameState.gymLogo && img) {
        img.src = gameState.gymLogo; img.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
    }
}

// --- LEVELING & XP ---
function updateUI() {
    document.getElementById('points-val').innerText = gameState.points;
    document.getElementById('energy-val').innerText = gameState.energy + "/15";
    document.getElementById('week-val').innerText = gameState.week;
    document.getElementById('gym-level-val').innerText = gameState.gymLevel;

    // XP Bar Calculation
    const xpNeeded = gameState.gymLevel * 1000;
    const xpPercent = (gameState.gymXP / xpNeeded) * 100;
    document.getElementById('xp-bar-fill').style.width = xpPercent + "%";

    // Clash Button Audio and Color
    const advBtn = document.getElementById('advance-btn');
    if (gameState.week === 24 || gameState.week === 48) {
        if (!advBtn.classList.contains('clash-ready')) {
            advBtn.classList.add('clash-ready');
            advBtn.innerText = "ENTER CLASH!";
            document.getElementById('clash-chime').play().catch(e => {});
        }
    } else {
        advBtn.classList.remove('clash-ready');
        advBtn.innerText = "ADVANCE WEEK";
    }

    if (gameState.trophies > 0) document.getElementById('trophy-count').innerText = "🏆 x" + gameState.trophies;
    
    const feed = document.getElementById('news-feed');
    if (gameState.matches.length > 0) {
        feed.innerHTML = gameState.matches.slice(0, 3).map(m => `<div>Wk ${m.week}: ${m.fighter} ${m.result}</div>`).join('');
    }
}

// --- CLASH SYSTEM ---
function runGymClash() {
    const type = window.currentClashType;
    let wins = 0;
    tourneySelection.forEach(idx => { if (Math.random() > 0.5) wins++; gameState.stable[idx].status = "Fatigued"; });

    if (wins > tourneySelection.length / 2) {
        let reward = type === "ELITE" ? 5000 : 1500;
        let xpReward = type === "ELITE" ? 600 : 300;
        gameState.points += reward;
        gameState.gymXP += xpReward;
        if (type === "ELITE") gameState.trophies++;
        
        // Check Level Up
        if (gameState.gymXP >= (gameState.gymLevel * 1000)) {
            gameState.gymLevel++; gameState.gymXP = 0;
            alert("LEVEL UP! Check the Shop for new gear.");
        }
        alert("GYM VICTORY! +💰" + reward + " & +" + xpReward + "XP");
    } else { alert("DEFEAT!"); }
    
    gameState.week = (type === "ELITE") ? 1 : gameState.week + 1;
    showView('dashboard'); updateUI(); saveData();
}

// --- SHOP ---
function renderShop() {
    const list = document.getElementById('shop-list');
    const items = [
        { name: "Heavy Bag", cost: 1000, lvl: 1, desc: "Recruits start with +5 Strike" },
        { name: "Mat Room", cost: 2500, lvl: 2, desc: "Recruits start with +5 Grapple" },
        { name: "Physio Hub", cost: 6000, lvl: 3, desc: "Instantly heal one fighter/week" }
    ];
    list.innerHTML = items.map(item => {
        const locked = gameState.gymLevel < item.lvl;
        return `<div class="action-card" style="opacity:${locked ? 0.5 : 1}">
            <h3>${item.name}</h3><p>${item.desc}</p><b>💰${item.cost}</b><br>
            <button onclick="buyItem('${item.name}', ${item.cost})" ${locked || gameState.points < item.cost ? 'disabled' : ''}>${locked ? 'LVL '+item.lvl : 'BUY'}</button>
        </div>`;
    }).join('');
}

// --- CORE UTILS ---
function processWeekReset() {
    if (gameState.week === 24) return triggerClash("GYM");
    if (gameState.week === 48) return triggerClash("ELITE");
    gameState.week++; gameState.energy = 15;
    gameState.stable.forEach(f => { if (f.recoveryWeeks > 0) { f.recoveryWeeks--; if (f.recoveryWeeks === 0) f.status = "Healthy"; } });
    updateUI(); saveData();
}

function showView(v) {
    document.querySelectorAll('.view').forEach(view => view.style.display = 'none');
    document.getElementById('view-' + v).style.display = 'block';
    if (v === 'stable') renderStable();
    if (v === 'shop') renderShop();
}

function simulateFight(idx) {
    const f = gameState.stable[idx];
    if (gameState.energy < 1) return alert("Out of Energy!");
    gameState.energy--;
    const win = Math.random() > 0.5;
    gameState.points += win ? 250 : 75;
    f.status = "Fatigued"; f.recoveryWeeks = 1;
    gameState.matches.unshift({ week: gameState.week, fighter: f.name, result: win ? "WIN" : "LOSS" });
    renderStable(); updateUI(); saveData();
}

function createFighter() {
    if (gameState.points < 500) return alert("Need 💰500");
    const name = document.getElementById('new-fighter-name').value || "Recruit";
    gameState.stable.push({ name, status: "Healthy", recoveryWeeks: 0 });
    gameState.points -= 500; document.getElementById('new-fighter-name').value = "";
    showView('stable'); updateUI(); saveData();
}

function renderStable() {
    const list = document.getElementById('stable-list');
    list.innerHTML = gameState.stable.map((f, i) => `
        <div class="action-card"><h3>🥊 ${f.name}</h3><p>Status: ${f.status}</p>
        <button onclick="simulateFight(${i})" ${f.status !== 'Healthy' ? 'disabled' : ''}>FIGHT NOW</button></div>`).join('');
}

function triggerClash(type) {
    window.currentClashType = type; showView('tournament');
    document.getElementById('tourney-status').innerHTML = `<h2>${type} CLASH</h2>`;
    tourneySelection = []; renderTourneyRoster();
}

let tourneySelection = [];
function renderTourneyRoster() {
    const list = document.getElementById('tourney-roster');
    const btn = document.getElementById('start-clash-btn');
    btn.style.display = tourneySelection.length > 0 ? 'block' : 'none';
    list.innerHTML = gameState.stable.map((f, i) => `
        <div class="action-card"><b>${f.name}</b><br>
        <button onclick="toggleTourney(${i})">${tourneySelection.includes(i) ? 'REMOVE' : 'SELECT'}</button></div>`).join('');
}

function toggleTourney(idx) {
    if (tourneySelection.includes(idx)) tourneySelection = tourneySelection.filter(id => id !== idx);
    else if (tourneySelection.length < 6) tourneySelection.push(idx);
    renderTourneyRoster();
}

function forceHeal() { gameState.energy = 15; gameState.stable.forEach(f => { f.status = "Healthy"; f.recoveryWeeks = 0; }); updateUI(); renderStable(); }
function saveData() { localStorage.setItem('theCageSave', JSON.stringify(gameState)); }

window.onload = () => {
    const saved = localStorage.getItem('theCageSave');
    if (saved) gameState = Object.assign(gameState, JSON.parse(saved));
    renderLogo(); updateUI();
};
