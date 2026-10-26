// Pokémon Spin Wheel Engine: High-Performance Canvas Wheel with Pokéball Hub & Sound Synthesis
// Retains exact physics, deceleration, pointer bounce, spark trails and celebration effects

class PokemonWheel {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        
        this.characters = options.characters || [];
        this.onSelect = options.onSelect || (() => {});
        this.onSpinStart = options.onSpinStart || (() => {});
        
        this.currentAngle = 0;
        this.isSpinning = false;
        this.spinVelocity = 0;
        this.deceleration = 0.985;
        this.minVelocity = 0.002;
        this.lastTickIndex = -1;
        this.pointerBounce = 0;
        
        this.particles = [];
        this.audioEnabled = true;
        this.audioCtx = null;
        
        // Element color mappings for Pokémon types
        this.typeColors = {
            Normal: { bg: '#94a3b8', text: '#ffffff' },
            Fire: { bg: '#ea580c', text: '#ffffff' },
            Water: { bg: '#0284c7', text: '#ffffff' },
            Grass: { bg: '#16a34a', text: '#ffffff' },
            Electric: { bg: '#eab308', text: '#1e293b' },
            Ice: { bg: '#06b6d4', text: '#1e293b' },
            Fighting: { bg: '#b91c1c', text: '#ffffff' },
            Poison: { bg: '#9333ea', text: '#ffffff' },
            Ground: { bg: '#b45309', text: '#ffffff' },
            Flying: { bg: '#38bdf8', text: '#1e293b' },
            Psychic: { bg: '#d946ef', text: '#ffffff' },
            Bug: { bg: '#65a30d', text: '#ffffff' },
            Rock: { bg: '#78716c', text: '#ffffff' },
            Ghost: { bg: '#4f46e5', text: '#ffffff' },
            Dragon: { bg: '#6d28d9', text: '#ffffff' },
            Dark: { bg: '#334155', text: '#ffffff' },
            Steel: { bg: '#64748b', text: '#ffffff' },
            Fairy: { bg: '#ec4899', text: '#ffffff' }
        };

