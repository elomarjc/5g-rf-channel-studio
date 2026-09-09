/**
 * 5G/6G RF Channel & Constellation Studio
 * Maximum-Likelihood Demodulator, EVM/MER Analyzer, and Theoretical BER Engine
 */

import { MODULATION_TYPES, MODULATION_CONFIGS, getConstellationAlphabet } from './modulator.js';

export class RFDemodulator {
    constructor() {
        this.alphabetCache = {};
        for (const type of Object.values(MODULATION_TYPES)) {
            this.alphabetCache[type] = getConstellationAlphabet(type);
        }
    }

    /**
     * Hard-Decision Slicer: Maps received noisy points to closest ideal symbols.
     * Returns recovered bits, recovered ideal symbols, and error vector magnitude.
     */
    slice(iRecv, qRecv, modType) {
        const alphabet = this.alphabetCache[modType];
        const config = MODULATION_CONFIGS[modType];
        const k = config.bitsPerSymbol;
        const N = iRecv.length;

        const iIdeal = new Float32Array(N);
        const qIdeal = new Float32Array(N);
        const rxBits = new Uint8Array(N * k);

        let sumErrorSq = 0.0;
        let sumIdealPower = 0.0;
        let peakErrorSq = 0.0;

        for (let n = 0; n < N; n++) {
            const rxI = iRecv[n];
            const rxQ = qRecv[n];

            // Nearest neighbor search in Euclidean distance
            let minDistSq = Infinity;
            let bestSymbol = alphabet[0];

            for (let a = 0; a < alphabet.length; a++) {
                const pt = alphabet[a];
                const dI = rxI - pt.i;
                const dQ = rxQ - pt.q;
                const distSq = dI * dI + dQ * dQ;
                if (distSq < minDistSq) {
                    minDistSq = distSq;
                    bestSymbol = pt;
                }
            }

            iIdeal[n] = bestSymbol.i;
            qIdeal[n] = bestSymbol.q;

            const errSq = minDistSq;
            sumErrorSq += errSq;
            if (errSq > peakErrorSq) peakErrorSq = errSq;

            const idealPwr = bestSymbol.i * bestSymbol.i + bestSymbol.q * bestSymbol.q;
            sumIdealPower += (idealPwr > 0 ? idealPwr : 1.0);

            // Extract bits from symbol integer
            const symInt = bestSymbol.symbolInt;
            const bitOffset = n * k;
            for (let b = 0; b < k; b++) {
                rxBits[bitOffset + (k - 1 - b)] = (symInt >> b) & 1;
            }
        }

        // EVM Calculations (3GPP TS 38.104 standard)
        const evmRms = Math.sqrt(sumErrorSq / (sumIdealPower > 0 ? sumIdealPower : N)) * 100.0;
        const evmPeak = Math.sqrt(peakErrorSq) * 100.0;
        const merDb = sumErrorSq > 0 ? 10.0 * Math.log10(sumIdealPower / sumErrorSq) : 50.0;

        return {
            iIdeal,
            qIdeal,
            rxBits,
            evmRms,
            evmPeak,
            merDb
        };
    }

    /**
     * Compute Bit Error Rate between transmitted and demodulated bits
     */
    static computeBER(txBits, rxBits) {
        const len = Math.min(txBits.length, rxBits.length);
        let errors = 0;
        for (let i = 0; i < len; i++) {
            if (txBits[i] !== rxBits[i]) {
                errors++;
            }
        }
        return {
            bitErrors: errors,
            totalBits: len,
            ber: len > 0 ? errors / len : 0.0
        };
    }

    /**
     * Complementary Error Function (erfc) approximation
     * Abramowitz and Stegun 7.1.26 (max error < 1.5e-7)
     */
    static erfc(x) {
        if (x < 0) return 2.0 - RFDemodulator.erfc(-x);
        const p = 0.3275911;
        const a1 = 0.254829592;
        const a2 = -0.284496736;
        const a3 = 1.421413741;
        const a4 = -1.453152027;
        const a5 = 1.061405429;

        const t = 1.0 / (1.0 + p * x);
        const poly = t * (a1 + t * (a2 + t * (a3 + t * (a4 + t * a5))));
        return poly * Math.exp(-x * x);
    }

    /**
     * Q-function: Q(x) = 0.5 * erfc(x / sqrt(2))
     */
    static qFunction(x) {
        if (x <= 0) return 0.5;
        return 0.5 * RFDemodulator.erfc(x / Math.SQRT2);
    }

    /**
     * Theoretical AWGN Bit Error Rate calculations
     */
    static theoreticalBer(modType, snrDb) {
        const snrLinear = Math.pow(10, snrDb / 10.0);
        const config = MODULATION_CONFIGS[modType];
        const k = config.bitsPerSymbol;
        const ebNoLinear = snrLinear / k;

        if (modType === MODULATION_TYPES.BPSK || modType === MODULATION_TYPES.QPSK) {
            // Pb = Q(sqrt(2 * Eb/N0))
            return RFDemodulator.qFunction(Math.sqrt(2.0 * ebNoLinear));
        }

        const M = 1 << k;
        const sqrtM = Math.round(Math.sqrt(M));
        // Rectangular Gray-coded M-QAM union bound approximation:
        // Pb ~ 4/k * (1 - 1/sqrt(M)) * Q(sqrt(3 * k * Eb / ((M - 1) * N0)))
        const scale = (4.0 / k) * (1.0 - 1.0 / sqrtM);
        const arg = Math.sqrt((3.0 * k * ebNoLinear) / (M - 1.0));
        return Math.min(1.0, scale * RFDemodulator.qFunction(arg));
    }
}
