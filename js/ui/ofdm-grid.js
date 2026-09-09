/**
 * 5G/6G RF Channel & Constellation Studio
 * 5G NR OFDM Resource Grid Interactive Visualizer
 * Frame Structure: 14 OFDM Symbols (Time) x 12 Subcarriers per PRB (Freq)
 */

export class OfdmGrid {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.numSymbols = 14; // Standard 5G NR slot
        this.numSubcarriers = 24; // 2 Physical Resource Blocks (PRBs)
        this.hoveredCell = null;
        this.selectedCell = null;

        this.types = {
            DATA: 0,
            DMRS: 1, // Demodulation Reference Signal (Pilot)
            CSIRS: 2, // Channel State Information RS
            GUARD: 3 // Guard Subcarrier
        };

        this.colors = {
            [this.types.DATA]: '#1a3b5c',
            [this.types.DMRS]: '#ff9900',
            [this.types.CSIRS]: '#9933ff',
            [this.types.GUARD]: '#0b1622'
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
        const dpr = window.devicePixelRatio || 1;
        this.width = rect.width || 450;
        this.height = rect.height || 220;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.ctx.scale(dpr, dpr);

        this.padLeft = 36;
        this.padBottom = 24;
        this.padTop = 10;
        this.padRight = 10;

        this.cellW = (this.width - this.padLeft - this.padRight) / this.numSymbols;
        this.cellH = (this.height - this.padTop - this.padBottom) / this.numSubcarriers;
    }

    updateChannelState(fadingActive, ricianKDb, dopplerHz) {
        // Compute frequency-selective fading profile across subcarriers
        const K_lin = Math.pow(10, ricianKDb / 10.0);
        for (let sc = 0; sc < this.numSubcarriers; sc++) {
            const freqNorm = (sc - this.numSubcarriers / 2) / this.numSubcarriers;
            // Simulated frequency selectivity (multipath notch filter)
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

        // Draw axis headers
        ctx.fillStyle = 'rgba(0, 200, 255, 0.6)';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillText('Freq (Subcarriers: 2 PRBs)', 4, this.padTop + 8);
        ctx.fillText('Time (OFDM Symbols: 0 - 13)', this.padLeft, this.height - 8);

        // Draw Resource Elements
        for (let sc = 0; sc < this.numSubcarriers; sc++) {
            const y = this.padTop + sc * this.cellH;
            for (let sym = 0; sym < this.numSymbols; sym++) {
                const x = this.padLeft + sym * this.cellW;
                const cell = this.grid[sc][sym];

                let fillColor = this.colors[cell.type];

                // Modulate cell brightness by channel gain
                if (cell.type === this.types.DATA) {
                    const brightness = Math.min(1.5, cell.channelGain);
                    if (brightness < 0.6) {
                        fillColor = '#0d2238'; // Deep faded notch
                    }
                }

                ctx.fillStyle = fillColor;
                ctx.fillRect(x + 1, y + 1, this.cellW - 2, this.cellH - 2);

                // Highlight hovered or selected
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
    }
}
