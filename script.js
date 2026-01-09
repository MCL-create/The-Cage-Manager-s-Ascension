let gameState = {
    points: 1300, energy: 15, week: 1, 
    stable: [], marketFighters: [], matches: [], trophies: 0,
    gymLogo: null, gymLevel: 1, gymXP: 0,
    specialization: null, activeGrudge: null,
    gymRep: 500, totalMoneyEarned: 1300, totalSponsorMoney: 0, careerWins: 0, careerLosses: 0,
    rivals: [
        { name: "Iron Dojo", rep: 600 }, { name: "Shadow Combat", rep: 550 },
        { name: "Apex MMA", rep: 480 }, { name: "Titan Gym", rep: 420 }
    ]
};

// --- CORE UTILS ---
function saveData() { localStorage.setItem('theCageSave_v2', JSON.stringify(gameState)); }
function showView(v) {
    document.querySelectorAll('.view').forEach(view => view.style.display = 'none');
    document.getElementById('view-' + v).style.display = 'block';
    if (v === 'stable') renderStable();
    if (v === 'market') renderMarket();
    if (v === 'leaderboard') renderLeaderboard();
    if (v === 'stats') renderStats();
    if (v === 'shop') renderShop();
}

// --- REPUTATION & LEADERBOARD ---
function updateReputation(win, type = "normal") {
    let change = win ? 25 : -15;
    if (type === "grudge") change = win ? 75 : -40;
    if (type === "clash") change = win ? 150 : -100;
    gameState.gymRep += change;
    gameState.rivals.forEach(r => r.rep += Math.floor(Math.random() * 21) - 8);
}

function renderLeaderboard() {
    const list = document.getElementById('leaderboard-body');
    let all = [{ name: "The Cage (You)", rep: gameState.gymRep, isPlayer: true }, ...gameState.rivals];
    all.sort((a, b) => b.rep - a.rep);
    list.innerHTML = all.map((g, i) => `
        <tr style="${g.isPlayer ? 'background: #1e293b; color: #fbbf24;' : ''}">
            <td style="padding: 12px;">#${i + 1}</td><td>${g.name}</td><td>${g.rep}</td>
        </tr>`).join('');
}

// --- ECONOMY ---
function calculateSponsorBonus() {
    let all = [{ rep: gameState.gymRep, isPlayer: true }, ...gameState.rivals].sort((a, b) => b.rep - a.rep);
    const rank = all.findIndex(g => g.isPlayer) + 1;
    let b = rank === 1 ? 1000 : rank === 2 ? 500 : rank === 3 ? 200 : 0;
    return { bonus: b, rank };
}

// --- FIGHTING & HISTORY ---
function simulateFight(idx) {
    const f = gameState.stable[idx]; if (gameState.energy < 1) return alert("No Energy!");
    gameState.energy--; 
    let winChance = 0.5 + (gameState.specialization === 'Grappler' ? 0.07 : 0);
    const win = Math.random() < winChance;
    let prize = win ? 250 : 75;
    if (win && gameState.specialization === 'Striker') prize = Math.floor(prize * 1.15);
    
    gameState.points += prize; gameState.totalMoneyEarned += prize;
    if (win) { f.wins++; gameState.careerWins++; f.history.unshift('W'); } 
    else { f.losses++; gameState.careerLosses++; f.history.unshift('L'); }
    if (f.history.length > 5) f.history.pop();

    f.status = "Fatigued"; f.recoveryWeeks = 1;
    updateReputation(win, "normal");
    updateUI(); renderStable(); saveData();
}

// --- STABLE & MARKET ---
function renderStable() {
    const list = document.getElementById('stable-list');
    list.innerHTML = gameState.stable.map((f, i) => `
        <div class="action-card">
            <h3>🥊 ${f.name}</h3>
            <div style="margin-bottom:10px;">
                ${f.history.map(r => `<span class="history-dot" style="background:${r==='W'?'#10b981':'#ef4444'}"></span>`).join('')}
            </div>
            <p>Record: ${f.wins}-${f.losses}</p>
            <p>Status: <b style="color:${f.status==='Healthy'?'#10b981':'#ef4444'}">${f.status}</b></p>
            <div style="display:flex; justify-content:space-between;">
                <button onclick="simulateFight(${i})" ${f.status !== 'Healthy' ? 'disabled' : ''}>FIGHT</button>
                <button class="retire-btn" onclick="retireFighter(${i})">RETIRE</button>
            </div>
        </div>`).join('');
}

function generateMarket() {
    const names = ["Cody", "Max", "Leo", "Jax", "Kai", "Bo"];
    gameState.marketFighters = Array.from({ length: 15 }, () => {
        const s = 40 + Math.floor(Math.random() * 20) + (gameState.gymLevel * 2);
        return { 
            name: names[Math.floor(Math.random() * 6)] + " " + (10 + Math.floor(Math.random() * 89)),
            striking: s, grappling: 45, cost: 500 + (s * 10),
            status: "Healthy", recoveryWeeks: 0, wins: 0, losses: 0, history: []
        };
    });
}

