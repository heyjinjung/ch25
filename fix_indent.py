import sys

def fix_indentation(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    with open(filepath, 'w', encoding='utf-8') as f:
        for i, line in enumerate(lines):
            lineno = i + 1
            stripped = line.lstrip()
            if not stripped:
                f.write('\n')
                continue
                
            # Line range for the refactored block
            if lineno >= 228 and lineno <= 245:
                # if/elif/else/event_rewards/event_reward_override/if override
                if any(stripped.startswith(p) for p in ["if", "elif", "else:", "event_rewards", "event_reward_override", "pass"]):
                    # Note: event_rewards and event_reward_override are at the same level as if
                    f.write(' ' * 17 + stripped)
                else:
                    # Content inside blocks
                    f.write(' ' * 21 + stripped)
            else:
                f.write(line)

if __name__ == "__main__":
    fix_indentation(r'c:\Users\JAVIS\ch\ch25\app\services\dice_service.py')
    print("Indentation fixed.")
