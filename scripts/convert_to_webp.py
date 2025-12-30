import os
from PIL import Image

def convert_to_webp(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.lower().endswith(('.png', '.jpg', '.jpeg')):
                file_path = os.path.join(root, file)
                name, ext = os.path.splitext(file_path)
                webp_path = name + ".webp"
                
                # Check if it's already converted
                if os.path.exists(webp_path):
                    print(f"Skipping (already exists): {webp_path}")
                    continue
                
                try:
                    with Image.open(file_path) as img:
                        img.save(webp_path, "WEBP", quality=85)
                        print(f"Converted: {file_path} -> {webp_path}")
                except Exception as e:
                    print(f"Failed to convert {file_path}: {e}")

if __name__ == "__main__":
    assets_dir = r"c:\Users\JAVIS\ch\ch25\public\assets"
    print(f"Starting WebP conversion in {assets_dir}...")
    convert_to_webp(assets_dir)
    print("WebP conversion completed.")
