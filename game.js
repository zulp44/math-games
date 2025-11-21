const stageElement = document.querySelector(".stage");
const questionEl = document.getElementById("question");
const statusEl = document.getElementById("status");
const markerEl = document.getElementById("marker");
const ropeTrackEl = document.querySelector(".rope-track");

const restartBtn = document.getElementById("restart");
const fullscreenButtons = Array.from(document.querySelectorAll("[data-fullscreen]"));
const editTeamsBtn = document.getElementById("edit-teams");
const setupScreen = document.getElementById("setup-screen");
const matchScreen = document.getElementById("match-screen");
const teamCountInput = document.getElementById("team-count");
const teamInputsContainer = document.getElementById("team-inputs");
const standingsList = document.getElementById("standings-list");
const teamASelect = document.getElementById("team-a");
const teamBSelect = document.getElementById("team-b");
const startMatchBtn = document.getElementById("start-match");
const teamLabelBlue = document.getElementById("team-label-blue");
const teamLabelRed = document.getElementById("team-label-red");
const teamNameBlue = document.getElementById("team-name-blue");
const teamNameRed = document.getElementById("team-name-red");
const scoreBlueEl = document.getElementById("score-blue");
const scoreRedEl = document.getElementById("score-red");
const chibiBlue = document.getElementById("chibi-blue");
const chibiRed = document.getElementById("chibi-red");
const victoryModal = document.getElementById("victory-modal");
const victoryTeamName = document.getElementById("victory-team-name");
const closeVictoryBtn = document.getElementById("close-victory");
const confettiContainer = document.getElementById("confetti-container");

const calculators = Array.from(document.querySelectorAll(".calculator"));
const displayEls = {
  blue: document.querySelector('[data-display="blue"]'),
  red: document.querySelector('[data-display="red"]'),
};

const maxPosition = 4;

let position = 0;
let matchScores = { blue: 0, red: 0 };
let correctAnswer = null;
let roundActive = false;
let nextQuestionTimeout = null;
let lastWinnerTeam = null;

const teamInputsValue = { blue: "", red: "" };

const tournamentState = {
  teamCount: 2,
  teams: ["Tim Biru", "Tim Merah"],
  wins: {},
};

const currentMatch = {
  blue: "Tim Biru",
  red: "Tim Merah",
};

const ops = [
  {
    label: "+",
    gen: () => {
      const a = randomInt(5, 20);
      const b = randomInt(5, 20);
      return { text: `${a} + ${b}`, answer: a + b };
    },
  },
  {
    label: "−",
    gen: () => {
      const a = randomInt(10, 25);
      const b = randomInt(3, 10);
      return { text: `${a} - ${b}`, answer: a - b };
    },
  },
  {
    label: "×",
    gen: () => {
      const a = randomInt(2, 12);
      const b = randomInt(2, 12);
      return { text: `${a} × ${b}`, answer: a * b };
    },
  },
  {
    label: "÷",
    gen: () => {
      const b = randomInt(2, 10);
      const answer = randomInt(2, 10);
      const a = b * answer;
      return { text: `${a} ÷ ${b}`, answer };
    },
  },
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function playTone(type) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = type === "correct" ? 520 : 260;
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.35);
}

function setStatus(message, highlight = false) {
  statusEl.innerHTML = highlight ? `<span>${message}</span>` : message;
}

function updateMarker() {
  const percent = (position / maxPosition) * 50;
  markerEl.style.transform = `translate(-50%, -50%) translateX(${percent}%)`;
}

function updateRopeTrack() {
  if (!ropeTrackEl) return;

  const progressRatio = Math.min(1, Math.abs(position) / maxPosition);
  const progressPercent = progressRatio * 100; // 0–100% of the rope length

  // Base: all white when no one leading
  if (progressPercent === 0) {
    ropeTrackEl.style.background = "#f9fafb";
    return;
  }

  if (position < 0) {
    // Blue team leading: color grows from the left side
    const end = progressPercent;
    ropeTrackEl.style.background = `linear-gradient(90deg,
      rgba(59, 130, 246, 0.85) 0%,
      rgba(59, 130, 246, 0.85) ${end}%,
      #f9fafb ${end}%,
      #f9fafb 100%)`;
  } else {
    // Red team leading: color grows from the right side
    const start = 100 - progressPercent;
    ropeTrackEl.style.background = `linear-gradient(90deg,
      #f9fafb 0%,
      #f9fafb ${start}%,
      rgba(239, 68, 68, 0.85) ${start}%,
      rgba(239, 68, 68, 0.85) 100%)`;
  }
}

function resetInputs() {
  teamInputsValue.blue = "";
  teamInputsValue.red = "";
  updateDisplay("blue");
  updateDisplay("red");
}

function updateDisplay(team) {
  displayEls[team].textContent = teamInputsValue[team] || "0";
}

function animateChibis(winner) {
  const loser = winner === "blue" ? "red" : "blue";
  const winnerChibi = winner === "blue" ? chibiBlue : chibiRed;
  const loserChibi = winner === "blue" ? chibiRed : chibiBlue;
  winnerChibi.classList.add("celebrate");
  loserChibi.classList.add("defeat");
  setTimeout(() => {
    winnerChibi.classList.remove("celebrate");
    loserChibi.classList.remove("defeat");
  }, 900);
}

