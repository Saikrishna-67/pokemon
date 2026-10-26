// Pokémon Raid Wheel & Boss Battler - Enhanced Application Engine
// Features: Interactive Raid Moves, Tera Burst, Floating Damage, Authentic Catch Animation, Badge Case & Summary

let wheelInstance = null;
let allPokemon = [];
let filteredPokemon = [];
let activePokemon = null;

let currentFilter = 'all';

// Trainer & Session State
const DEFAULT_SETTINGS = {
    trainerCount: 2,
    startingPurse: 150000, // ₹ 1,50,000 (Allowed between 1L and 2L)
    maxPicks: 5,           // Exactly 5 picks per player
    hostIndex: 0           // Only Player 1 (Host) has discard privileges
};

let gameSettings = { ...DEFAULT_SETTINGS };
let trainers = [];

// Badges Unlocked in Raids
let unlockedBadges = {
    boss_1: false,
    boss_2: false,
    boss_3: false,
    boss_4: false,
    boss_5: false
};

// Auction State
let auctionMode = 'live'; // 'live', 'secret', 'direct'
let currentHighBid = 0;
let currentHighBidder = null;
let activeBidderIndex = 0;
let passedBidders = new Set();
let secretBids = {}; // { trainerId: bidAmount }
let secretTurnIndex = 0;

// Raid Battle State
let activeRaidBoss = null;
let raidSquad = []; // Current squad in the raid
let raidBossCurrentHp = 0;
let raidBossMaxHp = 0;
let raidTurn = 1;
let isRaidRunning = false;
let isTeraBoosted = false;
let teraUsedInBattle = false;
let activeSelectedAttacker = null;

// Universal Currency Formatter (INR ₹)
function formatINR(val) {
    if (isNaN(val)) return '₹ 0';
    return '₹ ' + Number(val).toLocaleString('en-IN');
}

// Initialization on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    allPokemon = loadPokemon();
    filteredPokemon = [...allPokemon];

    loadSessionState();
    loadBadges();
    setupWheel();
    setupEventListeners();
    renderTrainerPodiums();
    updateBadgeCountHeader();

    // Select initial random Pokémon
    if (filteredPokemon.length) {
        selectPokemon(filteredPokemon[0]);
    }
}

// Session State Loading & Setup
function loadSessionState() {
    const saved = localStorage.getItem('poke_raid_session_v2');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            if (data.settings) gameSettings = data.settings;
            if (Array.isArray(data.trainers) && data.trainers.length >= 2) {
                trainers = data.trainers;
                return;
            }
        } catch(e) {}
    }
    resetTrainers();
}

function resetTrainers() {
    trainers = [];
    for (let i = 0; i < gameSettings.trainerCount; i++) {
        trainers.push({
            id: 'trainer_' + (i + 1),
            name: 'Trainer ' + (i + 1) + (i === gameSettings.hostIndex ? ' (Host)' : ''),
            purse: gameSettings.startingPurse,
            party: [] // max 5 Pokémon
        });
    }
    saveSessionState();
}

function saveSessionState() {
    try {
        localStorage.setItem('poke_raid_session_v2', JSON.stringify({
            settings: gameSettings,
            trainers
        }));
    } catch(e) {}
}

function loadBadges() {
    try {
        const saved = localStorage.getItem('poke_raid_badges_v2');
        if (saved) unlockedBadges = JSON.parse(saved);
    } catch(e) {}
}

function saveBadges() {
    try {
        localStorage.setItem('poke_raid_badges_v2', JSON.stringify(unlockedBadges));
        updateBadgeCountHeader();
    } catch(e) {}
}

function updateBadgeCountHeader() {
    const countElem = document.getElementById('unlocked-badge-count');
    if (!countElem) return;
    const count = Object.values(unlockedBadges).filter(Boolean).length;
    countElem.textContent = `${count}/5`;
}

// Setup Canvas Wheel
function setupWheel() {
    wheelInstance = new PokemonWheel('spin-canvas', {
        characters: filteredPokemon,
        onSpinStart: () => {
            const spinBtn = document.getElementById('btn-spin');
            if (spinBtn) spinBtn.disabled = true;
            logAuction("The Poké-Wheel is spinning with high momentum!");
        },
        onSelect: (selectedChar) => {
            const spinBtn = document.getElementById('btn-spin');
            if (spinBtn) spinBtn.disabled = false;
            selectPokemon(selectedChar);
            initBiddingForActivePokemon();
        }
    });
}

