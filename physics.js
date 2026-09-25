// Physics Engine using Matter.js
import { CONFIG } from './config.js';
import { ParticleSystem, RippleEffect, GlowEffect } from './particles.js';

export class PhysicsEngine {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;

        // Matter.js modules
        this.Engine = Matter.Engine;
        this.World = Matter.World;
        this.Bodies = Matter.Bodies;
        this.Body = Matter.Body;
        this.Events = Matter.Events;

        // Create engine
        this.engine = this.Engine.create();
        this.engine.gravity.y = CONFIG.physics.gravity;

        // Physics bodies
        this.largeContainer = null;
        this.smallContainer = null;
        this.coin = null;
        this.waterZone = null;

        // Effects
        this.particleSystem = new ParticleSystem(canvas, ctx);
        this.rippleEffect = new RippleEffect(canvas, ctx);
        this.glowEffect = new GlowEffect();

        // State
        this.coinInWater = false;
        this.lastCoinY = 0;

        this.setupWorld();
        this.setupCollisionEvents();
    }

    // Setup physics world
    setupWorld() {
        const { large, small } = CONFIG.containers;

        // Create large container walls
        const wallOptions = {
            isStatic: true,
            restitution: 0.2,
            friction: 0.3,
            render: { fillStyle: 'rgba(255, 255, 255, 0.1)' }
        };

        // Bottom wall
        this.largeContainerBottom = this.Bodies.rectangle(
            large.x,
            large.y + large.wallThickness / 2,
            large.width,
            large.wallThickness,
            wallOptions
        );

        // Left wall
        this.largeContainerLeft = this.Bodies.rectangle(
            large.x - large.width / 2 + large.wallThickness / 2,
            large.y - large.height / 2,
            large.wallThickness,
            large.height,
            wallOptions
        );

        // Right wall
        this.largeContainerRight = this.Bodies.rectangle(
            large.x + large.width / 2 - large.wallThickness / 2,
            large.y - large.height / 2,
            large.wallThickness,
            large.height,
            wallOptions
        );

        // Create small container walls
        const smallWallOptions = {
            isStatic: true,
            restitution: 0.3,
            friction: 0.2,
            render: { fillStyle: 'rgba(255, 255, 255, 0.15)' }
        };

        // Small container bottom
        this.smallContainerBottom = this.Bodies.rectangle(
            small.x,
            small.y + small.wallThickness / 2,
            small.width,
            small.wallThickness,
            smallWallOptions
        );

        // Small container left wall
        this.smallContainerLeft = this.Bodies.rectangle(
            small.x - small.width / 2 + small.wallThickness / 2,
            small.y - small.height / 2,
            small.wallThickness,
            small.height,
            smallWallOptions
        );

        // Small container right wall
        this.smallContainerRight = this.Bodies.rectangle(
            small.x + small.width / 2 - small.wallThickness / 2,
            small.y - small.height / 2,
            small.wallThickness,
            small.height,
            smallWallOptions
        );

        // Add containers to world
        this.World.add(this.engine.world, [
            this.largeContainerBottom,
            this.largeContainerLeft,
            this.largeContainerRight,
            this.smallContainerBottom,
            this.smallContainerLeft,
            this.smallContainerRight
        ]);

        // Define water zone (for visual reference)
        this.waterZone = {
            x: large.x,
            y: large.y - large.waterLevel / 2,
            width: large.width - large.wallThickness * 2,
            height: large.waterLevel
        };
    }

    // Setup collision detection
    setupCollisionEvents() {
        this.Events.on(this.engine, 'collisionStart', (event) => {
            event.pairs.forEach((pair) => {
                if (this.coin && (pair.bodyA === this.coin || pair.bodyB === this.coin)) {
                    const otherBody = pair.bodyA === this.coin ? pair.bodyB : pair.bodyA;
                    const collision = pair.collision;

                    // Calculate impact velocity
                    const velocity = Math.abs(this.coin.velocity.y);

                    // Create splash if hitting water surface or container
                    if (velocity > CONFIG.effects.splashThreshold) {
                        this.particleSystem.createSplash(
                            collision.supports[0].x,
                            collision.supports[0].y,
                            velocity
                        );

                        this.rippleEffect.createRipple(
                            collision.supports[0].x,
                            collision.supports[0].y,
                            velocity / 10
                        );
                    }
                }
            });
        });
    }

    // Create and drop coin
    dropCoin(angle, force) {
        // Remove existing coin if any
        if (this.coin) {
            this.World.remove(this.engine.world, this.coin);
        }

        const { large } = CONFIG.containers;
        const { radius } = CONFIG.coin;

        // Calculate drop position based on angle
        const angleRad = (angle * Math.PI) / 180;
        const dropRadius = large.width / 2 + CONFIG.drop.dropHeight;

        const dropX = large.x + Math.cos(angleRad) * dropRadius;
        const dropY = large.y - large.height / 2 - CONFIG.drop.dropHeight;

        // Create coin body
        this.coin = this.Bodies.circle(dropX, dropY, radius, {
            restitution: CONFIG.physics.coinRestitution,
            friction: CONFIG.physics.coinFriction,
            density: 0.001,
            render: { fillStyle: CONFIG.coin.color }
        });

        // Apply initial force towards center
        const forceX = -Math.cos(angleRad) * force * 0.001;
        const forceY = force * 0.0005;

        this.Body.applyForce(this.coin, this.coin.position, {
            x: forceX,
            y: forceY
        });

        // Add to world
        this.World.add(this.engine.world, this.coin);

        // Reset state
        this.coinInWater = false;
        this.lastCoinY = dropY;
        this.glowEffect.setIntensity(1);

        console.log('Coin dropped at angle:', angle, 'with force:', force);
    }

    // Update physics
    update() {
        // Update engine
        this.Engine.update(this.engine, 1000 / 60);

        // Update effects
        this.particleSystem.update();
        this.rippleEffect.update();
        this.glowEffect.update();

        // Check if coin is in water and apply water resistance
        if (this.coin) {
            const coinY = this.coin.position.y;
            const waterTop = this.waterZone.y - this.waterZone.height / 2;

            // Check if coin entered water
            if (coinY > waterTop && !this.coinInWater) {
                this.coinInWater = true;
                this.particleSystem.createSplash(
                    this.coin.position.x,
                    waterTop,
                    Math.abs(this.coin.velocity.y)
                );
                this.rippleEffect.createRipple(
                    this.coin.position.x,
                    waterTop,
                    2
                );
            }

            // Apply water resistance
            if (this.coinInWater) {
                const waterResistance = CONFIG.physics.waterResistance;

                // Apply deflection force (water pushes coin sideways)
                const deflectionForce = {
                    x: (Math.random() - 0.5) * 0.0001,
                    y: -this.coin.velocity.y * waterResistance * 0.001
                };

                this.Body.applyForce(this.coin, this.coin.position, deflectionForce);

                // Reduce velocity (water resistance)
                this.Body.setVelocity(this.coin, {
                    x: this.coin.velocity.x * (1 - waterResistance * 0.1),
                    y: this.coin.velocity.y * (1 - waterResistance * 0.05)
                });
            }

            // Create trail particles
            if (Math.abs(this.coin.velocity.y) > 1) {
                this.particleSystem.createTrail(
                    this.coin.position.x,
                    this.coin.position.y
                );
            }

            this.lastCoinY = coinY;
        }
    }

    // Render physics world
    render() {
        // Clear canvas
        this.ctx.fillStyle = CONFIG.canvas.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Render water
        this.renderWater();

        // Render containers
        this.renderContainer();

        // Render effects
        this.rippleEffect.render();

        // Render coin
        if (this.coin) {
            this.renderCoin();
        }

        // Render particles on top
        this.particleSystem.render();
    }

    // Render water
    renderWater() {
        const { x, y, width, height } = this.waterZone;

        this.ctx.save();

        // Water gradient
        const gradient = this.ctx.createLinearGradient(
            x - width / 2,
            y - height / 2,
            x - width / 2,
            y + height / 2
        );
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
        gradient.addColorStop(1, 'rgba(37, 99, 235, 0.5)');

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(
            x - width / 2,
            y - height / 2,
            width,
            height
        );

        // Water surface shimmer
        this.ctx.strokeStyle = 'rgba(147, 197, 253, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x - width / 2, y - height / 2);
        this.ctx.lineTo(x + width / 2, y - height / 2);
        this.ctx.stroke();

        this.ctx.restore();
    }

    // Render containers
    renderContainer() {
        const { large, small } = CONFIG.containers;

        this.ctx.save();

        // Large container
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = large.wallThickness;
        this.ctx.beginPath();
        this.ctx.moveTo(large.x - large.width / 2, large.y);
        this.ctx.lineTo(large.x - large.width / 2, large.y - large.height);
        this.ctx.lineTo(large.x + large.width / 2, large.y - large.height);
        this.ctx.lineTo(large.x + large.width / 2, large.y);
        this.ctx.stroke();

        // Glass effect
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // Small container
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.lineWidth = small.wallThickness;
        this.ctx.beginPath();
        this.ctx.moveTo(small.x - small.width / 2, small.y);
        this.ctx.lineTo(small.x - small.width / 2, small.y - small.height);
        this.ctx.lineTo(small.x + small.width / 2, small.y - small.height);
        this.ctx.lineTo(small.x + small.width / 2, small.y);
        this.ctx.stroke();

        // Highlight small container (target)
        this.ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        this.ctx.restore();
    }

    // Render coin
    renderCoin() {
        const pos = this.coin.position;
        const radius = CONFIG.coin.radius;

        this.ctx.save();

        // Apply glow effect
        this.glowEffect.apply(this.ctx, CONFIG.coin.glowColor);

        // Coin gradient
        const gradient = this.ctx.createRadialGradient(
            pos.x - radius / 3,
            pos.y - radius / 3,
            0,
            pos.x,
            pos.y,
            radius
        );
        gradient.addColorStop(0, '#FFF4CC');
        gradient.addColorStop(0.5, CONFIG.coin.color);
        gradient.addColorStop(1, '#CC9900');

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Coin outline
        this.ctx.strokeStyle = '#CC9900';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        this.glowEffect.remove(this.ctx);

        this.ctx.restore();
    }

    // Check if coin is settled
    isCoinSettled() {
        if (!this.coin) return false;

        const velocityThreshold = 0.1;
        const velocity = Math.sqrt(
            this.coin.velocity.x ** 2 + this.coin.velocity.y ** 2
        );

        return velocity < velocityThreshold;
    }

    // Check if coin is in small container (WIN condition)
    isCoinInTarget() {
        if (!this.coin) return false;

        const { small } = CONFIG.containers;
        const pos = this.coin.position;

        // Check if coin is within small container bounds
        const inXBounds = pos.x > (small.x - small.width / 2) &&
            pos.x < (small.x + small.width / 2);
        const inYBounds = pos.y > (small.y - small.height) &&
            pos.y < small.y;

        return inXBounds && inYBounds;
    }

    // Get coin position
    getCoinPosition() {
        if (!this.coin) return null;
        return {
            x: this.coin.position.x,
            y: this.coin.position.y
        };
    }

    // Create celebration effect
    celebrate() {
        if (this.coin) {
            this.particleSystem.createCelebration(
                this.coin.position.x,
                this.coin.position.y
            );
        }
    }

    // Create loss effect
    showLoss() {
        if (this.coin) {
            this.particleSystem.createLossEffect(
                this.coin.position.x,
                this.coin.position.y
            );
        }
    }

    // Reset physics world
    reset() {
        if (this.coin) {
            this.World.remove(this.engine.world, this.coin);
            this.coin = null;
        }

        this.particleSystem.clear();
        this.rippleEffect.clear();
        this.coinInWater = false;
        this.glowEffect.setIntensity(0);
    }

    // Clean up
    destroy() {
        this.World.clear(this.engine.world);
        this.Engine.clear(this.engine);
    }
}
