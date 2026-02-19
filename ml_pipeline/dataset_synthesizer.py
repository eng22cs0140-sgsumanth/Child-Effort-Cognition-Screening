"""
Dataset Synthesizer for CECI Assessment System

Generates realistic synthetic datasets for all 10 games with:
- Proper session timings per game type
- Behavioral metrics following developmental patterns
- Three risk profiles: typical (green), at-risk (amber), high-risk (red)
- Multi-session longitudinal data
- Age-appropriate difficulty scaling
"""

import numpy as np
import pandas as pd
import json
import os
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field

# Reproducibility
SEED = 42


@dataclass
class GameConfig:
    """Configuration for each game's session parameters"""
    game_id: str
    name: str
    badge: str  # Attention, Cognitive, Language, Social
    age_range: Tuple[int, int]
    session_duration_seconds: int  # Typical session duration
    min_items_per_session: int
    max_items_per_session: int
    typical_reaction_time_range: Tuple[float, float]  # ms for typical children
    at_risk_reaction_time_multiplier: float  # multiplier for at-risk


# Game configurations with realistic session timings
GAME_CONFIGS = {
    'catcher': GameConfig(
        game_id='catcher',
        name='Reaction Time Catcher',
        badge='Attention',
        age_range=(0, 9),
        session_duration_seconds=30,  # 30-second timed game
        min_items_per_session=10,
        max_items_per_session=25,
        typical_reaction_time_range=(300, 700),
        at_risk_reaction_time_multiplier=1.6
    ),
    'memory': GameConfig(
        game_id='memory',
        name='Pattern Memory Match',
        badge='Cognitive',
        age_range=(2, 9),
        session_duration_seconds=90,  # ~1.5 minutes per level x 5 levels
        min_items_per_session=5,
        max_items_per_session=15,
        typical_reaction_time_range=(500, 1200),
        at_risk_reaction_time_multiplier=1.5
    ),
    'shapes': GameConfig(
        game_id='shapes',
        name='Shape Sorter Challenge',
        badge='Cognitive',
        age_range=(0, 6),
        session_duration_seconds=60,  # ~1 minute sorting session
        min_items_per_session=8,
        max_items_per_session=20,
        typical_reaction_time_range=(600, 1500),
        at_risk_reaction_time_multiplier=1.4
    ),
    'sound': GameConfig(
        game_id='sound',
        name='Sound & Word Games',
        badge='Language',
        age_range=(1, 9),
        session_duration_seconds=75,  # ~75 seconds for word matching
        min_items_per_session=6,
        max_items_per_session=15,
        typical_reaction_time_range=(800, 2000),
        at_risk_reaction_time_multiplier=1.5
    ),
    'leader': GameConfig(
        game_id='leader',
        name='Follow the Leader',
        badge='Social',
        age_range=(0, 9),
        session_duration_seconds=45,  # 4 rounds, ~10s each + transitions
        min_items_per_session=4,
        max_items_per_session=8,
        typical_reaction_time_range=(400, 1000),
        at_risk_reaction_time_multiplier=1.7
    ),
    'counting': GameConfig(
        game_id='counting',
        name='Counting Garden',
        badge='Cognitive',
        age_range=(1, 7),
        session_duration_seconds=60,  # ~1 minute counting session
        min_items_per_session=5,
        max_items_per_session=12,
        typical_reaction_time_range=(700, 1800),
        at_risk_reaction_time_multiplier=1.4
    ),
    'emotion': GameConfig(
        game_id='emotion',
        name='Emotion Detective',
        badge='Social',
        age_range=(2, 9),
        session_duration_seconds=70,  # ~70s for emotion identification
        min_items_per_session=6,
        max_items_per_session=12,
        typical_reaction_time_range=(600, 1500),
        at_risk_reaction_time_multiplier=1.5
    ),
    'simon': GameConfig(
        game_id='simon',
        name='Simon Says Musical',
        badge='Attention',
        age_range=(2, 9),
        session_duration_seconds=50,  # 5 rounds, ~10s each
        min_items_per_session=5,
        max_items_per_session=10,
        typical_reaction_time_range=(500, 1200),
        at_risk_reaction_time_multiplier=1.6
    ),
    'maze': GameConfig(
        game_id='maze',
        name='Color Trail Maze',
        badge='Cognitive',
        age_range=(1, 7),
        session_duration_seconds=90,  # ~1.5 minutes for maze navigation
        min_items_per_session=8,
        max_items_per_session=20,
        typical_reaction_time_range=(400, 1000),
        at_risk_reaction_time_multiplier=1.5
    ),
    'category': GameConfig(
        game_id='category',
        name='Category Sort Game',
        badge='Attention',
        age_range=(3, 9),
        session_duration_seconds=60,  # ~1 minute sorting
        min_items_per_session=8,
        max_items_per_session=16,
        typical_reaction_time_range=(600, 1400),
        at_risk_reaction_time_multiplier=1.4
    ),
}