function renderMarket() {
    const list = document.getElementById('market-list');
    list.innerHTML = gameState.marketFighters.map((f, i) => `
        <div class="action-card">
            <h3>👤 ${f.name}</h3><p>STR: ${f.striking} | GRP: ${f.grappling}</p>
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

// --- WEEK PROGRESSION ---
function processWeekReset() {
    if (gameState.week === 24) return triggerClash("GYM");
    if (gameState.week === 48) return triggerClash("ELITE");

    const s = calculateSponsorBonus();
    gameState.points += s.bonus; gameState.totalSponsorMoney += s.bonus;
    gameState.totalMoneyEarned += s.bonus;

    gameState.week++; gameState.energy = 15;
    generateMarket(); handleRivalLogic();
    gameState.stable.forEach(f => { if (f.recoveryWeeks > 0) { f.recoveryWeeks--; if (f.recoveryWeeks === 0) f.status = "Healthy"; } });
    updateUI(); saveData();
}

function handleRivalLogic() {
    const r = gameState.rivals[Math.floor(Math.random() * 4)];
    if (Math.random() < 0.25) {
        gameState.activeGrudge = { rival: r.name };
        document.getElementById('rival-alert').style.display = 'block';
    } else {
        gameState.activeGrudge = null;
        document.getElementById('rival-alert').style.display = 'none';
        updateNews(`${r.name} is climbing the rankings.`);
    }
}

function triggerGrudgeMatch() {
    showView('grudge');
    document.getElementById('grudge-desc').innerText = `${gameState.activeGrudge.rival} challenge! Winner: 💰500.`;
    document.getElementById('grudge-selection').innerHTML = gameState.stable.map((f, i) => `
        <button class="action-card" onclick="runGrudgeMatch(${i})">Send ${f.name}</button>`).join('');
}

function runGrudgeMatch(idx) {
    const win = Math.random() > 0.45;
    if (win) { gameState.points += 500; gameState.totalMoneyEarned += 500; gameState.gymXP += 200; alert("Grudge Won!"); }
    else { alert("Lost the grudge!"); }
    updateReputation(win, "grudge");
    gameState.stable[idx].status = "Fatigued"; gameState.stable[idx].recoveryWeeks = 2;
    gameState.activeGrudge = null;
    showView('dashboard'); updateUI(); checkLevelUp(); saveData();
}

// --- UI & SPECIALIZATION ---
function updateUI() {
    document.getElementById('points-val').innerText = gameState.points;
    document.getElementById('energy-val').innerText = gameState.energy + "/15";
    document.getElementById('week-val').innerText = gameState.week;
    document.getElementById('gym-level-val').innerText = gameState.gymLevel;
    document.getElementById('xp-bar-fill').style.width = (gameState.gymXP / (gameState.gymLevel * 1000) * 100) + "%";
    
    const s = calculateSponsorBonus();
    document.getElementById('sponsor-payout').innerText = `💰${s.bonus} / week`;

    const advBtn = document.getElementById('advance-btn');
    if (gameState.week === 24 || gameState.week === 48) {
        advBtn.classList.add('clash-ready'); advBtn.innerText = "ENTER CLASH!";
        document.getElementById('clash-chime').play().catch(()=>{});
    } else {
        advBtn.classList.remove('clash-ready'); advBtn.innerText = "ADVANCE WEEK";
    }
}

function checkLevelUp() {
    if (gameState.gymXP >= (gameState.gymLevel * 1000)) {
        gameState.gymLevel++; gameState.gymXP = 0;
        if (gameState.gymLevel === 5) showView('specialization');
        updateUI();
    }
}

function selectSpecialization(type) {
    gameState.specialization = type;
    gameState.stable.forEach(f => { if(type === 'Striker') f.striking += 10; else f.grappling += 10; });
    showView('dashboard'); updateUI(); saveData();
}

function renderStats() {
    document.getElementById('stat-total-money').innerText = `💰${gameState.totalMoneyEarned}`;
    document.getElementById('stat-sponsor-total').innerText = `💰${gameState.totalSponsorMoney}`;
    const total = gameState.careerWins + gameState.careerLosses;
    const winPct = total > 0 ? Math.round((gameState.careerWins / total) * 100) : 0;
    document.getElementById('stat-wl-ratio').innerText = winPct + "%";
    document.getElementById('win-bar').style.width = winPct + "%";
    document.getElementById('loss-bar').style.width = (100 - winPct) + "%";
    if (gameState.stable.length > 0) {
        const best = [...gameState.stable].sort((a,b)=>b.wins - a.wins)[0];
        document.getElementById('hof-content').innerHTML = `<h4>${best.name}</h4><p>${best.wins} Wins</p>`;
    }
}

// --- BOILERPLATE ---
function updateNews(m) { document.getElementById('news-feed').innerHTML = `<div>${m}</div>` + document.getElementById('news-feed').innerHTML; }
function handleLogoUpload(i) {
    const reader = new FileReader();
    reader.onload = e => { gameState.gymLogo = e.target.result; renderLogo(); saveData(); };
    reader.readAsDataURL(i.files[0]);
}
function renderLogo() { if(gameState.gymLogo) { document.getElementById('gym-logo-img').src = gameState.gymLogo; document.getElementById('gym-logo-img').style.display='block'; document.getElementById('pic-placeholder').style.display='none'; } }
function createFighter() {
    if (gameState.points < 500) return alert("Need 500");
    gameState.points -= 500;
    gameState.stable.push({ name: document.getElementById('new-fighter-name').value || "Recruit", striking: 45, grappling: 45, status: "Healthy", recoveryWeeks: 0, wins: 0, losses: 0, history: [] });
    showView('stable'); updateUI(); saveData();
}
function retireFighter(i) { if(confirm("Retire?")) { gameState.stable.splice(i,1); renderStable(); saveData(); } }
function forceHeal() { gameState.energy = 15; gameState.stable.forEach(f=> { f.status="Healthy"; f.recoveryWeeks=0; }); updateUI(); }

window.onload = () => {
    const saved = localStorage.getItem('theCageSave_v2');
    if (saved) gameState = Object.assign(gameState, JSON.parse(saved));
    if (gameState.marketFighters.length === 0) generateMarket();
    renderLogo(); updateUI();
};
