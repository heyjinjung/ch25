
with open("production_dump_py.sql", "rb") as f:
    content = f.read()
    if b"CREATE TABLE `users`" in content:
        print("FOUND: CREATE TABLE `users`")
    else:
        print("NOT FOUND: CREATE TABLE `users`")
    
    print(f"Total size: {len(content)}")