function moveMarker(team) {
  if (team === "blue") {
    position = Math.max(position - 1, -maxPosition);
  } else {
    position = Math.min(position + 1, maxPosition);
  }
  updateMarker();
  updateRopeTrack();
}

function updateScores() {
  scoreBlueEl.textContent = matchScores.blue;
  scoreRedEl.textContent = matchScores.red;
}

function showVictoryModal(team) {
  if (!victoryModal || !victoryTeamName || !confettiContainer) {
    console.error("Victory modal elements not found");
    return;
  }
  lastWinnerTeam = team;
  const teamName = currentMatch[team];
  victoryTeamName.textContent = teamName;
  victoryModal.classList.remove("hidden");

  createConfetti();
  playTone("correct");
  setTimeout(() => playTone("correct"), 200);
  setTimeout(() => playTone("correct"), 400);
}

function createConfetti() {
  if (!confettiContainer) return;
  confettiContainer.innerHTML = "";
  const colors = ["#facc15", "#3b82f6", "#ef4444", "#10b981", "#8b5cf6"];
  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement("div");
    confetti.className = "confetti";
    confetti.style.left = Math.random() * 100 + "%";
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDelay = Math.random() * 0.5 + "s";
    confetti.style.animationDuration = (Math.random() * 1 + 1.5) + "s";
    confettiContainer.appendChild(confetti);
  }
}

function checkMatchVictory(team) {
  // Victory when the rope has been pulled fully to one side
  if (Math.abs(position) >= maxPosition) {
    roundActive = false;
    tournamentState.wins[currentMatch[team]] =
      (tournamentState.wins[currentMatch[team]] || 0) + 1;
    updateStandings();
    animateChibis(team);
    showVictoryModal(team);
    return true;
  }
  return false;
}

function handleCorrectAnswer(team) {
  roundActive = false;
  playTone("correct");
  matchScores[team] += 1;
  updateScores();
  moveMarker(team);
  animateChibis(team);
  setStatus(`${currentMatch[team]} menjawab dengan benar!`, true);
  if (checkMatchVictory(team)) {
    return;
  }

  clearTimeout(nextQuestionTimeout);
  nextQuestionTimeout = setTimeout(generateQuestion, 800);
}

function generateQuestion() {
  roundActive = true;
  resetInputs();
  const operation = ops[randomInt(0, ops.length - 1)];
  const generated = operation.gen();
  correctAnswer = generated.answer;
  questionEl.textContent = `Berapa ${generated.text}?`;
  setStatus("Jawab dengan cepat menggunakan kalkulator untuk menarik tambang!");
}

function parseTeamInputs() {
  const inputs = Array.from(teamInputsContainer.querySelectorAll("input"));
  return inputs.map((input, index) => {
    const value = input.value.trim();
    return value || `Tim ${index + 1}`;
  });
}

function renderTeamInputs(countOverride) {
  const count = clampTeamCount(countOverride ?? tournamentState.teamCount);
  tournamentState.teamCount = count;
  const existing = Array.from(teamInputsContainer.querySelectorAll("input")).map((input) =>
    input.value.trim()
  );
  teamInputsContainer.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const row = document.createElement("div");
    row.className = "form-row";
    const label = document.createElement("label");
    label.textContent = `Nama tim ${i + 1}`;
    const input = document.createElement("input");
    input.type = "text";
    input.value =
      existing[i] || tournamentState.teams[i] || `Tim ${i + 1}`;
    row.append(label, input);
    teamInputsContainer.appendChild(row);
  }
}
function clampTeamCount(value) {
  return Math.min(6, Math.max(2, Number(value) || 2));
}

function updateStandings() {
  standingsList.innerHTML = "";
  tournamentState.teams.forEach((name) => {
    const item = document.createElement("div");
    item.className = "standings-item";
    item.innerHTML = `
      <span class="standings-name">${name}</span>
      <span class="standings-points">${tournamentState.wins[name] || 0}</span>
    `;
    standingsList.appendChild(item);
  });
}

function populateMatchSelectors() {
  const options = tournamentState.teams
    .map((name) => `<option value="${name}">${name}</option>`)
    .join("");
  teamASelect.innerHTML = options;
  teamBSelect.innerHTML = options;
  teamASelect.value = currentMatch.blue = tournamentState.teams[0] || "";
  teamBSelect.value = currentMatch.red =
    tournamentState.teams[1] || tournamentState.teams[0] || "";
  updateMatchLabels();
}

function updateMatchLabels() {
  teamLabelBlue.textContent = currentMatch.blue;
  teamLabelRed.textContent = currentMatch.red;
  teamNameBlue.textContent = currentMatch.blue;
  teamNameRed.textContent = currentMatch.red;
}

function showMatchScreen() {
  setupScreen.classList.add("hidden");
  matchScreen.classList.remove("hidden");
  restartBtn.classList.remove("hidden");
  editTeamsBtn.classList.remove("hidden");
}