// UI Event Listeners
function setupEventListeners() {
    // Spin Button
    const spinBtn = document.getElementById('btn-spin');
    if (spinBtn) {
        spinBtn.addEventListener('click', () => {
            if (wheelInstance && !wheelInstance.isSpinning) {
                wheelInstance.spin();
            }
        });
    }

    // Filter Buttons
    document.querySelectorAll('.btn-filter').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            applyFilter(e.currentTarget.getAttribute('data-filter'));
        });
    });

    // Audio Toggle
    const audioBtn = document.getElementById('btn-audio-toggle');
    if (audioBtn) {
        audioBtn.addEventListener('click', () => {
            if (wheelInstance) {
                wheelInstance.audioEnabled = !wheelInstance.audioEnabled;
                audioBtn.textContent = wheelInstance.audioEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
            }
        });
    }

    // Bidding Mode Navigation Tabs
    document.querySelectorAll('.bid-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.bid-tab-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            auctionMode = e.currentTarget.getAttribute('data-mode');
            renderBiddingMode();
        });
    });

    // Quick Raise Buttons (+₹ 1,000, +₹ 2,500, +₹ 5,000, +₹ 10,000)
    document.querySelectorAll('.btn-raise').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const addVal = parseInt(e.currentTarget.getAttribute('data-add')) || 1000;
            placeQuickRaise(addVal);
        });
    });

    // Custom Bid Submit
    const customBidBtn = document.getElementById('btn-submit-bid');
    const customBidInput = document.getElementById('custom-bid-input');
    if (customBidBtn && customBidInput) {
        customBidBtn.addEventListener('click', () => {
            const val = parseInt(customBidInput.value);
            if (!isNaN(val) && val > 0) {
                placeCustomBid(val);
                customBidInput.value = '';
            }
        });
    }

    // Pass Turn
    const passBtn = document.getElementById('btn-pass-turn');
    if (passBtn) {
        passBtn.addEventListener('click', passTurn);
    }

    // Discard Button (HOST ONLY)
    const discardBtn = document.getElementById('btn-discard-pokemon');
    if (discardBtn) {
        discardBtn.addEventListener('click', discardCurrentPokemon);
    }

    // Direct Assign Trigger
    const directAssignBtn = document.getElementById('btn-direct-assign');
    if (directAssignBtn) {
        directAssignBtn.addEventListener('click', handleDirectAssign);
    }

    // Secret Bid Controls
    const secretSubmitBtn = document.getElementById('btn-secret-submit');
    const secretInput = document.getElementById('secret-bid-input');
    if (secretSubmitBtn && secretInput) {
        secretSubmitBtn.addEventListener('click', handleSecretBidSubmit);
    }

    // Open Raid Boss Arena Modal
    const openRaidBtn = document.getElementById('open-raid-btn');
    const raidDialog = document.getElementById('raid-boss-dialog');
    if (openRaidBtn && raidDialog) {
        openRaidBtn.addEventListener('click', () => {
            openRaidArena();
        });
    }

    // Close Raid Boss Arena Modal
    const closeRaidBtn = document.getElementById('btn-close-raid');
    if (closeRaidBtn && raidDialog) {
        closeRaidBtn.addEventListener('click', () => {
            raidDialog.close();
        });
    }

    // Tera Burst Button
    const teraBtn = document.getElementById('btn-tera-burst');
    if (teraBtn) {
        teraBtn.addEventListener('click', toggleTeraBurst);
    }

    // Open Badge Case
    const openBadgesBtn = document.getElementById('open-badges-btn');
    const badgeDialog = document.getElementById('badge-case-dialog');
    const closeBadgesBtn = document.getElementById('btn-close-badges');
    if (openBadgesBtn && badgeDialog) {
        openBadgesBtn.addEventListener('click', () => {
            renderBadgeCase();
            badgeDialog.showModal();
        });
    }
    if (closeBadgesBtn && badgeDialog) {
        closeBadgesBtn.addEventListener('click', () => badgeDialog.close());
    }

    // Pokémon Summary Dialog Close
    const closeSummaryBtn = document.getElementById('btn-close-summary');
    const summaryDialog = document.getElementById('poke-summary-dialog');
    if (closeSummaryBtn && summaryDialog) {
        closeSummaryBtn.addEventListener('click', () => summaryDialog.close());
    }

    // Raid Boss Selector Buttons
    document.querySelectorAll('.boss-select-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.boss-select-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            const bossId = e.currentTarget.getAttribute('data-boss');
            setupRaidBoss(bossId);
        });
    });

    // Raid Attack Button (Squad Assault)
    const raidAttackBtn = document.getElementById('btn-raid-attack');
    if (raidAttackBtn) {
        raidAttackBtn.addEventListener('click', executeRaidTurn);
    }

    // Raid Auto Simulate Button
    const raidAutoBtn = document.getElementById('btn-raid-auto');
    if (raidAutoBtn) {
        raidAutoBtn.addEventListener('click', autoSimulateRaid);
    }

    // Settings Modal
    const openSettingsBtn = document.getElementById('open-settings-btn');
    const settingsDialog = document.getElementById('settings-dialog');
    const closeSettingsBtn = document.getElementById('btn-close-settings');
    const saveSettingsBtn = document.getElementById('btn-save-settings');

    if (openSettingsBtn && settingsDialog) {
        openSettingsBtn.addEventListener('click', () => {
            document.getElementById('setting-trainers').value = gameSettings.trainerCount;
            document.getElementById('setting-purse').value = gameSettings.startingPurse;
            settingsDialog.showModal();
        });
    }
    if (closeSettingsBtn && settingsDialog) {
        closeSettingsBtn.addEventListener('click', () => settingsDialog.close());
    }
    if (saveSettingsBtn && settingsDialog) {
        saveSettingsBtn.addEventListener('click', () => {
            const tCount = parseInt(document.getElementById('setting-trainers').value) || 2;
            let purse = parseInt(document.getElementById('setting-purse').value) || 150000;
            if (purse < 100000) purse = 100000;
            if (purse > 200000) purse = 200000;

            gameSettings.trainerCount = tCount;
            gameSettings.startingPurse = purse;
            resetTrainers();
            renderTrainerPodiums();
            settingsDialog.close();
            logAuction(`Settings applied: ${tCount} Trainers, Purse ${formatINR(purse)}`);
        });
    }

    // Reset Roster Button
    const resetRosterBtn = document.getElementById('btn-reset-roster');
    if (resetRosterBtn) {
        resetRosterBtn.addEventListener('click', () => {
            if (confirm('Reset entire Pokémon roster, parties, and badges to default?')) {
                allPokemon = resetPokemonToDefault();
                applyFilter('all');
                resetTrainers();
                unlockedBadges = { boss_1: false, boss_2: false, boss_3: false, boss_4: false, boss_5: false };
                saveBadges();
                renderTrainerPodiums();
                logAuction('Pokémon roster and trainer data restored to initial state.');
            }
        });
    }
}

