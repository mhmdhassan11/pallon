const container = document.getElementById('game-container');
const scoreDisplay = document.getElementById('score-display');
const livesDisplay = document.getElementById('lives-display');
const gameOverModal = document.getElementById('game-over');
const overCard = document.getElementById('over-card');
const finalScoreText = document.getElementById('final-score');

let score = 0;
let lives = 3;
let gameActive = true;
let spawnRate = 1500; // ms
let speed = 4; // seconds to cross screen
let comboCount = 0;
let lastPopTime = 0;
let currentPhase = 'day';
let lastCelebrationScore = 0;
let isFrozen = false;
let freezeTimer = null;
let activeAnimations = new Set();

const images = [
    'img/p1.png',
    'img/p2.png',
    'img/p3.png',
    'img/p4.png',
    'img/p5.png',
    'img/p6.png',
    'img/p7.png',
    'img/p8.png',
    'img/p9.png'
];

const celebrationAssets = [
    'assets/images/candy_cyan.png',
    'assets/images/candy_cyan2.png',
    'assets/images/candy_green.png',
    'assets/images/candy_green_triangle.png',
    'assets/images/candy_heart.png',
    'assets/images/candy_orange.png',
    'assets/images/candy_pink.png',
    'assets/images/candy_pink2.png',
    'assets/images/candy_purple.png',
    'assets/images/candy_yellow.png',
    'assets/images/candy_yellow2.png'
];

const sounds = [
    'sound/balloon-burst-383750.mp3',
    'sound/balloon-pop-48030.mp3',
    'sound/freesound_community-balloon-pop-93436.mp3',
    'sound/universfield-party-balloon-pop-323588.mp3'
];

// Simple Audio Pool for file:// compatibility and low latency
const audioPool = {};
sounds.forEach(src => {
    audioPool[src] = [];
    for (let i = 0; i < 5; i++) { // Create 5 instances of each sound
        const audio = new Audio(src);
        audio.preload = 'auto';
        audioPool[src].push(audio);
    }
});

// Preparation for Wow sound (Celebration)
const wowSound = new Audio('sound/wow.mp3');
wowSound.preload = 'auto';

function createBalloon() {
    if (!gameActive) return;

    const balloon = document.createElement('img');
    balloon.className = 'balloon';

    // Determine Type
    let type = 'normal';
    const rand = Math.random();
    if (rand < 0.05) type = 'gold';
    else if (rand < 0.08) type = 'bomb';
    else if (rand < 0.10) type = 'life';
    else if (rand < 0.15) type = 'freeze';

    const imgSrc = images[Math.floor(Math.random() * images.length)];
    const size = (type === 'normal') ? Math.random() * 60 + 70 : 100;

    balloon.src = imgSrc;
    balloon.dataset.type = type;
    balloon.style.width = `${size}px`;
    balloon.style.height = 'auto';
    balloon.style.left = `${Math.random() * (window.innerWidth - size)}px`;
    balloon.style.bottom = `-150px`;
    balloon.style.position = 'absolute';
    balloon.style.cursor = 'pointer';
    balloon.style.userSelect = 'none';
    balloon.setAttribute('draggable', 'false');

    // Visual styles for special types
    if (type === 'gold') {
        balloon.style.filter = 'drop-shadow(0 0 10px gold) brightness(1.2)';
        gsap.to(balloon, { scale: 1.2, repeat: -1, yoyo: true, duration: 0.5 });
    } else if (type === 'bomb') {
        balloon.style.filter = 'drop-shadow(0 0 10px red) hue-rotate(300deg)';
    } else if (type === 'freeze') {
        balloon.style.filter = 'drop-shadow(0 0 15px #00e5ff) hue-rotate(180deg)';
        const flakeIcon = document.createElement('div');
        flakeIcon.innerHTML = `<i data-lucide="snowflak" class="text-white w-10 h-10"></i>`;
        // Fix typo if it was meant to be snowflake, but using inline SVG is safer
        flakeIcon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <line x1="12" y1="2" x2="12" y2="22"></line>
                <path d="m20 16-4-4 4-4"></path>
                <path d="m4 8 4 4-4 4"></path>
                <path d="m16 4-4 4-4-4"></path>
                <path d="m8 20 4-4 4 4"></path>
            </svg>
        `;
        flakeIcon.style.position = 'absolute';
        flakeIcon.style.top = '50%';
        flakeIcon.style.left = '50%';
        flakeIcon.style.transform = 'translate(-50%, -50%)';
        flakeIcon.className = 'pointer-events-none';
        const wrapper = document.createElement('div');
        wrapper.style.position = 'absolute';
        wrapper.style.left = balloon.style.left;
        wrapper.style.bottom = balloon.style.bottom;
        wrapper.appendChild(balloon);
        wrapper.appendChild(flakeIcon);
        container.appendChild(wrapper);
        balloon.style.position = 'static';
    } else if (type === 'life') {
        balloon.style.filter = 'drop-shadow(0 0 10px #ff007a)';
        const heartIcon = document.createElement('div');
        heartIcon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="#ff4757" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
            </svg>
        `;
        heartIcon.style.position = 'absolute';
        heartIcon.style.top = '50%';
        heartIcon.style.left = '50%';
        heartIcon.style.transform = 'translate(-50%, -50%)';
        heartIcon.className = 'pointer-events-none';
        // Need a wrapper to show emoji over image
        const wrapper = document.createElement('div');
        wrapper.style.position = 'absolute';
        wrapper.style.left = balloon.style.left;
        wrapper.style.bottom = balloon.style.bottom;
        wrapper.appendChild(balloon);
        wrapper.appendChild(heartIcon);
        container.appendChild(wrapper);
        balloon.style.position = 'static'; // Use wrapper's position
    } else {
        container.appendChild(balloon);
    }

    const targetElement = (type === 'life' || type === 'freeze') ? balloon.parentElement : balloon;

    // Animation with Wobble
    const anim = gsap.to(targetElement, {
        y: -(window.innerHeight + 200),
        x: `+=${Math.random() * 100 - 50}`, // Gentle drift
        duration: speed,
        ease: "none",
        onComplete: () => {
            if (gameActive && type === 'normal') {
                loseLife();
            }
            activeAnimations.delete(anim);
            targetElement.remove();
        }
    });

    if (isFrozen) anim.timeScale(0.3);
    activeAnimations.add(anim);

    // Sine Wave Wobble
    gsap.to(targetElement, {
        x: "+=40",
        duration: 0.8 + Math.random(),
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
    });

    balloon.onclick = (e) => {
        if (!gameActive) return;
        const rect = balloon.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        playPopSound();
        createExplosion(centerX, centerY);
        popBalloon(targetElement, anim, type);
    };
}

