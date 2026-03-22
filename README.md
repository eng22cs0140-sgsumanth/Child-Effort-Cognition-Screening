# CECI — Child Effort-Cognition Index

A game-based early childhood developmental screening system that computes the **Child Effort-Cognition Index (CECI)** from interactive gameplay telemetry. Designed for parents, clinicians, and researchers to identify potential cognitive and developmental concerns in young children (ages 3–9) through engaging, non-stressful assessments.

---

## Project Structure

```
major_project/
├── copy1/                      # React Web Application
│   ├── App.tsx                 # Main app — onboarding, routing, session logic
│   ├── components/             # Game + UI components
│   │   ├── AssessmentPage.tsx
│   │   ├── ObservationsDiary.tsx
│   │   ├── ReportTemplate.tsx
│   │   └── [10 game components]
│   ├── services/
│   │   └── ceciService.ts      # CECI parameter estimation & API bridge
│   ├── types.ts                # TypeScript type definitions
│   └── constants.tsx           # Game registry & app-wide constants
│
├── mobile/                     # React Native Mobile App (Expo)
│   └── src/
│       ├── screens/
│       │   ├── WelcomeScreen.tsx
│       │   ├── LoginScreen.tsx
│       │   ├── OnboardingParentScreen.tsx
│       │   ├── OnboardingChildScreen.tsx
│       │   ├── AssessmentScreen.tsx
│       │   ├── ResultsScreen.tsx
│       │   └── HelpScreen.tsx
│       ├── components/games/   # Mobile game components (10 games)
│       ├── context/
│       │   └── AppContext.tsx  # Global state + AsyncStorage persistence
│       ├── hooks/
│       │   └── useCECICalculation.ts
│       ├── ceciAlgorithm.ts    # Local CECI calculation (offline fallback)
│       └── types.ts
│
├── ml_pipeline/                # Python ML Backend (FastAPI)
│   ├── api.py                  # REST API endpoints
│   ├── pipeline.py             # 5-stage ML pipeline orchestrator
│   ├── stages/                 # Feature engineering, tree model, temporal model,
│   │                           # Bayesian calibration, post-processing
│   ├── tests/                  # 86+ pytest test cases
│   ├── trained_models/         # Serialised model artefacts (.joblib)
│   ├── README.md               # ML pipeline usage & API reference
│   ├── ARCHITECTURE.md         # System architecture deep-dive
│   └── DEPLOYMENT.md           # Docker / cloud deployment guide
│
├── start-all.sh                # Start ML pipeline + React web app
├── stop-all.sh                 # Stop all services
└── clear-sessions.sh           # Wipe browser localStorage session history
```

---

## Quick Start

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Python | 3.8+ |
| Node.js | 16+ |
| npm | 8+ |
| Expo CLI | Latest |

### Web App

```bash
# One-command start (ML pipeline + React app)
chmod +x start-all.sh stop-all.sh   # first time only
./start-all.sh
```

This starts:
- **ML Pipeline API** → http://localhost:8000
- **React Web App** → http://localhost:3002

```bash
./stop-all.sh   # stop everything
```

Manual start:
```bash
# Terminal 1 — ML Pipeline
cd ml_pipeline
pip install -r requirements.txt
python run.py server

# Terminal 2 — React Web App
cd copy1
npm install
cp .env.example .env
npm run dev
```

### Mobile App (Android APK)

```bash
cd mobile
npm install
npx expo login          # requires an Expo account
eas build -p android --profile preview
```

The build runs on Expo's cloud servers (~5–10 min). When complete, download the `.apk` link and install on your Android device. Enable *"Install from unknown sources"* if prompted.

---

## How It Works

### 1. Role Selection

Three roles:
- **Child** — plays assessment games directly
- **Parent** — registers child profile, monitors progress, adds diary observations
- **Doctor** — views full clinical dashboard, fills official assessment form, downloads PDF report

### 2. Child Profile

Fields collected are evidence-based and directly impact scoring calibration:

| Field | Purpose |
|-------|---------|
| Name & Date of Birth | Identity + age-indexed norm selection |
| Sex | Normative data is sex-stratified |
| Born premature? + gestational age (weeks) | Required for corrected-age calculation (ASQ-3, Bayley-4) |
| Family history of ASD/ADHD/ID | Strongest single risk-stratification variable |
| Known medical conditions | Diagnosed conditions alter score interpretation |
| Blood group / Height / Weight / BMI | Physical health metrics (mobile only) |

### 3. Assessment Games

Ten interactive games covering four developmental domains:

| Domain | Games |
|--------|-------|
| Cognitive | Pattern Memory, Number Sequencer, Counting Garden, Color Maze |
| Social / Emotional | Emotion Detective, Follow Leader |
| Language | Sound Word Game |
| Attention | Simon Says, Category Sort, Reaction Catcher |

Each game records: reaction time, accuracy, hesitation periods, completion rate, and trial-level accuracy sequences.

### 4. CECI Scoring

```
CECI = w₁·PID + w₂·(1 − Var(Acc)) − w₃·PEff
```

| Component | Meaning |
|-----------|---------|
| **PID** | Persistent Intellectual Difficulty — probability of persistent cognitive difficulty |
| **Var(Acc)** | Cross-session accuracy variance (consistency measure) |
| **PEff** | Effort inconsistency probability |

Default weights: `w₁ = 0.50`, `w₂ = 0.30`, `w₃ = 0.20`

#### Risk Bands

