import json
import requests
from typing import Dict, Any, Tuple
from app.core.config import settings

class AIScoringService:
    def __init__(self):
        self.gemini_api_key = getattr(settings, 'GEMINI_API_KEY', 'your-gemini-api-key')
        self.gemini_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
    
    def calculate_prediction_score(self, prediction_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        예측 이벤트에 대한 AI 점수 계산
        """
        try:
            # Gemini API를 사용한 점수 계산
            score_result = self._call_gemini_api(prediction_data)
            
            # 점수 정규화 및 검증
            normalized_scores = self._normalize_scores(score_result)
            
            return normalized_scores
            
        except Exception as e:
            print(f"AI scoring error: {e}")
            # 오류 시 기본 점수 반환
            return self._get_default_scores()
    
    def _call_gemini_api(self, prediction_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Gemini API 호출하여 점수 계산
        """
        prompt = self._create_scoring_prompt(prediction_data)
        
        payload = {
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }],
            "generationConfig": {
                "temperature": 0.3,
                "topK": 40,
                "topP": 0.95,
                "maxOutputTokens": 2048,
            }
        }
        
        headers = {
            "Content-Type": "application/json",
        }
        
        url = f"{self.gemini_url}?key={self.gemini_api_key}"
        
        try:
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()
            
            result = response.json()
            ai_response = result['candidates'][0]['content']['parts'][0]['text']
            
            # JSON 파싱
            return self._parse_ai_response(ai_response)
            
        except requests.exceptions.HTTPError as e:
            print(f"Gemini API HTTP error: {e}")
            if e.response.status_code == 404:
                print("API 엔드포인트를 확인해주세요. Gemini API 키가 유효한지 확인하세요.")
            elif e.response.status_code == 403:
                print("API 키가 유효하지 않거나 권한이 없습니다.")
            elif e.response.status_code == 400:
                print("API 요청 형식이 잘못되었습니다.")
            return self._get_default_scores()
        except Exception as e:
            print(f"Gemini API error: {e}")
            return self._get_default_scores()
    
    def _create_scoring_prompt(self, prediction_data: Dict[str, Any]) -> str:
        """
        AI 점수 계산을 위한 프롬프트 생성
        """
        prompt = f"""
당신은 스포츠 예측 이벤트의 품질을 평가하는 AI 전문가입니다. 
다음 예측 이벤트를 5개 카테고리로 평가하고 각각 0-100점으로 점수를 매겨주세요.

예측 정보:
- 게임 ID: {prediction_data.get('game_id', '')}
- 예측 내용: {prediction_data.get('prediction', '')}
- 옵션 A: {prediction_data.get('option_a', '')}
- 옵션 B: {prediction_data.get('option_b', '')}
- 제안자: {prediction_data.get('creator_username', '')}
- 제안자 활동일수: {prediction_data.get('creator_activity_days', 0)}
- 제안자 기여도: {prediction_data.get('creator_contribution_score', 0.0)}

평가 기준:

(A) 품질/해결 가능성 (35% 가중치)
- 명확도: 이분법/멀티클래스가 명확한가 (모호 문구 감점)
- 판정 근거: 1차 데이터 소스 존재 (공식 리그/기관/API)
- 타임프레임: 종료 시점이 분명한가 (무기한/지연 위험 감점)
- 규정 준수: 지역 규제/콘텐츠 정책 충돌 여부

(B) 수요/트렌드 신호 (25% 가중치)
- 트렌드 지표: X 언급량·속도, 검색트렌드, 뉴스량 변화
- 주제 인기: 팀/선수 지역 인기, 리그 중요도
- 시의성: 경기 D-날짜 근접, 이적시장/컵대회 시즌성

(C) 제안자 신뢰/기여 (20% 가중치)
- 충성도: 활동일수, 커뮤니티 레벨, 과거 기여·정확도
- 성공 히스토리: 과거 제안 채택률, 거래량/참여율
- 본드 규모: 제안 시 스테이킹 (소각/슬래시 위험 감수)

(D) 선점/중복도 (10% 가중치)
- 최초성: 동일/유사 마켓 대비 최초 제안 (타임스탬프 가점)
- 중복도: 의미·엔티티·기간이 유사한 기존 마켓과의 거리

(E) 경제성/운영성 (10% 가중치)
- 예상 유동성: 과거 유사 주제의 평균 참여/거래량
- 스프레드/변동성: 가격발견에 유리한가 (극단적 원사이드 감점)
- 오라클 비용/지연 리스크: 판정 수고/비용 추정

다음 JSON 형식으로 응답해주세요:
{{
    "quality_score": 85,
    "demand_score": 72,
    "reputation_score": 60,
    "novelty_score": 90,
    "economic_score": 75,
    "quality_details": {{
        "clarity": 90,
        "data_source": 80,
        "timeframe": 85,
        "compliance": 85
    }},
    "demand_details": {{
        "trend_indicators": 70,
        "topic_popularity": 75,
        "timing": 70
    }},
    "reputation_details": {{
        "loyalty": 60,
        "success_history": 50,
        "bond_size": 70
    }},
    "novelty_details": {{
        "first_mover": 95,
        "uniqueness": 85
    }},
    "economic_details": {{
        "liquidity": 80,
        "volatility": 70,
        "oracle_cost": 75
    }},
    "ai_reasoning": "이 예측은 명확한 이분법 구조를 가지고 있으며, 공식 리그 데이터를 기반으로 합니다. 하지만 제안자의 활동 이력이 부족하여 신뢰도 점수가 낮습니다."
}}
"""
        return prompt
    
    def _parse_ai_response(self, ai_response: str) -> Dict[str, Any]:
        """
        AI 응답을 파싱하여 점수 추출
        """
        try:
            # JSON 부분만 추출
            start_idx = ai_response.find('{')
            end_idx = ai_response.rfind('}') + 1
            
            if start_idx != -1 and end_idx != -1:
                json_str = ai_response[start_idx:end_idx]
                return json.loads(json_str)
            else:
                return self._get_default_scores()
                
        except json.JSONDecodeError:
            return self._get_default_scores()
    
    def _normalize_scores(self, scores: Dict[str, Any]) -> Dict[str, Any]:
        """
        점수를 정규화하고 총점 계산
        """
        # 각 카테고리 점수 (0-100)
        quality_score = min(100, max(0, scores.get('quality_score', 70)))
        demand_score = min(100, max(0, scores.get('demand_score', 60)))
        reputation_score = min(100, max(0, scores.get('reputation_score', 50)))
        novelty_score = min(100, max(0, scores.get('novelty_score', 80)))
        economic_score = min(100, max(0, scores.get('economic_score', 65)))
        
        # 가중치 적용하여 총점 계산
        total_score = (
            quality_score * 0.35 +
            demand_score * 0.25 +
            reputation_score * 0.20 +
            novelty_score * 0.10 +
            economic_score * 0.10
        )
        
        return {
            'quality_score': quality_score,
            'demand_score': demand_score,
            'reputation_score': reputation_score,
            'novelty_score': novelty_score,
            'economic_score': economic_score,
            'total_score': round(total_score, 2),
            'quality_details': scores.get('quality_details', {}),
            'demand_details': scores.get('demand_details', {}),
            'reputation_details': scores.get('reputation_details', {}),
            'novelty_details': scores.get('novelty_details', {}),
            'economic_details': scores.get('economic_details', {}),
            'ai_reasoning': scores.get('ai_reasoning', 'AI 평가 완료')
        }
    
    def _get_default_scores(self) -> Dict[str, Any]:
        """
        기본 점수 반환 (API 오류 시)
        """
        return {
            'quality_score': 70.0,
            'demand_score': 60.0,
            'reputation_score': 50.0,
            'novelty_score': 80.0,
            'economic_score': 65.0,
            'total_score': 65.0,
            'quality_details': {
                'clarity': 70,
                'data_source': 70,
                'timeframe': 70,
                'compliance': 70
            },
            'demand_details': {
                'trend_indicators': 60,
                'topic_popularity': 60,
                'timing': 60
            },
            'reputation_details': {
                'loyalty': 50,
                'success_history': 50,
                'bond_size': 50
            },
            'novelty_details': {
                'first_mover': 80,
                'uniqueness': 80
            },
            'economic_details': {
                'liquidity': 65,
                'volatility': 65,
                'oracle_cost': 65
            },
            'ai_reasoning': '기본 점수 적용 (AI 평가 오류)'
        }
