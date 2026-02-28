// Screen Manager - handles game state and screen rendering
import { listSaveSlots } from './SaveManager.js';
import { GameConfig } from '../config/GameConfig.ts';
import { getQuestDescription } from '../config/questConfig.ts';
import { STATIC_QUESTS } from '../config/staticQuests.ts';
import type { Quest } from '../types/quest.ts';

export type ScreenName = 'title' | 'classSelect' | 'saveSelect' | 'hub' | 'playing' | 'death' | 'pause' | 'settings' | 'settings-controls' | 'help';

export interface SettingsLike {
  musicEnabled?: boolean;
  sfxEnabled?: boolean;
  showMinimap?: boolean;
  useCharacterSprites?: boolean;
  useEnvironmentSprites?: boolean;
  showPlayerHitboxIndicators?: boolean;
  showEnemyHitboxIndicators?: boolean;
  showEnemyStaminaBars?: boolean;
  showPlayerHealthBarAlways?: boolean;
  showEnemyHealthBars?: boolean;
}

const MENU_SCREENS: ScreenName[] = ['title', 'classSelect', 'saveSelect', 'death', 'pause', 'settings', 'settings-controls', 'help'];

export class ScreenManager {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    currentScreen: ScreenName;
    selectedStartLevel: number;
    onEnterMenuScreen?: () => void;

    constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, onEnterMenuScreen?: () => void) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.currentScreen = 'title';
        this.selectedStartLevel = 1;
        this.onEnterMenuScreen = onEnterMenuScreen;
    }

    /** When the user has mousedown on a menu button (for press animation). Cleared on mouseup/leave. */
    private _pressedButton: { screen: ScreenName; button: string } | null = null;

    setScreen(screen: ScreenName): void {
        this.currentScreen = screen;
        if (MENU_SCREENS.includes(screen) && this.onEnterMenuScreen) {
            this.onEnterMenuScreen();
        }
    }

    setPressedButton(p: { screen: ScreenName; button: string } | null): void {
        this._pressedButton = p;
    }

    isButtonPressed(screen: ScreenName, button: string): boolean {
        return this._pressedButton?.screen === screen && this._pressedButton?.button === button;
    }

    /** Returns which menu button is at (x,y) for the current screen (for press feedback). settings required for 'settings' screen. */
    getPressedButtonAt(x: number, y: number, settings?: SettingsLike): { screen: ScreenName; button: string } | null {
        const s = this.currentScreen;
        if (s === 'title') {
            const b = this.getTitleButtonAt(x, y);
            return b ? { screen: 'title', button: b } : null;
        }
        if (s === 'classSelect') {
            const b = this.getClassSelectButtonAt(x, y);
            return b ? { screen: 'classSelect', button: b } : null;
        }
        if (s === 'saveSelect') {
            const b = this.getSaveSelectButtonAt(x, y);
            return b ? { screen: 'saveSelect', button: b } : null;
        }
        if (s === 'death') {
            const hit = this.checkButtonClick(x, y, 'death');
            return hit ? { screen: 'death', button: 'return' } : null;
        }
        if (s === 'pause') {
            const b = this.getPauseButtonAt(x, y);
            return b ? { screen: 'pause', button: b } : null;
        }
        if (s === 'settings') {
            const b = this.getSettingsItemAt(x, y, settings ?? {});
            return b ? { screen: 'settings', button: b } : null;
        }
        if (s === 'settings-controls') {
            const b = this.getControlsItemAt(x, y);
            return b ? { screen: 'settings-controls', button: b } : null;
        }
        if (s === 'help') {
            const b = this.getHelpBackButtonAt(x, y);
            return b ? { screen: 'help', button: 'back' } : null;
        }
        return null;
    }

    isScreen(screen: ScreenName): boolean {
        return this.currentScreen === screen;
    }

    /** Draw a menu button with optional press offset/depth (2px down, darker fill when pressed). */
    private drawMenuButton(centerX: number, centerY: number, width: number, height: number, label: string, pressed: boolean, options?: { dim?: boolean; fontSize?: number }): void {
        const dy = pressed ? 2 : 0;
        const y = centerY + dy;
        const h = pressed ? height - 2 : height;
        this.ctx.fillStyle = pressed ? '#120d08' : '#1a1008';
        this.ctx.fillRect(centerX - width / 2, y - h / 2, width, h);
        this.ctx.strokeStyle = pressed ? '#3a2820' : '#4a3020';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(centerX - width / 2, y - h / 2, width, h);
        if (!pressed) {
            this.ctx.strokeStyle = '#c9a227';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(centerX - width / 2 + 2, y - h / 2 + 2, width - 4, h - 4);
        }
        this.ctx.fillStyle = options?.dim ? '#a08060' : '#e8dcc8';
        this.ctx.font = `600 ${options?.fontSize ?? 15}px Cinzel, Georgia, serif`;
        this.ctx.fillText(label, centerX, y);
    }

    /** Draw a small rect button (e.g. Select, Load, Back) with press depth. */
    private drawSmallButton(centerX: number, centerY: number, width: number, height: number, label: string, pressed: boolean): void {
        const dy = pressed ? 2 : 0;
        const y = centerY + dy;
        const h = pressed ? height - 2 : height;
        this.ctx.fillStyle = pressed ? '#120d08' : '#1a1008';
        this.ctx.fillRect(centerX - width / 2, y - h / 2, width, h);
        this.ctx.strokeStyle = pressed ? '#3a2820' : '#4a3020';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(centerX - width / 2, y - h / 2, width, h);
        if (!pressed) {
            this.ctx.strokeStyle = '#c9a227';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(centerX - width / 2 + 2, y - h / 2 + 2, width - 4, h - 4);
        }
        this.ctx.fillStyle = '#e8dcc8';
        this.ctx.font = '600 14px Cinzel, Georgia, serif';
        this.ctx.fillText(label, centerX, y);
    }

    getLevelSelectBounds(): { cx: number; rowW: number; rowH: number; startY: number; rows: { level: number; y: number; name: string }[] } {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const cx = width / 2;
        const rowH = 32;
        const rowW = 280;
        const startY = height / 2 - 48;
        return {
            cx, rowW, rowH, startY,
            rows: [
                { level: 1, y: startY, name: 'Village Outskirts' },
                { level: 2, y: startY + rowH, name: 'Cursed Wilds' },
                { level: 3, y: startY + rowH * 2, name: 'Demon Approach' },
                { level: 4, y: startY + rowH * 3, name: 'The Fort' },
                { level: 5, y: startY + rowH * 4, name: 'Elder Woods' },
            ]
        };
    }

    getLevelSelectAt(x: number, y: number): number | null {
        const b = this.getLevelSelectBounds();
        const left = b.cx - b.rowW / 2;
        const right = b.cx + b.rowW / 2;
        for (const row of b.rows) {
            const top = row.y - b.rowH / 2;
            const bottom = row.y + b.rowH / 2;
            if (x >= left && x <= right && y >= top && y <= bottom) return row.level;
        }
        return null;
    }

    /** Tabbed board frame (bulletin + main quest tabs). Use for hit-test and content area. */
    getTabbedBoardFrame(): { frameX: number; frameY: number; frameW: number; frameH: number; tabBarHeight: number; contentTop: number; contentHeight: number } {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const cx = width / 2;
        const cy = height / 2 - 72;
        const framePad = 20;
        const boardH = 420;
        const tabBarHeight = 40;
        const innerH = boardH + framePad * 2 + 24;
        const frameH = innerH + tabBarHeight;
        const boardW = 780;
        const frameW = boardW + framePad * 2;
        const frameX = cx - frameW / 2;
        const frameY = cy - frameH / 2;
        const contentTop = frameY + tabBarHeight;
        return { frameX, frameY, frameW: 780 + framePad * 2, frameH, tabBarHeight, contentTop, contentHeight: innerH };
    }

    getBoardTabAt(x: number, y: number): 'bulletin' | 'mainQuest' | null {
        const t = this.getTabbedBoardFrame();
        const tabTop = t.frameY + 6;
        const tabH = t.tabBarHeight - 12;
        if (y < tabTop || y > tabTop + tabH) return null;
        const mid = t.frameX + t.frameW / 2;
        if (x >= t.frameX && x < mid) return 'mainQuest';
        if (x >= mid && x <= t.frameX + t.frameW) return 'bulletin';
        return null;
    }

    /** Bulletin board: title, then buttons (side by side), then 3 page rects. contentTop optional for tabbed board. */
    getQuestBoardBounds(questList: Quest[], _levelNames: Record<number, string>, contentTop?: number): {
        cx: number;
        cy: number;
        frameY: number;
        boardW: number;
        boardH: number;
        pageW: number;
        pageH: number;
        pageGap: number;
        rows: { index: number; x: number; y: number; w: number; h: number }[];
        buttonY: number;
        acceptX: number;
        rerollX: number;
        backX: number;
        buttonW: number;
        buttonH: number;
        rerollButtonW: number;
    } {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const cx = width / 2;
        const cy = height / 2 - 72;
        const framePad = 20;
        const boardW = 780;
        const boardH = 420;
        const frameY = contentTop ?? (cy - boardH / 2 - framePad - 24);
        const titleBottom = frameY + 48;
        const buttonH = 40;
        const buttonY = titleBottom + 24 + buttonH / 2;
        const pageTop = buttonY + buttonH / 2 + 24;
        const pageW = 228;
        const pageH = 300;
        const pageGap = 24;
        const step = pageW + pageGap;
        const rows: { index: number; x: number; y: number; w: number; h: number }[] = [];
        for (let i = 0; i < Math.min(3, questList.length); i++) {
            const pageCx = cx + (i - 1) * step;
            rows.push({
                index: i,
                x: pageCx - pageW / 2,
                y: pageTop,
                w: pageW,
                h: pageH,
            });
        }
        const buttonW = 120;
        const rerollButtonW = 140;
        const buttonGap = 16;
        const totalButtonsW = buttonW + buttonGap + rerollButtonW + buttonGap + buttonW;
        const acceptX = cx - totalButtonsW / 2 + buttonW / 2;
        const rerollX = cx;
        const backX = cx + totalButtonsW / 2 - buttonW / 2;
        return { cx, cy, frameY, boardW, boardH, pageW, pageH, pageGap, rows, buttonY, acceptX, rerollX, backX, buttonW, buttonH, rerollButtonW };
    }

    /** Board overlay button hit-test (Accept / Re-roll / Back), side by side. contentTop optional for tabbed board. */
    getHubBoardButtonAt(x: number, y: number, _questCount = 0, contentTop?: number): 'start' | 'reroll' | 'back' | null {
        const height = this.canvas.height;
        const cx = this.canvas.width / 2;
        const buttonW = 120;
        const buttonH = 40;
        const rerollButtonW = 140;
        const buttonGap = 16;
        const cy = height / 2 - 72;
        const framePad = 20;
        const boardH = 420;
        const frameY = contentTop ?? (cy - boardH / 2 - framePad - 24);
        const buttonY = frameY + 48 + 24 + buttonH / 2;
        const totalButtonsW = buttonW + buttonGap + rerollButtonW + buttonGap + buttonW;
        const acceptX = cx - totalButtonsW / 2 + buttonW / 2;
        const rerollX = cx;
        const backX = cx + totalButtonsW / 2 - buttonW / 2;
        const top = buttonY - buttonH / 2;
        const bottom = buttonY + buttonH / 2;
        if (y >= top && y <= bottom) {
            if (x >= acceptX - buttonW / 2 && x <= acceptX + buttonW / 2) return 'start';
            if (x >= rerollX - rerollButtonW / 2 && x <= rerollX + rerollButtonW / 2) return 'reroll';
            if (x >= backX - buttonW / 2 && x <= backX + buttonW / 2) return 'back';
        }
        return null;
    }

    getQuestSelectAt(x: number, y: number, questList: Quest[], levelNames: Record<number, string>, contentTop?: number): number | null {
        if (!questList.length) return null;
        const b = this.getQuestBoardBounds(questList, levelNames, contentTop);
        for (const row of b.rows) {
            if (x >= row.x && x <= row.x + row.w && y >= row.y && y <= row.y + row.h) return row.index;
        }
        return null;
    }

    getWeaponSelectBounds() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const cx = width / 2;
        const rowH = 28;
        const rowW = 260;
        const startY = height / 2 + 52;
        return {
            cx, rowW, rowH, startY,
            rows: [
                { key: 'sword_rusty', label: 'Rusty Sword', y: startY },
                { key: 'dagger_rusty', label: 'Rusty Dagger', y: startY + rowH },
                { key: 'greatsword_rusty', label: 'Rusty Greatsword', y: startY + rowH * 2 },
                { key: 'crossbow_rusty', label: 'Rusty Crossbow', y: startY + rowH * 3 },
                { key: 'mace_rusty', label: 'Rusty Mace', y: startY + rowH * 4 }
            ]
        };
    }

    getWeaponSelectAt(x, y) {
        const b = this.getWeaponSelectBounds();
        const left = b.cx - b.rowW / 2;
        const right = b.cx + b.rowW / 2;
        for (const row of b.rows) {
            const top = row.y - b.rowH / 2;
            const bottom = row.y + b.rowH / 2;
            if (x >= left && x <= right && y >= top && y <= bottom) return row.key;
        }
        return null;
    }

    /** Draw a stone brazier with flame at center (x, y), total size w×h. */
    private drawTitleBrazier(centerX: number, centerY: number, w: number, h: number) {
        const ctx = this.ctx;
        const baseH = h * 0.22;
        const stemW = w * 0.35;
        const stemH = h * 0.4;
        const bowlDepth = h * 0.38;
        const bowlTopW = w * 0.9;
        const bowlBottomW = w * 0.7;
        const left = centerX - w / 2;
        const right = centerX + w / 2;

        // Base (dark stone)
        ctx.fillStyle = '#3d3630';
        ctx.beginPath();
        ctx.roundRect(left, centerY + h / 2 - baseH, w, baseH, 2);
        ctx.fill();
        ctx.strokeStyle = '#2a2520';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Stem
        ctx.fillStyle = '#4a443c';
        ctx.fillRect(centerX - stemW / 2, centerY + h / 2 - baseH - stemH, stemW, stemH);
        ctx.strokeStyle = '#35302a';
        ctx.strokeRect(centerX - stemW / 2, centerY + h / 2 - baseH - stemH, stemW, stemH);

        // Bowl (trapezoid / basin)
        const bowlTop = centerY + h / 2 - baseH - stemH - bowlDepth;
        ctx.fillStyle = '#5a5348';
        ctx.beginPath();
        ctx.moveTo(centerX - bowlTopW / 2, bowlTop);
        ctx.lineTo(centerX + bowlTopW / 2, bowlTop);
        ctx.lineTo(centerX + bowlBottomW / 2, bowlTop + bowlDepth);
        ctx.lineTo(centerX - bowlBottomW / 2, bowlTop + bowlDepth);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#3d3630';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Inner bowl edge (rim)
        ctx.strokeStyle = '#6b6458';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(centerX - bowlTopW / 2 + 2, bowlTop + 3);
        ctx.lineTo(centerX + bowlTopW / 2 - 2, bowlTop + 3);
        ctx.stroke();

        // Flame (multi-layer for glow)
        const flameCenterY = bowlTop + 8;
        const flameH = 28;
        const t = (Date.now() / 120) % (Math.PI * 2);
        const sway = Math.sin(t) * 2;

        // Outer glow
        const glowGrad = ctx.createRadialGradient(
            centerX + sway, flameCenterY, 0,
            centerX + sway, flameCenterY, flameH * 1.2
        );
        glowGrad.addColorStop(0, 'rgba(255, 180, 60, 0.7)');
        glowGrad.addColorStop(0.4, 'rgba(220, 100, 30, 0.25)');
        glowGrad.addColorStop(1, 'rgba(180, 50, 10, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.ellipse(centerX + sway, flameCenterY, 10, flameH, 0, 0, Math.PI * 2);
        ctx.fill();

        // Core flame (teardrop shape)
        const coreGrad = ctx.createLinearGradient(centerX, flameCenterY - flameH, centerX, flameCenterY + flameH);
        coreGrad.addColorStop(0, '#fff8b0');
        coreGrad.addColorStop(0.3, '#ffcc40');
        coreGrad.addColorStop(0.7, '#e07020');
        coreGrad.addColorStop(1, '#802010');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.moveTo(centerX + sway, flameCenterY - flameH * 0.85);
        ctx.bezierCurveTo(
            centerX + 8 + sway, flameCenterY - 4,
            centerX + 6 + sway, flameCenterY + flameH,
            centerX + sway, flameCenterY + flameH * 0.3
        );
        ctx.bezierCurveTo(
            centerX - 6 + sway, flameCenterY + flameH,
            centerX - 8 + sway, flameCenterY - 4,
            centerX + sway, flameCenterY - flameH * 0.85
        );
        ctx.fill();

        // Inner bright tip
        ctx.fillStyle = 'rgba(255, 255, 220, 0.9)';
        ctx.beginPath();
        ctx.ellipse(centerX + sway, flameCenterY - flameH * 0.5, 3, 10, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    renderTitleScreen() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const cx = width / 2;
        const cy = height / 2;

        this.ctx.fillStyle = 'rgba(10, 8, 6, 0.88)';
        this.ctx.fillRect(0, 0, width, height);

        // Stone braziers with flames (left and right of title)
        const brazierY = cy - 90;
        const brazierW = 56;
        const brazierH = 100;
        this.drawTitleBrazier(cx - 220, brazierY, brazierW, brazierH);
        this.drawTitleBrazier(cx + 220, brazierY, brazierW, brazierH);

        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Game title
        this.ctx.fillStyle = '#c9a227';
        this.ctx.font = '700 52px Cinzel, Georgia, serif';
        this.ctx.fillText('Dungeon Crawl', width / 2, height / 2 - 90);

        // Subtitle / hint
        this.ctx.fillStyle = '#a08060';
        this.ctx.font = '500 15px Cinzel, Georgia, serif';
        this.ctx.fillText('Choose an option below', width / 2, height / 2 - 10);

        const buttonWidth = 180;
        const buttonHeight = 44;
        const gap = 20;
        const totalW = buttonWidth * 2 + gap;
        const leftX = width / 2 - totalW / 2 + buttonWidth / 2 + gap / 2;
        const rightX = width / 2 + totalW / 2 - buttonWidth / 2 - gap / 2;
        const buttonY = height / 2 + 50;

        this.drawMenuButton(leftX, buttonY, buttonWidth, buttonHeight, 'New Game', this.isButtonPressed('title', 'newGame'));
        this.drawMenuButton(rightX, buttonY, buttonWidth, buttonHeight, 'Load Game', this.isButtonPressed('title', 'loadGame'));
    }

    getTitleButtonAt(x: number, y: number): 'newGame' | 'loadGame' | null {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const buttonWidth = 180;
        const buttonHeight = 44;
        const gap = 20;
        const totalW = buttonWidth * 2 + gap;
        const leftX = width / 2 - totalW / 2 + buttonWidth / 2 + gap / 2;
        const rightX = width / 2 + totalW / 2 - buttonWidth / 2 - gap / 2;
        const buttonY = height / 2 + 50;
        const hw = buttonWidth / 2;
        const hh = buttonHeight / 2;
        if (x >= leftX - hw && x <= leftX + hw && y >= buttonY - hh && y <= buttonY + hh) return 'newGame';
        if (x >= rightX - hw && x <= rightX + hw && y >= buttonY - hh && y <= buttonY + hh) return 'loadGame';
        return null;
    }

    /** Layout for class select: three panels, each with portrait, description, and button. */
    private static readonly CLASS_SELECT_PANEL_WIDTH = 200;
    private static readonly CLASS_SELECT_PORTRAIT_SIZE = 96;
    private static readonly CLASS_SELECT_BUTTON_WIDTH = 160;
    private static readonly CLASS_SELECT_BUTTON_HEIGHT = 40;

    getClassSelectBounds(): {
        titleY: number;
        panelTop: number;
        panelCenterX: { warrior: number; mage: number; rogue: number };
        portraitTop: number;
        nameY: number;
        descY: number;
        buttonY: number;
        buttonWidth: number;
        buttonHeight: number;
        backButtonY: number;
        backButtonWidth: number;
        backButtonHeight: number;
    } {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const cx = width / 2;
        const gap = 24;
        const totalPanelWidth = ScreenManager.CLASS_SELECT_PANEL_WIDTH * 3 + gap * 2;
        const left = cx - totalPanelWidth / 2 + ScreenManager.CLASS_SELECT_PANEL_WIDTH / 2 + gap / 2;
        const panelCenterX = {
            warrior: left,
            mage: cx,
            rogue: width - left
        };
        return {
            titleY: height * 0.14,
            panelTop: height * 0.22,
            panelCenterX,
            portraitTop: height * 0.22 + 16,
            nameY: height * 0.22 + 16 + ScreenManager.CLASS_SELECT_PORTRAIT_SIZE + 14,
            descY: height * 0.22 + 16 + ScreenManager.CLASS_SELECT_PORTRAIT_SIZE + 14 + 24 + 20,
            buttonY: height * 0.22 + 16 + ScreenManager.CLASS_SELECT_PORTRAIT_SIZE + 14 + 24 + 52 + 14,
            buttonWidth: ScreenManager.CLASS_SELECT_BUTTON_WIDTH,
            buttonHeight: ScreenManager.CLASS_SELECT_BUTTON_HEIGHT,
            backButtonY: height - 52,
            backButtonWidth: 120,
            backButtonHeight: 38
        };
    }

    /** Top-down class portrait: same body shapes as PlayerEntityRenderer, scaled to fit circle. */
    private drawClassPortraitWarrior(centerX: number, centerY: number, size: number): void {
        const s = size / 2;
        const ctx = this.ctx;
        ctx.fillStyle = '#1a1410';
        ctx.beginPath();
        ctx.arc(centerX, centerY, s - 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#4a3020';
        ctx.lineWidth = 2;
        ctx.stroke();
        const w = (s - 2) * 1.9;
        const lw = Math.max(1, 2);
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(Math.PI / 2); // face south (down)
        // Knight top-down: pauldrons + helmet (matches PlayerEntityRenderer)
        const steel = '#8b8b9a';
        const steelDark = '#5a5a68';
        const steelDarker = '#4a4a58';
        const helmetRx = w * 0.42;
        const helmetRy = w * 0.38;
        const paulOffsetY = helmetRy * 0.72;
        const paulRx = w * 0.22;
        const paulRy = w * 0.28;
        ctx.fillStyle = steel;
        ctx.strokeStyle = steelDarker;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.ellipse(0, paulOffsetY, paulRx, paulRy, 0, 0, Math.PI * 2);
        ctx.ellipse(0, -paulOffsetY, paulRx, paulRy, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = steelDark;
        ctx.strokeStyle = steelDarker;
        ctx.beginPath();
        ctx.ellipse(0, 0, helmetRx, helmetRy, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.lineWidth = Math.max(1.5, lw * 1.2);
        ctx.beginPath();
        ctx.moveTo(helmetRx * 0.35, 0);
        ctx.lineTo(helmetRx * 0.95, 0);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = lw * 0.5;
        ctx.beginPath();
        ctx.moveTo(-helmetRx * 0.5, 0);
        ctx.lineTo(helmetRx * 0.5, 0);
        ctx.stroke();
        ctx.restore();
    }

    /** Top-down class portrait: same body shapes as PlayerEntityRenderer. */
    private drawClassPortraitMage(centerX: number, centerY: number, size: number): void {
        const s = size / 2;
        const ctx = this.ctx;
        ctx.fillStyle = '#1a1410';
        ctx.beginPath();
        ctx.arc(centerX, centerY, s - 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#4a3020';
        ctx.lineWidth = 2;
        ctx.stroke();
        const w = (s - 2) * 1.9;
        const lw = Math.max(1, 2);
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(Math.PI / 2); // face south (down)
        // Wizard top-down: sleeves, bald head (under hood), hood, hat tip
        const hoodRx = w * 0.42;
        const hoodRy = w * 0.38;
        const sleeveOffsetY = hoodRy * 0.72;
        const sleeveRx = w * 0.22;
        const sleeveRy = w * 0.28;
        const robeFill = '#3d2d4d';
        const robeStroke = '#2a2035';
        const hoodFill = '#352540';
        const hoodStroke = '#2a2035';
        const headFill = '#8b7355';
        const headStroke = '#6a5a48';
        ctx.fillStyle = robeFill;
        ctx.strokeStyle = robeStroke;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.ellipse(0, sleeveOffsetY, sleeveRx, sleeveRy, 0, 0, Math.PI * 2);
        ctx.ellipse(0, -sleeveOffsetY, sleeveRx, sleeveRy, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Bald head (small, mostly covered by hood)
        ctx.fillStyle = headFill;
        ctx.strokeStyle = headStroke;
        ctx.beginPath();
        ctx.ellipse(0, 0, hoodRx * 0.5, hoodRy * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Hood covering the head
        ctx.fillStyle = hoodFill;
        ctx.strokeStyle = hoodStroke;
        ctx.beginPath();
        ctx.ellipse(0, 0, hoodRx, hoodRy, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    /** Top-down class portrait: same body shapes as PlayerEntityRenderer. */
    private drawClassPortraitRogue(centerX: number, centerY: number, size: number): void {
        const s = size / 2;
        const ctx = this.ctx;
        ctx.fillStyle = '#1a1410';
        ctx.beginPath();
        ctx.arc(centerX, centerY, s - 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#4a3020';
        ctx.lineWidth = 2;
        ctx.stroke();
        const w = (s - 2) * 1.9;
        const lw = Math.max(1, 2);
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(Math.PI / 2); // face south (down)
        // Rogue top-down: shoulders + hood, hood tip (matches PlayerEntityRenderer)
        const hoodRx = w * 0.44;
        const hoodRy = w * 0.40;
        const shoulderOffsetY = hoodRy * 0.68;
        const shoulderRx = w * 0.18;
        const shoulderRy = w * 0.24;
        const brownFill = '#5a4a3a';
        const brownStroke = '#3d3228';
        ctx.fillStyle = brownFill;
        ctx.strokeStyle = brownStroke;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.ellipse(0, shoulderOffsetY, shoulderRx, shoulderRy, 0, 0, Math.PI * 2);
        ctx.ellipse(0, -shoulderOffsetY, shoulderRx, shoulderRy, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = brownFill;
        ctx.strokeStyle = brownStroke;
        ctx.beginPath();
        ctx.ellipse(0, 0, hoodRx, hoodRy, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    renderClassSelectScreen() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const cx = width / 2;
        const b = this.getClassSelectBounds();

        this.ctx.fillStyle = 'rgba(10, 8, 6, 0.92)';
        this.ctx.fillRect(0, 0, width, height);

        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Title
        this.ctx.fillStyle = '#c9a227';
        this.ctx.font = '700 38px Cinzel, Georgia, serif';
        this.ctx.fillText('Choose Your Class', cx, b.titleY);

        const classes: { key: 'warrior' | 'mage' | 'rogue'; name: string; description: string[] }[] = [
            { key: 'warrior', name: 'Warrior', description: ['Heavy armor and blade.', 'Front-line fighter, high defense.'] },
            { key: 'mage', name: 'Mage', description: ['Staff and arcane arts.', 'Ranged power, crowd control.'] },
            { key: 'rogue', name: 'Rogue', description: ['Dagger and bow.', 'Speed, crits, and mobility.'] }
        ];

        const portraitCenterY = b.portraitTop + ScreenManager.CLASS_SELECT_PORTRAIT_SIZE / 2;
        const halfPanel = ScreenManager.CLASS_SELECT_PANEL_WIDTH / 2;

        for (const c of classes) {
            const px = b.panelCenterX[c.key];
            // Panel background
            const panelH = 14 + ScreenManager.CLASS_SELECT_PORTRAIT_SIZE + 14 + 24 + 52 + 14 + b.buttonHeight + 14;
            this.ctx.fillStyle = 'rgba(26, 20, 12, 0.85)';
            this.ctx.strokeStyle = '#4a3020';
            this.ctx.lineWidth = 2;
            this.ctx.fillRect(px - halfPanel, b.panelTop, ScreenManager.CLASS_SELECT_PANEL_WIDTH, panelH);
            this.ctx.strokeRect(px - halfPanel, b.panelTop, ScreenManager.CLASS_SELECT_PANEL_WIDTH, panelH);
            // Portrait
            this.ctx.save();
            this.ctx.translate(px, portraitCenterY);
            if (c.key === 'warrior') this.drawClassPortraitWarrior(0, 0, ScreenManager.CLASS_SELECT_PORTRAIT_SIZE);
            else if (c.key === 'mage') this.drawClassPortraitMage(0, 0, ScreenManager.CLASS_SELECT_PORTRAIT_SIZE);
            else this.drawClassPortraitRogue(0, 0, ScreenManager.CLASS_SELECT_PORTRAIT_SIZE);
            this.ctx.restore();
            // Class name
            this.ctx.fillStyle = '#e8dcc8';
            this.ctx.font = '600 20px Cinzel, Georgia, serif';
            this.ctx.fillText(c.name, px, b.nameY);
            // Description lines
            this.ctx.fillStyle = '#a08060';
            this.ctx.font = '500 13px Cinzel, Georgia, serif';
            c.description.forEach((line, i) => {
                this.ctx.fillText(line, px, b.descY + i * 18);
            });
            // Select button
            const btnW = b.buttonWidth;
            const btnH = b.buttonHeight;
            this.drawSmallButton(px, b.buttonY, btnW, btnH, 'Select', this.isButtonPressed('classSelect', c.key));
        }

        this.ctx.fillStyle = '#706050';
        this.ctx.font = '500 12px Cinzel, Georgia, serif';
        this.ctx.fillText('Select a class to begin your journey', cx, height - 72);

        // Back button
        const backY = b.backButtonY;
        const backW = b.backButtonWidth;
        const backH = b.backButtonHeight;
        this.drawSmallButton(cx, backY, backW, backH, 'Back', this.isButtonPressed('classSelect', 'back'));
    }

    getClassSelectButtonAt(x: number, y: number): 'back' | 'warrior' | 'mage' | 'rogue' | null {
        const b = this.getClassSelectBounds();
        const cx = this.canvas.width / 2;
        const backHw = b.backButtonWidth / 2;
        const backHh = b.backButtonHeight / 2;
        if (x >= cx - backHw && x <= cx + backHw && y >= b.backButtonY - backHh && y <= b.backButtonY + backHh) return 'back';
        const hw = b.buttonWidth / 2;
        const hh = b.buttonHeight / 2;
        if (x >= b.panelCenterX.warrior - hw && x <= b.panelCenterX.warrior + hw && y >= b.buttonY - hh && y <= b.buttonY + hh) return 'warrior';
        if (x >= b.panelCenterX.mage - hw && x <= b.panelCenterX.mage + hw && y >= b.buttonY - hh && y <= b.buttonY + hh) return 'mage';
        if (x >= b.panelCenterX.rogue - hw && x <= b.panelCenterX.rogue + hw && y >= b.buttonY - hh && y <= b.buttonY + hh) return 'rogue';
        return null;
    }

    renderSaveSelectScreen() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const cx = width / 2;

        this.ctx.fillStyle = 'rgba(10, 8, 6, 0.92)';
        this.ctx.fillRect(0, 0, width, height);

        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        this.ctx.fillStyle = '#c9a227';
        this.ctx.font = '700 38px Cinzel, Georgia, serif';
        this.ctx.fillText('Load Game', cx, height * 0.12);

        this.ctx.fillStyle = '#a08060';
        this.ctx.font = '500 14px Cinzel, Georgia, serif';
        this.ctx.fillText('Choose a save slot to continue', cx, height * 0.18);

        const slots = listSaveSlots();
        const rowHeight = 56;
        const startY = height * 0.26;
        const slotWidth = Math.min(420, width - 80);
        const labelLeft = cx - slotWidth / 2;
        const loadBtnWidth = 80;
        const loadBtnHeight = 36;

        slots.forEach((slot, i) => {
            const y = startY + i * rowHeight;
            this.ctx.fillStyle = 'rgba(26, 20, 12, 0.85)';
            this.ctx.strokeStyle = '#4a3020';
            this.ctx.lineWidth = 2;
            this.ctx.fillRect(labelLeft, y - rowHeight / 2 + 4, slotWidth, rowHeight - 8);
            this.ctx.strokeRect(labelLeft, y - rowHeight / 2 + 4, slotWidth, rowHeight - 8);

            this.ctx.textAlign = 'left';
            this.ctx.fillStyle = '#e8dcc8';
            this.ctx.font = '600 16px Cinzel, Georgia, serif';
            this.ctx.fillText(`Slot ${slot.id}`, labelLeft + 16, y);
            this.ctx.fillStyle = slot.isEmpty ? '#706050' : '#a08060';
            this.ctx.font = '500 14px Cinzel, Georgia, serif';
            this.ctx.fillText(slot.label, labelLeft + 72, y);
            this.ctx.textAlign = 'center';

            if (!slot.isEmpty) {
                const loadX = labelLeft + slotWidth - loadBtnWidth / 2 - 16;
                this.drawSmallButton(loadX, y, loadBtnWidth, loadBtnHeight, 'Load', this.isButtonPressed('saveSelect', slot.id));
            }
        });

        this.ctx.textAlign = 'center';
        const backY = height - 52;
        const backW = 120;
        const backH = 38;
        this.drawSmallButton(cx, backY, backW, backH, 'Back', this.isButtonPressed('saveSelect', 'back'));
    }

    getSaveSelectButtonAt(x: number, y: number): 'back' | string | null {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const cx = width / 2;
        const slots = listSaveSlots();
        const rowHeight = 56;
        const startY = height * 0.26;
        const slotWidth = Math.min(420, width - 80);
        const labelLeft = cx - slotWidth / 2;
        const loadBtnWidth = 80;
        const loadBtnHeight = 36;

        const backY = height - 52;
        const backW = 120;
        const backH = 38;
        if (x >= cx - backW / 2 && x <= cx + backW / 2 && y >= backY - backH / 2 && y <= backY + backH / 2) return 'back';

        for (let i = 0; i < slots.length; i++) {
            if (slots[i].isEmpty) continue;
            const rowY = startY + i * rowHeight;
            const loadX = labelLeft + slotWidth - loadBtnWidth / 2 - 16;
            if (x >= loadX - loadBtnWidth / 2 && x <= loadX + loadBtnWidth / 2 && y >= rowY - loadBtnHeight / 2 && y <= rowY + loadBtnHeight / 2) {
                return slots[i].id;
            }
        }
        return null;
    }

    renderPauseScreen() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const cx = width / 2;

        // Dimmed background
        this.ctx.fillStyle = 'rgba(10, 8, 6, 0.75)';
        this.ctx.fillRect(0, 0, width, height);

        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Title
        this.ctx.fillStyle = '#c9a227';
        this.ctx.font = '700 38px Cinzel, Georgia, serif';
        this.ctx.fillText('Paused', cx, height / 2 - 120);

        // Resume / Save / Settings / Help / Quit buttons
        const buttonWidth = 200;
        const buttonHeight = 44;
        const resumeY = height / 2 - 115;
        const saveY = height / 2 - 65;
        const settingsY = height / 2 - 15;
        const helpY = height / 2 + 35;
        const quitY = height / 2 + 85;

        this.drawMenuButton(cx, resumeY, buttonWidth, buttonHeight, 'Resume', this.isButtonPressed('pause', 'resume'));
        this.drawMenuButton(cx, saveY, buttonWidth, buttonHeight, 'Save game', this.isButtonPressed('pause', 'save'));
        this.drawMenuButton(cx, settingsY, buttonWidth, buttonHeight, 'Settings', this.isButtonPressed('pause', 'settings'));
        this.drawMenuButton(cx, helpY, buttonWidth, buttonHeight, 'Help — Pack modifiers', this.isButtonPressed('pause', 'help'));
        this.drawMenuButton(cx, quitY, buttonWidth, buttonHeight, 'Quit to main menu', this.isButtonPressed('pause', 'quit'), { dim: true });

        this.ctx.fillStyle = '#a08060';
        this.ctx.font = '500 13px Cinzel, Georgia, serif';
        this.ctx.fillText('Press ESC to resume', cx, height / 2 + 200);
    }

    getPauseButtonAt(x: number, y: number): string | null {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const buttonWidth = 200;
        const buttonHeight = 44;
        const cx = width / 2;
        const resumeY = height / 2 - 115;
        const saveY = height / 2 - 65;
        const settingsY = height / 2 - 15;
        const helpY = height / 2 + 35;
        const quitY = height / 2 + 85;
        const left = cx - buttonWidth / 2;
        const right = cx + buttonWidth / 2;
        if (x >= left && x <= right && y >= resumeY - buttonHeight / 2 && y <= resumeY + buttonHeight / 2) return 'resume';
        if (x >= left && x <= right && y >= saveY - buttonHeight / 2 && y <= saveY + buttonHeight / 2) return 'save';
        if (x >= left && x <= right && y >= settingsY - buttonHeight / 2 && y <= settingsY + buttonHeight / 2) return 'settings';
        if (x >= left && x <= right && y >= helpY - buttonHeight / 2 && y <= helpY + buttonHeight / 2) return 'help';
        if (x >= left && x <= right && y >= quitY - buttonHeight / 2 && y <= quitY + buttonHeight / 2) return 'quit';
        return null;
    }

    /** Build a short description line for a pack modifier from its config. */
    getPackModifierDescription(name, def) {
        if (!def) return '';
        const parts = [];
        if (def.speedMultiplier != null && def.speedMultiplier !== 1) {
            const pct = Math.round((def.speedMultiplier - 1) * 100);
            parts.push(pct > 0 ? `+${pct}% speed` : `${pct}% speed`);
        }
        if (def.damageMultiplier != null && def.damageMultiplier !== 1) {
            const pct = Math.round((def.damageMultiplier - 1) * 100);
            parts.push(pct > 0 ? `+${pct}% damage` : `${pct}% damage`);
        }
        if (def.knockbackResist != null && def.knockbackResist > 0) {
            parts.push(`+${Math.round(def.knockbackResist * 100)}% knockback resist`);
        }
        if (def.attackCooldownMultiplier != null && def.attackCooldownMultiplier !== 1) {
            const pct = Math.round((1 - def.attackCooldownMultiplier) * 100);
            parts.push(`${pct}% faster attacks`);
        }
        if (def.stunBuildupPerHitMultiplier != null && def.stunBuildupPerHitMultiplier !== 1) {
            const pct = Math.round((def.stunBuildupPerHitMultiplier - 1) * 100);
            parts.push(`+${pct}% stun buildup`);
        }
        if (def.detectionRangeMultiplier != null && def.detectionRangeMultiplier !== 1) {
            const pct = Math.round((def.detectionRangeMultiplier - 1) * 100);
            parts.push(`+${pct}% detection range`);
        }
        if (def.healthMultiplier != null && def.healthMultiplier !== 1) {
            const pct = Math.round((def.healthMultiplier - 1) * 100);
            parts.push(pct > 0 ? `+${pct}% health` : `${pct}% health`);
        }
        return parts.length ? parts.join(', ') : '—';
    }

    /** Draw a small info tile at top center when hovering an enemy: name, health bar, modifier (only if present), short description. */
    renderEnemyTooltip(displayName, modifierName, modifierDescription, healthPercent) {
        const width = this.canvas.width;
        const padding = 16;
        const lineHeight = 20;
        const maxTextWidth = 280;
        const barHeight = 6;
        const barGap = 8;
        const modifierTopGap = 6;

        const hasModifier = modifierName && typeof modifierName === 'string' && modifierName.trim().length > 0;
        const modifierLabel = hasModifier ? (modifierName.charAt(0).toUpperCase() + modifierName.slice(1)) : '';
        const lines = [displayName];
        if (modifierLabel) lines.push(modifierLabel);
        if (hasModifier && modifierDescription) lines.push(modifierDescription);

        this.ctx.font = '500 14px Cinzel, Georgia, serif';
        const measure = (t) => this.ctx.measureText(t).width;
        const tileWidth = Math.min(maxTextWidth, Math.max(...lines.map((t) => measure(t))) + padding * 2);
        const hasBar = typeof healthPercent === 'number' && healthPercent >= 0;
        const barArea = hasBar ? barHeight + barGap : 0;
        const modifierGapArea = (hasModifier && (modifierLabel || modifierDescription)) ? modifierTopGap : 0;
        const tileHeight = padding * 2 + lines.length * lineHeight + barArea + modifierGapArea;

        const cx = width / 2;
        const top = 12;
        const left = cx - tileWidth / 2;
        const topPad = 10;

        this.ctx.fillStyle = 'rgba(26, 16, 8, 0.92)';
        this.ctx.fillRect(left, top, tileWidth, tileHeight + topPad);
        this.ctx.strokeStyle = '#4a3020';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(left, top, tileWidth, tileHeight + topPad);

        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        const packModifiers = (typeof GameConfig !== 'undefined' && GameConfig.packModifiers) ? GameConfig.packModifiers : {};
        const modDef = modifierName ? packModifiers[modifierName] : null;
        const modifierColor = (modDef && modDef.color) ? modDef.color : '#e8dcc8';

        let y = top + topPad / 2 + lineHeight / 2;
        this.ctx.fillStyle = '#e8dcc8';
        this.ctx.font = '600 15px Cinzel, Georgia, serif';
        this.ctx.fillText(lines[0], cx, y);
        y += lineHeight;

        if (hasBar) {
            const barWidth = tileWidth - padding * 2;
            const barX = left + padding;
            const barY = y + barGap / 2;
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(barX, barY, barWidth, barHeight);
            const pct = Math.max(0, Math.min(1, healthPercent));
            this.ctx.fillStyle = pct > 0.5 ? '#44ff44' : pct > 0.25 ? '#ffff44' : '#ff4444';
            this.ctx.fillRect(barX, barY, barWidth * pct, barHeight);
            this.ctx.strokeStyle = '#222';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(barX, barY, barWidth, barHeight);
            y += barHeight + barGap;
        }
        if (modifierGapArea > 0) y += modifierTopGap;

        if (lines.length > 1) {
            this.ctx.fillStyle = modifierColor;
            this.ctx.font = '500 13px Cinzel, Georgia, serif';
            this.ctx.fillText(lines[1], cx, y);
            y += lineHeight;
        }
        if (lines.length > 2) {
            this.ctx.fillStyle = '#a08060';
            this.ctx.font = '500 12px Cinzel, Georgia, serif';
            this.ctx.fillText(lines[2], cx, y);
        }
    }

    renderHelpScreen() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const cx = width / 2;

        // Dim overlay but leave bottom cutout so health/stamina orbs stay visible
        const bottomCutoutH = 200;
        this.ctx.fillStyle = 'rgba(10, 8, 6, 0.88)';
        this.ctx.fillRect(0, 0, width, height - bottomCutoutH);

        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        this.ctx.fillStyle = '#c9a227';
        this.ctx.font = '700 36px Cinzel, Georgia, serif';
        this.ctx.fillText('Pack modifiers', cx, 72);

        this.ctx.fillStyle = '#a08060';
        this.ctx.font = '500 15px Cinzel, Georgia, serif';
        this.ctx.fillText('Enemies in a pack (same type, nearby) get one random modifier. Tag appears above them when buff is active.', cx, 112);

        const packModifiers = GameConfig.packModifiers || {};
        const names = Object.keys(packModifiers);
        const lineHeight = 28;
        const startY = 142;

        for (let i = 0; i < names.length; i++) {
            const name = names[i];
            const def = packModifiers[name];
            const capName = name.charAt(0).toUpperCase() + name.slice(1);
            const desc = this.getPackModifierDescription(name, def);
            const line = desc ? `${capName} — ${desc}` : capName;
            const y = startY + i * lineHeight;

            this.ctx.fillStyle = def && def.color ? def.color : '#e8dcc8';
            this.ctx.font = '600 16px Cinzel, Georgia, serif';
            this.ctx.fillText(line, cx, y);
        }

        const backY = height - 56;
        const buttonWidth = 120;
        const buttonHeight = 40;
        this.drawSmallButton(cx, backY, buttonWidth, buttonHeight, 'Back', this.isButtonPressed('help', 'back'));
    }

    getHelpBackButtonAt(x: number, y: number): boolean {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const cx = width / 2;
        const backY = height - 56;
        const buttonWidth = 120;
        const buttonHeight = 40;
        const left = cx - buttonWidth / 2;
        const right = cx + buttonWidth / 2;
        if (x >= left && x <= right && y >= backY - buttonHeight / 2 && y <= backY + buttonHeight / 2) return true;
        return false;
    }

    /** Main Quest overlay: quests filtered by unlockedLevelIds, one row per quest. contentTop/contentHeight optional for tabbed board. */
    getMainQuestOverlayBounds(
        unlockedLevelIds: number[],
        contentTop?: number,
        contentHeight?: number,
    ): { titleY: number; listTop: number; rowHeight: number; rows: { index: number; quest: Quest; y: number; left: number; right: number; top: number; bottom: number }[]; buttonY: number; acceptX: number; backX: number; buttonW: number; buttonH: number } {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const cx = width / 2;
        const listW = 520;
        const rowHeight = 44;
        const unlockedSet = new Set(unlockedLevelIds);
        const quests = STATIC_QUESTS.filter((q) => unlockedSet.has(q.level)).sort((a, b) => a.level - b.level || (a.order ?? 0) - (b.order ?? 0));
        const titleY = contentTop !== undefined ? contentTop + 24 : 56;
        const listTop = contentTop !== undefined ? contentTop + 56 : 88;
        const buttonY = contentTop !== undefined && contentHeight !== undefined ? contentTop + contentHeight - 56 : height - 56;
        const rows: { index: number; quest: Quest; y: number; left: number; right: number; top: number; bottom: number }[] = [];
        const left = cx - listW / 2;
        const right = cx + listW / 2;
        for (let i = 0; i < quests.length; i++) {
            const y = listTop + i * rowHeight + rowHeight / 2;
            rows.push({
                index: i,
                quest: quests[i],
                y,
                left,
                right,
                top: y - rowHeight / 2,
                bottom: y + rowHeight / 2,
            });
        }
        const buttonH = 40;
        const buttonW = 120;
        const gap = 24;
        const acceptX = cx - buttonW / 2 - gap / 2;
        const backX = cx + buttonW / 2 + gap / 2;
        return { titleY, listTop, rowHeight, rows, buttonY, acceptX, backX, buttonW, buttonH };
    }

    renderMainQuestOverlay(
        unlockedLevelIds: number[],
        completedQuestIds: string[],
        selectedQuestIndex: number,
        levelNames: Record<number, string>,
        contentTop?: number,
        contentHeight?: number,
    ): void {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        const width = this.canvas.width;
        const height = this.canvas.height;
        const cx = width / 2;

        if (contentTop === undefined) {
            this.ctx.fillStyle = 'rgba(10, 8, 6, 0.82)';
            this.ctx.fillRect(0, 0, width, height);
        }

        const b = this.getMainQuestOverlayBounds(unlockedLevelIds, contentTop, contentHeight);

        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = '#c9a227';
        this.ctx.font = '700 24px Cinzel, Georgia, serif';
        this.ctx.fillText('Main Quest', cx, b.titleY);

        const completedSet = new Set(completedQuestIds);
        for (const row of b.rows) {
            const isSelected = selectedQuestIndex === row.index;
            const completed = completedSet.has(row.quest.id);
            const levelName = levelNames[row.quest.level] ?? 'Level ' + row.quest.level;

            this.ctx.fillStyle = isSelected ? 'rgba(201, 162, 39, 0.35)' : 'rgba(26, 16, 8, 0.6)';
            this.ctx.fillRect(row.left, row.top, row.right - row.left, row.bottom - row.top);
            this.ctx.strokeStyle = isSelected ? '#c9a227' : '#4a3020';
            this.ctx.lineWidth = isSelected ? 2 : 1;
            this.ctx.strokeRect(row.left, row.top, row.right - row.left, row.bottom - row.top);

            this.ctx.textAlign = 'left';
            this.ctx.fillStyle = completed ? '#6a8a6a' : '#e8dcc8';
            this.ctx.font = '600 15px Cinzel, Georgia, serif';
            this.ctx.fillText(completed ? '✓ ' + row.quest.name : row.quest.name, row.left + 12, row.y);
            this.ctx.fillStyle = '#a08060';
            this.ctx.font = '500 12px Cinzel, Georgia, serif';
            this.ctx.fillText(levelName, row.right - 10, row.y);
            if (row.quest.gatesBiomeUnlock) {
                this.ctx.fillStyle = '#c9a227';
                this.ctx.font = '500 11px Cinzel, Georgia, serif';
                this.ctx.fillText('Required', row.left + 14, row.y + 14);
            }
            this.ctx.textAlign = 'center';
        }

        const hasSelection = selectedQuestIndex >= 0 && selectedQuestIndex < b.rows.length;
        this.ctx.fillStyle = hasSelection ? '#1a1008' : 'rgba(26, 16, 8, 0.6)';
        this.ctx.fillRect(b.acceptX - b.buttonW / 2, b.buttonY - b.buttonH / 2, b.buttonW, b.buttonH);
        this.ctx.strokeStyle = hasSelection ? '#c9a227' : '#4a3020';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(b.acceptX - b.buttonW / 2, b.buttonY - b.buttonH / 2, b.buttonW, b.buttonH);
        this.ctx.fillStyle = hasSelection ? '#e8dcc8' : '#6a5a50';
        this.ctx.font = '600 14px Cinzel, Georgia, serif';
        this.ctx.fillText('Accept', b.acceptX, b.buttonY);

        this.ctx.fillStyle = '#1a1008';
        this.ctx.fillRect(b.backX - b.buttonW / 2, b.buttonY - b.buttonH / 2, b.buttonW, b.buttonH);
        this.ctx.strokeStyle = '#4a3020';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(b.backX - b.buttonW / 2, b.buttonY - b.buttonH / 2, b.buttonW, b.buttonH);
        this.ctx.fillStyle = '#a08060';
        this.ctx.fillText('Back', b.backX, b.buttonY);
    }

    getMainQuestSelectAt(x: number, y: number, unlockedLevelIds: number[], contentTop?: number, contentHeight?: number): number | null {
        const b = this.getMainQuestOverlayBounds(unlockedLevelIds, contentTop, contentHeight);
        for (const row of b.rows) {
            if (x >= row.left && x <= row.right && y >= row.top && y <= row.bottom) return row.index;
        }
        return null;
    }

    getMainQuestButtonAt(x: number, y: number, unlockedLevelIds: number[], contentTop?: number, contentHeight?: number): 'accept' | 'back' | null {
        const b = this.getMainQuestOverlayBounds(unlockedLevelIds, contentTop, contentHeight);
        const halfW = b.buttonW / 2;
        const halfH = b.buttonH / 2;
        if (x >= b.acceptX - halfW && x <= b.acceptX + halfW && y >= b.buttonY - halfH && y <= b.buttonY + halfH) return 'accept';
        if (x >= b.backX - halfW && x <= b.backX + halfW && y >= b.buttonY - halfH && y <= b.buttonY + halfH) return 'back';
        return null;
    }

    renderDeathScreen() {
        const width = this.canvas.width;
        const height = this.canvas.height;

        this.ctx.fillStyle = 'rgba(10, 8, 6, 0.88)';
        this.ctx.fillRect(0, 0, width, height);

        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = '#c9a227';
        this.ctx.font = '700 38px Cinzel, Georgia, serif';
        this.ctx.fillText('Thou art fallen', width / 2, height / 2 - 88);

        this.ctx.fillStyle = '#a08060';
        this.ctx.font = '500 15px Cinzel, Georgia, serif';
        this.ctx.fillText('You dropped your equipment and passed out.', width / 2, height / 2 - 48);
        this.ctx.fillText('A strange presence has brought you back to the Sanctuary.', width / 2, height / 2 - 28);

        this.ctx.font = '500 14px Cinzel, Georgia, serif';
        this.ctx.fillText('Press SPACE or click to return to Sanctuary', width / 2, height / 2 + 4);

        const buttonX = width / 2;
        const buttonY = height / 2 + 70;
        const buttonWidth = 160;
        const buttonHeight = 48;
        this.drawMenuButton(buttonX, buttonY, buttonWidth, buttonHeight, 'Return to Sanctuary', this.isButtonPressed('death', 'return'));
    }

    checkButtonClick(x: number, y: number, screen: ScreenName): boolean {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const buttonX = width / 2;
        const buttonY = screen === 'title' ? height / 2 + 60 : screen === 'death' ? height / 2 + 70 : height / 2 + 48;
        const buttonWidth = 160;
        const buttonHeight = 48;

        const buttonLeft = buttonX - buttonWidth / 2;
        const buttonRight = buttonX + buttonWidth / 2;
        const buttonTop = buttonY - buttonHeight / 2;
        const buttonBottom = buttonY + buttonHeight / 2;

        return x >= buttonLeft && x <= buttonRight && y >= buttonTop && y <= buttonBottom;
    }

    renderHubBoardOverlay(questList: Quest[], selectedQuestIndex: number, levelNames: Record<number, string>, gold: number = 0): void {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        const width = this.canvas.width;
        const height = this.canvas.height;
        const cx = width / 2;

        this.ctx.fillStyle = 'rgba(10, 8, 6, 0.82)';
        this.ctx.fillRect(0, 0, width, height);

        if (questList.length === 0) {
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillStyle = '#a08060';
            this.ctx.font = '500 16px Cinzel, Georgia, serif';
            this.ctx.fillText('No quests posted.', cx, height / 2);
            return;
        }

        const b = this.getQuestBoardBounds(questList, levelNames);
        const framePad = 20;
        const frameX = cx - b.boardW / 2 - framePad;
        const frameW = b.boardW + framePad * 2;
        const frameH = b.boardH + framePad * 2 + 24;

        // Wooden bulletin board frame
        this.ctx.fillStyle = '#3d2817';
        this.ctx.fillRect(frameX, b.frameY, frameW, frameH);
        this.ctx.strokeStyle = '#5c3d22';
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(frameX, b.frameY, frameW, frameH);
        this.ctx.fillStyle = '#2a1810';
        this.ctx.fillRect(frameX + 6, b.frameY + 6, frameW - 12, frameH - 12);

        // Title
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = '#c9a227';
        this.ctx.font = '700 22px Cinzel, Georgia, serif';
        this.ctx.fillText('Investigations', cx, b.frameY + 22);

        const REROLL_COST = 200;
        const canReroll = gold >= REROLL_COST;

        // Buttons side by side (Accept | Re-roll | Back)
        this.ctx.fillStyle = '#1a1008';
        this.ctx.fillRect(b.acceptX - b.buttonW / 2, b.buttonY - b.buttonH / 2, b.buttonW, b.buttonH);
        this.ctx.strokeStyle = '#c9a227';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(b.acceptX - b.buttonW / 2, b.buttonY - b.buttonH / 2, b.buttonW, b.buttonH);
        this.ctx.fillStyle = '#e8dcc8';
        this.ctx.font = '600 14px Cinzel, Georgia, serif';
        this.ctx.fillText('Accept quest', b.acceptX, b.buttonY);

        this.ctx.fillStyle = canReroll ? '#1a1008' : 'rgba(26, 16, 8, 0.6)';
        this.ctx.fillRect(b.rerollX - b.rerollButtonW / 2, b.buttonY - b.buttonH / 2, b.rerollButtonW, b.buttonH);
        this.ctx.strokeStyle = canReroll ? '#c9a227' : '#4a3020';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(b.rerollX - b.rerollButtonW / 2, b.buttonY - b.buttonH / 2, b.rerollButtonW, b.buttonH);
        this.ctx.fillStyle = canReroll ? '#e8dcc8' : '#6a5a50';
        this.ctx.font = '600 13px Cinzel, Georgia, serif';
        this.ctx.fillText('Re-roll (200g)', b.rerollX, b.buttonY);

        this.ctx.fillStyle = '#1a1008';
        this.ctx.fillRect(b.backX - b.buttonW / 2, b.buttonY - b.buttonH / 2, b.buttonW, b.buttonH);
        this.ctx.strokeStyle = '#4a3020';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(b.backX - b.buttonW / 2, b.buttonY - b.buttonH / 2, b.buttonW, b.buttonH);
        this.ctx.fillStyle = '#a08060';
        this.ctx.fillText('Back', b.backX, b.buttonY);

        // Word-wrap a string to fit within maxChars per line (break on spaces when possible).
        const wrapText = (text: string, maxChars: number): string[] => {
            const out: string[] = [];
            let rest = text.trim();
            while (rest.length > 0) {
                if (rest.length <= maxChars) {
                    out.push(rest);
                    break;
                }
                let breakAt = rest.slice(0, maxChars + 1).lastIndexOf(' ');
                if (breakAt <= 0) breakAt = maxChars;
                out.push(rest.slice(0, breakAt).trim());
                rest = rest.slice(breakAt).trim();
            }
            return out;
        };

        // Three quest pages (pinned paper look)
        const maxCharsPerLine = 34;
        const descLineHeight = 18;
        for (let i = 0; i < b.rows.length; i++) {
            const row = b.rows[i];
            const quest = questList[row.index];
            const isSelected = selectedQuestIndex === row.index;
            const levelName = levelNames[quest.level] ?? 'Level ' + quest.level;
            const diffLabel = quest.difficulty?.label ?? quest.difficultyId;
            const descLines = getQuestDescription(quest);
            const wrappedLines: string[] = [];
            for (const line of descLines) {
                wrappedLines.push(...wrapText(line, maxCharsPerLine));
            }

            this.ctx.save();
            const slightRotate = (i - 1) * 0.018;
            this.ctx.translate(row.x + row.w / 2, row.y + row.h / 2);
            this.ctx.rotate(slightRotate);
            this.ctx.translate(-(row.x + row.w / 2), -(row.y + row.h / 2));

            this.ctx.fillStyle = isSelected ? '#f4ecd8' : '#e8dfc8';
            this.ctx.strokeStyle = isSelected ? '#c9a227' : '#8b7355';
            this.ctx.lineWidth = isSelected ? 3 : 1.5;
            this.ctx.fillRect(row.x, row.y, row.w, row.h);
            this.ctx.strokeRect(row.x, row.y, row.w, row.h);

            const pad = 12;
            let ty = row.y + pad + 8;
            this.ctx.fillStyle = '#1a1008';
            this.ctx.font = '700 20px Cinzel, Georgia, serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(levelName, row.x + row.w / 2, ty);
            ty += 26;
            this.ctx.fillStyle = '#4a3020';
            this.ctx.font = '600 16px Cinzel, Georgia, serif';
            this.ctx.fillText(diffLabel, row.x + row.w / 2, ty);
            ty += 22;
            this.ctx.fillStyle = '#2a1810';
            this.ctx.font = '500 14px Cinzel, Georgia, serif';
            for (const line of wrappedLines) {
                this.ctx.fillText(line, row.x + row.w / 2, ty);
                ty += descLineHeight;
            }
            this.ctx.restore();
        }
    }

    renderBoardOverlayWithTabs(
        boardTab: 'bulletin' | 'mainQuest',
        questList: Quest[],
        hubSelectedQuestIndex: number,
        unlockedLevelIds: number[],
        completedQuestIds: string[],
        hubSelectedMainQuestIndex: number,
        levelNames: Record<number, string>,
        gold: number,
    ): void {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        const width = this.canvas.width;
        const height = this.canvas.height;
        const cx = width / 2;

        this.ctx.fillStyle = 'rgba(10, 8, 6, 0.82)';
        this.ctx.fillRect(0, 0, width, height);

        const t = this.getTabbedBoardFrame();
        // Wooden frame
        this.ctx.fillStyle = '#3d2817';
        this.ctx.fillRect(t.frameX, t.frameY, t.frameW, t.frameH);
        this.ctx.strokeStyle = '#5c3d22';
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(t.frameX, t.frameY, t.frameW, t.frameH);
        this.ctx.fillStyle = '#2a1810';
        this.ctx.fillRect(t.frameX + 6, t.frameY + 6, t.frameW - 12, t.frameH - 12);

        // Tab bar
        const tabTop = t.frameY + 6;
        const tabH = t.tabBarHeight - 12;
        const tab1Right = t.frameX + t.frameW / 2;
        const tab2Left = tab1Right;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        for (const [tab, label, left, right] of [
            ['mainQuest' as const, 'Main Quest', t.frameX, tab1Right],
            ['bulletin' as const, 'Investigations', tab2Left, t.frameX + t.frameW],
        ]) {
            const isActive = boardTab === tab;
            this.ctx.fillStyle = isActive ? '#3d2817' : '#2a1810';
            this.ctx.fillRect(left, tabTop, right - left, tabH);
            this.ctx.strokeStyle = isActive ? '#c9a227' : '#4a3020';
            this.ctx.lineWidth = isActive ? 2 : 1;
            this.ctx.strokeRect(left, tabTop, right - left, tabH);
            this.ctx.fillStyle = isActive ? '#e8dcc8' : '#a08060';
            this.ctx.font = isActive ? '600 14px Cinzel, Georgia, serif' : '500 13px Cinzel, Georgia, serif';
            this.ctx.fillText(label, (left + right) / 2, tabTop + tabH / 2);
        }

        if (boardTab === 'bulletin') {
            if (questList.length === 0) {
                this.ctx.fillStyle = '#a08060';
                this.ctx.font = '500 16px Cinzel, Georgia, serif';
                this.ctx.fillText('No quests posted.', cx, t.contentTop + t.contentHeight / 2);
                return;
            }
            const b = this.getQuestBoardBounds(questList, levelNames, t.contentTop);
            this.ctx.fillStyle = '#c9a227';
            this.ctx.font = '700 22px Cinzel, Georgia, serif';
            this.ctx.fillText('Investigations', cx, b.frameY + 22);
            const REROLL_COST = 200;
            const canReroll = gold >= REROLL_COST;
            this.ctx.fillStyle = '#1a1008';
            this.ctx.fillRect(b.acceptX - b.buttonW / 2, b.buttonY - b.buttonH / 2, b.buttonW, b.buttonH);
            this.ctx.strokeStyle = '#c9a227';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(b.acceptX - b.buttonW / 2, b.buttonY - b.buttonH / 2, b.buttonW, b.buttonH);
            this.ctx.fillStyle = '#e8dcc8';
            this.ctx.font = '600 14px Cinzel, Georgia, serif';
            this.ctx.fillText('Accept quest', b.acceptX, b.buttonY);
            this.ctx.fillStyle = canReroll ? '#1a1008' : 'rgba(26, 16, 8, 0.6)';
            this.ctx.fillRect(b.rerollX - b.rerollButtonW / 2, b.buttonY - b.buttonH / 2, b.rerollButtonW, b.buttonH);
            this.ctx.strokeStyle = canReroll ? '#c9a227' : '#4a3020';
            this.ctx.strokeRect(b.rerollX - b.rerollButtonW / 2, b.buttonY - b.buttonH / 2, b.rerollButtonW, b.buttonH);
            this.ctx.fillStyle = canReroll ? '#e8dcc8' : '#6a5a50';
            this.ctx.font = '600 13px Cinzel, Georgia, serif';
            this.ctx.fillText('Re-roll (200g)', b.rerollX, b.buttonY);
            this.ctx.fillStyle = '#1a1008';
            this.ctx.fillRect(b.backX - b.buttonW / 2, b.buttonY - b.buttonH / 2, b.buttonW, b.buttonH);
            this.ctx.strokeStyle = '#4a3020';
            this.ctx.strokeRect(b.backX - b.buttonW / 2, b.buttonY - b.buttonH / 2, b.buttonW, b.buttonH);
            this.ctx.fillStyle = '#a08060';
            this.ctx.fillText('Back', b.backX, b.buttonY);
            const wrapText = (text: string, maxChars: number): string[] => {
                const out: string[] = [];
                let rest = text.trim();
                while (rest.length > 0) {
                    if (rest.length <= maxChars) {
                        out.push(rest);
                        break;
                    }
                    const breakAt = rest.slice(0, maxChars + 1).lastIndexOf(' ');
                    out.push(rest.slice(0, breakAt <= 0 ? maxChars : breakAt).trim());
                    rest = rest.slice(breakAt <= 0 ? maxChars : breakAt).trim();
                }
                return out;
            };
            const maxCharsPerLine = 34;
            const descLineHeight = 18;
            for (let i = 0; i < b.rows.length; i++) {
                const row = b.rows[i];
                const quest = questList[row.index];
                const isSelected = hubSelectedQuestIndex === row.index;
                const levelName = levelNames[quest.level] ?? 'Level ' + quest.level;
                const diffLabel = quest.difficulty?.label ?? quest.difficultyId;
                const descLines = getQuestDescription(quest);
                const wrappedLines: string[] = [];
                for (const line of descLines) {
                    wrappedLines.push(...wrapText(line, maxCharsPerLine));
                }
                this.ctx.save();
                const slightRotate = (i - 1) * 0.018;
                this.ctx.translate(row.x + row.w / 2, row.y + row.h / 2);
                this.ctx.rotate(slightRotate);
                this.ctx.translate(-(row.x + row.w / 2), -(row.y + row.h / 2));
                this.ctx.fillStyle = isSelected ? '#f4ecd8' : '#e8dfc8';
                this.ctx.strokeStyle = isSelected ? '#c9a227' : '#8b7355';
                this.ctx.lineWidth = isSelected ? 3 : 1.5;
                this.ctx.fillRect(row.x, row.y, row.w, row.h);
                this.ctx.strokeRect(row.x, row.y, row.w, row.h);
                const pad = 12;
                let ty = row.y + pad + 8;
                this.ctx.fillStyle = '#1a1008';
                this.ctx.font = '700 20px Cinzel, Georgia, serif';
                this.ctx.fillText(levelName, row.x + row.w / 2, ty);
                ty += 26;
                this.ctx.fillStyle = '#4a3020';
                this.ctx.font = '600 16px Cinzel, Georgia, serif';
                this.ctx.fillText(diffLabel, row.x + row.w / 2, ty);
                ty += 22;
                this.ctx.fillStyle = '#2a1810';
                this.ctx.font = '500 14px Cinzel, Georgia, serif';
                for (const line of wrappedLines) {
                    this.ctx.fillText(line, row.x + row.w / 2, ty);
                    ty += descLineHeight;
                }
                this.ctx.restore();
            }
        } else {
            this.renderMainQuestOverlay(unlockedLevelIds, completedQuestIds, hubSelectedMainQuestIndex, levelNames, t.contentTop, t.contentHeight);
        }
    }

    getWeaponChestOverlayBounds() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const cx = width / 2;
        const rowH = 28;
        const rowW = 260;
        const startY = height / 2 - 140;
        return {
            cx, rowW, rowH, startY,
            backY: height / 2 + 160,
            rows: [
                { key: 'sword_rusty', mainhandKey: 'sword_rusty', offhandKey: 'none', label: 'Rusty Sword', y: startY },
                { key: 'sword_rusty+shield', mainhandKey: 'sword_rusty', offhandKey: 'shield_wooden', label: 'Rusty Sword + Shield', y: startY + rowH },
                { key: 'dagger_rusty', mainhandKey: 'dagger_rusty', offhandKey: 'none', label: 'Rusty Dagger', y: startY + rowH * 2 },
                { key: 'dagger_rusty+shield', mainhandKey: 'dagger_rusty', offhandKey: 'shield_wooden', label: 'Rusty Dagger + Shield', y: startY + rowH * 3 },
                { key: 'greatsword_rusty', mainhandKey: 'greatsword_rusty', offhandKey: 'none', label: 'Rusty Greatsword', y: startY + rowH * 4 },
                { key: 'crossbow_rusty', mainhandKey: 'crossbow_rusty', offhandKey: 'none', label: 'Rusty Crossbow', y: startY + rowH * 5 },
                { key: 'crossbow_rusty+shield', mainhandKey: 'crossbow_rusty', offhandKey: 'shield_wooden', label: 'Rusty Crossbow + Shield', y: startY + rowH * 6 },
                { key: 'mace_rusty', mainhandKey: 'mace_rusty', offhandKey: 'none', label: 'Rusty Mace', y: startY + rowH * 7 },
                { key: 'mace_rusty+shield', mainhandKey: 'mace_rusty', offhandKey: 'shield_wooden', label: 'Rusty Mace + Shield', y: startY + rowH * 8 }
            ]
        };
    }

    getWeaponChestWeaponAt(x, y) {
        const b = this.getWeaponChestOverlayBounds();
        const left = b.cx - b.rowW / 2;
        const right = b.cx + b.rowW / 2;
        for (const row of b.rows) {
            const top = row.y - b.rowH / 2;
            const bottom = row.y + b.rowH / 2;
            if (x >= left && x <= right && y >= top && y <= bottom) {
                return { mainhandKey: row.mainhandKey, offhandKey: row.offhandKey };
            }
        }
        return null;
    }

    getWeaponChestBackAt(x, y) {
        const b = this.getWeaponChestOverlayBounds();
        const buttonWidth = 120;
        const buttonHeight = 40;
        const left = b.cx - buttonWidth / 2;
        const right = b.cx + buttonWidth / 2;
        const top = b.backY - buttonHeight / 2;
        const bottom = b.backY + buttonHeight / 2;
        return x >= left && x <= right && y >= top && y <= bottom;
    }

    renderWeaponChestOverlay(equippedMainhandKey, equippedOffhandKey) {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        const width = this.canvas.width;
        const height = this.canvas.height;
        const cx = width / 2;

        this.ctx.fillStyle = 'rgba(10, 8, 6, 0.75)';
        this.ctx.fillRect(0, 0, width, height);

        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = '#c9a227';
        this.ctx.font = '700 26px Cinzel, Georgia, serif';
        this.ctx.fillText('Equipment', cx, height / 2 - 90);

        const b = this.getWeaponChestOverlayBounds();
        for (const row of b.rows) {
            const isEquipped = equippedMainhandKey === row.mainhandKey && equippedOffhandKey === row.offhandKey;
            this.ctx.fillStyle = isEquipped ? 'rgba(201, 162, 39, 0.25)' : 'rgba(20, 16, 8, 0.6)';
            this.ctx.fillRect(b.cx - b.rowW / 2, row.y - b.rowH / 2, b.rowW, b.rowH);
            this.ctx.strokeStyle = isEquipped ? '#c9a227' : '#4a3020';
            this.ctx.lineWidth = isEquipped ? 2 : 1;
            this.ctx.strokeRect(b.cx - b.rowW / 2, row.y - b.rowH / 2, b.rowW, b.rowH);
            this.ctx.fillStyle = isEquipped ? '#e8dcc8' : '#a08060';
            this.ctx.font = isEquipped ? '600 13px Cinzel, Georgia, serif' : '500 12px Cinzel, Georgia, serif';
            this.ctx.fillText(row.label, b.cx, row.y);
        }

        const buttonWidth = 120;
        const buttonHeight = 40;
        this.ctx.fillStyle = '#1a1008';
        this.ctx.fillRect(cx - buttonWidth / 2, b.backY - buttonHeight / 2, buttonWidth, buttonHeight);
        this.ctx.strokeStyle = '#4a3020';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(cx - buttonWidth / 2, b.backY - buttonHeight / 2, buttonWidth, buttonHeight);
        this.ctx.fillStyle = '#a08060';
        this.ctx.font = '600 13px Cinzel, Georgia, serif';
        this.ctx.fillText('Back', cx, b.backY);
    }

    getSettingsLayout(settings) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const cx = width / 2;

        const rowHeight = 32;
        const rowWidth = 360;
        const startY = height / 2 - 60;

        const rows = [
            {
                key: 'music',
                label: 'Music',
                value: settings.musicEnabled,
                type: 'toggle',
                x: cx - rowWidth / 2,
                y: startY + 0 * 40
            },
            {
                key: 'sfx',
                label: 'Sound Effects',
                value: settings.sfxEnabled,
                type: 'toggle',
                x: cx - rowWidth / 2,
                y: startY + 1 * 40
            },
            {
                key: 'minimap',
                label: 'Minimap',
                value: settings.showMinimap,
                type: 'toggle',
                x: cx - rowWidth / 2,
                y: startY + 2 * 40
            },
            {
                key: 'characterSprites',
                label: 'Character Sprites',
                value: settings.useCharacterSprites,
                type: 'toggle',
                x: cx - rowWidth / 2,
                y: startY + 3 * 40
            },
            {
                key: 'environmentSprites',
                label: 'Environment Sprites',
                value: settings.useEnvironmentSprites,
                type: 'toggle',
                x: cx - rowWidth / 2,
                y: startY + 4 * 40
            },
            {
                key: 'playerHitboxIndicators',
                label: 'Player Hitbox Indicators',
                value: settings.showPlayerHitboxIndicators,
                type: 'toggle',
                x: cx - rowWidth / 2,
                y: startY + 5 * 40
            },
            {
                key: 'enemyHitboxIndicators',
                label: 'Enemy Hitbox Indicators',
                value: settings.showEnemyHitboxIndicators,
                type: 'toggle',
                x: cx - rowWidth / 2,
                y: startY + 6 * 40
            },
            {
                key: 'enemyStaminaBars',
                label: 'Enemy Stamina Bars',
                value: settings.showEnemyStaminaBars,
                type: 'toggle',
                x: cx - rowWidth / 2,
                y: startY + 7 * 40
            },
            {
                key: 'playerHealthBarAlways',
                label: 'Player Health Bar Always',
                value: settings.showPlayerHealthBarAlways,
                type: 'toggle',
                x: cx - rowWidth / 2,
                y: startY + 8 * 40
            },
            {
                key: 'enemyHealthBars',
                label: 'Enemy Health Bars',
                value: settings.showEnemyHealthBars,
                type: 'toggle',
                x: cx - rowWidth / 2,
                y: startY + 9 * 40
            },
            {
                key: 'controls',
                label: 'Controls',
                type: 'link',
                x: cx - rowWidth / 2,
                y: startY + 10 * 40
            }
        ];

        // Place the back button below the last settings row
        const lastRow = rows[rows.length - 1];
        const backY = lastRow.y + 60;

        const backButton = {
            key: 'back',
            label: 'Back',
            x: cx - 80,
            y: backY,
            width: 160,
            height: 40
        };

        return { rows, backButton, rowWidth, rowHeight };
    }

    renderSettingsScreen(settings) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const cx = width / 2;

        // Dim background
        this.ctx.fillStyle = 'rgba(10, 8, 6, 0.80)';
        this.ctx.fillRect(0, 0, width, height);

        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Title
        this.ctx.fillStyle = '#c9a227';
        this.ctx.font = '700 34px Cinzel, Georgia, serif';
        this.ctx.fillText('Settings', cx, height / 2 - 140);

        const layout = this.getSettingsLayout(settings);

        // Setting rows as buttons
        layout.rows.forEach((row) => {
            // Button rect
            this.ctx.fillStyle = 'rgba(20, 16, 8, 0.8)';
            this.ctx.fillRect(row.x, row.y - layout.rowHeight / 2, layout.rowWidth, layout.rowHeight);

            this.ctx.strokeStyle = '#4a3020';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(row.x, row.y - layout.rowHeight / 2, layout.rowWidth, layout.rowHeight);

            // Text (toggle: "Label: On/Off", link: "Label")
            this.ctx.fillStyle = '#e8dcc8';
            this.ctx.font = '500 15px Cinzel, Georgia, serif';
            const text = row.type === 'link' ? row.label : `${row.label}: ${row.value ? 'On' : 'Off'}`;
            this.ctx.fillText(text, cx, row.y);
        });

        // Back button
        const back = layout.backButton;
        this.ctx.fillStyle = '#1a1008';
        this.ctx.fillRect(back.x, back.y - back.height / 2, back.width, back.height);
        this.ctx.strokeStyle = '#4a3020';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(back.x, back.y - back.height / 2, back.width, back.height);

        this.ctx.fillStyle = '#a08060';
        this.ctx.font = '600 15px Cinzel, Georgia, serif';
        this.ctx.fillText('Back', cx, back.y);
    }

    getSettingsItemAt(x, y, settings) {
        const layout = this.getSettingsLayout(settings);

        // Check setting rows
        for (const row of layout.rows) {
            const left = row.x;
            const right = row.x + layout.rowWidth;
            const top = row.y - layout.rowHeight / 2;
            const bottom = row.y + layout.rowHeight / 2;

            if (x >= left && x <= right && y >= top && y <= bottom) {
                return row.key; // 'music', 'sfx', or 'minimap'
            }
        }

        // Check Back button
        const back = layout.backButton;
        const left = back.x;
        const right = back.x + back.width;
        const top = back.y - back.height / 2;
        const bottom = back.y + back.height / 2;

        if (x >= left && x <= right && y >= top && y <= bottom) {
            return back.key; // 'back'
        }

        return null;
    }

    getControlsBackButton() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const cx = width / 2;
        return {
            x: cx - 80,
            y: height / 2 + 180,
            width: 160,
            height: 40
        };
    }

    getControlsItemAt(x, y) {
        const back = this.getControlsBackButton();
        if (x >= back.x && x <= back.x + back.width &&
            y >= back.y - back.height / 2 && y <= back.y + back.height / 2) {
            return 'back';
        }
        return null;
    }

    renderControlsScreen() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const cx = width / 2;

        this.ctx.fillStyle = 'rgba(10, 8, 6, 0.90)';
        this.ctx.fillRect(0, 0, width, height);

        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Title
        this.ctx.fillStyle = '#c9a227';
        this.ctx.font = '700 34px Cinzel, Georgia, serif';
        this.ctx.fillText('Controls', cx, height / 2 - 200);

        // Control text (moved from in-game overlay)
        const lines = [
            'WASD — Move',
            'Shift — Sprint',
            'Space — Dodge',
            'Left click — Attack',
            'Right click — Block',
            'Q — Heal (tap to drink, then regen)',
            'Shift + Left click — Dash attack',
            'E — Portal (next area or return to Sanctuary)',
            'In Sanctuary: E at board — Level select · E at chest — Equipment · E at shop — Buy weapons'
        ];
        this.ctx.fillStyle = '#e8dcc8';
        this.ctx.font = '500 15px Cinzel, Georgia, serif';
        this.ctx.textAlign = 'center';
        const lineHeight = 24;
        const startY = height / 2 - 140;
        lines.forEach((line, i) => {
            this.ctx.fillText(line, cx, startY + i * lineHeight);
        });

        // Back button
        const back = this.getControlsBackButton();
        this.ctx.fillStyle = '#1a1008';
        this.ctx.fillRect(back.x, back.y - back.height / 2, back.width, back.height);
        this.ctx.strokeStyle = '#4a3020';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(back.x, back.y - back.height / 2, back.width, back.height);
        this.ctx.fillStyle = '#a08060';
        this.ctx.font = '600 15px Cinzel, Georgia, serif';
        this.ctx.fillText('Back', cx, back.y);
    }

    render(settings: SettingsLike): void {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (this.currentScreen === 'title') {
            this.renderTitleScreen();
        } else if (this.currentScreen === 'classSelect') {
            this.renderClassSelectScreen();
        } else if (this.currentScreen === 'saveSelect') {
            this.renderSaveSelectScreen();
        } else if (this.currentScreen === 'death') {
            this.renderDeathScreen();
        } else if (this.currentScreen === 'pause') {
            this.renderPauseScreen();
        } else if (this.currentScreen === 'settings') {
            this.renderSettingsScreen(settings);
        } else if (this.currentScreen === 'settings-controls') {
            this.renderControlsScreen();
        } else if (this.currentScreen === 'help') {
            this.renderHelpScreen();
        }
        // 'hub' and 'playing' screens are handled by the normal game rendering
    }
}

