
import sys
import os
# Add project root to sys.path
sys.path.append(os.path.abspath("c:/Users/JAVIS/ch/ch25"))

from tests.v2.verification.test_v2_sot_compliance import test_no_v1_model_imports_in_v2

try:
    test_no_v1_model_imports_in_v2()
    print("SOT Compliance Passed!")
except AssertionError as e:
    print(e)
except Exception as e:
    print(f"Error: {e}")
