/**
 * 5G/6G RF Channel & Constellation Studio
 * Industry Test Scenarios & Conformance Presets
 * Inspired by physical-layer RF testbench R&D testing challenges
 */

import { MODULATION_TYPES } from './dsp/modulator.js';

export const TEST_PRESETS = [
    {
        id: 'clean_lab',
        name: 'Clean Lab Baseline',
        description: 'AWGN conformance baseline at 28 dB SNR with zero multipath or Doppler. Used for transmitter RF calibration.',
        config: {
            modType: MODULATION_TYPES.QAM64,
            snrDb: 28.0,
            enableFading: false,
            ricianKDb: 30.0,
            dopplerHz: 0.0,
            phaseNoiseDeg: 0.0,
            iqGainImbalanceDb: 0.0,
            iqPhaseSkewDeg: 0.0
        }
    },
    {
        id: 'high_speed_train',
        name: 'High-Speed Train (300 km/h)',
        description: '3GPP High-Speed Train scenario at 3.5 GHz (fd ~ 972 Hz). Severe Doppler shift and carrier rotation stress-testing carrier tracking loops.',
        config: {
            modType: MODULATION_TYPES.QPSK,
            snrDb: 18.0,
            enableFading: true,
            ricianKDb: 6.0,
            dopplerHz: 972.0,
            phaseNoiseDeg: 0.8,
            iqGainImbalanceDb: 0.2,
            iqPhaseSkewDeg: 0.5
        }
    },
    {
        id: 'dense_urban_nlos',
        name: 'Dense Urban NLOS (Rayleigh Fading)',
        description: 'Non-line-of-sight urban canyon with severe multi-path scattering and deep fading notches. Tests receiver equalizer resilience.',
        config: {
            modType: MODULATION_TYPES.QAM16,
            snrDb: 14.0,
            enableFading: true,
            ricianKDb: -30.0, // Pure Rayleigh
            dopplerHz: 80.0,
            phaseNoiseDeg: 1.2,
            iqGainImbalanceDb: 0.4,
            iqPhaseSkewDeg: 1.0
        }
    },
    {
        id: 'sub_thz_6g',
        name: 'Sub-THz 6G / mmWave Stress',
        description: 'Next-generation 140 GHz D-Band link with severe local oscillator phase noise and RF mixer I/Q imbalance.',
        config: {
            modType: MODULATION_TYPES.QAM256,
            snrDb: 24.0,
            enableFading: false,
            ricianKDb: 30.0,
            dopplerHz: 15.0,
            phaseNoiseDeg: 3.8, // High phase noise
            iqGainImbalanceDb: 1.2, // 1.2 dB gain skew
            iqPhaseSkewDeg: 4.5 // 4.5 deg quadrature error
        }
    }
];
