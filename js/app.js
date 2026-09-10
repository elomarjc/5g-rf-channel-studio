/**
 * 5G/6G RF Channel & Constellation Studio
 * Master Application Controller
 */

import { MODULATION_TYPES, PRBS15, modulateBits, getConstellationAlphabet } from './dsp/modulator.js';
import { RFChannel } from './dsp/channel.js';
import { RFDemodulator } from './dsp/demodulator.js';
import { ConstellationScope } from './ui/constellation-scope.js';
import { OfdmGrid } from './ui/ofdm-grid.js';
import { ConformanceTestbench, CONFORMANCE_LIMITS_3GPP } from './ui/testbench.js';
import { TEST_PRESETS } from './presets.js';

class RFStudioApp {
    constructor() {
        this.modType = MODULATION_TYPES.QAM16;
        this.prbs = new PRBS15(0x55AA);
        this.channel = new RFChannel();
        this.demod = new RFDemodulator();

        // Channel state parameters
        this.channelParams = {
            snrDb: 22.0,
            enableFading: false,
            ricianKDb: 10.0,
            dopplerHz: 0.0,
            phaseNoiseDeg: 0.0,
            iqGainImbalanceDb: 0.0,
            iqPhaseSkewDeg: 0.0,
            dcOffsetI: 0.0,
            dcOffsetQ: 0.0,
            symbolRate: 100000.0
        };

        this.symbolsPerFrame = 2048;
        this.animationId = null;

        this.initDOM();
        this.initInstruments();
        this.initEventListeners();
        this.setupFloatingHUD();
        this.startStream();
    }

    initDOM() {
        this.dom = {
            modSelect: document.getElementById('mod-select'),
            snrSlider: document.getElementById('snr-slider'),
            snrVal: document.getElementById('snr-val'),
            fadingToggle: document.getElementById('fading-toggle'),
            fadingControls: document.getElementById('fading-controls'),
            ricianSlider: document.getElementById('rician-slider'),
            ricianVal: document.getElementById('rician-val'),
            dopplerSlider: document.getElementById('doppler-slider'),
            dopplerVal: document.getElementById('doppler-val'),
            phaseNoiseSlider: document.getElementById('phase-noise-slider'),
            phaseNoiseVal: document.getElementById('phase-noise-val'),
            iqGainSlider: document.getElementById('iq-gain-slider'),
            iqGainVal: document.getElementById('iq-gain-val'),
            iqPhaseSlider: document.getElementById('iq-phase-slider'),
            iqPhaseVal: document.getElementById('iq-phase-val'),
            persistenceSlider: document.getElementById('persistence-slider'),
            persistenceVal: document.getElementById('persistence-val'),

            // Gauges
            evmRmsGauge: document.getElementById('evm-rms-gauge'),
            evmPeakGauge: document.getElementById('evm-peak-gauge'),
            merGauge: document.getElementById('mer-gauge'),
            berGauge: document.getElementById('ber-gauge'),
            passFailBadge: document.getElementById('pass-fail-badge'),
            complianceText: document.getElementById('compliance-text'),

            // Presets container
            presetsContainer: document.getElementById('presets-container'),

            // Testbench
            runSweepBtn: document.getElementById('run-sweep-btn'),
            exportCsvBtn: document.getElementById('export-csv-btn'),
            exportJsonBtn: document.getElementById('export-json-btn'),
            sweepProgressBar: document.getElementById('sweep-progress-bar'),
            sweepProgressContainer: document.getElementById('sweep-progress-container'),
            ofdmDetails: document.getElementById('ofdm-cell-details')
        };
    }

    initInstruments() {
        const constCanvas = document.getElementById('constellation-canvas');
        this.scope = new ConstellationScope(constCanvas, {
            persistence: parseFloat(this.dom.persistenceSlider.value)
        });

        const ofdmCanvas = document.getElementById('ofdm-canvas');
        this.ofdmGrid = new OfdmGrid(ofdmCanvas);
        this.ofdmGrid.onSelect = (cell) => {
            const typeName = ['PDSCH Data', 'DMRS Pilot', 'CSI-RS', 'Guard'][cell.type];
            this.dom.ofdmDetails.innerHTML = `
                <strong>Selected RE:</strong> Subcarrier #${cell.subcarrier} | Symbol #${cell.symbol} (${typeName})<br/>
                <strong>Channel Gain:</strong> ${(cell.channelGain * 100).toFixed(1)}% | <strong>Phase:</strong> ${cell.phaseShiftDeg.toFixed(1)}&deg;
            `;
        };

        const berCanvas = document.getElementById('ber-canvas');
        this.testbench = new ConformanceTestbench(berCanvas);
        this.testbench.renderBerPlot(this.modType);

        window.addEventListener('resize', () => {
            this.scope.resize();
            this.ofdmGrid.resize();
            this.testbench.resize();
            this.testbench.renderBerPlot(this.modType);
        });
    }