function playPopSound() {
    const src = sounds[Math.floor(Math.random() * sounds.length)];
    const pool = audioPool[src];

    // Find an available audio object in the pool
    const audio = pool.find(a => a.paused) || pool[0];
    audio.currentTime = 0;
    audio.play().catch(e => {
        // Fallback: create a new one if pooling is restricted
        const fallback = new Audio(src);
        fallback.play();
    });
}

function playCelebrationSound() {
    if (wowSound) {
        wowSound.currentTime = 0;
        wowSound.play().catch(e => console.log("Wow sound blocked", e));
    }
}

function createExplosion(x, y) {
    // 1. Central "Star" Burst
    const star = document.createElement('div');
    star.className = 'absolute z-[1001] pointer-events-none text-white text-4xl';
    star.style.left = `${x - 20}px`;
    star.style.top = `${y - 20}px`;
    star.innerHTML = '✦';
    container.appendChild(star);
    gsap.fromTo(star, { scale: 0, opacity: 1 }, { scale: 4, opacity: 0, duration: 0.3, ease: "power2.out", onComplete: () => star.remove() });

    // 2. Radial Rays
    for (let i = 0; i < 8; i++) {
        const ray = document.createElement('div');
        ray.className = 'absolute bg-white/60 z-[1000] pointer-events-none';
        ray.style.left = `${x}px`;
        ray.style.top = `${y}px`;
        ray.style.width = '2px';
        ray.style.height = '40px';
        ray.style.transformOrigin = 'bottom center';
        ray.style.transform = `rotate(${i * 45}deg)`;
        container.appendChild(ray);
        gsap.to(ray, { y: -60, scaleY: 0, opacity: 0, duration: 0.4, ease: "power2.out", onComplete: () => ray.remove() });
    }

    // 3. Dense Confetti (Squares, Triangles, Circles)
    const count = 35;
    const colors = ['#FF007A', '#00E5FF', '#FFD600', '#00FF94', '#9333EA', '#FF5C00'];

    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = Math.random() * 12 + 6;
        const type = Math.floor(Math.random() * 3); // 0: square, 1: circle, 2: strip

        p.className = 'absolute z-[1000] pointer-events-none';
        p.style.backgroundColor = color;
        p.style.left = `${x}px`;
        p.style.top = `${y}px`;

        if (type === 0) {
            p.style.width = `${size}px`;
            p.style.height = `${size}px`;
        } else if (type === 1) {
            p.style.width = `${size}px`;
            p.style.height = `${size}px`;
            p.style.borderRadius = '50%';
        } else {
            p.style.width = `${size / 3}px`;
            p.style.height = `${size * 1.5}px`;
        }

        p.style.boxShadow = `0 0 8px ${color}`;
        container.appendChild(p);

        const angle = Math.random() * Math.PI * 2;
        const force = Math.random() * 250 + 100;
        const tx = Math.cos(angle) * force;
        const ty = Math.sin(angle) * force;

        gsap.to(p, {
            x: tx,
            y: ty,
            rotation: Math.random() * 1000 - 500,
            duration: 0.6 + Math.random() * 0.4,
            ease: "expo.out",
        });

        gsap.to(p, {
            y: "+=200", // Gravity fall
            opacity: 0,
            scale: 0.2,
            delay: 0.3,
            duration: 0.7,
            ease: "power2.in",
            onComplete: () => p.remove()
        });
    }
}

