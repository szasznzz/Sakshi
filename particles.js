// Particle Effects System
import { CONFIG } from './config.js';

export class ParticleSystem {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.particles = [];
    }

    // Create water splash particles
    createSplash(x, y, velocity) {
        const particleCount = Math.min(
            CONFIG.effects.particleCount,
            Math.floor(Math.abs(velocity) * 5)
        );

        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI / 3) + (Math.random() * Math.PI / 3); // Upward spray
            const speed = 2 + Math.random() * 4;
            const size = 2 + Math.random() * 4;

            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
                vy: -Math.sin(angle) * speed,
                size: size,
                life: 1.0,
                decay: 0.02 + Math.random() * 0.02,
                color: this.getWaterColor()
            });
        }
    }

    // Create coin trail particles
    createTrail(x, y) {
        if (Math.random() > 0.7) { // Don't create trail every frame
            this.particles.push({
                x: x + (Math.random() - 0.5) * 10,
                y: y + (Math.random() - 0.5) * 10,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: 2 + Math.random() * 3,
                life: 1.0,
                decay: 0.03,
                color: this.getCoinTrailColor()
            });
        }
    }

    // Create win celebration particles
    createCelebration(x, y) {
        const particleCount = 50;

        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 3 + Math.random() * 5;
            const size = 3 + Math.random() * 5;

            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: size,
                life: 1.0,
                decay: 0.01,
                color: this.getCelebrationColor(),
                gravity: 0.1
            });
        }
    }

    // Create loss particles
    createLossEffect(x, y) {
        const particleCount = 30;

        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            const size = 2 + Math.random() * 4;

            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: size,
                life: 1.0,
                decay: 0.02,
                color: 'rgba(239, 68, 68, ',
                gravity: 0.05
            });
        }
    }

    // Update all particles
    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            // Update position
            p.x += p.vx;
            p.y += p.vy;

            // Apply gravity if exists
            if (p.gravity) {
                p.vy += p.gravity;
            }

            // Apply air resistance
            p.vx *= 0.98;
            p.vy *= 0.98;

            // Decrease life
            p.life -= p.decay;

            // Remove dead particles
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    // Render all particles
    render() {
        this.particles.forEach(p => {
            this.ctx.save();

            // Set opacity based on life
            this.ctx.globalAlpha = p.life;

            // Draw particle
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);

            // Handle color with alpha
            if (p.color.includes('rgba')) {
                this.ctx.fillStyle = p.color + p.life + ')';
            } else {
                this.ctx.fillStyle = p.color;
            }

            this.ctx.fill();

            // Add glow effect for celebration particles
            if (p.gravity && p.life > 0.5) {
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = p.color;
            }

            this.ctx.restore();
        });
    }

    // Get water particle color
    getWaterColor() {
        const colors = [
            'rgba(96, 165, 250, ',  // Blue
            'rgba(147, 197, 253, ', // Light blue
            'rgba(59, 130, 246, ',  // Darker blue
            'rgba(191, 219, 254, '  // Very light blue
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Get coin trail color
    getCoinTrailColor() {
        const colors = [
            'rgba(255, 215, 0, ',   // Gold
            'rgba(255, 193, 7, ',   // Amber
            'rgba(255, 160, 0, '    // Orange-gold
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Get celebration particle color
    getCelebrationColor() {
        const colors = [
            'rgba(16, 185, 129, ',  // Green
            'rgba(52, 211, 153, ',  // Light green
            'rgba(255, 215, 0, ',   // Gold
            'rgba(236, 72, 153, ',  // Pink
            'rgba(139, 92, 246, '   // Purple
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Clear all particles
    clear() {
        this.particles = [];
    }

    // Get particle count
    getCount() {
        return this.particles.length;
    }
}

// Water ripple effect
export class RippleEffect {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.ripples = [];
    }

    // Create a ripple at position
    createRipple(x, y, intensity = 1) {
        this.ripples.push({
            x: x,
            y: y,
            radius: 0,
            maxRadius: 50 * intensity,
            alpha: 1,
            speed: 2 * intensity
        });
    }

    // Update ripples
    update() {
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const ripple = this.ripples[i];

            ripple.radius += ripple.speed;
            ripple.alpha = 1 - (ripple.radius / ripple.maxRadius);

            if (ripple.alpha <= 0) {
                this.ripples.splice(i, 1);
            }
        }
    }

    // Render ripples
    render() {
        this.ripples.forEach(ripple => {
            this.ctx.save();
            this.ctx.globalAlpha = ripple.alpha;
            this.ctx.strokeStyle = 'rgba(96, 165, 250, 0.6)';
            this.ctx.lineWidth = 2;

            this.ctx.beginPath();
            this.ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
            this.ctx.stroke();

            this.ctx.restore();
        });
    }

    // Clear all ripples
    clear() {
        this.ripples = [];
    }
}

// Glow effect for coin
export class GlowEffect {
    constructor() {
        this.intensity = 0;
        this.targetIntensity = 0;
        this.pulseSpeed = 0.05;
    }

    // Set glow intensity
    setIntensity(value) {
        this.targetIntensity = Math.max(0, Math.min(1, value));
    }

    // Update glow
    update() {
        // Smooth transition to target intensity
        this.intensity += (this.targetIntensity - this.intensity) * 0.1;

        // Add pulse effect
        this.intensity += Math.sin(Date.now() * this.pulseSpeed) * 0.1;
        this.intensity = Math.max(0, Math.min(1, this.intensity));
    }

    // Apply glow to context
    apply(ctx, color = '#FFD700') {
        if (this.intensity > 0) {
            ctx.shadowBlur = 20 * this.intensity;
            ctx.shadowColor = color;
        }
    }

    // Remove glow from context
    remove(ctx) {
        ctx.shadowBlur = 0;
    }
}
