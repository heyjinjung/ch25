import os
from PIL import Image
import sys

def convert_to_webp(directory):
    print(f"Starting WebP conversion in {directory}...")
    count = 0
    errors = 0
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.lower().endswith(('.png', '.jpg', '.jpeg')):
                file_path = os.path.join(root, file)
                webp_path = os.path.splitext(file_path)[0] + '.webp'
                
                if os.path.exists(webp_path):
                    continue
                    
                try:
                    img = Image.open(file_path)
                    img.save(webp_path, 'WEBP', quality=80)
                    print(f"Converted: {file} -> .webp")
                    count += 1
                except Exception as e:
                    print(f"Error converting {file}: {e}")
                    errors += 1
                    
    print(f"Finished. Converted {count} images. Errors: {errors}")

if __name__ == "__main__":
    target_dir = sys.argv[1] if len(sys.argv) > 1 else "./public"
    convert_to_webp(target_dir)
