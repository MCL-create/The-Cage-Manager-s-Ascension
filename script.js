let gameState = {
    points: 1300, energy: 15, week: 1, 
    stable: [], marketFighters: [], matches: [], trophies: 0,
    gymLogo: null, gymLevel: 1, gymXP: 0
};

// --- LOGO ---
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

// --- MARKET (15 SLOTS) ---
function generateMarket() {
    const fNames = ["Jax", "Leon", "Remy", "Viktor", "Sloane", "Kenta", "Zane", "Bo", "Dante", "Mika"];
    const lNames = ["Stone", "Viper", "Rage", "Steel", "Cobra", "Rush", "Grit", "Hammer", "Silva"];
    const emojis = ["🥋", "🥊", "🤼", "🥇", "🤜"];
    gameState.marketFighters = Array.from({ length: 15 }, () => {
        const str = 35 + Math.floor(Math.random() * 25) + (gameState.gymLevel * 2);
        const grp = 35 + Math.floor(Math.random() * 25) + (gameState.gymLevel * 2);
        return {
            name: `${fNames[Math.floor(Math.random()*10)]} ${lNames[Math.floor(Math.random()*9)]}`,
            emoji: emojis[Math.floor(Math.random()*5)],
            striking: str, grappling: grp,
            cost: 500 + (str * 9) + (grp * 9),
            status: "Healthy", recoveryWeeks: 0, wins: 0, losses: 0
        };
    });
}

function renderMarket() {
    const list = document.getElementById('market-list');
    if (!list) return;
    list.innerHTML = gameState.marketFighters.map((f, i) => `
        <div class="action-card">
            <span style="font-size:1.5rem">${f.emoji}</span>
            <h3 style="margin:5px 0">${f.name}</h3>
            <p style="font-size:0.7rem">STR: ${f.striking} | GRP: ${f.grappling}</p>
            <button onclick="buyFighter(${i})" ${gameState.points < f.cost ? 'disabled' : ''}>SIGN (💰${f.cost})</button>
        </div>`).join('');
}

function buyFighter(idx) {
    const f = gameState.marketFighters[idx];
    if (gameState.points >= f.cost) {
        gameState.points -= f.cost;
        gameState.stable.push(f);
        gameState.marketFighters.splice(idx, 1);
        updateUI(); renderMarket(); saveData();
    }
}

// --- STABLE & RETIRING ---
function renderStable() {
    const list = document.getElementById('stable-list');
    if (gameState.stable.length === 0) { list.innerHTML = "<p>Stable is empty.</p>"; return; }
    list.innerHTML = gameState.stable.map((f, i) => `
        <div class="action-card">
            <h3>🥊 ${f.name}</h3>
            <p>Record: ${f.wins}-${f.losses}</p>
            <p>Status: <b style="color:${f.status==='Healthy'?'#10b981':'#ef4444'}">${f.status}</b></p>
            <div style="display:flex; gap:10px;">
                <button onclick="simulateFight(${i})" ${f.status !== 'Healthy' ? 'disabled' : ''}>FIGHT</button>
                <button class="retire-btn" onclick="retireFighter(${i})">RETIRE</button>
            </div>
        </div>`).join('');
}

function retireFighter(idx) {
    if (confirm(`Retire ${gameState.stable[idx].name}? This cannot be undone.`)) {
        gameState.stable.splice(idx, 1);
        renderStable();
        saveData();
    }
}

// --- CORE LOOP ---
function processWeekReset() {
    if (gameState.week === 24) return triggerClash("GYM");
    if (gameState.week === 48) return triggerClash("ELITE");
    gameState.week++; gameState.energy = 15;
    generateMarket();
    gameState.stable.forEach(f => { if (f.recoveryWeeks > 0) { f.recoveryWeeks--; if (f.recoveryWeeks === 0) f.status = "Healthy"; } });
    updateUI(); saveData();
}

function updateUI() {
    document.getElementById('points-val').innerText = gameState.points;
    document.getElementById('energy-val').innerText = gameState.energy + "/15";
    document.getElementById('week-val').innerText = gameState.week;
    document.getElementById('gym-level-val').innerText = gameState.gymLevel;
    const xpNeeded = gameState.gymLevel * 1000;
    document.getElementById('xp-bar-fill').style.width = (gameState.gymXP / xpNeeded * 100) + "%";
    const advBtn = document.getElementById('advance-btn');
    if (gameState.week === 24 || gameState.week === 48) {
        advBtn.classList.add('clash-ready'); advBtn.innerText = "ENTER CLASH!";
        document.getElementById('clash-chime').play().catch(()=>{});
    } else {
        advBtn.classList.remove('clash-ready'); advBtn.innerText = "ADVANCE WEEK";
    }
    if (gameState.trophies > 0) document.getElementById('trophy-count').innerText = "🏆x" + gameState.trophies;
    const feed = document.getElementById('news-feed');
    if (gameState.matches.length > 0) {
        feed.innerHTML = gameState.matches.slice(0, 3).map(m => `<div>Wk ${m.week}: ${m.fighter} ${m.result}</div>`).join('');
    }
}

function simulateFight(idx) {
    const f = gameState.stable[idx];
    if (gameState.energy < 1) return alert("Out of Energy!");
    gameState.energy--;
    const win = Math.random() > 0.5;
    gameState.points += win ? 250 : 75;
    f.status = "Fatigued"; f.recoveryWeeks = 1;
    if (win) f.wins++; else f.losses++;
    gameState.matches.unshift({ week: gameState.week, fighter: f.name, result: win ? "WIN" : "LOSS" });
    renderStable(); updateUI(); saveData();
}

// --- VIEWS ---
function showView(v) {
    document.querySelectorAll('.view').forEach(view => view.style.display = 'none');
    document.getElementById('view-' + v).style.display = 'block';
    if (v === 'stable') renderStable();
    if (v === 'market') renderMarket();
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

function runGymClash() {
    const type = window.currentClashType;
    let wins = 0;
    tourneySelection.forEach(idx => { if (Math.random() > 0.5) wins++; gameState.stable[idx].status = "Fatigued"; });
    if (wins > tourneySelection.length / 2) {
        let reward = type === "ELITE" ? 5000 : 1500;
        gameState.points += reward;
        gameState.gymXP += (type === "ELITE" ? 600 : 300);
        if (type === "ELITE") gameState.trophies++;
        if (gameState.gymXP >= (gameState.gymLevel * 1000)) { gameState.gymLevel++; gameState.gymXP = 0; }
        alert("VICTORY!");
    } else { alert("DEFEAT!"); }
    gameState.week = (type === "ELITE") ? 1 : gameState.week + 1;
    showView('dashboard'); updateUI(); saveData();
}

function createFighter() {
    if (gameState.points < 500) return alert("Need 💰500");
    const name = document.getElementById('new-fighter-name').value || "Recruit";
    gameState.stable.push({ name, striking: 45, grappling: 45, status: "Healthy", recoveryWeeks: 0, wins: 0, losses: 0 });
    gameState.points -= 500; document.getElementById('new-fighter-name').value = "";
    showView('stable'); updateUI(); saveData();
}

function forceHeal() { gameState.energy = 15; gameState.stable.forEach(f => { f.status = "Healthy"; f.recoveryWeeks = 0; }); updateUI(); renderStable(); }
function saveData() { localStorage.setItem('theCageSave', JSON.stringify(gameState)); }

window.onload = () => {
    const saved = localStorage.getItem('theCageSave');
    if (saved) gameState = Object.assign(gameState, JSON.parse(saved));
    if (gameState.marketFighters.length === 0) generateMarket();
    renderLogo(); updateUI();
};