function showSetupScreen() {
  matchScreen.classList.add("hidden");
  setupScreen.classList.remove("hidden");
  pauseMatch();
  setStatus("Mengatur tim... berikutnya mulai pertandingan.", false);
  restartBtn.classList.add("hidden");
  editTeamsBtn.classList.add("hidden");
}

function pauseMatch() {
  roundActive = false;
  clearTimeout(nextQuestionTimeout);
}

function resetMatch() {
  position = 0;
  matchScores = { blue: 0, red: 0 };
  updateScores();
  updateMarker();
  updateRopeTrack();
  clearTimeout(nextQuestionTimeout);
  roundActive = true;
  resetInputs();
  setStatus("Pertandingan dimulai! Jawab dengan cepat agar tali bergerak.");
  updateMatchLabels();
  generateQuestion();
}

if (teamCountInput) {
  teamCountInput.addEventListener("input", () => {
    const clamped = clampTeamCount(Number(teamCountInput.value));
    teamCountInput.value = clamped;
    renderTeamInputs(clamped);
  });
}

document.getElementById("tournament-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const names = parseTeamInputs();
  tournamentState.teams = names;
  tournamentState.wins = {};
  names.forEach((name) => {
    tournamentState.wins[name] = 0;
  });
  renderTeamInputs();
  updateStandings();
  populateMatchSelectors();
  showMatchScreen();
  resetMatch();
});

startMatchBtn.addEventListener("click", () => {
  const blueName = teamASelect.value;
  const redName = teamBSelect.value;
  if (!blueName || !redName) {
    setStatus("Lengkapi nama tim dulu.", false);
    return;
  }
  if (blueName === redName) {
    setStatus("Pilih dua tim berbeda.", false);
    return;
  }
  currentMatch.blue = blueName;
  currentMatch.red = redName;
  updateMatchLabels();
  showMatchScreen();
  resetMatch();
});

editTeamsBtn.addEventListener("click", () => {
  showSetupScreen();
});

function closeVictoryModal() {
  if (victoryModal) {
    victoryModal.classList.add("hidden");
  }
  const winnerTeam =
    lastWinnerTeam || (position > 0 ? "red" : "blue");
  const winnerPoints = matchScores[winnerTeam] || 0;
  setStatus(
    `${currentMatch[winnerTeam]} memenangkan pertandingan dengan ${winnerPoints} poin!`,
    true
  );
  // Reset match scores after showing victory
  matchScores = { blue: 0, red: 0 };
  position = 0;
  updateScores();
  updateMarker();
  updateRopeTrack();
  lastWinnerTeam = null;
}

if (closeVictoryBtn) {
  closeVictoryBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeVictoryModal();
  });
}

// Close modal when clicking outside
if (victoryModal) {
  victoryModal.addEventListener("click", (e) => {
    if (e.target === victoryModal) {
      closeVictoryModal();
    }
  });
}

function toggleFullscreen() {
  if (!stageElement) {
    return;
  }
  if (!document.fullscreenElement) {
    stageElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
}

function updateFullscreenLabels() {
  const isFullscreen = Boolean(document.fullscreenElement);
  fullscreenButtons.forEach((btn) => {
    btn.textContent = isFullscreen ? "Keluar Fullscreen" : "Fullscreen";
  });
}

fullscreenButtons.forEach((btn) => {
  btn.addEventListener("click", toggleFullscreen);
});

document.addEventListener("fullscreenchange", updateFullscreenLabels);
updateFullscreenLabels();

calculators.forEach((calculator) => {
  const team = calculator.dataset.team;
  const buttons = calculator.querySelector(".calc-buttons");
  buttons.addEventListener("click", (event) => {
    if (!roundActive) {
      return;
    }
    const button = event.target.closest("button");
    if (!button) {
      return;
    }
    const key = button.dataset.key;
    const action = button.dataset.action;
    if (action === "clear") {
      teamInputsValue[team] = "";
    } else if (action === "back") {
      teamInputsValue[team] = teamInputsValue[team].slice(0, -1);
    } else if (key) {
      if (teamInputsValue[team].length >= 3) {
        return;
      }
      teamInputsValue[team] += key;
    }
    updateDisplay(team);
    checkAnswer(team);
  });
});

function checkAnswer(team) {
  if (!roundActive || !teamInputsValue[team]) {
    return;
  }
  if (Number(teamInputsValue[team]) === correctAnswer) {
    handleCorrectAnswer(team);
  }
}

restartBtn.addEventListener("click", () => {
  resetMatch();
});

function init() {
  tournamentState.teams.forEach((name) => {
    tournamentState.wins[name] = 0;
  });
  if (teamCountInput) {
    teamCountInput.value = tournamentState.teamCount;
  }
  renderTeamInputs();
  updateStandings();
  populateMatchSelectors();
  showSetupScreen();
  matchScores = { blue: 0, red: 0 };
  updateScores();
  updateMarker();
  updateRopeTrack();
  setStatus("Silakan atur tim dulu untuk memulai.");
}

init();