function popBalloon(balloon, anim, type = 'normal') {
    anim.kill(); // Kill the flight animation
    activeAnimations.delete(anim);

    // Combo Logic
    const now = Date.now();
    if (now - lastPopTime < 600) {
        comboCount++;
        showComboText(comboCount);
    } else {
        comboCount = 0;
    }
    lastPopTime = now;

    // Score Handling
    let points = 10;
    if (type === 'gold') points = 50;

    const multiplier = (comboCount > 0) ? Math.min(comboCount + 1, 5) : 1;
    score += (points * multiplier);
    scoreDisplay.innerText = `Score: ${score}`;

    // Special Effects
    if (type === 'bomb') {
        explodeAll();
    } else if (type === 'life') {
        if (lives < 3) lives++;
        updateLivesUI(true);
    } else if (type === 'freeze') {
        applyFreeze();
    }

    // Pop Effect
    gsap.to(balloon, {
        scale: 1.4,
        opacity: 0,
        duration: 0.15,
        ease: "power1.out",
        onComplete: () => balloon.remove()
    });

    handleProgression();
}

function handleProgression() {
    // Phase Backgrounds
    if (score >= 1000 && currentPhase !== 'night') {
        currentPhase = 'night';
        gsap.to(document.body, { backgroundColor: '#1a1a2e', duration: 3 });
    } else if (score >= 500 && currentPhase === 'day') {
        currentPhase = 'sunset';
        gsap.to(document.body, { backgroundColor: '#ff7e5f', duration: 3 });
    }

    // Difficulty Increase & Celebration
    if (score >= lastCelebrationScore + 100) {
        lastCelebrationScore = Math.floor(score / 100) * 100;

        speed = Math.max(1.5, speed - 0.2);
        spawnRate = Math.max(400, spawnRate - 50);
        clearInterval(spawnInterval);
        spawnInterval = setInterval(createBalloon, spawnRate);

        triggerCelebration();
    }
}

function showComboText(count) {
    if (count < 1) return;
    const txt = document.createElement('div');
    txt.className = 'absolute pointer-events-none text-white font-bold italic z-[1500] pointer-events-none';
    txt.style.left = '50%';
    txt.style.top = '40%';
    txt.style.fontSize = (2 + count * 0.5) + 'rem';
    txt.innerHTML = `<span class="text-yellow-400 drop-shadow-lg">COMBO x${count + 1}!</span>`;
    container.appendChild(txt);

    gsap.fromTo(txt, { scale: 0, opacity: 1 }, {
        scale: 1.2,
        y: -100,
        opacity: 0,
        duration: 0.8,
        onComplete: () => txt.remove()
    });
}

function explodeAll() {
    const allBalloons = document.querySelectorAll('.balloon');
    allBalloons.forEach(b => {
        const rect = b.getBoundingClientRect();
        createExplosion(rect.left + rect.width / 2, rect.top + rect.height / 2);
        b.remove();
    });
    score += (allBalloons.length * 10);
    scoreDisplay.innerText = `Score: ${score}`;
}

function triggerCelebration() {
    playCelebrationSound();
    const words = ["AWESOME!", "HERO!", "WONDERFUL!", "AMAZING!", "KEEP GOING!", "EXCELLENT!"];
    const word = words[Math.floor(Math.random() * words.length)];

    // 1. Encouragement Text
    const text = document.createElement('div');
    text.className = 'absolute inset-0 flex items-center justify-center pointer-events-none z-[2000]';
    text.innerHTML = `<h2 class="text-7xl font-bold text-white drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)] scale-0">${word}</h2>`;
    container.appendChild(text);

    gsap.to(text.firstChild, {
        scale: 1.5,
        duration: 0.8,
        ease: "back.out(2)",
        onComplete: () => {
            gsap.to(text.firstChild, { opacity: 0, y: -100, duration: 0.5, delay: 0.5, onComplete: () => text.remove() });
        }
    });

    // 2. Candy Shower (Confetti)
    for (let i = 0; i < 40; i++) {
        const candy = document.createElement('img');
        const imgSrc = celebrationAssets[Math.floor(Math.random() * celebrationAssets.length)];
        const size = Math.random() * 50 + 40; // Larger for celebration

        candy.src = imgSrc;
        candy.className = 'absolute pointer-events-none z-[1900]';
        candy.style.width = `${size}px`;
        candy.style.left = `${Math.random() * 100}vw`;
        candy.style.top = `-50px`;
        container.appendChild(candy);

        gsap.to(candy, {
            y: window.innerHeight + 100,
            x: `+=${Math.random() * 200 - 100}`,
            rotation: Math.random() * 1000 - 500,
            duration: Math.random() * 2 + 1.5,
            ease: "none",
            onComplete: () => candy.remove()
        });
    }
}