// Filter Pokémon on Wheel
function applyFilter(filter) {
    currentFilter = filter;
    if (filter === 'all') {
        filteredPokemon = [...allPokemon];
    } else {
        filteredPokemon = allPokemon.filter(p => p.category === filter);
    }
    if (wheelInstance) {
        wheelInstance.setCharacters(filteredPokemon);
    }
    const filterBadge = document.getElementById('active-filter-badge');
    if (filterBadge) {
        filterBadge.textContent = `${filteredPokemon.length} Pokémon`;
    }
}

// Display Chosen Pokémon Encounter
function selectPokemon(p) {
    if (!p) return;
    activePokemon = p;

    document.getElementById('poke-name').textContent = p.name;
    document.getElementById('poke-subtitle').textContent = p.title || p.origin;
    document.getElementById('poke-artwork').src = p.image || p.thumb;
    document.getElementById('poke-artwork').alt = p.name;
    document.getElementById('poke-power-level').textContent = `⚡ ${p.powerLevel} PWR`;
    document.getElementById('poke-base-bid').textContent = formatINR(p.basePrice);
    document.getElementById('poke-bounty').textContent = p.bounty;
    document.getElementById('poke-lore').textContent = `"${p.quote}"`;

    // Type badges
    const typeContainer = document.getElementById('poke-type-badges');
    if (typeContainer && p.types) {
        typeContainer.innerHTML = p.types.map(t => {
            const bg = (wheelInstance && wheelInstance.typeColors[t]) ? wheelInstance.typeColors[t].bg : '#64748b';
            return `<span class="type-pill" style="background:${bg};">${t}</span>`;
        }).join('');
    }

    // Techniques
    const techContainer = document.getElementById('poke-techniques-list');
    if (techContainer && p.techniques) {
        techContainer.innerHTML = p.techniques.map(tech => `
            <div class="technique-item">
                <span class="tech-name">${tech.name}</span>
                <span class="tech-meta">${tech.type} • PWR ${tech.power}</span>
            </div>
        `).join('');
    }
}

// Bidding Logic
function initBiddingForActivePokemon() {
    if (!activePokemon) return;
    currentHighBid = activePokemon.basePrice || 5000;
    currentHighBidder = null;
    activeBidderIndex = 0;
    passedBidders.clear();
    secretBids = {};
    secretTurnIndex = 0;

    renderBiddingMode();
    logAuction(`Encounter: Wild ${activePokemon.name} appeared! Starting base bid: ${formatINR(currentHighBid)}`);
}

function renderBiddingMode() {
    const livePanel = document.getElementById('panel-live-bid');
    const secretPanel = document.getElementById('panel-secret-bid');
    const directPanel = document.getElementById('panel-direct-bid');

    if (livePanel) livePanel.style.display = auctionMode === 'live' ? 'block' : 'none';
    if (secretPanel) secretPanel.style.display = auctionMode === 'secret' ? 'block' : 'none';
    if (directPanel) directPanel.style.display = auctionMode === 'direct' ? 'block' : 'none';

    updateBiddingStatus();
}

function updateBiddingStatus() {
    const highBidElem = document.getElementById('live-high-bid');
    const highBidderElem = document.getElementById('live-high-bidder');
    const activeTrainerBadge = document.getElementById('live-turn-badge');
    const activePurseElem = document.getElementById('live-turn-purse');

    if (highBidElem) highBidElem.textContent = formatINR(currentHighBid);
    if (highBidderElem) {
        highBidderElem.textContent = currentHighBidder ? currentHighBidder.name : '(No bids placed yet)';
    }

    const currentTrainer = trainers[activeBidderIndex];
    if (activeTrainerBadge && currentTrainer) {
        activeTrainerBadge.textContent = currentTrainer.name;
    }
    if (activePurseElem && currentTrainer) {
        activePurseElem.textContent = `Purse: ${formatINR(currentTrainer.purse)}`;
    }

    renderTrainerPodiums();
}

function placeQuickRaise(amount) {
    const nextBid = currentHighBid + amount;
    placeCustomBid(nextBid);
}

function placeCustomBid(bidAmount) {
    if (!activePokemon) return;
    const trainer = trainers[activeBidderIndex];
    if (!trainer) return;

    if (trainer.party.length >= gameSettings.maxPicks) {
        alert(`${trainer.name} already has ${gameSettings.maxPicks} Pokémon (Party is Full!)`);
        advanceTurn();
        return;
    }

    if (bidAmount <= currentHighBid) {
        alert(`Bid must be strictly higher than current high bid of ${formatINR(currentHighBid)}`);
        return;
    }

    if (bidAmount > trainer.purse) {
        alert(`${trainer.name} does not have enough funds! Current Purse: ${formatINR(trainer.purse)}`);
        return;
    }

    currentHighBid = bidAmount;
    currentHighBidder = trainer;
    passedBidders.clear();
    logAuction(`⚡ ${trainer.name} raised bid to ${formatINR(bidAmount)}!`);

    advanceTurn();
}

