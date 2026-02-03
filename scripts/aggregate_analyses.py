import pandas as pd
import os
import argparse

def aggregate_analyses(output_dir: str, final_csv: str):
    print("📊 집합 분석 시작...")

    files = [
        'psychology_analysis.csv',
        'referral_analysis.csv',
        'launch_analysis.csv',
        'onboarding_analysis.csv',
        'page_cro_analysis.csv',
        'popup_cro_analysis.csv',
        'paywall_cro_analysis.csv'
    ]

    aggregated = {}
    for file in files:
        path = os.path.join(output_dir, file)
        if os.path.exists(path):
            df = pd.read_csv(path)
            key = file.replace('_analysis.csv', '').replace('cro_', '').replace('_cro', '')
            aggregated[key] = df.to_dict('records')[0] if not df.empty else {}

    # 통합 점수 계산 (예: 평균 점수 기반 종합 추천)
    scores = []
    recommendations = []
    for k, v in aggregated.items():
        if 'plfs' in v:
            scores.append(v['plfs'])
        elif 'readiness_score' in v:
            scores.append(v['readiness_score'])
        elif 'conversion_rate' in v:
            scores.append(v['conversion_rate'] * 100)  # 퍼센트로 변환
        if 'recommendation' in v:
            recommendations.append(v['recommendation'])

    avg_score = sum(scores) / len(scores) if scores else 0
    overall_recommendation = "다양한 스킬 적용으로 마케팅 최적화" if avg_score > 50 else "기본 스킬부터 강화"

    aggregated['summary'] = {
        'avg_score': avg_score,
        'overall_recommendation': overall_recommendation,
        'key_insights': '; '.join(recommendations[:3])  # 상위 3개 추천
    }

    df_final = pd.DataFrame.from_dict(aggregated, orient='index')
    df_final.to_csv(final_csv)
    print(f"📄 집합 분석 결과 저장: {final_csv}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="집합 분석")
    parser.add_argument("--output_dir", default=".", help="분석 파일 디렉토리")
    parser.add_argument("--final_csv", default="aggregated_analysis.csv", help="최종 CSV")
    args = parser.parse_args()
    aggregate_analyses(args.output_dir, args.final_csv)