# CECI — Child Effort-Cognition Index

A game-based early childhood developmental screening system that computes the **Child Effort-Cognition Index (CECI)** from interactive gameplay telemetry. Designed for parents, clinicians, and researchers to identify potential cognitive and developmental concerns in young children (ages 2–8) through engaging, non-stressful assessments.

---

## Project Structure

```
major_project/
├── copy1/                      # React Web Application (primary interface)
│   ├── App.tsx                 # Main app — onboarding, routing, session logic
│   ├── components/             # Game + UI components
│   ├── services/
│   │   └── ceciService.ts      # CECI parameter estimation & API bridge
│   ├── types.ts                # TypeScript type definitions
│   ├── constants.tsx           # Game registry & app-wide constants
│   └── CECI_ALGORITHM_DOCUMENTATION.md
│
├── mobile/                     # React Native mobile app (Expo)
│   └── src/
│       ├── screens/            # Onboarding, Assessment, Results
│       ├── components/games/   # Mobile game components
│       ├── ceciAlgorithm.ts    # Local CECI calculation engine
│       └── hooks/
│           └── useCECICalculation.ts
│
├── ml_pipeline/                # Python ML backend (FastAPI)
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
├── start-all.sh                # Start ML pipeline + React app
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

### One-command start

```bash
chmod +x start-all.sh stop-all.sh clear-sessions.sh   # first time only
./start-all.sh
```

This starts:
- **ML Pipeline API** → http://localhost:8000
- **React Web App** → http://localhost:3002

To stop everything:
```bash
./stop-all.sh
```

### Manual start

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

---

## How It Works

### 1. Role Selection
Choose one of three roles:
- **Child** — plays assessment games directly
- **Parent** — registers child profile, plays games, views results
- **Doctor** — views full clinical dashboard and can submit official assessment

### 2. Child Profile (Parent Registration)

Fields collected are evidence-based and directly impact scoring calibration:

| Field | Purpose |
|-------|---------|
| Name & Date of Birth | Identity + age-indexed norm selection |
| Sex | Normative data is sex-stratified; boys carry higher ASD/ADHD risk |
| Born premature? + gestational age (weeks) | Required for corrected-age calculation (ASQ-3, Bayley-4); omitting this causes up to a 17-point scoring error for preterm children |
| Primary language at home | Bilingual children score >1 SD below monolingual norms on language tests without this context |
| Family history of ASD/ADHD/ID | Strongest single risk-stratification variable |
| Known medical conditions | Diagnosed conditions alter score interpretation |

> Blood group, height, weight and BMI were intentionally excluded — no validated link exists between these and individual developmental/cognitive screening outcomes.

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

The CECI score is computed from multi-session gameplay using the paper's longitudinal formulation:

```
CECI = w₁·PID + w₂·(1 − Var(Acc)) − w₃·PEff
```

Where:
- **PID** — Persistent Intellectual Difficulty (probability of persistent cognitive difficulty)
- **Var(Acc)** — Cross-session accuracy variance (consistency)
- **PEff** — Effort inconsistency probability

Default weights: `w₁ = 0.50`, `w₂ = 0.30`, `w₃ = 0.20`

#### Risk Bands

| Band | CECI Score | Meaning | Action |
|------|-----------|---------|--------|
| 🟢 Green | 0.00 – 0.40 | Low Risk — Typical development | Continue regular activities |
| 🟡 Amber | 0.40 – 0.65 | Moderate Risk — Monitor | Increase session frequency |
| 🔴 Red | 0.65 – 1.00 | High Risk — Refer | Seek specialist assessment |

#### Multi-Session Longitudinal Mode

After 2+ sessions, the system activates full longitudinal analysis:
- Cross-session Var(Acc) computed per paper Eq.(3)
- PID recalculated across session history stored in browser localStorage
- Classification indicators: Cognitive Risk Score, Emotional Variability, Effort Variability

Session history utilities:
```bash
./clear-sessions.sh        # Clear browser localStorage via URL hook
```
Or use the **Clear History** button on the Results page.

### 5. ML Pipeline (Backend)

The Python backend runs a 5-stage ML pipeline for production-grade scoring:

```
Game telemetry
    → Stage 1: Feature Engineering
    → Stage 2: Tree-Based Model (RF/XGBoost)
    → Stage 3: Temporal Model (LSTM/GRU simulation)
    → Stage 4: Bayesian Calibration
    → Stage 5: Post-Processing
    → CECI Score + confidence + risk band
```

The React app calls the pipeline via `/api/ceci/analyze` and automatically falls back to the local TypeScript implementation if the API is unavailable.

API docs: http://localhost:8000/docs

---

## Domain Assessment Indices

Six neuropsychological domain scores are derived from game performance:

| Index | Full Name | Games |
|-------|-----------|-------|
| VMI | Visual-Motor Integration | Color Maze, Number Sequencer |
| FRI | Fluid Reasoning Index | Pattern Memory, Counting Garden |
| LCI | Language Comprehension Index | Sound Word Game |
| IFI | Inhibitory Function Index | Simon Says, Category Sort |
| API | Attention Processing Index | Reaction Catcher |
| ATI | Attention-Task Integration | Follow Leader, Emotion Detective |

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

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Results page shows data with 0 games played | Run `./clear-sessions.sh` to wipe stale localStorage |
| React app shows "Local Mode" always | Check `curl http://localhost:8000/health` and verify `.env` |
| CORS errors in browser console | Add your origin to `allow_origins` in `ml_pipeline/api.py` |
| Port 8000 / 3002 already in use | `lsof -ti:8000 \| xargs kill -9` |

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
| Mobile | React Native, Expo |
| ML Backend | Python 3.8+, FastAPI, scikit-learn, NumPy, pandas |
| Testing | pytest (86+ cases) |
| Deployment | Docker, docker-compose |

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