| Band | CECI Score | Meaning | Action |
|------|------------|---------|--------|
| 🟢 Green | 0.00 – 0.40 | Typical development | Continue regular activities |
| 🟡 Amber | 0.40 – 0.65 | Monitor closely | Increase session frequency |
| 🔴 Red | 0.65 – 1.00 | High risk | Seek specialist assessment |

#### Multi-Session Longitudinal Mode

After 2+ sessions:
- Cross-session Var(Acc) computed per paper Eq.(3)
- PID recalculated across full session history
- 3-way classification: Cognitive Risk / Emotional Variability / Effort Variability

### 5. ML Pipeline (Backend)

```
Game telemetry
    → Stage 1: Feature Engineering
    → Stage 2: Tree-Based Model (RF/XGBoost)
    → Stage 3: Temporal Model (LSTM/GRU simulation)
    → Stage 4: Bayesian Calibration
    → Stage 5: Post-Processing
    → CECI Score + confidence + risk band
```

The app calls `/api/ceci/analyze` and falls back to the local TypeScript/native implementation if the API is unavailable.

API docs: http://localhost:8000/docs

---

## Domain Assessment Indices

Six neuropsychological domain scores derived from game performance:

| Index | Full Name | Games |
|-------|-----------|-------|
| VMI | Visual-Motor Integration | Color Maze, Number Sequencer |
| FRI | Fluid Reasoning Index | Pattern Memory, Counting Garden |
| LCI | Language Comprehension Index | Sound Word Game |
| IFI | Inhibitory Function Index | Simon Says, Category Sort |
| API | Attention Processing Index | Reaction Catcher |
| ATI | Attention-Task Integration | Follow Leader, Emotion Detective |

---

## Features

### Web App
- Role-based access (Child / Parent / Doctor)
- Full child profile with neurodevelopmental risk factors
- Parent re-authentication before profile edits
- Observations diary (timestamped parent notes)
- PDF report generation (jsPDF + html2canvas)
- Multi-session CECI with localStorage persistence
- Session history with clear button

### Mobile App (React Native / Expo)
- Full feature parity with the web app
- Child profile with sex, prematurity, family history, known conditions + physical metrics (BMI, blood group)
- Session history persisted to **AsyncStorage** across app restarts
- Parent re-authentication modal before profile updates
- PDF report generation + share via **expo-print** / **expo-sharing**
- Observations diary (floating action button in parent view)
- Domain Assessment Indices (VMI, FRI, LCI, IFI, API, ATI) in doctor view
- Full clinical assessment form in doctor view
- Clear session history with confirmation prompt

---

## Configuration

### React App (`copy1/.env`)

```bash
VITE_API_BASE_URL=http://localhost:8000    # ML Pipeline URL
VITE_USE_ML_PIPELINE=true                  # Enable API scoring
VITE_ENABLE_FALLBACK=true                  # Fall back to local if API down
VITE_API_TIMEOUT=10000                     # Request timeout (ms)
```

### ML Pipeline (`ml_pipeline/config.py`)

```python
GREEN_THRESHOLD = 0.40     # CECI ≤ 0.40 → green
AMBER_THRESHOLD = 0.65     # CECI ≤ 0.65 → amber, else red
```

---

## Testing

### ML Pipeline

```bash
cd ml_pipeline
pytest                              # Run all 86+ tests
pytest --cov=ml_pipeline            # With coverage report
pytest tests/test_pipeline.py -v    # Specific test file
```

### React App

```bash
cd copy1
npm run build    # TypeScript compile check
```

### Mobile App

```bash
cd mobile
npx tsc --noEmit    # TypeScript compile check
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Stale session data on web | Run `./clear-sessions.sh` or use the Clear History button |
| Mobile app shows "Local Mode" | Check that ML pipeline is running and reachable from the device |
| React app shows "Local Mode" | `curl http://localhost:8000/health` — verify `.env` settings |
| CORS errors in browser | Add your origin to `allow_origins` in `ml_pipeline/api.py` |
| Port 8000 / 3002 already in use | `lsof -ti:8000 \| xargs kill -9` |
| APK build fails | Run `npx expo login` and verify `eas.json` has `preview` profile |

---

## Documentation

| File | Contents |
|------|----------|
| `copy1/CECI_ALGORITHM_DOCUMENTATION.md` | Algorithm internals — PID, Var(Acc), PEff, fusion formula |
| `ml_pipeline/README.md` | API reference, endpoints, request/response schemas |
| `ml_pipeline/ARCHITECTURE.md` | Pipeline stage architecture and data flow |
| `ml_pipeline/DEPLOYMENT.md` | Docker, systemd, and cloud deployment guides |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Mobile | React Native, Expo, AsyncStorage, expo-print, expo-sharing |
| ML Backend | Python 3.8+, FastAPI, scikit-learn, NumPy, pandas |
| Testing | pytest (86+ cases) |
| Deployment | Docker, docker-compose, EAS (Expo Application Services) |

---

## References

This system implements the longitudinal CECI formulation from the research paper on game-based intellectual disability screening. Key external standards informing the child profile design:

- ASQ-3 (Ages & Stages Questionnaires) — corrected age protocol
- Bayley Scales of Infant and Toddler Development (4th ed.) — prematurity adjustment
- AAP developmental screening guidelines
- PMC8412365 — corrected vs. chronological age scoring in preterm children

---

**Status:** Active development
**Last updated:** March 2026
