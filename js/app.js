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
});
