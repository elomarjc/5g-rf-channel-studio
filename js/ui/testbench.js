/**
 * 5G/6G RF Channel & Constellation Studio
 * 3GPP TS 38.104 Automated Conformance Testbench & Dataset Exporter
 */

import { MODULATION_TYPES, PRBS15, modulateBits } from '../dsp/modulator.js';
import { RFChannel } from '../dsp/channel.js';
import { RFDemodulator } from '../dsp/demodulator.js';

export const CONFORMANCE_LIMITS_3GPP = {
    [MODULATION_TYPES.QPSK]: 17.5,   // <= 17.5% RMS EVM
    [MODULATION_TYPES.QAM16]: 12.5,  // <= 12.5% RMS EVM
    [MODULATION_TYPES.QAM64]: 8.0,   // <= 8.0% RMS EVM
    [MODULATION_TYPES.QAM256]: 3.5,  // <= 3.5% RMS EVM
    [MODULATION_TYPES.BPSK]: 20.0
};

export class ConformanceTestbench {
    constructor(berCanvas, callbacks = {}) {
        this.berCanvas = berCanvas;
        this.ctx = berCanvas.getContext('2d');
        this.callbacks = callbacks;
        this.isRunning = false;
        this.testResults = [];
        this.resize();
    }

    resize() {
        const rect = this.berCanvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.width = rect.width || 450;
        this.height = rect.height || 220;
        this.berCanvas.width = this.width * dpr;
        this.berCanvas.height = this.height * dpr;
        this.ctx.scale(dpr, dpr);
    }

    checkCompliance(modType, evmRms) {
        const limit = CONFORMANCE_LIMITS_3GPP[modType] || 15.0;
        const passes = evmRms <= limit;
        return {
            passes,
            evmRms,
            limit,
            margin: limit - evmRms
        };
    }

    async runSweep(modType, currentChannelParams, onProgress) {
        if (this.isRunning) return;
        this.isRunning = true;
        this.testResults = [];

        const prbs = new PRBS15(0x9A41);
        const channel = new RFChannel();
        const demod = new RFDemodulator();
        const bitsPerStep = 60000;
        const txBits = prbs.generateBits(bitsPerStep);
        const mod = modulateBits(txBits, modType);

        // Sweep SNR from 0 dB to 24 dB in 2 dB steps
        const snrSteps = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];

        for (let i = 0; i < snrSteps.length; i++) {
            const snr = snrSteps[i];
            const testParams = {
                ...currentChannelParams,
                snrDb: snr
            };

            const chanOut = channel.process(mod.i, mod.q, testParams);
            const demodOut = demod.slice(chanOut.i, chanOut.q, modType);
            const berData = RFDemodulator.computeBER(txBits, demodOut.rxBits);
            const theoBer = RFDemodulator.theoreticalBer(modType, snr);
            const compliance = this.checkCompliance(modType, demodOut.evmRms);

            const result = {
                snrDb: snr,
                evmRms: demodOut.evmRms,
                evmPeak: demodOut.evmPeak,
                merDb: demodOut.merDb,
                empiricalBer: berData.ber,
                theoreticalBer: theoBer,
                bitErrors: berData.bitErrors,
                totalBits: berData.totalBits,
                passes3GPP: compliance.passes
            };

            this.testResults.push(result);
            this.renderBerPlot(modType);

            if (onProgress) {
                onProgress((i + 1) / snrSteps.length, result);
            }

            // Yield to browser UI thread
            await new Promise(r => setTimeout(r, 40));
        }

