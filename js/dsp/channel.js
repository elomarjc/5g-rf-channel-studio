/**
 * 5G/6G RF Channel & Constellation Studio
 * 3GPP Radio Propagation & Transceiver Impairments Engine
 */

export class RFChannel {
    constructor() {
        this.phaseAccumulator = 0.0;
        this.phaseNoiseState = 0.0;
    }

    static gaussianRandom(mean = 0, stdDev = 1) {
        let u1 = 0, u2 = 0;
        while (u1 === 0) u1 = Math.random();
        while (u2 === 0) u2 = Math.random();
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        return z0 * stdDev + mean;
    }

    process(iIn, qIn, params) {
        const N = iIn.length;
        const iOut = new Float32Array(N);
        const qOut = new Float32Array(N);

        const snrDb = params.snrDb !== undefined ? params.snrDb : 20.0;
        const enableFading = params.enableFading === true;
        const ricianKDb = params.ricianKDb !== undefined ? params.ricianKDb : -30.0;
        const dopplerHz = params.dopplerHz || 0.0;
        const phaseNoiseDeg = params.phaseNoiseDeg || 0.0;
        const iqGainImbalanceDb = params.iqGainImbalanceDb || 0.0;
        const iqPhaseSkewDeg = params.iqPhaseSkewDeg || 0.0;
        const dcOffsetI = params.dcOffsetI || 0.0;
        const dcOffsetQ = params.dcOffsetQ || 0.0;
        const symbolRate = params.symbolRate || 100000.0;

        // Fading parameters
        const K_linear = Math.pow(10, ricianKDb / 10.0);
        const directGain = Math.sqrt(K_linear / (K_linear + 1.0));
        const diffuseGain = Math.sqrt(1.0 / (K_linear + 1.0));

        // AWGN noise variance (Es = 1.0)
        const noiseStdDev = snrDb >= 80.0 ? 0.0 : Math.sqrt(1.0 / (2.0 * Math.pow(10, snrDb / 10.0)));

        // I/Q Imbalance parameters
        const gLinear = Math.pow(10, iqGainImbalanceDb / 20.0);
        const phiSkewRad = (iqPhaseSkewDeg * Math.PI) / 180.0;
        const cosSkew = Math.cos(phiSkewRad);
        const sinSkew = Math.sin(phiSkewRad);

        const phaseNoiseStdRad = (phaseNoiseDeg * Math.PI) / 180.0;
        const deltaThetaDoppler = (2.0 * Math.PI * dopplerHz) / symbolRate;

        for (let n = 0; n < N; n++) {
            let curI = iIn[n];
            let curQ = qIn[n];

            // 1. Fading (Rician / Rayleigh)
            if (enableFading) {
                const hDiffuseI = RFChannel.gaussianRandom(0, 1.0 / Math.SQRT2);
                const hDiffuseQ = RFChannel.gaussianRandom(0, 1.0 / Math.SQRT2);
                
                const hTotalI = directGain + diffuseGain * hDiffuseI;
                const hTotalQ = diffuseGain * hDiffuseQ;

                const fI = curI * hTotalI - curQ * hTotalQ;
                const fQ = curI * hTotalQ + curQ * hTotalI;
                curI = fI;
                curQ = fQ;
            }

            // 2. Doppler Frequency Shift
            if (dopplerHz !== 0.0) {
                this.phaseAccumulator += deltaThetaDoppler;
                if (this.phaseAccumulator > 2.0 * Math.PI) {
                    this.phaseAccumulator -= 2.0 * Math.PI;
                }
                const cosD = Math.cos(this.phaseAccumulator);
                const sinD = Math.sin(this.phaseAccumulator);
                const dI = curI * cosD - curQ * sinD;
                const dQ = curI * sinD + curQ * cosD;
                curI = dI;
                curQ = dQ;
            }

            // 3. Phase Noise
            if (phaseNoiseDeg > 0.0) {
                this.phaseNoiseState += RFChannel.gaussianRandom(0, phaseNoiseStdRad);
                this.phaseNoiseState *= 0.995;
                const cosPN = Math.cos(this.phaseNoiseState);
                const sinPN = Math.sin(this.phaseNoiseState);
                const pnI = curI * cosPN - curQ * sinPN;
                const pnQ = curI * sinPN + curQ * cosPN;
                curI = pnI;
                curQ = pnQ;
            }

            // 4. I/Q Imbalance
            if (iqGainImbalanceDb !== 0.0 || iqPhaseSkewDeg !== 0.0) {
                const imbI = gLinear * curI;
                const imbQ = (1.0 / gLinear) * (curI * sinSkew + curQ * cosSkew);
                curI = imbI;
                curQ = imbQ;
            }

            // 5. AWGN Noise
            if (noiseStdDev > 0.0) {
                curI += RFChannel.gaussianRandom(0, noiseStdDev);
                curQ += RFChannel.gaussianRandom(0, noiseStdDev);
            }

            // 6. DC Offset
            curI += dcOffsetI;
            curQ += dcOffsetQ;

            iOut[n] = curI;
            qOut[n] = curQ;
        }

        return { i: iOut, q: qOut, noiseStdDev };
    }
}
