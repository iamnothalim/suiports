#!/usr/bin/env python3
"""
모든 예측 이벤트에 대해 AI 점수를 계산하는 스크립트
"""

import requests
import json
import time

def login():
    """관리자로 로그인하여 토큰 획득"""
    login_url = "http://localhost:8000/api/v1/auth/login"
    login_data = {
        "username": "admin",
        "password": "admin123"
    }
    
    response = requests.post(login_url, data=login_data)
    if response.status_code == 200:
        token_data = response.json()
        return token_data["access_token"]
    else:
        print(f"로그인 실패: {response.status_code}")
        return None

def get_predictions(token):
    """모든 예측 이벤트 조회"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.get("http://localhost:8000/api/v1/predictions/", headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"예측 이벤트 조회 실패: {response.status_code}")
        return []

def calculate_score(token, prediction_id):
    """특정 예측 이벤트에 대해 AI 점수 계산"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(f"http://localhost:8000/api/v1/scoring/calculate/{prediction_id}", headers=headers)
    if response.status_code == 200:
        score_data = response.json()
        return score_data
    else:
        print(f"점수 계산 실패 - 예측 ID {prediction_id}: {response.status_code}")
        if response.status_code == 400:
            error_data = response.json()
            print(f"오류 메시지: {error_data.get('detail', '알 수 없는 오류')}")
        return None

def main():
    print("🚀 모든 예측 이벤트에 대해 AI 점수 계산을 시작합니다...")
    
    # 로그인
    token = login()
    if not token:
        print("❌ 로그인에 실패했습니다.")
        return
    
    print("✅ 로그인 성공")
    
    # 예측 이벤트 조회
    predictions = get_predictions(token)
    if not predictions:
        print("❌ 예측 이벤트를 조회할 수 없습니다.")
        return
    
    print(f"📊 총 {len(predictions)}개의 예측 이벤트를 발견했습니다.")
    
    # 각 예측 이벤트에 대해 점수 계산
    success_count = 0
    for prediction in predictions:
        prediction_id = prediction["id"]
        game_id = prediction["game_id"]
        prediction_text = prediction["prediction"]
        
        print(f"\n🎯 예측 ID {prediction_id}: {game_id}")
        print(f"   내용: {prediction_text}")
        
        score = calculate_score(token, prediction_id)
        if score:
            print(f"   ✅ 점수 계산 완료: {score['total_score']}점")
            success_count += 1
        else:
            print(f"   ❌ 점수 계산 실패")
        
        # API 호출 간격 조절
        time.sleep(1)
    
    print(f"\n🎉 완료! 총 {success_count}/{len(predictions)}개의 예측 이벤트에 대해 점수를 계산했습니다.")

if __name__ == "__main__":
    main()