        this.isRunning = false;
        return this.testResults;
    }

    renderBerPlot(modType) {
        const ctx = this.ctx;
        ctx.fillStyle = '#060b13';
        ctx.fillRect(0, 0, this.width, this.height);

        const padLeft = 45;
        const padRight = 15;
        const padTop = 15;
        const padBottom = 25;
        const plotW = this.width - padLeft - padRight;
        const plotH = this.height - padTop - padBottom;

        // Grid lines (Logarithmic Y-axis from 10^0 down to 10^-5)
        const logMin = -5;
        const logMax = 0;
        const snrMin = 0;
        const snrMax = 24;

        ctx.strokeStyle = 'rgba(35, 60, 90, 0.4)';
        ctx.lineWidth = 1;
        ctx.font = '9px "JetBrains Mono", monospace';

        for (let logY = logMax; logY >= logMin; logY--) {
            const y = padTop + ((logMax - logY) / (logMax - logMin)) * plotH;
            ctx.beginPath();
            ctx.moveTo(padLeft, y);
            ctx.lineTo(this.width - padRight, y);
            ctx.stroke();

            ctx.fillStyle = 'rgba(0, 200, 255, 0.5)';
            ctx.fillText(`10^${logY}`, 8, y + 3);
        }

        // X-axis (SNR dB)
        for (let snr = snrMin; snr <= snrMax; snr += 4) {
            const x = padLeft + ((snr - snrMin) / (snrMax - snrMin)) * plotW;
            ctx.beginPath();
            ctx.moveTo(x, padTop);
            ctx.lineTo(x, this.height - padBottom);
            ctx.stroke();

            ctx.fillStyle = 'rgba(0, 200, 255, 0.5)';
            ctx.fillText(`${snr}dB`, x - 8, this.height - 8);
        }

        // Draw Theoretical AWGN Curve
        ctx.save();
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();

        let first = true;
        for (let snr = snrMin; snr <= snrMax; snr += 0.5) {
            const theo = Math.max(1e-5, RFDemodulator.theoreticalBer(modType, snr));
            const logVal = Math.log10(theo);
            const x = padLeft + ((snr - snrMin) / (snrMax - snrMin)) * plotW;
            const y = padTop + ((logMax - logVal) / (logMax - logMin)) * plotH;

            if (first) {
                ctx.moveTo(x, y);
                first = false;
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
        ctx.restore();

        // Draw Empirical Sweep Points
        if (this.testResults.length > 0) {
            ctx.save();
            ctx.strokeStyle = '#ff0055';
            ctx.fillStyle = '#ff0055';
            ctx.lineWidth = 2;
            ctx.beginPath();

            for (let i = 0; i < this.testResults.length; i++) {
                const res = this.testResults[i];
                const berClamped = Math.max(1e-5, res.empiricalBer);
                const logVal = Math.log10(berClamped);
                const x = padLeft + ((res.snrDb - snrMin) / (snrMax - snrMin)) * plotW;
                const y = padTop + ((logMax - logVal) / (logMax - logMin)) * plotH;

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);

                ctx.fillRect(x - 2.5, y - 2.5, 5, 5);
            }
            ctx.stroke();
            ctx.restore();
        }

        // Legend
        ctx.fillStyle = '#00ffff';
        ctx.fillText('--- Theory (AWGN)', this.width - 125, padTop + 12);
        ctx.fillStyle = '#ff0055';
        ctx.fillText('■ Empirical Sweep', this.width - 125, padTop + 24);
    }

    exportCSV(modType) {
        if (this.testResults.length === 0) return;
        let csv = 'Timestamp,Modulation,SNR_dB,EVM_RMS_Pct,EVM_Peak_Pct,MER_dB,BitErrors,TotalBits,Empirical_BER,Theoretical_BER,3GPP_Status\n';
        const now = new Date().toISOString();

        for (const r of this.testResults) {
            csv += `${now},${modType},${r.snrDb},${r.evmRms.toFixed(3)},${r.evmPeak.toFixed(3)},${r.merDb.toFixed(2)},${r.bitErrors},${r.totalBits},${r.empiricalBer.toExponential(4)},${r.theoreticalBer.toExponential(4)},${r.passes3GPP ? 'PASS' : 'FAIL'}\n`;
        }

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Keysight_3GPP_Conformance_${modType}_${Date.now()}.csv`;
        a.click();
    }

    exportJSON(modType, activeParams) {
        const dataset = {
            instrument: 'High-Precision 5G/6G VSA Digital Channel Emulator',
            standard: '3GPP TS 38.104 Conformance Verification',
            timestamp: new Date().toISOString(),
            modulation: modType,
            channelConfiguration: activeParams,
            sweepResults: this.testResults
        };

        const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Keysight_Dataset_${modType}_${Date.now()}.json`;
        a.click();
    }
}
