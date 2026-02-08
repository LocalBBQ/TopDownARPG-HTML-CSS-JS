// Screen Manager - handles game state and screen rendering
class ScreenManager {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.currentScreen = 'title'; // 'title', 'playing', 'death'
    }

    setScreen(screen) {
        this.currentScreen = screen;
    }

    isScreen(screen) {
        return this.currentScreen === screen;
    }

     renderTitleScreen() {
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Dark background with slight transparency
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, width, height);

        // Title
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 72px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('Dungeon Crawler', width / 2, height / 2 - 150);

        // Subtitle
        this.ctx.font = '32px Arial';
        this.ctx.fillStyle = '#cccccc';
        this.ctx.fillText('Destroy the Darkness', width / 2, height / 2 - 80);

        // Start button
        const buttonX = width / 2;
        const buttonY = height / 2 + 50;
        const buttonWidth = 300;
        const buttonHeight = 60;

        // Button background
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(buttonX - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight);

        // Button border
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(buttonX - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight);

        // Button text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 36px Arial';
        this.ctx.fillText('START GAME', buttonX, buttonY);

        // Instructions
        this.ctx.font = '20px Arial';
        this.ctx.fillStyle = '#888888';
        this.ctx.fillText('Click START GAME or press SPACE to begin', width / 2, height / 2 + 150);
    }

    renderDeathScreen() {
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Dark red background
        this.ctx.fillStyle = 'rgba(40, 0, 0, 0.9)';
        this.ctx.fillRect(0, 0, width, height);

        // Death message
        this.ctx.fillStyle = '#ff0000';
        this.ctx.font = 'bold 64px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('YOU DIED', width / 2, height / 2 - 150);

        // Subtitle
        this.ctx.font = '28px Arial';
        this.ctx.fillStyle = '#ff6666';
        this.ctx.fillText('The darkness has consumed you...', width / 2, height / 2 - 80);

        // Restart button
        const buttonX = width / 2;
        const buttonY = height / 2 + 50;
        const buttonWidth = 300;
        const buttonHeight = 60;

        // Button background
        this.ctx.fillStyle = '#660000';
        this.ctx.fillRect(buttonX - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight);

        // Button border
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(buttonX - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight);

        // Button text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 36px Arial';
        this.ctx.fillText('RESTART', buttonX, buttonY);

        // Instructions
        this.ctx.font = '20px Arial';
        this.ctx.fillStyle = '#ff8888';
        this.ctx.fillText('Click RESTART or press SPACE to try again', width / 2, height / 2 + 150);
    }

    checkButtonClick(x, y, screen) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const buttonX = width / 2;
        const buttonY = height / 2 + 50;
        const buttonWidth = 300;
        const buttonHeight = 60;

        const buttonLeft = buttonX - buttonWidth / 2;
        const buttonRight = buttonX + buttonWidth / 2;
        const buttonTop = buttonY - buttonHeight / 2;
        const buttonBottom = buttonY + buttonHeight / 2;

        return x >= buttonLeft && x <= buttonRight && y >= buttonTop && y <= buttonBottom;
    }

    render() {
        if (this.currentScreen === 'title') {
            this.renderTitleScreen();
        } else if (this.currentScreen === 'death') {
            this.renderDeathScreen();
        }
        // 'playing' screen is handled by the normal game rendering
    }
}

