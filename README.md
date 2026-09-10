# 📡 5G/6G RF Channel & Constellation Studio

<div align="center">

### Interactive Physical-Layer (PHY) Channel Emulator & Automated 3GPP TS 38.104 Conformance Testbench
**Developed by Jacob El-Omar • M.Sc. in Electronic Systems, Aalborg University (AAU)**

[![Live Demo](https://img.shields.io/badge/Live_Demo-Interactive_Web_Instrument-00ffc8?style=for-the-badge&logo=google-chrome&logoColor=black)](https://elomarjc.github.io/5g-rf-channel-studio/)
[![3GPP Standard](https://img.shields.io/badge/Standard-3GPP_TS_38.104_Release_18-00aaff?style=for-the-badge)](https://www.3gpp.org)
[![Target](https://img.shields.io/badge/Target_Domain-Keysight_Technologies_R%26D-ffaa00?style=for-the-badge)](https://www.keysight.com)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

[**🚀 Launch Live WebApp Instrument**](https://elomarjc.github.io/5g-rf-channel-studio/) • [**Mathematical Formulations**](#-mathematical-foundations--channel-physics) • [**Keysight R&D Context**](#-solving-the-telecom-testing-challenge) • [**Conformance Suite**](#-3gpp-ts-38104-automated-conformance-matrix)

</div>

---

## 🎯 Solving the Telecom Testing Challenge

### The Industry Problem
In next-generation cellular design (5G NR Release 18 and emerging sub-THz 6G networks), telecommunications equipment manufacturers and test houses (such as **Keysight Technologies**, Ericsson, and Nokia) must validate whether user equipment (UE) and gNodeB base stations can maintain reliable connectivity under severe real-world radio propagation environments.

Traditionally, evaluating physical-layer degradation requires multi-gigabyte, closed-source, Windows-only desktop software suites or multi-million dollar hardware channel emulators (e.g. Keysight PROPSIM). Test and R&D engineers lack lightweight, open, zero-install instruments to:
1. Rapidly prototype and visualize radio impairments in real time (multipath fading, high-speed Doppler, oscillator phase noise).
2. Stress-test digital modulation schemes up to **256-QAM** under controlled RF degradations.
3. Automatically execute compliance verification sweeps against **3GPP TS 38.104 EVM limits** and export structured datasets for AI/ML post-processing.

### The Solution: 5G/6G RF Channel Studio
This project provides an open-source, high-performance physical-layer emulator running natively in any modern web browser at **60 FPS** with **zero dependencies and zero installation**. 

It was architected specifically to solve the active engineering needs outlined in Keysight Technologies' Aalborg R&D division:
* **Automated Test Execution**: Full-range Monte Carlo Signal-to-Noise Ratio (SNR) sweeps.
* **Signal Degradation Modeling**: Mathematically rigorous Clarke/Jakes multipath fading, Doppler frequency shifts up to 300+ km/h, and transceiver mixer I/Q imbalance.
* **Real-Time Instrumentation**: Digital phosphor persistence I/Q vector signal analyzer (VSA) scope and interactive 5G NR Orthogonal Frequency-Division Multiplexing (OFDM) resource grid.
* **Dataset Generation**: One-click export to **Keysight PathWave-compatible CSV** and structured **JSON datasets** for offline data science and deep-learning channel estimation.

---

## 🌟 Key Features

| Instrument Subsystem | Engineering Capabilities |
| :--- | :--- |
| **Digital Modulation Engine** | • Gray-coded symbol mapping for **BPSK, QPSK (4-QAM), 16-QAM, 64-QAM, and 256-QAM**.<br/>• Exact symbol energy normalization ($E_s = 1.0000$) across all constellation sizes.<br/>• Integrated ITU/3GPP PRBS-15 pseudo-random binary sequence bitstream generator. |
| **3GPP Radio Channel Models** | • **Rayleigh & Rician Multipath Fading**: Continuous Gaussian diffuse scattering with tunable Line-of-Sight (LOS) Rician $K$-factor ($-30\text{ dB}$ to $+15\text{ dB}$).<br/>• **Doppler Frequency Shift**: Simulates vehicle and high-speed rail mobility up to $300+\text{ km/h}$ at $3.5\text{ GHz}$ mid-band.<br/>• **Local Oscillator (LO) Phase Noise**: Brownian motion phase jitter modeling high-frequency RF downconversion.<br/>• **Mixer I/Q Imbalance**: Independent gain mismatch ($\pm 3\text{ dB}$) and quadrature phase orthogonality skew ($\pm 10^\circ$).<br/>• **AWGN Channel**: Box-Muller normal distribution parameterized by $E_b/N_0$ and SNR. |
| **Digital Phosphor VSA Scope** | • 60 FPS HTML5 Canvas coordinate transformation engine with adjustable exponential **phosphor persistence decay** (recreating analog CRT / digital oscilloscope phosphor response).<br/>• Real-time digital readouts: **RMS EVM (%)**, **Peak EVM (%)**, **Modulation Error Ratio (MER in dB)**, and **Bit Error Rate (BER)**. |
| **5G NR OFDM Resource Grid** | • Interactive 2D time-frequency grid: 14 OFDM Symbols (time) $\times$ 24 Subcarriers (frequency across 2 Physical Resource Blocks).<br/>• Resource Elements (REs) categorized by **PDSCH Data**, **DMRS Pilots**, **CSI-RS**, and **Guard Bands**.<br/>• Real-time channel attenuation heatmaps with interactive click inspection. |
| **Automated Conformance Suite** | • One-click automated Monte Carlo BER vs. $E_b/N_0$ sweep across 13 test points.<br/>• Dynamic rendering of empirical test curves over **closed-form theoretical AWGN benchmarks** ($Q$-function / $\text{erfc}$).<br/>• Automated **3GPP TS 38.104 Pass/Fail compliance badge**.<br/>• Export to formatted CSV log and JSON dataset. |

---

## 📐 Mathematical Foundations & Channel Physics

### 1. Constellation Energy Normalization
To ensure fair Bit Error Rate comparisons across modulation orders, constellations are scaled by normalization constant $C_{\text{norm}}$ such that the average symbol energy $E_s = 1$:

$$
\mathcal{S}_{\text{norm}} = C_{\text{norm}} \cdot \{ I + j Q \}, \quad \mathbb{E}[\lvert \mathcal{S}_{\text{norm}} \rvert^2] = 1
$$

| Modulation Scheme | Bits/Symbol ($k$) | Unscaled Levels | Normalization Factor ($C_{\text{norm}}$) |
| :--- | :---: | :---: | :---: |
| **BPSK** | 1 | $\{\pm 1\}$ | $1.0$ |
| **QPSK** | 2 | $\{\pm 1\}$ | $\frac{1}{\sqrt{2}} \approx 0.7071$ |
| **16-QAM** | 4 | $\{\pm 1, \pm 3\}$ | $\frac{1}{\sqrt{10}} \approx 0.3162$ |
| **64-QAM** | 6 | $\{\pm 1, \dots, \pm 7\}$ | $\frac{1}{\sqrt{42}} \approx 0.1543$ |
| **256-QAM** | 8 | $\{\pm 1, \dots, \pm 15\}$ | $\frac{1}{\sqrt{170}} \approx 0.0767$ |

### 2. Clarke's Isotropic Rayleigh & Rician Fading
In non-line-of-sight (NLOS) conditions, received multi-path waves combine destructively and constructively according to Clarke's isotropic 2D scattering model:

$$
h_{\text{NLOS}}[n] = \frac{1}{\sqrt{2}} \left( X[n] + j Y[n] \right), \quad X, Y \sim \mathcal{N}(0, 1)
$$

Under Rician fading (presence of a dominant specular Line-of-Sight component), the composite channel transfer coefficient is:

$$
h[n] = \sqrt{\frac{K}{K + 1}} + \sqrt{\frac{1}{K + 1}} h_{\text{NLOS}}[n]
$$

where $K = 10^{K_{\text{dB}} / 10}$ is the Rician $K$-factor.

### 3. Doppler Frequency Rotation
A mobile terminal moving at velocity $v$ relative to a carrier wavelength $\lambda = c / f_c$ experiences maximum Doppler shift $f_d = v / \lambda$. Over sampling interval $T_s$, the received signal acquires a continuous phase rotation:

$$
\theta[n] = \theta[n-1] + 2\pi f_d T_s
$$

$$
r_{\text{Doppler}}[n] = s[n] \cdot e^{j \theta[n]}
$$

### 4. 3GPP Error Vector Magnitude (EVM)
The Error Vector Magnitude measures the root-mean-square displacement of received constellation coordinates $r[n]$ from ideal symbol locations $s_{\text{ideal}}[n]$:

$$
\text{EVM}_{\text{RMS}} = \sqrt{\frac{\frac{1}{N}\sum_{n=1}^N \lvert r[n] - s_{\text{ideal}}[n] \rvert^2}{\frac{1}{N}\sum_{n=1}^N \lvert s_{\text{ideal}}[n] \rvert^2}} \times 100\%
$$

$$
\text{MER}_{\text{dB}} = 10 \log_{10}\left( \frac{\sum \lvert s_{\text{ideal}} \rvert^2}{\sum \lvert r - s_{\text{ideal}} \rvert^2} \right) = -20 \log_{10}\left(\frac{\text{EVM}_{\text{RMS}}}{100}\right)
$$

## 📊 3GPP TS 38.104 Automated Conformance Matrix

The webapp automatically tests EVM against official **3GPP TS 38.104 Release 18** transmitter minimum requirements:

| Modulation Scheme | 3GPP TS 38.104 Max EVM | Testbench Conformance Logic |
| :---: | :---: | :---: |
| **QPSK** | **17.5%** | $\text{EVM}_{\text{RMS}} \le 17.5\%$ → **PASS** |
| **16-QAM** | **12.5%** | $\text{EVM}_{\text{RMS}} \le 12.5\%$ → **PASS** |
| **64-QAM** | **8.0%** | $\text{EVM}_{\text{RMS}} \le 8.0\%$ → **PASS** |
| **256-QAM** | **3.5%** | $\text{EVM}_{\text{RMS}} \le 3.5\%$ → **PASS** |

---

## 🎛️ Real-World Test Presets

1. **Clean Lab Baseline**:
   * AWGN benchmark at $28\text{ dB}$ SNR with zero multipath or Doppler. Used for baseline transmitter RF calibration and theoretical curve verification.
2. **High-Speed Train (300 km/h)**:
   * 3GPP HST scenario at $3.5\text{ GHz}$ ($f_d \approx 972\text{ Hz}$). Severe carrier phase rotation stress-testing receiver phase-locked loop (PLL) tracking.
3. **Dense Urban NLOS (Rayleigh Fading)**:
   * Severe multi-path scattering ($K = -30\text{ dB}$) with deep frequency-selective notches across the OFDM resource grid.
4. **Sub-THz 6G / mmWave Stress**:
   * Next-generation high-frequency link suffering from local oscillator phase noise ($3.8^\circ$) and mixer quadrature distortion ($1.2\text{ dB}$ gain mismatch, $4.5^\circ$ phase skew).

---

## 🏗️ Technical Architecture & Zero-Build Philosophy

```
5g-rf-channel-studio/
├── index.html                  # Main instrument shell & UI structure
├── css/
│   └── instrument.css          # Keysight PathWave dark instrument styling
├── js/
│   ├── app.js                  # Master application orchestrator & 60 FPS loop
│   ├── presets.js              # Industry test scenario configurations
│   ├── dsp/
│   │   ├── modulator.js        # Gray symbol mapper for BPSK-256QAM & PRBS-15
│   │   ├── channel.js          # Rayleigh/Rician, Doppler, AWGN, Phase Noise
│   │   └── demodulator.js      # ML Euclidean slicer, EVM, MER, and erfc curves
│   └── ui/
│       ├── constellation-scope.js # 60 FPS phosphor-persistence canvas scope
│       ├── ofdm-grid.js        # 5G NR 14x24 resource element inspector
│       └── testbench.js        # Automated SNR sweep & CSV/JSON exporter
└── test/
    └── test_dsp_engine.mjs     # Standalone Node.js DSP verification test
```

* **Zero Build Steps**: Written in clean, standard ES6 modules. No Webpack, no Vite, no node_modules required for deployment.
* **Instant Deployment**: Deploys natively to **GitHub Pages** with $100\%$ uptime and instant load times ($<1\text{ second}$).

---

## 🧪 Verification & Unit Testing

The DSP core includes a comprehensive headless unit test suite (`test/test_dsp_engine.mjs`) verified with Node.js:
1. **Symbol Energy Verification**: Proves average symbol energy $E_s = 1.0000 \pm 0.0001$ across BPSK, QPSK, 16-QAM, 64-QAM, and 256-QAM.
2. **Zero-Noise Roundtrip**: Proves $0$ bit errors across $10^5$ bits in ideal conditions.
3. **Analytical BER Verification**: Validates empirical Monte Carlo BER against closed-form theoretical complementary error function ($\text{erfc}$) bounds within $<1\%$ statistical variance.

Run unit tests locally:
```bash
node test/test_dsp_engine.mjs
```

---

## 👨‍🎓 Author & Aalborg University Background

**Jacob El-Omar**  
*Master of Science (M.Sc.) in Electronic Systems • Aalborg University (AAU), Denmark*  
*Specialization: Control Engineering, Digital Signal Processing & Communications*  

* **LinkedIn**: [linkedin.com/in/jacob-el-omar](https://www.linkedin.com/in/jacob-el-omar/)
* **GitHub**: [@elomarjc](https://github.com/elomarjc)
* **Email**: [elomarjc@gmail.com](mailto:elomarjc@gmail.com)
* **Portfolio**: [elomarjc.github.io](https://github.com/elomarjc)
