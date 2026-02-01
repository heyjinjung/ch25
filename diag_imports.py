
import os
import sys

# Add project root to sys.path
sys.path.append(os.getcwd())

from tests.v2_tests.phase2_core.test_vault_withdrawal_logic import VaultService, User as TestUser

print(f"VaultService class: {VaultService}")
print(f"VaultService module: {VaultService.__module__}")
print(f"User class: {TestUser}")
print(f"User module: {TestUser.__module__}")

import inspect
print(f"File containing VaultService: {inspect.getfile(VaultService)}")