        this.init();
    }

    init() {
        this.setupDPI();
        window.addEventListener('resize', () => {
            this.setupDPI();
            this.draw();
        });
        this.draw();
        this.loop();
    }

    setupDPI() {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.width = rect.width;
        this.height = rect.height;
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        this.radius = Math.min(this.centerX, this.centerY) - 24;
    }

    setCharacters(chars) {
        this.characters = chars;
        this.draw();
    }

    initAudio() {
        if (!this.audioCtx && (window.AudioContext || window.webkitAudioContext)) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
        }
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    playTickSound() {
        if (!this.audioEnabled) return;
        this.initAudio();
        if (!this.audioCtx) return;
        try {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(680 + Math.random() * 80, this.audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(140, this.audioCtx.currentTime + 0.04);
            gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.04);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.05);
        } catch(e) {}
    }

    playWinSound() {
        if (!this.audioEnabled) return;
        this.initAudio();
        if (!this.audioCtx) return;
        try {
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            notes.forEach((freq, idx) => {
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime + idx * 0.09);
                gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime + idx * 0.09);
                gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + idx * 0.09 + 0.35);
                osc.connect(gain);
                gain.connect(this.audioCtx.destination);
                osc.start(this.audioCtx.currentTime + idx * 0.09);
                osc.stop(this.audioCtx.currentTime + idx * 0.09 + 0.4);
            });
        } catch(e) {}
    }

    playCatchSound() {
        if (!this.audioEnabled) return;
        this.initAudio();
        if (!this.audioCtx) return;
        try {
            // Iconic Pokémon Catch Jingle (G, B, D, G6)
            const notes = [392.00, 493.88, 587.33, 783.99, 880.00, 987.77];
            notes.forEach((freq, idx) => {
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime + idx * 0.12);
                gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime + idx * 0.12);
                gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + idx * 0.12 + 0.3);
                osc.connect(gain);
                gain.connect(this.audioCtx.destination);
                osc.start(this.audioCtx.currentTime + idx * 0.12);
                osc.stop(this.audioCtx.currentTime + idx * 0.12 + 0.35);
            });
        } catch(e) {}
    }

    playWiggleSound() {
        if (!this.audioEnabled) return;
        this.initAudio();
        if (!this.audioCtx) return;
        try {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, this.audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.1);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.12);
        } catch(e) {}
    }

    playSuperEffectiveSound() {
        if (!this.audioEnabled) return;
        this.initAudio();
        if (!this.audioCtx) return;
        try {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(320, this.audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(80, this.audioCtx.currentTime + 0.25);
            gain.gain.setValueAtTime(0.18, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.28);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.3);
        } catch(e) {}
    }

    playBossRoarSound() {
        if (!this.audioEnabled) return;
        this.initAudio();
        if (!this.audioCtx) return;
        try {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(90, this.audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(45, this.audioCtx.currentTime + 0.6);
            gain.gain.setValueAtTime(0.25, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.65);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.7);
        } catch(e) {}
    }

    playTeraSound() {
        if (!this.audioEnabled) return;
        this.initAudio();
        if (!this.audioCtx) return;
        try {
            [880, 1108.73, 1318.51, 1760].forEach((freq, idx) => {
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime + idx * 0.08);
                gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime + idx * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + idx * 0.08 + 0.4);
                osc.connect(gain);
                gain.connect(this.audioCtx.destination);
                osc.start(this.audioCtx.currentTime + idx * 0.08);
                osc.stop(this.audioCtx.currentTime + idx * 0.08 + 0.45);
            });
        } catch(e) {}
    }

    addSpark(x, y, color = '#facc15') {
        for (let i = 0; i < 4; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 3.5;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1,
                alpha: 1,
                decay: 0.03 + Math.random() * 0.03,
                size: 2.5 + Math.random() * 3,
                color
            });
        }
    }

    spin(targetIndex = null) {
        if (this.isSpinning || !this.characters.length) return;
        this.isSpinning = true;
        this.onSpinStart();

        const numSlices = this.characters.length;
        const sliceAngle = (Math.PI * 2) / numSlices;

        let targetSlice = targetIndex !== null && targetIndex >= 0 && targetIndex < numSlices
            ? targetIndex
            : Math.floor(Math.random() * numSlices);

        // Calculate rotation so targetSlice lands exactly under top pointer (angle = 3*PI/2)
        const minRotations = 5 + Math.floor(Math.random() * 3);
        const randomOffset = (Math.random() * 0.7 - 0.35) * sliceAngle; // slight center randomness
        const destinationAngle = (3 * Math.PI / 2) - (targetSlice * sliceAngle + sliceAngle / 2) + randomOffset;
        
        let totalDistance = destinationAngle - (this.currentAngle % (Math.PI * 2));
        while (totalDistance < minRotations * Math.PI * 2) {
            totalDistance += Math.PI * 2;
        }

        // Calculate initial velocity based on distance and deceleration
        this.spinVelocity = Math.sqrt(2 * totalDistance * (1 - this.deceleration) * 1.5);
        if (this.spinVelocity < 0.35) this.spinVelocity = 0.42;
    }

    loop() {
        requestAnimationFrame(() => this.loop());

        if (this.isSpinning) {
            this.currentAngle += this.spinVelocity;
            this.spinVelocity *= this.deceleration;

            // Pointer tick calculation
            const numSlices = this.characters.length;
            const sliceAngle = (Math.PI * 2) / numSlices;
            const normalizedAngle = (3 * Math.PI / 2 - this.currentAngle) % (Math.PI * 2);
            const positiveAngle = (normalizedAngle + Math.PI * 2) % (Math.PI * 2);
            const currentSliceIndex = Math.floor(positiveAngle / sliceAngle);

            if (currentSliceIndex !== this.lastTickIndex) {
                this.lastTickIndex = currentSliceIndex;
                this.pointerBounce = 1.0;
                this.playTickSound();
                this.addSpark(this.centerX, this.centerY - this.radius, '#ef4444');
            }

            if (this.spinVelocity <= this.minVelocity) {
                this.isSpinning = false;
                this.spinVelocity = 0;
                const finalSelected = this.characters[currentSliceIndex];
                this.playWinSound();
                this.onSelect(finalSelected, currentSliceIndex);
            }
        }

        if (this.pointerBounce > 0) {
            this.pointerBounce *= 0.88;
            if (this.pointerBounce < 0.02) this.pointerBounce = 0;
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.08; // gravity
            p.alpha -= p.decay;
            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }

        this.draw();
    }

    draw() {
        const ctx = this.ctx;
        if (!ctx) return;

        ctx.clearRect(0, 0, this.width, this.height);

        const numSlices = this.characters.length;
        if (numSlices === 0) {
            this.drawEmptyWheel();
            return;
        }

        const sliceAngle = (Math.PI * 2) / numSlices;

        // Outer Aura Glow
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.radius + 12, 0, Math.PI * 2);
        ctx.strokeStyle = this.isSpinning ? 'rgba(239, 68, 68, 0.55)' : 'rgba(245, 158, 11, 0.35)';
        ctx.lineWidth = 14;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.radius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 8;
        ctx.stroke();
        ctx.restore();

        // Draw Slices
        for (let i = 0; i < numSlices; i++) {
            const char = this.characters[i];
            const startAngle = this.currentAngle + i * sliceAngle;
            const endAngle = startAngle + sliceAngle;

            const primaryType = char.types && char.types[0] ? char.types[0] : 'Normal';
            const palette = this.typeColors[primaryType] || this.typeColors.Normal;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(this.centerX, this.centerY);
            ctx.arc(this.centerX, this.centerY, this.radius, startAngle, endAngle);
            ctx.closePath();

            // Slice background gradient
            const midAngle = startAngle + sliceAngle / 2;
            const gradX = this.centerX + Math.cos(midAngle) * this.radius;
            const gradY = this.centerY + Math.sin(midAngle) * this.radius;
            const grad = ctx.createLinearGradient(this.centerX, this.centerY, gradX, gradY);
            grad.addColorStop(0, '#0f172a');
            grad.addColorStop(0.3, palette.bg);
            grad.addColorStop(1, '#020617');

            ctx.fillStyle = grad;
            ctx.fill();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();

            // Label text & type pill
            ctx.save();
            ctx.translate(this.centerX, this.centerY);
            ctx.rotate(midAngle);
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';

            // Pokémon Name
            ctx.font = 'bold 12px "Inter", sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
            ctx.shadowBlur = 4;
            
            const maxChars = numSlices > 30 ? 11 : 16;
            const shortName = char.name.length > maxChars ? char.name.substring(0, maxChars) + '..' : char.name;
            ctx.fillText(shortName, this.radius - 22, 0);

            // Subtle Type dot
            ctx.beginPath();
            ctx.arc(this.radius - 10, 0, 4, 0, Math.PI * 2);
            ctx.fillStyle = palette.bg;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.restore();
        }

        // Draw Center Pokéball Hub
        this.drawPokeballHub();

        // Draw Pointer at Top
        this.drawPointer();

        // Draw Sparks
        this.drawParticles();
    }

    drawPokeballHub() {
        const ctx = this.ctx;
        const hubRadius = Math.max(38, this.radius * 0.18);

        ctx.save();
        ctx.translate(this.centerX, this.centerY);

        // Shadow under hub
        ctx.beginPath();
        ctx.arc(0, 0, hubRadius + 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fill();

        // Top Half (Red)
        ctx.beginPath();
        ctx.arc(0, 0, hubRadius, Math.PI, 0, false);
        ctx.fillStyle = '#ef4444';
        ctx.fill();

        // Bottom Half (White)
        ctx.beginPath();
        ctx.arc(0, 0, hubRadius, 0, Math.PI, false);
        ctx.fillStyle = '#f8fafc';
        ctx.fill();

        // Black Center Divider Belt
        ctx.beginPath();
        ctx.rect(-hubRadius, -4, hubRadius * 2, 8);
        ctx.fillStyle = '#0f172a';
        ctx.fill();

        // Center Outer Ring (Black)
        ctx.beginPath();
        ctx.arc(0, 0, hubRadius * 0.38, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();

        // Center Button (White with glow)
        ctx.beginPath();
        ctx.arc(0, 0, hubRadius * 0.24, 0, Math.PI * 2);
        ctx.fillStyle = this.isSpinning ? '#facc15' : '#ffffff';
        ctx.shadowColor = this.isSpinning ? '#facc15' : '#38bdf8';
        ctx.shadowBlur = this.isSpinning ? 15 : 6;
        ctx.fill();

        // Inner Core Ring
        ctx.beginPath();
        ctx.arc(0, 0, hubRadius * 0.12, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b';
        ctx.fill();

        // Outer Metallic Rim
        ctx.beginPath();
        ctx.arc(0, 0, hubRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.restore();
    }

    drawPointer() {
        const ctx = this.ctx;
        const pointerY = this.centerY - this.radius;
        const angleDeflect = this.pointerBounce * 0.25;

        ctx.save();
        ctx.translate(this.centerX, pointerY);
        ctx.rotate(angleDeflect);

        // Outer Glow
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 12;

        // Pointer Arrow
        ctx.beginPath();
        ctx.moveTo(0, 16);
        ctx.lineTo(-14, -18);
        ctx.lineTo(14, -18);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, -18, 0, 16);
        grad.addColorStop(0, '#f97316');
        grad.addColorStop(1, '#ef4444');
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Pointer Anchor Jewel
        ctx.beginPath();
        ctx.arc(0, -18, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.restore();
    }

    drawParticles() {
        const ctx = this.ctx;
        for (const p of this.particles) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 6;
            ctx.fill();
            ctx.restore();
        }
    }

    drawEmptyWheel() {
        const ctx = this.ctx;
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '16px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No Pokémon matched the selected filter', this.centerX, this.centerY);
        ctx.restore();
    }
}