    initEventListeners() {
        // Modulation select
        this.dom.modSelect.addEventListener('change', (e) => {
            this.modType = e.target.value;
            this.testbench.renderBerPlot(this.modType);
        });

        // Impairment sliders
        this.dom.snrSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            this.channelParams.snrDb = val;
            this.dom.snrVal.textContent = `${val.toFixed(1)} dB`;
        });

        this.dom.fadingToggle.addEventListener('change', (e) => {
            this.channelParams.enableFading = e.target.checked;
            this.dom.fadingControls.style.opacity = e.target.checked ? '1.0' : '0.4';
        });

        this.dom.ricianSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            this.channelParams.ricianKDb = val;
            this.dom.ricianVal.textContent = val <= -29 ? 'Rayleigh' : `${val.toFixed(1)} dB`;
        });

        this.dom.dopplerSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            this.channelParams.dopplerHz = val;
            const speedKmh = ((val * 3e8) / (3.5e9 * 1000 / 3600)).toFixed(0);
            this.dom.dopplerVal.textContent = `${val.toFixed(0)} Hz (${speedKmh} km/h)`;
        });

        this.dom.phaseNoiseSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            this.channelParams.phaseNoiseDeg = val;
            this.dom.phaseNoiseVal.textContent = `${val.toFixed(2)}°`;
        });

        this.dom.iqGainSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            this.channelParams.iqGainImbalanceDb = val;
            this.dom.iqGainVal.textContent = `${val.toFixed(2)} dB`;
        });

        this.dom.iqPhaseSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            this.channelParams.iqPhaseSkewDeg = val;
            this.dom.iqPhaseVal.textContent = `${val.toFixed(2)}°`;
        });

        this.dom.persistenceSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            this.scope.options.persistence = val;
            this.dom.persistenceVal.textContent = `${Math.round(val * 100)}%`;
        });

        // Presets
        this.renderPresets();

        // Testbench controls
        this.dom.runSweepBtn.addEventListener('click', () => this.runAutomatedSweep());
        this.dom.exportCsvBtn.addEventListener('click', () => this.testbench.exportCSV(this.modType));
        this.dom.exportJsonBtn.addEventListener('click', () => this.testbench.exportJSON(this.modType, this.channelParams));
    }

    renderPresets() {
        this.dom.presetsContainer.innerHTML = '';
        for (const preset of TEST_PRESETS) {
            const btn = document.createElement('button');
            btn.className = 'preset-btn';
            btn.innerHTML = `<strong>${preset.name}</strong><span>${preset.description.slice(0, 50)}...</span>`;
            btn.title = preset.description;
            btn.addEventListener('click', () => this.applyPreset(preset));
            this.dom.presetsContainer.appendChild(btn);
        }
    }

    applyPreset(preset) {
        const c = preset.config;
        this.modType = c.modType;
        this.dom.modSelect.value = c.modType;

        this.channelParams.snrDb = c.snrDb;
        this.dom.snrSlider.value = c.snrDb;
        this.dom.snrVal.textContent = `${c.snrDb.toFixed(1)} dB`;

        this.channelParams.enableFading = c.enableFading;
        this.dom.fadingToggle.checked = c.enableFading;
        this.dom.fadingControls.style.opacity = c.enableFading ? '1.0' : '0.4';

        this.channelParams.ricianKDb = c.ricianKDb;
        this.dom.ricianSlider.value = c.ricianKDb;
        this.dom.ricianVal.textContent = c.ricianKDb <= -29 ? 'Rayleigh' : `${c.ricianKDb.toFixed(1)} dB`;

        this.channelParams.dopplerHz = c.dopplerHz;
        this.dom.dopplerSlider.value = c.dopplerHz;
        const speedKmh = ((c.dopplerHz * 3e8) / (3.5e9 * 1000 / 3600)).toFixed(0);
        this.dom.dopplerVal.textContent = `${c.dopplerHz.toFixed(0)} Hz (${speedKmh} km/h)`;

        this.channelParams.phaseNoiseDeg = c.phaseNoiseDeg;
        this.dom.phaseNoiseSlider.value = c.phaseNoiseDeg;
        this.dom.phaseNoiseVal.textContent = `${c.phaseNoiseDeg.toFixed(2)}°`;

        this.channelParams.iqGainImbalanceDb = c.iqGainImbalanceDb;
        this.dom.iqGainSlider.value = c.iqGainImbalanceDb;
        this.dom.iqGainVal.textContent = `${c.iqGainImbalanceDb.toFixed(2)} dB`;

        this.channelParams.iqPhaseSkewDeg = c.iqPhaseSkewDeg;
        this.dom.iqPhaseSlider.value = c.iqPhaseSkewDeg;
        this.dom.iqPhaseVal.textContent = `${c.iqPhaseSkewDeg.toFixed(2)}°`;

        this.testbench.renderBerPlot(this.modType);
    }

    async runAutomatedSweep() {
        this.dom.runSweepBtn.disabled = true;
        this.dom.sweepProgressContainer.style.display = 'block';

        await this.testbench.runSweep(this.modType, this.channelParams, (pct, result) => {
            this.dom.sweepProgressBar.style.width = `${(pct * 100).toFixed(0)}%`;
        });

        this.dom.runSweepBtn.disabled = false;
        this.dom.exportCsvBtn.disabled = false;
        this.dom.exportJsonBtn.disabled = false;
        this.dom.sweepProgressContainer.style.display = 'none';
    }

    startStream() {
        const k = 4; // Nominally 4 bits/sym for PRBS chunk
        const rawBits = this.prbs.generateBits(this.symbolsPerFrame * 8);

        const loop = () => {
            // 1. Modulate
            const modOut = modulateBits(rawBits, this.modType);

            // 2. Channel Impairments
            const chanOut = this.channel.process(modOut.i, modOut.q, this.channelParams);

            // 3. Demodulate & Measure
            const demodOut = this.demod.slice(chanOut.i, chanOut.q, this.modType);
            const berData = RFDemodulator.computeBER(rawBits, demodOut.rxBits);

            // 4. Update Gauges
            this.dom.evmRmsGauge.textContent = `${demodOut.evmRms.toFixed(2)}%`;
            this.dom.evmPeakGauge.textContent = `${demodOut.evmPeak.toFixed(1)}%`;
            this.dom.merGauge.textContent = `${demodOut.merDb.toFixed(1)} dB`;
            this.dom.berGauge.textContent = berData.ber.toExponential(2);

            // 5. Check 3GPP TS 38.104 Compliance
            const limit = CONFORMANCE_LIMITS_3GPP[this.modType] || 15.0;
            const passes = demodOut.evmRms <= limit;
            if (passes) {
                this.dom.passFailBadge.className = 'badge badge-pass';
                this.dom.passFailBadge.textContent = '3GPP PASS';
                this.dom.complianceText.textContent = `EVM ${demodOut.evmRms.toFixed(2)}% <= Limit ${limit.toFixed(1)}%`;
            } else {
                this.dom.passFailBadge.className = 'badge badge-fail';
                this.dom.passFailBadge.textContent = '3GPP FAIL';
                this.dom.complianceText.textContent = `EVM ${demodOut.evmRms.toFixed(2)}% > Limit ${limit.toFixed(1)}%`;
            }

            // 6. Render Constellation Scope
            const alphabet = getConstellationAlphabet(this.modType);
            this.scope.render(chanOut.i, chanOut.q, alphabet);

            // 7. Update OFDM Grid Channel State
            this.ofdmGrid.updateChannelState(
                this.channelParams.enableFading,
                this.channelParams.ricianKDb,
                this.channelParams.dopplerHz
            );

            this.animationId = requestAnimationFrame(loop);
        };

        this.animationId = requestAnimationFrame(loop);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new RFStudioApp();

    setupFloatingHUD() {
        // 1. Drawer open/close
        const drawer = document.getElementById('telemetry-drawer');
        const backdrop = document.getElementById('telemetry-backdrop');
        const openDrawer = () => {
            drawer?.classList.add('open');
            backdrop?.classList.add('active');
        };
        const closeDrawer = () => {
            drawer?.classList.remove('open');
            backdrop?.classList.remove('active');
        };

        document.getElementById('btn-hud-settings')?.addEventListener('click', openDrawer);
        document.getElementById('btn-close-telemetry')?.addEventListener('click', closeDrawer);
        backdrop?.addEventListener('click', closeDrawer);

        // 2. Fullscreen Toggle
        const fsBtn = document.getElementById('btn-hud-fullscreen');
        fsBtn?.addEventListener('click', () => {
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen().catch(() => {
                        document.body.classList.toggle('immersive-fullscreen');
                    });
                } else if (document.documentElement.webkitRequestFullscreen) {
                    document.documentElement.webkitRequestFullscreen();
                } else {
                    document.body.classList.toggle('immersive-fullscreen');
                }
            } else {
                if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
                else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
                document.body.classList.remove('immersive-fullscreen');
            }
        });

        // 3. Pause Simulation Toggle
        let isPaused = false;
        const transPause = document.getElementById('btn-transport-pause');
        const railPause = document.getElementById('btn-rail-pause');
        const hudPauseIcon = document.getElementById('hud-pause-icon');
        const hudPauseLabel = document.getElementById('hud-pause-label');
        const railPauseIcon = document.getElementById('rail-pause-icon');

        const togglePause = () => {
            isPaused = !isPaused;
            const icon = isPaused ? '▶' : '⏸';
            const label = isPaused ? 'RESUME' : 'PAUSE';
            if (hudPauseIcon) hudPauseIcon.textContent = icon;
            if (hudPauseLabel) hudPauseLabel.textContent = label;
            if (railPauseIcon) railPauseIcon.textContent = icon;
            transPause?.classList.toggle('is-paused', isPaused);
            if (isPaused) {
                if (this.animationId) cancelAnimationFrame(this.animationId);
            } else {
                this.startStream();
            }
        };

        transPause?.addEventListener('click', togglePause);
        railPause?.addEventListener('click', togglePause);

        // 4. Modulation Selector
        const selectMod = document.getElementById('select-active-mod');
        const lblMod = document.getElementById('hud-mod-label');
        selectMod?.addEventListener('change', (e) => {
            const val = e.target.value;
            if (this.dom.modSelect) {
                this.dom.modSelect.value = val;
                this.dom.modSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (lblMod) lblMod.textContent = selectMod.options[selectMod.selectedIndex].text.split(' ')[0];
        });

        // 5. Mode Cards
        const cardAwgn = document.getElementById('hud-mode-awgn');
        const cardRayleigh = document.getElementById('hud-mode-rayleigh');
        const cardDoppler = document.getElementById('hud-mode-high-doppler');
        const cardSweep = document.getElementById('hud-mode-sweep');

        const setCardActive = (activeCard) => {
            [cardAwgn, cardRayleigh, cardDoppler].forEach(c => c?.classList.remove('active'));
            activeCard?.classList.add('active');
        };

        cardAwgn?.addEventListener('click', () => {
            setCardActive(cardAwgn);
            this.channelParams.snrDb = 28.0;
            this.channelParams.enableFading = false;
            this.channelParams.dopplerHz = 0.0;
            if (this.dom.snrSlider) this.dom.snrSlider.value = 28;
            if (this.dom.fadingToggle) this.dom.fadingToggle.checked = false;
            if (this.dom.dopplerSlider) this.dom.dopplerSlider.value = 0;
            updateSnr(28);
            updateDoppler(0);
        });

        cardRayleigh?.addEventListener('click', () => {
            setCardActive(cardRayleigh);
            this.channelParams.snrDb = 18.0;
            this.channelParams.enableFading = true;
            this.channelParams.ricianKDb = -100.0;
            this.channelParams.dopplerHz = 30.0;
            if (this.dom.snrSlider) this.dom.snrSlider.value = 18;
            if (this.dom.fadingToggle) this.dom.fadingToggle.checked = true;
            if (this.dom.dopplerSlider) this.dom.dopplerSlider.value = 30;
            updateSnr(18);
            updateDoppler(30);
        });

        cardDoppler?.addEventListener('click', () => {
            setCardActive(cardDoppler);
            this.channelParams.snrDb = 20.0;
            this.channelParams.enableFading = true;
            this.channelParams.dopplerHz = 150.0;
            if (this.dom.snrSlider) this.dom.snrSlider.value = 20;
            if (this.dom.fadingToggle) this.dom.fadingToggle.checked = true;
            if (this.dom.dopplerSlider) this.dom.dopplerSlider.value = 150;
            updateSnr(20);
            updateDoppler(150);
        });

        cardSweep?.addEventListener('click', () => {
            this.dom.runSweepBtn?.click();
            cardSweep.classList.add('active');
            setTimeout(() => cardSweep.classList.remove('active'), 2500);
        });

        // 6. SNR Rail (0 to 40 dB)
        const snrContainer = document.getElementById('snr-rail-container');
        const snrInput = document.getElementById('slider-snr-vertical');
        const snrFill = document.getElementById('snr-rail-fill');
        const snrThumb = document.getElementById('snr-rail-thumb');
        const snrPill = document.getElementById('val-snr-pill');

        const updateSnr = (val) => {
            const num = Math.max(0, Math.min(40, Math.round(val)));
            this.channelParams.snrDb = num;
            if (this.dom.snrSlider) this.dom.snrSlider.value = num;
            if (this.dom.snrVal) this.dom.snrVal.textContent = `${num} dB`;
            if (snrInput) snrInput.value = num;
            if (snrPill) snrPill.textContent = `${num} dB`;
            const pct = (num / 40) * 100;
            if (snrFill) snrFill.style.height = `${pct}%`;
            if (snrThumb) snrThumb.style.bottom = `${pct}%`;
        };

        snrInput?.addEventListener('input', (e) => updateSnr(parseFloat(e.target.value)));

        let dragSnr = false;
        const handleSnrPointer = (e) => {
            const rect = snrContainer.getBoundingClientRect();
            const frac = Math.max(0, Math.min(1, (rect.bottom - e.clientY) / rect.height));
            updateSnr(frac * 40);
        };
        snrContainer?.addEventListener('pointerdown', (e) => {
            dragSnr = true;
            snrContainer.setPointerCapture?.(e.pointerId);
            handleSnrPointer(e);
        });
        snrContainer?.addEventListener('pointermove', (e) => {
            if (dragSnr) handleSnrPointer(e);
        });
        const stopSnrDrag = (e) => {
            if (dragSnr) {
                dragSnr = false;
                try { snrContainer.releasePointerCapture?.(e.pointerId); } catch (_) {}
            }
        };
        snrContainer?.addEventListener('pointerup', stopSnrDrag);
        snrContainer?.addEventListener('pointercancel', stopSnrDrag);

        // 7. Doppler Rail (0 to 300 Hz)
        const dopplerContainer = document.getElementById('doppler-rail-container');
        const dopplerInput = document.getElementById('slider-doppler-vertical');
        const dopplerFill = document.getElementById('doppler-rail-fill');
        const dopplerThumb = document.getElementById('doppler-rail-thumb');
        const dopplerPill = document.getElementById('val-doppler-pill');

        const updateDoppler = (val) => {
            const num = Math.max(0, Math.min(300, Math.round(val)));
            this.channelParams.dopplerHz = num;
            if (this.dom.dopplerSlider) this.dom.dopplerSlider.value = num;
            if (this.dom.dopplerVal) this.dom.dopplerVal.textContent = `${num} Hz`;
            if (dopplerInput) dopplerInput.value = num;
            if (dopplerPill) dopplerPill.textContent = `${num} Hz`;
            const pct = (num / 300) * 100;
            if (dopplerFill) dopplerFill.style.height = `${pct}%`;
            if (dopplerThumb) dopplerThumb.style.bottom = `${pct}%`;
        };

        dopplerInput?.addEventListener('input', (e) => updateDoppler(parseFloat(e.target.value)));

        let dragDoppler = false;
        const handleDopplerPointer = (e) => {
            const rect = dopplerContainer.getBoundingClientRect();
            const frac = Math.max(0, Math.min(1, (rect.bottom - e.clientY) / rect.height));
            updateDoppler(frac * 300);
        };
        dopplerContainer?.addEventListener('pointerdown', (e) => {
            dragDoppler = true;
            dopplerContainer.setPointerCapture?.(e.pointerId);
            handleDopplerPointer(e);
        });
        dopplerContainer?.addEventListener('pointermove', (e) => {
            if (dragDoppler) handleDopplerPointer(e);
        });
        const stopDopplerDrag = (e) => {
            if (dragDoppler) {
                dragDoppler = false;
                try { dopplerContainer.releasePointerCapture?.(e.pointerId); } catch (_) {}
            }
        };
        dopplerContainer?.addEventListener('pointerup', stopDopplerDrag);
        dopplerContainer?.addEventListener('pointercancel', stopDopplerDrag);
    }

});