function applyFreeze() {
    if (isFrozen) {
        clearTimeout(freezeTimer);
    } else {
        isFrozen = true;
        // Slow down all active animations
        activeAnimations.forEach(a => gsap.to(a, { timeScale: 0.3, duration: 0.5 }));

        // Slow down spawning
        clearInterval(spawnInterval);
        spawnInterval = setInterval(createBalloon, spawnRate * 2);

        // Visual overlay
        const overlay = document.createElement('div');
        overlay.id = 'freeze-overlay';
        // Lower z-index so it doesn't block clicks, and remove backdrop-blur for safer events
        overlay.className = 'fixed inset-0 pointer-events-none z-[10] bg-blue-500/30 opacity-0';
        document.body.appendChild(overlay);
        gsap.to(overlay, { opacity: 1, duration: 0.5 });

        // Ensure balloons are clickable by giving them higher z-index (handled in CSS or here)
        container.style.zIndex = "100";
    }

    freezeTimer = setTimeout(() => {
        isFrozen = false;
        // Restore all active animations
        activeAnimations.forEach(a => gsap.to(a, { timeScale: 1.0, duration: 1 }));

        // Restore spawning
        clearInterval(spawnInterval);
        spawnInterval = setInterval(createBalloon, spawnRate);

        const overlay = document.getElementById('freeze-overlay');
        if (overlay) {
            gsap.to(overlay, { opacity: 0, duration: 1, onComplete: () => overlay.remove() });
        }
    }, 5000);
}

function loseLife() {
    lives--;
    updateLivesUI();
    if (lives <= 0) {
        endGame();
    }
}

function updateLivesUI(regain = false) {
    const hearts = livesDisplay.querySelectorAll('.heart');
    hearts.forEach((h, i) => {
        if (i < lives) {
            h.classList.remove('lost');
        } else {
            h.classList.add('lost');
        }
    });
}

function endGame() {
    gameActive = false;

    // Confetti celebration
    createExplosion(window.innerWidth / 2, window.innerHeight / 2);
    for (let i = 0; i < 5; i++) {
        setTimeout(() => createExplosion(
            Math.random() * window.innerWidth,
            Math.random() * window.innerHeight
        ), i * 100);
    }

    // Show modal and animate card
    gameOverModal.classList.add('active');
    gsap.to(gameOverModal, { opacity: 1, duration: 0.5 });
    gsap.to(overCard, {
        scale: 1,
        duration: 1.2,
        ease: "elastic.out(1, 0.4)"
    });

    // Animate score counting
    const scoreElement = document.getElementById('final-score');
    let displayScore = { val: 0 };
    gsap.to(displayScore, {
        val: score,
        duration: 2,
        ease: "power2.out",
        onUpdate: () => {
            scoreElement.innerText = Math.floor(displayScore.val);
        },
        onComplete: () => {
            // Show stars after score
            showStars(score);
        }
    });

    // Save Total Points
    const totalPoints = parseInt(localStorage.getItem('totalPoints') || '0');
    localStorage.setItem('totalPoints', totalPoints + score);
}

function showStars(finalScore) {
    let starCount = 0;
    if (finalScore >= 500) starCount = 3;
    else if (finalScore >= 250) starCount = 2;
    else if (finalScore >= 100) starCount = 1;

    const stars = [document.getElementById('star1'), document.getElementById('star2'), document.getElementById('star3')];

    stars.forEach((star, index) => {
        if (index < starCount) {
            setTimeout(() => {
                star.classList.add('active');
                gsap.from(star, {
                    scale: 0,
                    rotation: 360,
                    duration: 0.8,
                    ease: "back.out(2)"
                });

                // Sound
                const pop = new Audio(sounds[0]);
                pop.volume = 0.2;
                pop.play().catch(() => { });
            }, index * 300);
        }
    });
}

let spawnInterval = setInterval(createBalloon, spawnRate);