function passTurn() {
    const trainer = trainers[activeBidderIndex];
    if (trainer) {
        passedBidders.add(trainer.id);
        logAuction(`✋ ${trainer.name} passed.`);
    }

    const eligibleTrainers = trainers.filter(t => t.party.length < gameSettings.maxPicks);
    if (currentHighBidder && passedBidders.size >= eligibleTrainers.length - 1) {
        finalizeCatch(currentHighBidder, currentHighBid);
        return;
    }

    advanceTurn();
}

function advanceTurn() {
    let attempts = 0;
    do {
        activeBidderIndex = (activeBidderIndex + 1) % trainers.length;
        attempts++;
    } while (
        (trainers[activeBidderIndex].party.length >= gameSettings.maxPicks || 
         passedBidders.has(trainers[activeBidderIndex].id)) && 
        attempts < trainers.length
    );

    updateBiddingStatus();
}

function discardCurrentPokemon() {
    const isHost = activeBidderIndex === gameSettings.hostIndex;
    if (!isHost) {
        alert("Only the Host (Player 1) has permission to discard or release a Pokémon back to the wild!");
        return;
    }

    if (confirm(`Release ${activePokemon.name} back to the wild? No trainer will catch it.`)) {
        logAuction(`🗑️ Host released ${activePokemon.name} back to the wild!`);
        currentHighBidder = null;
        currentHighBid = 0;
        passedBidders.clear();
        updateBiddingStatus();
    }
}

// Finalize Catch & Authentic Pokeball Animation
function finalizeCatch(winner, price) {
    if (!winner || !activePokemon) return;

    if (winner.purse < price) {
        alert(`${winner.name} lacks funds to complete capture!`);
        return;
    }

    winner.purse -= price;
    winner.party.push({ ...activePokemon, caughtPrice: price });

    saveSessionState();
    renderTrainerPodiums();

    // Trigger Authentic Pokéball Animation Modal
    playCatchAnimationSequence(winner, activePokemon, price);

    logAuction(`🎉 CAUGHT! ${winner.name} caught ${activePokemon.name} for ${formatINR(price)}!`);

    currentHighBidder = null;
    currentHighBid = 0;
    passedBidders.clear();
    updateBiddingStatus();

    checkAllPartiesFull();
}

function playCatchAnimationSequence(winner, pokemon, price) {
    const overlay = document.getElementById('catch-modal-overlay');
    const sprite = document.getElementById('catch-pokeball-sprite');
    const headline = document.getElementById('catch-headline-text');
    const details = document.getElementById('catch-details-text');

    if (!overlay || !sprite) return;

    headline.textContent = `THROWING POKÉBALL...`;
    details.textContent = `${winner.name} is capturing ${pokemon.name}!`;
    sprite.className = 'pokeball-sprite pokeball-bounce';
    overlay.classList.add('active');

    // Step 1: Wiggles
    setTimeout(() => {
        sprite.className = 'pokeball-sprite pokeball-wiggling';
        if (wheelInstance) wheelInstance.playWiggleSound();
    }, 600);

    setTimeout(() => {
        if (wheelInstance) wheelInstance.playWiggleSound();
    }, 1100);

    // Step 2: Final Click & Star Burst
    setTimeout(() => {
        sprite.className = 'pokeball-sprite pokeball-caught';
        if (wheelInstance) wheelInstance.playCatchSound();
        triggerCatchConfetti();

        headline.textContent = `🌟 GOTCHA! 🌟`;
        details.textContent = `${winner.name} caught ${pokemon.name} for ${formatINR(price)}!`;
    }, 1600);

    // Step 3: Dismiss
    setTimeout(() => {
        overlay.classList.remove('active');
    }, 3200);
}

function handleDirectAssign() {
    const select = document.getElementById('direct-trainer-select');
    if (!select) return;
    const tIndex = parseInt(select.value);
    const trainer = trainers[tIndex];
    if (!trainer || !activePokemon) return;

    if (trainer.party.length >= gameSettings.maxPicks) {
        alert(`${trainer.name}'s party is already full (Max ${gameSettings.maxPicks})!`);
        return;
    }

    const price = activePokemon.basePrice;
    if (trainer.purse < price) {
        alert(`${trainer.name} cannot afford base price ${formatINR(price)}!`);
        return;
    }

    finalizeCatch(trainer, price);
}

function handleSecretBidSubmit() {
    const input = document.getElementById('secret-bid-input');
    const trainer = trainers[secretTurnIndex];
    if (!trainer || !input) return;

    const val = parseInt(input.value) || 0;
    secretBids[trainer.id] = val;
    input.value = '';

    secretTurnIndex++;
    if (secretTurnIndex < trainers.length) {
        document.getElementById('secret-current-trainer-label').textContent = `${trainers[secretTurnIndex].name}'s Turn to Enter Bid`;
    } else {
        let highest = 0;
        let winner = null;
        for (const t of trainers) {
            const bid = secretBids[t.id] || 0;
            if (bid > highest && bid <= t.purse && t.party.length < gameSettings.maxPicks) {
                highest = bid;
                winner = t;
            }
        }
        if (winner && highest >= activePokemon.basePrice) {
            finalizeCatch(winner, highest);
        } else {
            logAuction("Secret Auction ended with no winning bids meeting base price.");
        }
        secretTurnIndex = 0;
        secretBids = {};
        document.getElementById('secret-current-trainer-label').textContent = `${trainers[0].name}'s Turn to Enter Bid`;
    }
}

