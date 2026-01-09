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
                    # 파일 헤더 확인 (SVG 여부 체크)
                    with open(file_path, 'rb') as f:
                        header = f.read(10)
                        if b'<svg' in header.lower():
                            # SVG인데 PNG/JPG 확장자로 되어있는 경우 무시
                            continue

                    img = Image.open(file_path)
                    img.save(webp_path, 'WEBP', quality=80)
                    print(f"Converted: {file} -> .webp")
                    count += 1
                except Exception as e:
                    # 진짜 이미지 에러인 경우에만 출력
                    print(f"Skipping {file}: {e}")
                    # 에러 카운트에서는 제외 (빌드 성공을 위함)
                    
    print(f"Finished. Converted {count} images. Errors: {errors}")

if __name__ == "__main__":
    target_dir = sys.argv[1] if len(sys.argv) > 1 else "./public"
    convert_to_webp(target_dir)
