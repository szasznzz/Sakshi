// ===== Game State =====
const gameState = {
    currentQuestion: 0,
    answers: {
        q1: null,
        q2: null,
        q3: null,
        q4: null
    },
    correctAnswers: {
        q1: 'shiva',
        q2: 'vashu',
        q3: 'dancing'
    }
};

// ===== Particle System =====
class ParticleSystem {
    constructor() {
        this.canvas = document.getElementById('particles');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.resize();
        this.init();

        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    init() {
        // Create floating hearts and stars
        for (let i = 0; i < 30; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 3 + 2,
                speedY: Math.random() * 0.5 + 0.2,
                speedX: Math.random() * 0.3 - 0.15,
                type: Math.random() > 0.5 ? 'heart' : 'star',
                opacity: Math.random() * 0.5 + 0.3,
                color: this.getRandomColor()
            });
        }

        this.animate();
    }

    getRandomColor() {
        const colors = [
            'rgba(255, 107, 157, ',  // pink
            'rgba(196, 69, 105, ',   // purple
            'rgba(162, 155, 254, ',  // lavender
            'rgba(116, 185, 255, '   // blue
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    drawHeart(x, y, size, color, opacity) {
        this.ctx.save();
        this.ctx.fillStyle = color + opacity + ')';
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.bezierCurveTo(x, y - size / 2, x - size, y - size / 2, x - size, y);
        this.ctx.bezierCurveTo(x - size, y + size / 2, x, y + size, x, y + size * 1.5);
        this.ctx.bezierCurveTo(x, y + size, x + size, y + size / 2, x + size, y);
        this.ctx.bezierCurveTo(x + size, y - size / 2, x, y - size / 2, x, y);
        this.ctx.fill();
        this.ctx.restore();
    }

    drawStar(x, y, size, color, opacity) {
        this.ctx.save();
        this.ctx.fillStyle = color + opacity + ')';
        this.ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
            const x1 = x + Math.cos(angle) * size;
            const y1 = y + Math.sin(angle) * size;
            if (i === 0) this.ctx.moveTo(x1, y1);
            else this.ctx.lineTo(x1, y1);

            const angle2 = angle + Math.PI / 5;
            const x2 = x + Math.cos(angle2) * (size / 2);
            const y2 = y + Math.sin(angle2) * (size / 2);
            this.ctx.lineTo(x2, y2);
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.particles.forEach(particle => {
            if (particle.type === 'heart') {
                this.drawHeart(particle.x, particle.y, particle.size, particle.color, particle.opacity);
            } else {
                this.drawStar(particle.x, particle.y, particle.size, particle.color, particle.opacity);
            }

            particle.y -= particle.speedY;
            particle.x += particle.speedX;

            // Reset particle when it goes off screen
            if (particle.y < -10) {
                particle.y = this.canvas.height + 10;
                particle.x = Math.random() * this.canvas.width;
            }

            if (particle.x < -10) particle.x = this.canvas.width + 10;
            if (particle.x > this.canvas.width + 10) particle.x = -10;
        });

        requestAnimationFrame(() => this.animate());
    }

    celebrate() {
        // Add burst of particles for celebration
        for (let i = 0; i < 50; i++) {
            this.particles.push({
                x: this.canvas.width / 2,
                y: this.canvas.height / 2,
                size: Math.random() * 5 + 3,
                speedY: Math.random() * 3 - 1.5,
                speedX: Math.random() * 6 - 3,
                type: Math.random() > 0.5 ? 'heart' : 'star',
                opacity: 1,
                color: this.getRandomColor()
            });
        }
    }
}

// ===== Screen Management =====
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// ===== Game Functions =====
function startGame() {
    showScreen('question1');
    gameState.currentQuestion = 1;
}

function checkAnswer(questionNum, answer = null) {
    const feedbackEl = document.getElementById(`feedback${questionNum}`);

    if (questionNum === 1) {
        gameState.answers.q1 = answer;

        // Disable all option buttons
        const buttons = document.querySelectorAll('#question1 .option-btn');
        buttons.forEach(btn => btn.disabled = true);

        if (answer === gameState.correctAnswers.q1) {
            // Correct answer
            const correctBtn = document.querySelector(`#question1 .option-btn[data-answer="${answer}"]`);
            correctBtn.classList.add('correct');

            feedbackEl.textContent = '✨ Correct! Moving to next question...';
            feedbackEl.className = 'feedback success show';

            setTimeout(() => {
                showScreen('question2');
            }, 1500);
        } else {
            // Wrong answer
            const wrongBtn = document.querySelector(`#question1 .option-btn[data-answer="${answer}"]`);
            wrongBtn.classList.add('wrong');

            feedbackEl.textContent = '❌ Oops! Try again!';
            feedbackEl.className = 'feedback error show';

            setTimeout(() => {
                buttons.forEach(btn => {
                    btn.disabled = false;
                    btn.classList.remove('wrong');
                });
                feedbackEl.classList.remove('show');
            }, 1500);
        }
    } else if (questionNum === 2) {
        gameState.answers.q2 = answer;

        // Disable all option buttons
        const buttons = document.querySelectorAll('#question2 .option-btn');
        buttons.forEach(btn => btn.disabled = true);

        if (answer === gameState.correctAnswers.q2) {
            // Correct answer
            const correctBtn = document.querySelector(`#question2 .option-btn[data-answer="${answer}"]`);
            correctBtn.classList.add('correct');

            feedbackEl.textContent = '✨ Perfect! Keep going...';
            feedbackEl.className = 'feedback success show';

            setTimeout(() => {
                showScreen('question3');
            }, 1500);
        } else {
            // Wrong answer
            const wrongBtn = document.querySelector(`#question2 .option-btn[data-answer="${answer}"]`);
            wrongBtn.classList.add('wrong');

            feedbackEl.textContent = '❌ Not quite! Try again!';
            feedbackEl.className = 'feedback error show';

            setTimeout(() => {
                buttons.forEach(btn => {
                    btn.disabled = false;
                    btn.classList.remove('wrong');
                });
                feedbackEl.classList.remove('show');
            }, 1500);
        }
    } else if (questionNum === 3) {
        gameState.answers.q3 = answer;

        // Disable all option buttons
        const buttons = document.querySelectorAll('#question3 .option-btn');
        buttons.forEach(btn => btn.disabled = true);

        if (answer === gameState.correctAnswers.q3) {
            // Correct answer
            const correctBtn = document.querySelector(`#question3 .option-btn[data-answer="${answer}"]`);
            correctBtn.classList.add('correct');

            feedbackEl.textContent = '✨ Excellent! Last question...';
            feedbackEl.className = 'feedback success show';

            setTimeout(() => {
                showScreen('question4');
            }, 1500);
        } else {
            // Wrong answer
            const wrongBtn = document.querySelector(`#question3 .option-btn[data-answer="${answer}"]`);
            wrongBtn.classList.add('wrong');

            feedbackEl.textContent = '❌ Not quite! Try again!';
            feedbackEl.className = 'feedback error show';

            setTimeout(() => {
                buttons.forEach(btn => {
                    btn.disabled = false;
                    btn.classList.remove('wrong');
                });
                feedbackEl.classList.remove('show');
            }, 1500);
        }
    } else if (questionNum === 4) {
        const answerInput = document.getElementById('answer4');
        const userAnswer = answerInput.value.trim();

        if (userAnswer === '') {
            feedbackEl.textContent = '⚠️ Please type your answer!';
            feedbackEl.className = 'feedback error show';
            return;
        }

        gameState.answers.q4 = userAnswer;

        // Show success and reveal birthday message
        feedbackEl.textContent = '✨ Amazing! Revealing your birthday surprise...';
        feedbackEl.className = 'feedback success show';

        setTimeout(() => {
            revealBirthday();
        }, 1500);
    }
}

function revealBirthday() {
    showScreen('birthday-reveal');

    // Trigger celebration particles
    if (window.particleSystem) {
        window.particleSystem.celebrate();
    }

    // Play celebration animation
    const birthdayCard = document.querySelector('.birthday-card');
    birthdayCard.style.animation = 'revealCard 1s ease';
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    // Initialize particle system
    window.particleSystem = new ParticleSystem();

    // Add enter key support for question 4
    document.getElementById('answer4')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            checkAnswer(4);
        }
    });
});

// ===== Confetti Effect (bonus) =====
function createConfetti() {
    const colors = ['#ff6b9d', '#c44569', '#a29bfe', '#74b9ff', '#ffd700'];
    const confettiCount = 100;

    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * window.innerWidth + 'px';
        confetti.style.top = '-10px';
        confetti.style.opacity = '1';
        confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
        confetti.style.zIndex = '9999';
        confetti.style.pointerEvents = 'none';

        document.body.appendChild(confetti);

        const fallDuration = Math.random() * 3 + 2;
        const fallDistance = window.innerHeight + 10;
        const drift = (Math.random() - 0.5) * 200;

        confetti.animate([
            {
                transform: `translateY(0) translateX(0) rotate(0deg)`,
                opacity: 1
            },
            {
                transform: `translateY(${fallDistance}px) translateX(${drift}px) rotate(${Math.random() * 720}deg)`,
                opacity: 0
            }
        ], {
            duration: fallDuration * 1000,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }).onfinish = () => confetti.remove();
    }
}

// Trigger confetti on birthday reveal
const originalReveal = revealBirthday;
revealBirthday = function () {
    originalReveal();
    setTimeout(createConfetti, 500);
};
