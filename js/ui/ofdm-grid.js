/**
 * 5G/6G RF Channel & Constellation Studio
 * 5G NR OFDM Resource Grid Interactive Visualizer (Keysight VSA Style)
 * Frame Structure: 14 OFDM Symbols (Time) x 12 Subcarriers per PRB (Freq) = 2 PRBs (24 subcarriers)
 * Fully responsive on mobile with clean margins, zero text collisions, and Retina rendering.
 */

export class OfdmGrid {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.numSymbols = 14; // Standard 5G NR slot (0.5 ms @ 30 kHz SCS)
        this.numSubcarriers = 24; // 2 Physical Resource Blocks (PRBs)
        this.hoveredCell = null;
        this.selectedCell = { row: 4, col: 11 }; // Default select DMRS pilot cell

        this.types = {
            DATA: 0,
            DMRS: 1, // Demodulation Reference Signal (Pilot)
            CSIRS: 2, // Channel State Information RS
            GUARD: 3 // Guard Subcarrier
        };

        this.colors = {
            [this.types.DATA]: '#132c45',
            [this.types.DMRS]: '#ff9900',
            [this.types.CSIRS]: '#a855f7',
            [this.types.GUARD]: '#08121d'
        };

        this.initGrid();
        this.setupEvents();
        this.resize();
    }

    initGrid() {
        this.grid = [];
        for (let sc = 0; sc < this.numSubcarriers; sc++) {
            const row = [];
            for (let sym = 0; sym < this.numSymbols; sym++) {
                let type = this.types.DATA;

                // 5G NR Type 1 DMRS pilot pattern (symbols 2 and 11, alternating subcarriers)
                if ((sym === 2 || sym === 11) && sc % 2 === 0) {
                    type = this.types.DMRS;
                } else if (sym === 7 && sc % 4 === 2) {
                    type = this.types.CSIRS;
                } else if (sc === 0 || sc === this.numSubcarriers - 1) {
                    type = this.types.GUARD;
                }

                row.push({
                    subcarrier: sc,
                    symbol: sym,
                    type: type,
                    channelGain: 1.0,
                    phaseShiftDeg: 0.0
                });
            }
            this.grid.push(row);
        }
    }

    setupEvents() {
        // Mouse hover inspection
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const col = Math.floor((x - this.padLeft) / this.cellW);
            const row = Math.floor((y - this.padTop) / this.cellH);

            if (row >= 0 && row < this.numSubcarriers && col >= 0 && col < this.numSymbols) {
                this.hoveredCell = { row, col };
            } else {
                this.hoveredCell = null;
            }
            this.render();
        });

        // Touch support for mobile devices
        this.canvas.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;

            const col = Math.floor((x - this.padLeft) / this.cellW);
            const row = Math.floor((y - this.padTop) / this.cellH);

            if (col >= 0 && col < this.numSymbols && row >= 0 && row < this.numSubcarriers) {
                this.selectedCell = { row, col };
                if (this.onSelect) this.onSelect(this.grid[row][col]);
                this.render();
            }
        }, { passive: true });

        // Click selection
        this.canvas.addEventListener('click', () => {
            if (this.hoveredCell) {
                this.selectedCell = { ...this.hoveredCell };
                if (this.onSelect) this.onSelect(this.grid[this.selectedCell.row][this.selectedCell.col]);
                this.render();
            }
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.hoveredCell = null;
            this.render();
        });
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        this.width = Math.round(rect.width) || 450;
        this.height = Math.round(rect.height) || 255;

        this.canvas.width = Math.round(this.width * dpr);
        this.canvas.height = Math.round(this.height * dpr);

        if (this.ctx.resetTransform) {
            this.ctx.resetTransform();
        } else {
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
        this.ctx.scale(dpr, dpr);

        // Dedicated non-overlapping padding margins
        this.padLeft = 44;   // Space on left for Subcarrier index numbers (#0, #6, #12, #18, #23)
        this.padRight = 12;  // Right border padding
        this.padTop = 26;    // Space above grid for Frequency Header title
        this.padBottom = 26; // Space below grid for Time Header & symbol ticks

        this.cellW = (this.width - this.padLeft - this.padRight) / this.numSymbols;
        this.cellH = (this.height - this.padTop - this.padBottom) / this.numSubcarriers;

        this.render();
    }

    updateChannelState(fadingActive, ricianKDb, dopplerHz) {
        // Frequency-selective fading profile across subcarriers
        for (let sc = 0; sc < this.numSubcarriers; sc++) {
            const freqNorm = (sc - this.numSubcarriers / 2) / this.numSubcarriers;
            const notch = fadingActive ? (0.6 + 0.4 * Math.cos(freqNorm * Math.PI * 3.5)) : 1.0;
            const gain = fadingActive ? Math.min(1.4, Math.max(0.15, notch * (0.8 + 0.4 * Math.random()))) : 1.0;
            const phase = (dopplerHz * 0.05 * sc) % 360;

            for (let sym = 0; sym < this.numSymbols; sym++) {
                this.grid[sc][sym].channelGain = gain;
                this.grid[sc][sym].phaseShiftDeg = phase;
            }
        }
        this.render();
    }

    render() {
        const ctx = this.ctx;
        ctx.fillStyle = '#060b13';
        ctx.fillRect(0, 0, this.width, this.height);

        // 1. TOP FREQUENCY AXIS HEADER (Safely placed in the top margin, above all cells)
        ctx.fillStyle = 'rgba(0, 229, 255, 0.85)';
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.fillText('▲ FREQ (24 SUBCARRIERS • 2 PRBs • 720 kHz)', this.padLeft, 17);

        // 2. LEFT Y-AXIS SUBCARRIER TICKS & PRB LABELS
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'right';

        const tickIndices = [0, 6, 12, 18, 23];
        for (const sc of tickIndices) {
            const y = this.padTop + sc * this.cellH + (this.cellH * 0.75);
            ctx.fillText(`#${sc}`, this.padLeft - 6, y);
        }

        // PRB 0 and PRB 1 indicator text
        ctx.fillStyle = 'rgba(0, 229, 255, 0.4)';
        ctx.fillText('PRB1', this.padLeft - 22, this.padTop + 6 * this.cellH);
        ctx.fillText('PRB0', this.padLeft - 22, this.padTop + 18 * this.cellH);
        ctx.textAlign = 'left';

        // 3. DRAW RESOURCE ELEMENTS GRID
        for (let sc = 0; sc < this.numSubcarriers; sc++) {
            const y = this.padTop + sc * this.cellH;
            for (let sym = 0; sym < this.numSymbols; sym++) {
                const x = this.padLeft + sym * this.cellW;
                const cell = this.grid[sc][sym];

                let fillColor = this.colors[cell.type];

                // Modulate data cell color by fading gain
                if (cell.type === this.types.DATA) {
                    if (cell.channelGain < 0.5) {
                        fillColor = '#0b1928'; // Deep multipath notch
                    } else if (cell.channelGain > 1.1) {
                        fillColor = '#1f4870'; // High SNR boost
                    }
                }

                ctx.fillStyle = fillColor;
                ctx.fillRect(x + 0.5, y + 0.5, this.cellW - 1, this.cellH - 1);

                // Subtle inner grid border
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(x + 0.5, y + 0.5, this.cellW - 1, this.cellH - 1);

                // Highlight Selected Cell
                if (this.selectedCell && this.selectedCell.row === sc && this.selectedCell.col === sym) {
                    ctx.strokeStyle = '#00ffc8';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x + 0.5, y + 0.5, this.cellW - 1, this.cellH - 1);
                } else if (this.hoveredCell && this.hoveredCell.row === sc && this.hoveredCell.col === sym) {
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(x + 0.5, y + 0.5, this.cellW - 1, this.cellH - 1);
                }
            }
        }

        // PRB Midpoint Boundary Line (between subcarrier 11 and 12)
        const prbBoundaryY = this.padTop + 12 * this.cellH;
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(this.padLeft, prbBoundaryY);
        ctx.lineTo(this.width - this.padRight, prbBoundaryY);
        ctx.stroke();
        ctx.setLineDash([]);

        // 4. BOTTOM TIME AXIS (Safely placed in the bottom margin, below all cells)
        const gridBottomY = this.padTop + this.numSubcarriers * this.cellH;

        // Symbol index ticks along bottom
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';

        const keySymbols = [0, 2, 4, 7, 11, 13];
        for (const sym of keySymbols) {
            const symX = this.padLeft + sym * this.cellW + (this.cellW / 2);
            ctx.fillText(`${sym}`, symX, gridBottomY + 11);
        }

        // Time Axis Title
        ctx.fillStyle = 'rgba(0, 229, 255, 0.7)';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('TIME ► 14 OFDM SYMBOLS (0.5 ms SLOT)', this.padLeft, this.height - 4);
    }
}