@dataclass
class ChildProfile:
    """Synthetic child profile"""
    child_id: str
    name: str
    age: int
    risk_category: str  # 'green', 'amber', 'red'


class CECIDatasetSynthesizer:
    """
    Generates realistic synthetic datasets for the CECI Assessment System.

    Produces data matching the exact schema expected by the ML pipeline:
    - GameResult format with behavioralMetrics
    - Multi-session longitudinal sequences
    - Age-appropriate behavioral patterns
    - Three distinct risk profiles
    """

    def __init__(self, seed: int = SEED):
        self.rng = np.random.RandomState(seed)
        self.child_counter = 0

    def generate_child_profile(self, risk_category: str, age: Optional[int] = None) -> ChildProfile:
        """Generate a synthetic child profile"""
        self.child_counter += 1
        names = {
            'green': ['Aarav', 'Diya', 'Vihaan', 'Anaya', 'Arjun', 'Ishita',
                       'Reyansh', 'Saanvi', 'Aditya', 'Kiara', 'Kabir', 'Myra'],
            'amber': ['Rohan', 'Priya', 'Harsh', 'Neha', 'Karan', 'Siya',
                       'Vivaan', 'Aadhya', 'Shaurya', 'Pari', 'Arnav', 'Riya'],
            'red': ['Tanmay', 'Meera', 'Dhruv', 'Isha', 'Neel', 'Tara',
                     'Yash', 'Aisha', 'Dev', 'Nisha', 'Atharv', 'Zara']
        }
        name = self.rng.choice(names[risk_category])
        if age is None:
            age = self.rng.randint(1, 9)

        return ChildProfile(
            child_id=f"child_{self.child_counter:04d}",
            name=name,
            age=age,
            risk_category=risk_category
        )

    def _get_risk_params(self, risk_category: str) -> Dict[str, Any]:
        """Get behavioral parameters based on risk category"""
        if risk_category == 'green':
            return {
                'accuracy_mean': 82.0,
                'accuracy_std': 8.0,
                'engagement_mean': 82.0,
                'engagement_std': 8.0,
                'hesitation_mean': 1.5,
                'hesitation_std': 1.2,
                'improvement_rate': 3.0,  # % improvement per session
                'consistency': 0.85,  # low variability
                'rt_multiplier': 1.0,
            }
        elif risk_category == 'amber':
            return {
                'accuracy_mean': 58.0,
                'accuracy_std': 14.0,
                'engagement_mean': 55.0,
                'engagement_std': 15.0,
                'hesitation_mean': 5.0,
                'hesitation_std': 2.5,
                'improvement_rate': 0.5,  # minimal improvement
                'consistency': 0.55,  # moderate variability
                'rt_multiplier': 1.35,
            }
        else:  # red
            return {
                'accuracy_mean': 35.0,
                'accuracy_std': 10.0,
                'engagement_mean': 35.0,
                'engagement_std': 12.0,
                'hesitation_mean': 9.0,
                'hesitation_std': 3.0,
                'improvement_rate': -1.5,  # declining or stagnant
                'consistency': 0.30,  # high variability
                'rt_multiplier': 1.7,
            }

    def generate_session(
        self,
        game_config: GameConfig,
        child: ChildProfile,
        session_number: int,
        base_timestamp: int,
        risk_params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate a single game session with realistic behavioral metrics"""

        # Session improvement/decline effect
        session_effect = risk_params['improvement_rate'] * (session_number - 1)

        # Age effect on performance (older children tend to do better)
        age_bonus = max(0, (child.age - 2) * 2.5)

        # Calculate accuracy with noise
        base_accuracy = risk_params['accuracy_mean'] + session_effect + age_bonus
        noise = self.rng.normal(0, risk_params['accuracy_std'] * (1 - risk_params['consistency']))
        accuracy = np.clip(base_accuracy + noise, 0, 100)

        # Calculate engagement
        base_engagement = risk_params['engagement_mean'] + session_effect * 0.5
        eng_noise = self.rng.normal(0, risk_params['engagement_std'] * (1 - risk_params['consistency']))
        engagement = np.clip(base_engagement + eng_noise, 0, 100)

        # Calculate hesitation count
        hesitation = max(0, int(self.rng.normal(
            risk_params['hesitation_mean'] - session_effect * 0.2,
            risk_params['hesitation_std']
        )))

        # Number of items in this session
        n_items = self.rng.randint(
            game_config.min_items_per_session,
            game_config.max_items_per_session + 1
        )

        # Generate reaction times
        rt_low, rt_high = game_config.typical_reaction_time_range
        rt_center = (rt_low + rt_high) / 2 * risk_params['rt_multiplier']
        rt_spread = (rt_high - rt_low) / 2 * risk_params['rt_multiplier']

        # Age affects reaction time (younger = slower)
        age_rt_factor = max(0.7, 1.3 - child.age * 0.07)
        rt_center *= age_rt_factor

        reaction_times = []
        for _ in range(n_items):
            rt = self.rng.normal(rt_center, rt_spread * 0.4)
            # Add hesitation spikes
            if self.rng.random() < (hesitation / n_items):
                rt *= self.rng.uniform(1.5, 2.5)
            reaction_times.append(max(100, rt))

        avg_rt = float(np.mean(reaction_times))
        rt_variability = float(np.std(reaction_times))

        # Correct/incorrect attempts
        correct = int(round(n_items * accuracy / 100))
        incorrect = n_items - correct

        # Score (weighted combination)
        score = np.clip(accuracy * 0.7 + engagement * 0.3, 0, 100)

        # Timestamp: sessions spaced 1-3 days apart
        day_gap = self.rng.randint(1, 4)
        timestamp = base_timestamp + (session_number - 1) * day_gap * 86400000

        return {
            'gameId': game_config.game_id,
            'score': round(float(score), 1),
            'timestamp': int(timestamp),
            'sessionNumber': session_number,
            'behavioralMetrics': {
                'reactionTimes': [round(rt, 1) for rt in reaction_times],
                'accuracy': round(float(accuracy), 1),
                'hesitationCount': hesitation,
                'engagementScore': round(float(engagement), 1),
                'correctAttempts': correct,
                'incorrectAttempts': incorrect,
                'averageReactionTime': round(avg_rt, 1),
                'reactionTimeVariability': round(rt_variability, 1)
            }
        }

    def generate_child_sessions(
        self,
        child: ChildProfile,
        num_sessions: int = 5,
        games: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Generate multiple game sessions for a child across specified games"""

        risk_params = self._get_risk_params(child.risk_category)

        if games is None:
            # Select age-appropriate games
            games = [
                gid for gid, gc in GAME_CONFIGS.items()
                if gc.age_range[0] <= child.age <= gc.age_range[1]
            ]

        all_sessions = []
        base_timestamp = 1700000000000  # Nov 2023 start

        for game_id in games:
            game_config = GAME_CONFIGS[game_id]
            for session_num in range(1, num_sessions + 1):
                session = self.generate_session(
                    game_config=game_config,
                    child=child,
                    session_number=session_num,
                    base_timestamp=base_timestamp,
                    risk_params=risk_params
                )
                all_sessions.append(session)

        # Sort by timestamp
        all_sessions.sort(key=lambda x: x['timestamp'])
        return all_sessions

    def generate_training_dataset(
        self,
        n_children_per_category: int = 50,
        sessions_per_child: int = 5,
        games_per_child: Optional[int] = None
    ) -> Tuple[List[Dict[str, Any]], pd.DataFrame]:
        """
        Generate a full training dataset.

        Returns:
            Tuple of (raw_sessions_list, labels_dataframe)
            - raw_sessions_list: List of dicts, each with child_id, sessions, and label
            - labels_dataframe: DataFrame with child_id, risk_category, and features
        """
        dataset = []
        labels = []

        for risk_category in ['green', 'amber', 'red']:
            for i in range(n_children_per_category):
                child = self.generate_child_profile(risk_category)

                # Select subset of games if specified
                if games_per_child:
                    eligible_games = [
                        gid for gid, gc in GAME_CONFIGS.items()
                        if gc.age_range[0] <= child.age <= gc.age_range[1]
                    ]
                    n_games = min(games_per_child, len(eligible_games))
                    selected_games = list(self.rng.choice(eligible_games, n_games, replace=False))
                else:
                    selected_games = None

                sessions = self.generate_child_sessions(
                    child=child,
                    num_sessions=sessions_per_child,
                    games=selected_games
                )

                dataset.append({
                    'child_id': child.child_id,
                    'child_name': child.name,
                    'age': child.age,
                    'risk_category': risk_category,
                    'sessions': sessions
                })

                # Extract aggregate features for labels
                if sessions:
                    metrics = [s['behavioralMetrics'] for s in sessions if 'behavioralMetrics' in s]
                    if metrics:
                        labels.append({
                            'child_id': child.child_id,
                            'age': child.age,
                            'risk_category': risk_category,
                            'risk_label': {'green': 0, 'amber': 1, 'red': 2}[risk_category],
                            'avg_accuracy': np.mean([m['accuracy'] for m in metrics]),
                            'avg_reaction_time': np.mean([m['averageReactionTime'] for m in metrics]),
                            'avg_hesitation': np.mean([m['hesitationCount'] for m in metrics]),
                            'avg_engagement': np.mean([m['engagementScore'] for m in metrics]),
                            'accuracy_std': np.std([m['accuracy'] for m in metrics]),
                            'rt_variability': np.mean([m['reactionTimeVariability'] for m in metrics]),
                            'session_count': len(sessions),
                            'num_games': len(set(s['gameId'] for s in sessions)),
                        })

        labels_df = pd.DataFrame(labels)
        return dataset, labels_df

    def generate_test_scenarios(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        Generate specific test scenarios for model validation.

        Returns dict of scenario_name -> sessions
        """
        scenarios = {}

        # Scenario 1: Typical developing child (green)
        child_green = self.generate_child_profile('green', age=5)
        scenarios['typical_development'] = self.generate_child_sessions(
            child_green, num_sessions=5, games=['catcher', 'memory', 'shapes']
        )

        # Scenario 2: At-risk child showing improvement (amber -> green potential)
        child_improving = self.generate_child_profile('amber', age=4)
        sessions_improving = self.generate_child_sessions(
            child_improving, num_sessions=8, games=['catcher', 'emotion']
        )
        # Manually boost later sessions to simulate improvement
        for s in sessions_improving:
            if s['sessionNumber'] > 4:
                s['behavioralMetrics']['accuracy'] = min(100, s['behavioralMetrics']['accuracy'] + 15)
                s['behavioralMetrics']['engagementScore'] = min(100, s['behavioralMetrics']['engagementScore'] + 10)
        scenarios['improving_child'] = sessions_improving

        # Scenario 3: High-risk child with persistent difficulty (red)
        child_red = self.generate_child_profile('red', age=6)
        scenarios['persistent_difficulty'] = self.generate_child_sessions(
            child_red, num_sessions=8, games=['catcher', 'memory', 'counting']
        )

        # Scenario 4: Single session (minimal data)
        child_single = self.generate_child_profile('amber', age=3)
        scenarios['single_session'] = self.generate_child_sessions(
            child_single, num_sessions=1, games=['catcher']
        )

        # Scenario 5: High variability child (amber/inconsistent)
        child_variable = self.generate_child_profile('amber', age=5)
        sessions_variable = self.generate_child_sessions(
            child_variable, num_sessions=6, games=['simon', 'leader']
        )
        # Add extra variability
        for i, s in enumerate(sessions_variable):
            if i % 2 == 0:
                s['behavioralMetrics']['accuracy'] = min(100, s['behavioralMetrics']['accuracy'] + 20)
                s['behavioralMetrics']['engagementScore'] = min(100, s['behavioralMetrics']['engagementScore'] + 15)
            else:
                s['behavioralMetrics']['accuracy'] = max(0, s['behavioralMetrics']['accuracy'] - 20)
                s['behavioralMetrics']['engagementScore'] = max(0, s['behavioralMetrics']['engagementScore'] - 15)
        scenarios['high_variability'] = sessions_variable

        # Scenario 6: Very young child (age 1)
        child_young = self.generate_child_profile('green', age=1)
        scenarios['very_young_typical'] = self.generate_child_sessions(
            child_young, num_sessions=3, games=['catcher', 'shapes', 'leader']
        )

        # Scenario 7: Older child at risk (age 8)
        child_older_risk = self.generate_child_profile('red', age=8)
        scenarios['older_at_risk'] = self.generate_child_sessions(
            child_older_risk, num_sessions=6, games=['memory', 'category', 'emotion']
        )

        # Scenario 8: All 10 games comprehensive assessment
        child_comprehensive = self.generate_child_profile('green', age=5)
        scenarios['comprehensive_all_games'] = self.generate_child_sessions(
            child_comprehensive, num_sessions=3,
            games=list(GAME_CONFIGS.keys())
        )

        # Scenario 9: Declining performance (green -> amber)
        child_declining = self.generate_child_profile('green', age=6)
        sessions_declining = self.generate_child_sessions(
            child_declining, num_sessions=8, games=['catcher', 'memory']
        )
        for s in sessions_declining:
            if s['sessionNumber'] > 4:
                s['behavioralMetrics']['accuracy'] = max(0, s['behavioralMetrics']['accuracy'] - 25)
                s['behavioralMetrics']['engagementScore'] = max(0, s['behavioralMetrics']['engagementScore'] - 20)
                s['behavioralMetrics']['hesitationCount'] += 4
        scenarios['declining_performance'] = sessions_declining

        # Scenario 10: Perfect performer
        child_perfect = self.generate_child_profile('green', age=7)
        sessions_perfect = self.generate_child_sessions(
            child_perfect, num_sessions=5, games=['catcher', 'simon']
        )
        for s in sessions_perfect:
            s['behavioralMetrics']['accuracy'] = 95 + self.rng.uniform(0, 5)
            s['behavioralMetrics']['engagementScore'] = 90 + self.rng.uniform(0, 10)
            s['behavioralMetrics']['hesitationCount'] = 0
            s['score'] = 95 + self.rng.uniform(0, 5)
        scenarios['perfect_performer'] = sessions_perfect

        return scenarios

    def save_dataset(self, output_dir: str, n_children: int = 50, sessions: int = 5):
        """Generate and save dataset to files"""
        os.makedirs(output_dir, exist_ok=True)

        # Generate training data
        dataset, labels_df = self.generate_training_dataset(
            n_children_per_category=n_children,
            sessions_per_child=sessions
        )

        # Save raw sessions as JSON
        with open(os.path.join(output_dir, 'training_data.json'), 'w') as f:
            json.dump(dataset, f, indent=2)

        # Save labels as CSV
        labels_df.to_csv(os.path.join(output_dir, 'training_labels.csv'), index=False)

        # Generate and save test scenarios
        scenarios = self.generate_test_scenarios()
        with open(os.path.join(output_dir, 'test_scenarios.json'), 'w') as f:
            json.dump(scenarios, f, indent=2)

        # Save game configurations for reference
        game_configs_dict = {}
        for gid, gc in GAME_CONFIGS.items():
            game_configs_dict[gid] = {
                'name': gc.name,
                'badge': gc.badge,
                'age_range': list(gc.age_range),
                'session_duration_seconds': gc.session_duration_seconds,
                'min_items_per_session': gc.min_items_per_session,
                'max_items_per_session': gc.max_items_per_session,
                'typical_reaction_time_range_ms': list(gc.typical_reaction_time_range),
            }
        with open(os.path.join(output_dir, 'game_configs.json'), 'w') as f:
            json.dump(game_configs_dict, f, indent=2)

        # Generate summary statistics
        summary = {
            'total_children': len(dataset),
            'children_per_category': {
                cat: len([d for d in dataset if d['risk_category'] == cat])
                for cat in ['green', 'amber', 'red']
            },
            'total_sessions': sum(len(d['sessions']) for d in dataset),
            'sessions_per_child': sessions,
            'games_covered': list(GAME_CONFIGS.keys()),
            'age_distribution': labels_df['age'].value_counts().to_dict(),
            'feature_statistics': {
                col: {
                    'mean': round(labels_df[col].mean(), 2),
                    'std': round(labels_df[col].std(), 2),
                    'min': round(labels_df[col].min(), 2),
                    'max': round(labels_df[col].max(), 2)
                }
                for col in ['avg_accuracy', 'avg_reaction_time', 'avg_hesitation', 'avg_engagement']
            }
        }
        with open(os.path.join(output_dir, 'dataset_summary.json'), 'w') as f:
            json.dump(summary, f, indent=2)

        print(f"Dataset saved to {output_dir}/")
        print(f"  - {len(dataset)} children ({n_children} per risk category)")
        print(f"  - {sum(len(d['sessions']) for d in dataset)} total sessions")
        print(f"  - {len(scenarios)} test scenarios")
        print(f"  - Files: training_data.json, training_labels.csv, test_scenarios.json, "
              f"game_configs.json, dataset_summary.json")

        return dataset, labels_df, scenarios


def generate_pipeline_input(sessions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Convert synthesized sessions into the exact format expected by CECIPipeline.predict()
    """
    return [
        {
            'gameId': s.get('gameId', 'unknown'),
            'score': s.get('score', 0),
            'timestamp': s.get('timestamp', 0),
            'sessionNumber': s.get('sessionNumber', 1),
            'behavioralMetrics': s.get('behavioralMetrics', {})
        }
        for s in sessions
    ]


if __name__ == '__main__':
    synthesizer = CECIDatasetSynthesizer(seed=42)
    synthesizer.save_dataset(
        output_dir=os.path.join(os.path.dirname(__file__), 'data'),
        n_children=50,
        sessions=5
    )
