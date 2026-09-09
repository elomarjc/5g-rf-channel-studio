/**
 * 5G/6G RF Channel & Constellation Studio
 * Core Digital Modulation & Symbol Mapping Engine
 * 
 * Supports Gray-coded BPSK, QPSK, 16-QAM, 64-QAM, and 256-QAM
 * with precise average symbol energy normalization (Es = 1.0).
 */

export const MODULATION_TYPES = {
    BPSK: 'BPSK',
    QPSK: 'QPSK',
    QAM16: '16-QAM',
    QAM64: '64-QAM',
    QAM256: '256-QAM'
};

export const MODULATION_CONFIGS = {
    [MODULATION_TYPES.BPSK]: {
        name: 'BPSK',
        bitsPerSymbol: 1,
        levels: [-1, 1],
        normalization: 1.0,
        grayMap: [0, 1]
    },
    [MODULATION_TYPES.QPSK]: {
        name: 'QPSK',
        bitsPerSymbol: 2,
        levels: [-1, 1],
        normalization: 1.0 / Math.SQRT2,
        gray1D: [0, 1]
    },
    [MODULATION_TYPES.QAM16]: {
        name: '16-QAM',
        bitsPerSymbol: 4,
        levels: [-3, -1, 1, 3],
        normalization: 1.0 / Math.sqrt(10),
        gray1D: [0b00, 0b01, 0b11, 0b10]
    },
    [MODULATION_TYPES.QAM64]: {
        name: '64-QAM',
        bitsPerSymbol: 6,
        levels: [-7, -5, -3, -1, 1, 3, 5, 7],
        normalization: 1.0 / Math.sqrt(42),
        gray1D: [0b000, 0b001, 0b011, 0b010, 0b110, 0b111, 0b101, 0b100]
    },
    [MODULATION_TYPES.QAM256]: {
        name: '256-QAM',
        bitsPerSymbol: 8,
        levels: [-15, -13, -11, -9, -7, -5, -3, -1, 1, 3, 5, 7, 9, 11, 13, 15],
        normalization: 1.0 / Math.sqrt(170),
        gray1D: [
            0b0000, 0b0001, 0b0011, 0b0010,
            0b0110, 0b0111, 0b0101, 0b0100,
            0b1100, 0b1101, 0b1111, 0b1110,
            0b1010, 0b1011, 0b1001, 0b1000
        ]
    }
};

export function getConstellationAlphabet(modType) {
    const config = MODULATION_CONFIGS[modType];
    const points = [];

    if (modType === MODULATION_TYPES.BPSK) {
        return [
            { i: -1.0, q: 0.0, symbolInt: 0 },
            { i: 1.0, q: 0.0, symbolInt: 1 }
        ];
    }

    const levels = config.levels;
    const gray1D = config.gray1D;
    const norm = config.normalization;
    const bitsPerAxis = config.bitsPerSymbol / 2;

    for (let row = 0; row < levels.length; row++) {
        for (let col = 0; col < levels.length; col++) {
            const iVal = levels[col] * norm;
            const qVal = levels[row] * norm;
            const iBits = gray1D[col];
            const qBits = gray1D[row];
            const symbolInt = (iBits << bitsPerAxis) | qBits;
            
            points.push({
                i: iVal,
                q: qVal,
                symbolInt: symbolInt
            });
        }
    }
    return points;
}

export class PRBS15 {
    constructor(seed = 0x4A80) {
        this.state = seed & 0x7FFF;
        if (this.state === 0) this.state = 0x4A80;
    }

    nextBit() {
        const newBit = ((this.state >> 14) ^ (this.state >> 13)) & 1;
        this.state = ((this.state << 1) | newBit) & 0x7FFF;
        return newBit;
    }

    generateBits(count) {
        const bits = new Uint8Array(count);
        for (let i = 0; i < count; i++) {
            bits[i] = this.nextBit();
        }
        return bits;
    }
}

export function modulateBits(bits, modType) {
    const config = MODULATION_CONFIGS[modType];
    const k = config.bitsPerSymbol;
    const numSymbols = Math.floor(bits.length / k);
    const iArr = new Float32Array(numSymbols);
    const qArr = new Float32Array(numSymbols);

    if (modType === MODULATION_TYPES.BPSK) {
        for (let s = 0; s < numSymbols; s++) {
            iArr[s] = bits[s] === 1 ? 1.0 : -1.0;
            qArr[s] = 0.0;
        }
        return { i: iArr, q: qArr, numSymbols };
    }

    const norm = config.normalization;
    const levels = config.levels;
    const gray1D = config.gray1D;
    const bitsPerAxis = k / 2;

    const grayToLevel = new Int8Array(1 << bitsPerAxis);
    for (let idx = 0; idx < levels.length; idx++) {
        grayToLevel[gray1D[idx]] = levels[idx];
    }

    let bitIdx = 0;
    for (let s = 0; s < numSymbols; s++) {
        let iBits = 0;
        for (let b = 0; b < bitsPerAxis; b++) {
            iBits = (iBits << 1) | bits[bitIdx++];
        }
        let qBits = 0;
        for (let b = 0; b < bitsPerAxis; b++) {
            qBits = (qBits << 1) | bits[bitIdx++];
        }

        iArr[s] = grayToLevel[iBits] * norm;
        qArr[s] = grayToLevel[qBits] * norm;
    }

    return { i: iArr, q: qArr, numSymbols };
}
