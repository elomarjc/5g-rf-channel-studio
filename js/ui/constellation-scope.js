/**
 * 5G/6G RF Channel & Constellation Studio
 * High-Performance 60 FPS Digital Phosphor I/Q Constellation Scope
 */

export class ConstellationScope {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.options = {
            persistence: options.persistence !== undefined ? options.persistence : 0.25,
            showGrid: options.showGrid !== undefined ? options.showGrid : true,
            showIdeal: options.showIdeal !== undefined ? options.showIdeal : true,
            pointColor: options.pointColor || '#00ffc8',
            idealColor: options.idealColor || 'rgba(255, 60, 90, 0.85)',
            gridColor: options.gridColor || 'rgba(35, 60, 90, 0.4)',
            ...options
        };

        this.zoom = 1.35; // Constellation display zoom scale
        this.resize();
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.width = rect.width || 450;
        this.height = rect.height || 450;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        this.scale = (Math.min(this.width, this.height) / 2) * (1.0 / this.zoom);
    }

    clear() {
        this.ctx.fillStyle = '#060b13';
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.drawGrid();
    }

    drawGrid() {
        if (!this.options.showGrid) return;
        const ctx = this.ctx;
        ctx.save();
        ctx.strokeStyle = this.options.gridColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);

        // Concentric circles (Unit energy circles)
        const circles = [0.5, 1.0, 1.414];
        for (const r of circles) {
            ctx.beginPath();
            ctx.arc(this.centerX, this.centerY, r * this.scale, 0, 2 * Math.PI);
            ctx.stroke();
        }

        // Axes crosshair
        ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(0, 200, 255, 0.25)';
        ctx.beginPath();
        ctx.moveTo(0, this.centerY);
        ctx.lineTo(this.width, this.centerY);
        ctx.moveTo(this.centerX, 0);
        ctx.lineTo(this.centerX, this.height);
        ctx.stroke();

        // Axis labels
        ctx.fillStyle = 'rgba(0, 200, 255, 0.5)';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText('+Q (Quad)', this.centerX + 6, 14);
        ctx.fillText('+I (In-Phase)', this.width - 70, this.centerY - 6);

        ctx.restore();
    }

    /**
     * Render a frame of noisy points with phosphor persistence decay
     */
    render(iRecv, qRecv, alphabet = []) {
        const ctx = this.ctx;

        // Apply phosphor persistence fade (alpha blend over previous frame)
        const fadeAlpha = 1.0 - this.options.persistence;
        ctx.fillStyle = `rgba(6, 11, 19, ${Math.max(0.08, fadeAlpha)})`;
        ctx.fillRect(0, 0, this.width, this.height);

        this.drawGrid();

        // Draw Ideal Reference Alphabet Centroids
        if (this.options.showIdeal && alphabet.length > 0) {
            ctx.save();
            ctx.strokeStyle = this.options.idealColor;
            ctx.fillStyle = this.options.idealColor;
            ctx.lineWidth = 1.5;

            const crossSize = alphabet.length > 64 ? 2 : 4;
            for (let a = 0; a < alphabet.length; a++) {
                const pt = alphabet[a];
                const x = this.centerX + pt.i * this.scale;
                const y = this.centerY - pt.q * this.scale;

                ctx.beginPath();
                ctx.moveTo(x - crossSize, y);
                ctx.lineTo(x + crossSize, y);
                ctx.moveTo(x, y - crossSize);
                ctx.lineTo(x, y + crossSize);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Draw Received Noisy Scatter Points
        ctx.save();
        ctx.fillStyle = this.options.pointColor;
        ctx.shadowColor = this.options.pointColor;
        ctx.shadowBlur = 4;

        const N = iRecv.length;
        const ptRadius = alphabet.length > 64 ? 1.0 : 1.5;

        for (let n = 0; n < N; n++) {
            const x = this.centerX + iRecv[n] * this.scale;
            const y = this.centerY - qRecv[n] * this.scale;

            // Clip boundaries
            if (x >= 0 && x <= this.width && y >= 0 && y <= this.height) {
                ctx.beginPath();
                ctx.arc(x, y, ptRadius, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
        ctx.restore();
    }
}
