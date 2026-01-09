import pandas as pd
import json
import numpy as np

file_path = r'c:\Users\JAVIS\ch\ch25\docs\엑셀자료\CC0108.xlsx'

def convert_types(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.floating):
        return float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, pd.Timestamp):
        return str(obj)
    return obj

def analyze():
    xl = pd.ExcelFile(file_path)
    sheet_names = xl.sheet_names
    target_sheet = sheet_names[2]
    df = pd.read_excel(file_path, sheet_name=target_sheet)
    
    df.columns = [str(c).replace('\n', ' ').strip() for c in df.columns]
    
    stats = {}
    if len(df.columns) > 6:
        stats["status_distribution"] = {str(k): int(v) for k, v in df[df.columns[6]].value_counts().to_dict().items()}
    if len(df.columns) > 8:
        stats["group_distribution"] = {str(k): int(v) for k, v in df[df.columns[8]].value_counts().to_dict().items()}
    if len(df.columns) > 7:
        stats["tag_distribution"] = {str(k): int(v) for k, v in df[df.columns[7]].value_counts().to_dict().items()}

    summary = {
        "sheet_name": target_sheet,
        "total_rows": len(df),
        "columns": list(df.columns),
        "stats": stats
    }
    
    if '가입일' in df.columns:
        df['가입일'] = pd.to_datetime(df['가입일'], errors='coerce')
        summary["join_date_range"] = {
            "min": str(df['가입일'].min()),
            "max": str(df['가입일'].max())
        }
    
    if len(df.columns) > 5:
        active_days_col = df.columns[5]
        summary["avg_active_days"] = float(df[active_days_col].mean())
        summary["max_active_days"] = int(df[active_days_col].max())

    print(json.dumps(summary, indent=2, ensure_ascii=False))
    df.to_csv(r'c:\Users\JAVIS\ch\ch25\docs\엑셀자료\sheet3_data.csv', index=False, encoding='utf-8-sig')

if __name__ == "__main__":
    analyze()
