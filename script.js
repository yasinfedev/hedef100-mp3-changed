/* script.js */
document.getElementById('bgMusic').volume = 0.1;
const GRID_SIZE = 10;
let score = 0, history = [], undoRights = 3, timer = 0, timerInterval = null, isMusicPlaying = false, audioUnlocked = false;
const clickSfx = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-simple-game-countdown-921.mp3');
const errorSfx = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-negative-tone-interface-608.mp3');

function togglePanel(id, iconId) { 
    const p = document.getElementById(id); 
    const i = document.getElementById(iconId); 
    p.classList.toggle('open'); 
    i.innerText = p.classList.contains('open') ? '▲' : '▼'; 
}

function unlockAudio() { 
    if (!audioUnlocked) { 
        clickSfx.play().then(() => { clickSfx.pause(); audioUnlocked = true; }); 
    } 
}

function initBoard() {
    const b = document.getElementById('game-board'); b.innerHTML = '';
    for (let y = 1; y <= 10; y++) { 
        for (let x = 1; x <= 10; x++) {
            const c = document.createElement('div'); 
            c.id = `x${x}y${y}`; 
            c.className = 'cell clickable'; 
            c.onclick = () => handleCellClick(x, y); 
            b.appendChild(c);
        } 
    }
    updateLeaderboard(); 
    updateUI();
}

function handleCellClick(x, y) {
    const t = document.getElementById(`x${x}y${y}`);
    if (!t.classList.contains('clickable')) { errorSfx.currentTime = 0; errorSfx.play(); return; }
    if (score === 0) startTimer();
    clickSfx.currentTime = 0; clickSfx.play();
    const prev = document.querySelector('.last-clicked');
    if (prev) { prev.classList.remove('last-clicked'); prev.classList.add('clicked'); }
    score++; t.innerText = score; t.classList.add('clicked', 'last-clicked'); t.classList.remove('clickable');
    history.push({x, y}); 
    updateUI(); 
    calculateNextMoves(x, y);
}

function calculateNextMoves(x, y) {
    document.querySelectorAll('.cell.clickable').forEach(c => c.classList.remove('clickable'));
    const moves = [{dx:3,dy:0},{dx:-3,dy:0},{dx:0,dy:3},{dx:0,dy:-3},{dx:2,dy:2},{dx:-2,dy:-2},{dx:2,dy:-2},{dx:-2,dy:2}];
    let count = 0;
    moves.forEach(m => {
        const nx = x + m.dx, ny = y + m.dy;
        if (nx > 0 && nx < 11 && ny > 0 && ny < 11) {
            const cell = document.getElementById(`x${nx}y${ny}`);
            if (cell && !cell.classList.contains('clicked')) { cell.classList.add('clickable'); count++; }
        }
    });
    if (count === 0 && score > 0) endGame();
}

function startTimer() { 
    if(!timerInterval) {
        timerInterval = setInterval(() => { 
            timer++; 
            const m = String(Math.floor(timer/60)).padStart(2,'0'), s = String(timer%60).padStart(2,'0'); 
            document.getElementById('timerDisplay').innerText = `${m}:${s}`; 
        }, 1000); 
    }
}

function endGame() {
    clearInterval(timerInterval);
    saveScore(score, timer);
    function getFunMessage(s) {
        if (s === 99) return "Şu kadarcık kalmıştı!";
        if (s >= 90) return "100'e az kaldı ha?";
        if (s < 50) return "Kimse görmesin bence :)";
        return "Haydi yine yapalım!";
    }
    document.getElementById('finalScoreText').innerText = score;
    document.getElementById('finalTimeText').innerText = document.getElementById('timerDisplay').innerText;
    document.getElementById('finalDateText').innerText = new Date().toLocaleDateString('tr-TR');
    document.getElementById('funMessageText').innerText = getFunMessage(score);
    document.getElementById('resultModal').style.display = 'flex';
}

async function generateAndShare() {
    const area = document.querySelector("#captureArea");
    const btns = document.querySelector(".modal-btns");
    btns.style.visibility = 'hidden'; 
    try {
        const canvas = await html2canvas(area, { backgroundColor: "#0f172a", scale: 3, useCORS: true });
        btns.style.visibility = 'visible';
        canvas.toBlob(async (blob) => {
            const file = new File([blob], 'hedef100_skor.png', { type: 'image/png' });
            if (navigator.share) {
                await navigator.share({ title: 'Hedef 100', text: `Skorum: ${score}!`, files: [file] });
            } else {
                const a = document.createElement('a'); a.download = 'hedef100_skor.png'; a.href = canvas.toDataURL(); a.click();
            }
        });
    } catch (err) { btns.style.visibility = 'visible'; }
}

function toggleMute(e) { 
    const m = document.getElementById('bgMusic'); 
    const btn = document.getElementById('muteBtn');
    const icon = document.getElementById('muteIcon');
    if (!isMusicPlaying) { m.play(); isMusicPlaying = true; btn.className = 'sound-on'; icon.className = 'fas fa-volume-up'; } 
    else { m.pause(); isMusicPlaying = false; btn.className = 'sound-off'; icon.className = 'fas fa-volume-mute'; } 
}

function undoMove() { 
    if (undoRights <= 0 || history.length <= 1) return; 
    const last = history.pop(); 
    const cell = document.getElementById(`x${last.x}y${last.y}`); 
    cell.innerText = ''; cell.classList.remove('clicked', 'last-clicked'); 
    undoRights--; score--; 
    const nl = history[history.length - 1]; 
    const nlc = document.getElementById(`x${nl.x}y${nl.y}`); 
    nlc.classList.remove('clicked'); nlc.classList.add('last-clicked'); 
    calculateNextMoves(nl.x, nl.y); 
    updateUI(); 
}

function updateUI() {
    const undoDisplay = document.getElementById('undoDisplay');
    document.getElementById('scoreDisplay').innerText = score;
    undoDisplay.innerText = undoRights;
    
    undoDisplay.classList.remove('life-3', 'life-2', 'life-1', 'life-0');
    if (undoRights >= 3) undoDisplay.classList.add('life-3');
    else if (undoRights === 2) undoDisplay.classList.add('life-2');
    else if (undoRights === 1) undoDisplay.classList.add('life-1');
    else undoDisplay.classList.add('life-0');

    document.getElementById('undoBtn').disabled = (undoRights <= 0 || history.length <= 1);
}

function saveScore(s, t) { 
    let scs = JSON.parse(localStorage.getItem('h100Scores') || '[]'); 
    scs.push({ score: s, time: t, date: new Date().toLocaleDateString('tr-TR') }); 
    scs.sort((a, b) => b.score - a.score); 
    localStorage.setItem('h100Scores', JSON.stringify(scs.slice(0, 5))); 
    updateLeaderboard(); 
}

function updateLeaderboard() { 
    const scs = JSON.parse(localStorage.getItem('h100Scores') || '[]'); 
    const b = document.getElementById('leaderboardBody'); 
    b.innerHTML = scs.map((s, i) => `<tr><td>${i+1}.</td><td><b>${s.score} P</b></td><td>${s.time}s</td><td>${s.date}</td></tr>`).join(''); 
}

function closeModal() { document.getElementById('resultModal').style.display = 'none'; document.getElementById('game-start-overlay').style.display = 'flex'; }
function startActualGame() { document.getElementById('game-start-overlay').style.display = 'none'; resetGame(); }
function resetGame() { clearInterval(timerInterval); timerInterval = null; timer = 0; document.getElementById('timerDisplay').innerText = "00:00"; score = 0; history = []; undoRights = 3; initBoard(); }

initBoard();
