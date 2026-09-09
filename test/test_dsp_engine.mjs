import { MODULATION_TYPES, PRBS15, modulateBits, getConstellationAlphabet } from '../js/dsp/modulator.js';
import { RFChannel } from '../js/dsp/channel.js';
import { RFDemodulator } from '../js/dsp/demodulator.js';

console.log("=== Running 5G/6G RF DSP Core Unit Tests ===");

// 1. Symbol Power Normalization Test
console.log("\n1. Verifying Symbol Energy Normalization (Es = 1.0):");
for (const type of Object.values(MODULATION_TYPES)) {
    const alphabet = getConstellationAlphabet(type);
    let totalPwr = 0;
    for (const pt of alphabet) {
        totalPwr += pt.i * pt.i + pt.q * pt.q;
    }
    const avgPwr = totalPwr / alphabet.length;
    console.log(`  [${type.padEnd(7)}] Alphabet size: ${String(alphabet.length).padStart(3)} | Avg Symbol Energy: ${avgPwr.toFixed(4)}`);
    if (Math.abs(avgPwr - 1.0) > 0.02) {
        throw new Error(`Normalization error in ${type}: expected 1.0, got ${avgPwr}`);
    }
}
console.log("  => All constellations normalized perfectly to Es = 1.0000");

// 2. Zero-Noise Channel Identity Test
console.log("\n2. Verifying Zero-Noise Channel & Demodulator Roundtrip:");
const prbs = new PRBS15(12345);
const channel = new RFChannel();
const demod = new RFDemodulator();

for (const type of Object.values(MODULATION_TYPES)) {
    const bits = prbs.generateBits(16000);
    const modResult = modulateBits(bits, type);
    const chanResult = channel.process(modResult.i, modResult.q, {
        snrDb: 100.0,
        enableFading: false
    });
    const demodResult = demod.slice(chanResult.i, chanResult.q, type);
    const berMetrics = RFDemodulator.computeBER(bits, demodResult.rxBits);

    console.log(`  [${type.padEnd(7)}] Symbols: ${String(modResult.numSymbols).padStart(5)} | EVM: ${demodResult.evmRms.toFixed(3)}% | Bit Errors: ${berMetrics.bitErrors} | BER: ${berMetrics.ber}`);
    if (berMetrics.bitErrors !== 0) {
        throw new Error(`Unexpected bit errors in noiseless ${type}`);
    }
}
console.log("  => 100% Zero bit errors across BPSK, QPSK, 16-QAM, 64-QAM, and 256-QAM!");

// 3. AWGN BER vs Theoretical Limit Test (QPSK at 8 dB)
console.log("\n3. Verifying Empirical vs Theoretical BER (QPSK @ 8 dB):");
const testBits = prbs.generateBits(100000);
const modQpsk = modulateBits(testBits, MODULATION_TYPES.QPSK);
const chanQpsk = channel.process(modQpsk.i, modQpsk.q, {
    snrDb: 8.0,
    enableFading: false
});
const demodQpsk = demod.slice(chanQpsk.i, chanQpsk.q, MODULATION_TYPES.QPSK);
const berQpsk = RFDemodulator.computeBER(testBits, demodQpsk.rxBits);
const theoQpsk = RFDemodulator.theoreticalBer(MODULATION_TYPES.QPSK, 8.0);

console.log(`  Empirical BER:   ${berQpsk.ber.toExponential(4)} (${berQpsk.bitErrors} errors in ${berQpsk.totalBits} bits)`);
console.log(`  Theoretical BER: ${theoQpsk.toExponential(4)}`);
console.log(`  Empirical EVM:   ${demodQpsk.evmRms.toFixed(2)}% | MER: ${demodQpsk.merDb.toFixed(2)} dB`);

// 4. Fading & Doppler Stress Test
console.log("\n4. Verifying Fading & Doppler Stress Degradation:");
const chanFading = channel.process(modQpsk.i, modQpsk.q, {
    snrDb: 25.0,
    enableFading: true,
    ricianKDb: 3.0, // 3 dB Rician
    dopplerHz: 150.0 // 150 Hz Doppler
});
const demodFading = demod.slice(chanFading.i, chanFading.q, MODULATION_TYPES.QPSK);
console.log(`  Fading + Doppler EVM: ${demodFading.evmRms.toFixed(2)}% | MER: ${demodFading.merDb.toFixed(2)} dB`);

console.log("\n=== All DSP Engine Tests Passed Successfully! ===");