function checkAllPartiesFull() {
    const allFull = trainers.every(t => t.party.length >= gameSettings.maxPicks);
    if (allFull) {
        alert("🎉 ALL TRAINER PARTIES ARE FULL! Ready for the RAID BOSS ARENA! Click '⚔️ Raid Boss Arena' at the top to battle!");
    }
}

// Render Trainer Podiums with 5 Pokeball Slots (Clickable for Inspection)
function renderTrainerPodiums() {
    const list = document.getElementById('trainers-list');
    if (!list) return;

    list.innerHTML = trainers.map((t, idx) => {
        const isTurn = idx === activeBidderIndex;
        return `
            <div class="trainer-card ${isTurn ? 'active-turn' : ''}">
                <div class="trainer-header-row">
                    <span class="trainer-name">${t.name}</span>
                    <span class="trainer-purse">${formatINR(t.purse)}</span>
                </div>
                <div class="party-pokeballs-row">
                    ${[0, 1, 2, 3, 4].map(slotIdx => {
                        const caught = t.party[slotIdx];
                        if (caught) {
                            return `
                                <div class="pokeball-slot filled" title="Click to Inspect ${caught.name}" onclick="openPokemonSummary('${caught.id}')">
                                    <img src="${caught.thumb || caught.image}" alt="${caught.name}">
                                </div>
                            `;
                        } else {
                            return `<div class="pokeball-slot" title="Empty Slot ${slotIdx + 1}">⚪</div>`;
                        }
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');

    // Update Direct Assign Select
    const directSelect = document.getElementById('direct-trainer-select');
    if (directSelect) {
        directSelect.innerHTML = trainers.map((t, idx) => `
            <option value="${idx}">${t.name} (${t.party.length}/5) - ${formatINR(t.purse)}</option>
        `).join('');
    }
}

// Pokémon Inspection Modal
function openPokemonSummary(pokemonId) {
    const p = allPokemon.find(item => item.id === pokemonId);
    if (!p) return;

    const dialog = document.getElementById('poke-summary-dialog');
    if (!dialog) return;

    document.getElementById('summary-poke-name').textContent = p.name;
    document.getElementById('summary-poke-title').textContent = p.title || p.origin;
    document.getElementById('summary-poke-img').src = p.image || p.thumb;
    document.getElementById('summary-poke-pwr').textContent = `⚡ ${p.powerLevel} PWR`;
    document.getElementById('summary-poke-cost').textContent = formatINR(p.basePrice);
    document.getElementById('summary-poke-lore').textContent = `"${p.quote}"`;

    const typesContainer = document.getElementById('summary-poke-types');
    if (typesContainer && p.types) {
        typesContainer.innerHTML = p.types.map(t => {
            const bg = (wheelInstance && wheelInstance.typeColors[t]) ? wheelInstance.typeColors[t].bg : '#64748b';
            return `<span class="type-pill" style="background:${bg};">${t}</span>`;
        }).join('');
    }

    const movesContainer = document.getElementById('summary-poke-moves');
    if (movesContainer && p.techniques) {
        movesContainer.innerHTML = p.techniques.map(tech => `
            <div class="technique-item">
                <span class="tech-name">${tech.name}</span>
                <span class="tech-meta">${tech.type} • PWR ${tech.power}</span>
            </div>
        `).join('');
    }

    dialog.showModal();
}

function logAuction(msg) {
    const log = document.getElementById('auction-log-feed');
    if (!log) return;
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

// ==========================================
// RAID BOSS ARENA ENGINE (ENHANCED)
// ==========================================
function openRaidArena() {
    const dialog = document.getElementById('raid-boss-dialog');
    if (!dialog) return;

    setupRaidBoss('boss_1');

    const squadSelect = document.getElementById('raid-squad-trainer-select');
    if (squadSelect) {
        squadSelect.innerHTML = trainers.map((t, idx) => `
            <option value="${idx}">${t.name}'s Squad (${t.party.length} Pokémon)</option>
        `).join('') + `<option value="all">🌟 Combined All-Star Team (Best from all trainers)</option>`;

        squadSelect.onchange = () => {
            loadRaidSquad(squadSelect.value);
        };
    }

    loadRaidSquad('0');
    dialog.showModal();
}

function setupRaidBoss(bossId) {
    const boss = RAID_BOSSES.find(b => b.id === bossId) || RAID_BOSSES[0];
    activeRaidBoss = { ...boss };
    raidBossMaxHp = boss.maxHp;
    raidBossCurrentHp = boss.maxHp;
    raidTurn = 1;
    isRaidRunning = false;
    isTeraBoosted = false;
    teraUsedInBattle = false;
    activeSelectedAttacker = null;

    document.getElementById('raid-boss-name').textContent = boss.name;
    document.getElementById('raid-boss-title').textContent = boss.title;
    document.getElementById('raid-boss-difficulty').textContent = boss.difficulty;
    document.getElementById('raid-boss-img').src = boss.image;
    document.getElementById('raid-boss-types').textContent = boss.types.join(' / ');
    document.getElementById('raid-boss-phase-badge').textContent = boss.phases[0].name;

    const bossCard = document.getElementById('boss-card-element');
    if (bossCard) bossCard.classList.remove('enraged');

    const teraBtn = document.getElementById('btn-tera-burst');
    if (teraBtn) {
        teraBtn.disabled = false;
        teraBtn.style.opacity = '1';
        teraBtn.textContent = '✨ TERA BURST (2.5x)';
    }

    updateRaidHpBar();
    clearRaidLog();
    logRaid(`⚔️ Raid Encounter Started! ${boss.name} (${boss.difficulty}) challenges your squad!`);
}

function loadRaidSquad(trainerVal) {
    raidSquad = [];
    if (trainerVal === 'all') {
        trainers.forEach(t => {
            t.party.forEach(p => {
                raidSquad.push({ ...p, currentHp: p.hp, maxHp: p.hp, trainerId: t.id, trainerName: t.name });
            });
        });
    } else {
        const tIndex = parseInt(trainerVal) || 0;
        const t = trainers[tIndex];
        if (t && t.party.length) {
            raidSquad = t.party.map(p => ({ ...p, currentHp: p.hp, maxHp: p.hp, trainerId: t.id, trainerName: t.name }));
        }
    }

    renderRaidSquad();
    if (raidSquad.length) {
        selectAttackerForMoves(raidSquad[0]);
    }
}

function renderRaidSquad() {
    const squadList = document.getElementById('raid-squad-list');
    if (!squadList) return;

    if (!raidSquad.length) {
        squadList.innerHTML = `<div style="color:var(--text-muted); font-size:0.85rem;">No Pokémon in this squad yet! Spin the wheel to catch Pokémon first!</div>`;
        return;
    }

    squadList.innerHTML = raidSquad.map((p, idx) => {
        const hpPct = Math.max(0, Math.min(100, (p.currentHp / p.maxHp) * 100));
        const isFainted = p.currentHp <= 0;
        const isSelected = activeSelectedAttacker && activeSelectedAttacker.id === p.id;
        return `
            <div class="squad-member-row ${isFainted ? 'fainted' : ''} ${isSelected ? 'active-turn' : ''}" 
                 onclick="handleSquadRowClick('${p.id}')" style="cursor:pointer;" title="Click to select moves">
                <img src="${p.thumb || p.image}" alt="${p.name}">
                <div class="squad-member-info">
                    <div style="display:flex; justify-content:space-between;">
                        <span class="squad-member-name">${p.name} ${isFainted ? '💀 (Fainted)' : ''}</span>
                        <span style="font-size:0.75rem; color:var(--accent-yellow); font-weight:700;">${Math.round(p.currentHp)}/${p.maxHp} HP</span>
                    </div>
                    <div class="squad-member-hp-bar">
                        <div class="squad-member-hp-fill" style="width:${hpPct}%; background:${hpPct > 50 ? '#22c55e' : (hpPct > 20 ? '#eab308' : '#ef4444')};"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function handleSquadRowClick(pokemonId) {
    const target = raidSquad.find(p => p.id === pokemonId);
    if (target && target.currentHp > 0) {
        selectAttackerForMoves(target);
    }
}

function selectAttackerForMoves(attacker) {
    activeSelectedAttacker = attacker;
    const box = document.getElementById('squad-move-selector-box');
    const attackerName = document.getElementById('active-move-attacker');
    const container = document.getElementById('move-buttons-container');

    if (!box || !container || !attacker) return;
    box.style.display = 'flex';
    attackerName.textContent = attacker.name;

    container.innerHTML = attacker.techniques.map(tech => {
        const mult = getMoveMultiplier(tech.type, activeRaidBoss ? activeRaidBoss.types : []);
        let tagColor = '#94a3b8';
        let tagText = '1.0x Normal';
        if (mult >= 2.0) {
            tagColor = '#4ade80';
            tagText = `${mult}x SUPER EFFECTIVE! 💥`;
        } else if (mult === 0) {
            tagColor = '#ef4444';
            tagText = '0x NO EFFECT ❌';
        } else if (mult < 1.0) {
            tagColor = '#f59e0b';
            tagText = `${mult}x RESISTANT 🛡️`;
        }

        return `
            <button class="btn-move-action" onclick="executeIndividualMove('${tech.name}')" type="button">
                <div class="move-name-row">
                    <span>${tech.name}</span>
                    <span style="color:var(--accent-yellow);">PWR ${tech.power || 90}</span>
                </div>
                <div class="move-effect-tag" style="color:${tagColor};">${tagText}</div>
            </button>
        `;
    }).join('');

    renderRaidSquad();
}

function toggleTeraBurst() {
    if (teraUsedInBattle) {
        alert("Terastallization can only be activated once per raid!");
        return;
    }
    isTeraBoosted = !isTeraBoosted;
    const teraBtn = document.getElementById('btn-tera-burst');
    if (teraBtn) {
        if (isTeraBoosted) {
            teraBtn.textContent = '🌟 TERA ACTIVE (2.5x)!';
            teraBtn.style.boxShadow = '0 0 30px #facc15';
            if (wheelInstance) wheelInstance.playTeraSound();
            logRaid('✨ TERASTALLIZATION ACTIVATED! The squad radiates celestial crystal power (+150% damage)!');
        } else {
            teraBtn.textContent = '✨ TERA BURST (2.5x)';
            teraBtn.style.boxShadow = '';
        }
    }
}

function updateRaidHpBar() {
    const hpPct = Math.max(0, Math.min(100, (raidBossCurrentHp / raidBossMaxHp) * 100));
    const fill = document.getElementById('raid-boss-hp-fill');
    const val = document.getElementById('raid-boss-hp-val');
    const bossCard = document.getElementById('boss-card-element');

    if (fill) fill.style.width = `${hpPct}%`;
    if (val) val.textContent = `${Math.round(raidBossCurrentHp).toLocaleString()} / ${raidBossMaxHp.toLocaleString()} HP (${Math.round(hpPct)}%)`;

    // Enrage phase triggers (< 50% HP)
    if (activeRaidBoss && activeRaidBoss.phases.length > 1) {
        if (hpPct <= activeRaidBoss.phases[1].threshold * 100) {
            document.getElementById('raid-boss-phase-badge').textContent = `⚠️ ${activeRaidBoss.phases[1].name}`;
            document.getElementById('raid-boss-phase-badge').style.borderColor = '#ef4444';
            if (bossCard && !bossCard.classList.contains('enraged')) {
                bossCard.classList.add('enraged');
                if (wheelInstance) wheelInstance.playBossRoarSound();
                logRaid(`🚨 WARNING: ${activeRaidBoss.name} entered ${activeRaidBoss.phases[1].name}! Boss is ENRAGED!`);
            }
        }
    }
}

// Execute Individual Move from Move Selector
function executeIndividualMove(moveName) {
    if (!activeRaidBoss || raidBossCurrentHp <= 0 || !activeSelectedAttacker) return;
    const p = activeSelectedAttacker;
    const move = p.techniques.find(m => m.name === moveName) || p.techniques[0];

    logRaid(`--- TURN ${raidTurn} ---`);
    executePokemonAttack(p, move);
    checkRaidStateAndRetaliate();
}

// Execute Full Squad Assault (All 5 Alive Attack Together)
function executeRaidTurn() {
    if (!activeRaidBoss || raidBossCurrentHp <= 0) return;

    const aliveSquad = raidSquad.filter(p => p.currentHp > 0);
    if (!aliveSquad.length) {
        alert("All Pokémon have fainted! The Raid Boss was victorious. Heal and draft stronger counters!");
        return;
    }

    logRaid(`--- TURN ${raidTurn}: SQUAD ALL-OUT ASSAULT ---`);
    aliveSquad.forEach(p => {
        const move = p.techniques[Math.floor(Math.random() * p.techniques.length)];
        executePokemonAttack(p, move);
    });

    checkRaidStateAndRetaliate();
}

function executePokemonAttack(p, move) {
    const movePower = move.power || 90;
    const mult = getMoveMultiplier(move.type, activeRaidBoss.types);
    const isCrit = Math.random() < 0.22;
    const critMult = isCrit ? 1.5 : 1.0;
    const teraMult = isTeraBoosted ? 2.5 : 1.0;

    const baseDmg = (p.attack * (movePower / 100) * 12) / (activeRaidBoss.defense / 100);
    const totalDmg = Math.round(baseDmg * mult * critMult * teraMult);

    raidBossCurrentHp = Math.max(0, raidBossCurrentHp - totalDmg);
    updateRaidHpBar();

    // Floating combat numbers
    let dmgClass = 'dmg-normal';
    if (isCrit) dmgClass = 'dmg-crit';
    else if (mult >= 2.0) dmgClass = 'dmg-super';
    else if (mult < 1.0) dmgClass = 'dmg-resist';

    spawnFloatingDamage(`-${totalDmg.toLocaleString()} ${isCrit ? 'CRIT!' : ''}`, dmgClass, 'boss');

    if (mult >= 2.0 && wheelInstance) wheelInstance.playSuperEffectiveSound();

    let effectivenessText = '';
    if (mult >= 2.0) effectivenessText = '💥 SUPER EFFECTIVE!';
    else if (mult === 0) effectivenessText = '❌ NO EFFECT!';
    else if (mult < 1.0) effectivenessText = '🛡️ NOT VERY EFFECTIVE...';

    logRaid(`${p.name} used ${move.name}! Dealt ${totalDmg.toLocaleString()} DMG! ${isCrit ? '🔥 CRIT!' : ''} ${isTeraBoosted ? '✨ TERA!' : ''} ${effectivenessText}`);
}

function checkRaidStateAndRetaliate() {
    if (isTeraBoosted) {
        isTeraBoosted = false;
        teraUsedInBattle = true;
        const teraBtn = document.getElementById('btn-tera-burst');
        if (teraBtn) {
            teraBtn.disabled = true;
            teraBtn.style.opacity = '0.5';
            teraBtn.textContent = '✨ Tera Expended';
        }
    }

    // Check Boss Defeat
    if (raidBossCurrentHp <= 0) {
        handleRaidVictory();
        return;
    }

    // Boss Retaliation
    executeBossTurn();
    raidTurn++;
}

function executeBossTurn() {
    const aliveSquad = raidSquad.filter(p => p.currentHp > 0);
    if (!aliveSquad.length) {
        logRaid("💀 Your entire squad fainted! The raid has ended in defeat.");
        return;
    }

    const bossMove = activeRaidBoss.bossMoves[Math.floor(Math.random() * activeRaidBoss.bossMoves.length)];
    logRaid(`⚠️ ${activeRaidBoss.name} retaliated with ${bossMove.name}! (${bossMove.desc})`);

    if (bossMove.aoe) {
        aliveSquad.forEach(p => {
            const mult = getMoveMultiplier(bossMove.type, p.types);
            const dmg = Math.round((activeRaidBoss.attackPower * (bossMove.power / 100) * 8 * mult) / (p.defense / 100));
            p.currentHp = Math.max(0, p.currentHp - dmg);
            spawnFloatingDamage(`-${dmg.toLocaleString()}`, 'dmg-boss', 'squad');
        });
    } else {
        const target = aliveSquad[Math.floor(Math.random() * aliveSquad.length)];
        const mult = getMoveMultiplier(bossMove.type, target.types);
        const dmg = Math.round((activeRaidBoss.attackPower * (bossMove.power / 100) * 12 * mult) / (target.defense / 100));
        target.currentHp = Math.max(0, target.currentHp - dmg);
        spawnFloatingDamage(`-${dmg.toLocaleString()}`, 'dmg-boss', 'squad');
        logRaid(`💥 ${target.name} took ${dmg.toLocaleString()} DMG!`);
    }

    renderRaidSquad();
}

function handleRaidVictory() {
    logRaid(`🏆 VICTORY! ${activeRaidBoss.name} was vanquished! Claimed: ${activeRaidBoss.badge}!`);
    triggerCatchConfetti();
    if (wheelInstance) wheelInstance.playWinSound();

    // Unlock Badge
    unlockedBadges[activeRaidBoss.id] = true;
    saveBadges();

    // Reward MVP Purse Bonus
    if (trainers.length) {
        trainers[0].purse += 25000;
        saveSessionState();
        renderTrainerPodiums();
    }

    alert(`🏆 RAID CLEAR! You defeated ${activeRaidBoss.name}!\n\nAwarded the ${activeRaidBoss.badge}!\nBonus +₹ 25,000 INR prize added to Trainer 1's purse!`);
}

function autoSimulateRaid() {
    if (isRaidRunning) return;
    isRaidRunning = true;

    const interval = setInterval(() => {
        const alive = raidSquad.some(p => p.currentHp > 0);
        if (!alive || raidBossCurrentHp <= 0) {
            clearInterval(interval);
            isRaidRunning = false;
            return;
        }
        executeRaidTurn();
    }, 650);
}

function spawnFloatingDamage(text, className, targetType) {
    const layer = document.getElementById('floating-combat-layer');
    if (!layer) return;

    const elem = document.createElement('div');
    elem.className = `floating-dmg-num ${className}`;
    elem.textContent = text;

    if (targetType === 'boss') {
        elem.style.left = `${30 + Math.random() * 20}%`;
        elem.style.top = `${25 + Math.random() * 20}%`;
    } else {
        elem.style.right = `${10 + Math.random() * 30}%`;
        elem.style.top = `${40 + Math.random() * 30}%`;
    }

    layer.appendChild(elem);
    setTimeout(() => elem.remove(), 1200);
}

function renderBadgeCase() {
    const container = document.getElementById('badge-case-list');
    if (!container) return;

    const badges = [
        { id: 'boss_1', name: 'Mind Badge', boss: 'Mewtwo', icon: '🧠' },
        { id: 'boss_2', name: 'Torrent Badge', boss: 'Primal Titans', icon: '🌋' },
        { id: 'boss_3', name: 'Skycrest Badge', boss: 'Mega Rayquaza', icon: '🐉' },
        { id: 'boss_4', name: 'Radiance Badge', boss: 'Ultra Necrozma', icon: '☀️' },
        { id: 'boss_5', name: 'Alpha Crown', boss: 'Supreme Arceus', icon: '👑' }
    ];

    container.innerHTML = badges.map(b => {
        const isUnlocked = unlockedBadges[b.id];
        return `
            <div class="badge-item ${isUnlocked ? 'unlocked' : ''}">
                <div class="badge-icon">${b.icon}</div>
                <div class="badge-name">${b.name}</div>
                <div class="badge-boss">${b.boss}</div>
                <span style="font-size:0.68rem; font-weight:800; color:${isUnlocked ? '#22c55e' : '#64748b'};">
                    ${isUnlocked ? 'CLAIMED 🏆' : 'LOCKED 🔒'}
                </span>
            </div>
        `;
    }).join('');
}

function logRaid(msg) {
    const feed = document.getElementById('raid-combat-feed');
    if (!feed) return;
    const entry = document.createElement('div');
    entry.className = 'raid-log-entry';
    if (msg.includes('SUPER EFFECTIVE')) entry.className += ' log-super-effective';
    if (msg.includes('retaliated')) entry.className += ' log-boss-attack';
    entry.textContent = msg;
    feed.appendChild(entry);
    feed.scrollTop = feed.scrollHeight;
}

function clearRaidLog() {
    const feed = document.getElementById('raid-combat-feed');
    if (feed) feed.innerHTML = '';
}

// Confetti Celebration
function triggerCatchConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#ffffff'];

    for (let i = 0; i < 90; i++) {
        particles.push({
            x: canvas.width / 2,
            y: canvas.height / 2,
            vx: (Math.random() - 0.5) * 18,
            vy: (Math.random() - 0.8) * 18,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: 4 + Math.random() * 6,
            decay: 0.015 + Math.random() * 0.01,
            alpha: 1
        });
    }

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.4; // gravity
            p.alpha -= p.decay;
            if (p.alpha > 0) {
                alive = true;
                ctx.save();
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        });
        if (alive) requestAnimationFrame(render);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    render();
}
