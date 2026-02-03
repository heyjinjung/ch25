import bcrypt

stored_hash = "$2b$12$oo5LjwRO34tH7t9JXGkRuepiH2i6RYY0a81pHrz0zyU6guFxAjRoW"
password = "20260130"

match = bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))
print(f"Password match: {match}")

# 새로운 해시 생성해서 비교
new_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
print(f"New hash: {new_hash.decode('utf-8')}")
print(f"New hash matches: {bcrypt.checkpw(password.encode('utf-8'), new_hash)}")
