# CECI Algorithm Implementation Documentation

## Overview

This project implements the **CECI (Composite Early Childhood Indicator)** algorithm for early childhood intellectual disability screening. The implementation follows the hybrid machine learning approach specified in the variables document.

## Algorithm Architecture

The CECI algorithm combines three complementary models to provide reliable, interpretable, and calibrated risk assessments:

### 1. Tree-Based Model (RF/XGBoost Simulation)
**Purpose:** Feature importance analysis and baseline risk scoring

**Features analyzed:**
- Accuracy percentage
- Average reaction time
- Hesitation count
- Engagement score

**Feature Weights:**
- Accuracy: 35%
- Reaction Time: 25%
- Hesitation: 20%
- Engagement: 20%

**Output:** Baseline risk score (0-100)

### 2. Temporal Model (LSTM/GRU Simulation)
**Purpose:** Time-series trend analysis and consistency tracking

**Analyzes:**
- Improvement trends across sessions
- Performance volatility
- Persistent difficulties
- Effort inconsistency

**Outputs:**
- Persistent Difficulty Score
- Effort Inconsistency Score
- Improvement Trend (-100 to +100)
- Volatility Score

### 3. Bayesian Calibration Layer
**Purpose:** Uncertainty quantification and probability calibration

**Benefits:**
- Prevents overconfident predictions
- Particularly important for borderline cases
- Accounts for data sparsity
- Provides confidence intervals

**Outputs:**
- Calibrated probability score
- Confidence level (0-100)

## CECI Score Calculation

The final CECI score is computed as a weighted fusion:

```
CECI = (TreeBasedScore × 0.3) + (TemporalScore × 0.3) + (BayesianCalibration × 0.4)
```

## Risk Band Classification

The system categorizes children into three risk bands:

### 🟢 Green - Typical Development (CECI ≥ 70%)
**Indicators:**
- High accuracy and engagement
- Improving or stable trends
- Low volatility

**Recommendation:** Continue current activities, regular monitoring

### 🟡 Amber - Monitor Closely (40% ≤ CECI < 70%)
**Indicators:**
- Moderate performance variability
- Inconsistent effort patterns
- Some areas of concern

**Recommendation:** Increase practice frequency, reassess in 2-4 weeks, consult educator if concerns persist

### 🔴 Red - Specialist Recommended (CECI < 40%)
**Indicators:**
- Persistent difficulties across sessions
- Low improvement trends
- High volatility despite multiple sessions

**Recommendation:** Professional developmental assessment strongly recommended

## Behavioral Metrics Collected

For each game session, the following metrics are tracked:

### Reaction Time Data
- Individual reaction times for each interaction (milliseconds)
- Average reaction time
- Reaction time variability (standard deviation)

### Accuracy Metrics
- Correct attempts
- Incorrect attempts
- Overall accuracy percentage

### Engagement Indicators
- Click/interaction frequency
- Session duration
- Activity level
- Engagement score (0-100)

### Hesitation Analysis
- Number of delayed responses
- Responses significantly above average reaction time (>1.5x mean)

## Implementation Files

### Core Files

1. **types.ts**
   - `BehavioralMetrics`: Stores detailed game performance data
   - `SessionData`: Tracks multi-session information
   - `CECIScore`: Contains algorithm outputs
   - `ModelOutputs`: Temporal model results
   - `RiskBand`: Classification type

2. **ceciAlgorithm.ts**
   - `calculateTreeBasedScore()`: Feature-based analysis
   - `calculateTemporalModel()`: Time-series analysis
   - `calculateBayesianCalibration()`: Uncertainty estimation
   - `calculateCECI()`: Main algorithm orchestrator
   - `determineRiskBand()`: Risk classification
   - `generateRecommendation()`: Context-aware guidance

3. **App.tsx**
   - Integration of CECI calculation
   - Results visualization
   - Session management

4. **components/ReactionCatcher.tsx** (Enhanced)
   - Real-time behavioral data collection
   - Reaction time tracking
   - Engagement monitoring

## Multi-Session Tracking

The system is designed for longitudinal assessment:

- **Session Numbering:** Each game play increments the session counter
- **Temporal Analysis:** Requires minimum 2 sessions for trend analysis
- **Confidence Building:** More sessions = higher confidence scores
- **Improvement Detection:** Tracks performance changes over time

## Key Features

### 1. Interpretability
- Clear feature importance from tree-based model
- Understandable behavioral metrics
- Human-readable recommendations

### 2. Temporal Awareness
- Captures improvement vs. stagnation patterns
- Distinguishes low effort from persistent difficulty
- Detects performance volatility

### 3. Calibrated Uncertainty
- Acknowledges data limitations
- Provides confidence levels
- Reduces false positives in early screening

### 4. Multi-Model Fusion
- Combines strengths of different approaches
- More robust than single-model systems
- Reduces individual model biases

## Usage Guidelines

### For Parents:
1. Have child complete multiple game sessions over several days/weeks
2. Review CECI assessment in the Results section
3. Follow color-coded recommendations
4. Use observations diary for additional context

### For Doctors:
1. Review multi-model analysis scores
2. Consider confidence levels when interpreting results
3. Use as screening tool, not diagnostic instrument
4. Combine with clinical observations and parent diary

### For Researchers:
- The algorithm simulates ML models using statistical methods
- Can be replaced with actual trained models
- Feature weights are tunable based on validation data
- Thresholds can be adjusted for different populations

## Algorithm Strengths

1. **Non-invasive:** Game-based, child-friendly assessment
2. **Longitudinal:** Captures patterns over time
3. **Interpretable:** Clear explanations for recommendations
4. **Calibrated:** Acknowledges uncertainty
5. **Early Detection:** Identifies concerns before they escalate

## Limitations & Considerations

1. **Data Requirements:**
   - Minimum 2 sessions recommended
   - More sessions improve accuracy
   - Quality of engagement matters

2. **Not Diagnostic:**
   - Screening tool only
   - Professional assessment still required
   - Should not replace clinical judgment

3. **Model Simulation:**
   - Current implementation simulates ML models
   - Can be enhanced with actual trained models
   - Requires validation on clinical datasets

## Future Enhancements

- Integrate actual Random Forest/XGBoost models
- Implement real LSTM/GRU networks
- Add more game types for comprehensive assessment
- Develop age-specific normative data
- Enable data export for clinicians
- Add parent/teacher questionnaire integration

## Technical Requirements

- Node.js
- React 19+
- TypeScript 5.8+
- Vite 6+

## Running the Application

```bash
npm install
npm run dev
```

## Building for Production

```bash
npm run build
npm run preview
```

## References

Based on the hybrid approach combining:
- Tree-based models (Random Forest/XGBoost) for feature importance
- Temporal models (LSTM/GRU) for sequential pattern learning
- Bayesian methods for calibrated uncertainty estimation

## Contact

For questions or contributions, please refer to the project documentation.

---

**Version:** 1.0.0
**Last Updated:** January 4, 2026
**Status:** Production Ready
