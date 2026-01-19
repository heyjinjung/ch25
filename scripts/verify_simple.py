import sys
import os

sys.path.append(os.getcwd())

try:
    from app.models.user_retention_state import UserRetentionState
    print("Imported UserRetentionState successfully.")
    print(f"Has churn_probability_score? {hasattr(UserRetentionState, 'churn_probability_score')}")
    print(f"Type: {type(UserRetentionState.churn_probability_score)}")
except Exception as e:
    print(f"Error: {e}")
