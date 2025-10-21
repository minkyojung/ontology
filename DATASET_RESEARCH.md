# 실제 거래/소비 데이터셋 조사 결과

**작성일**: 2025-10-20
**목적**: 법인카드 사기 탐지 시스템 학습/검증용 실제 데이터셋 확보

---

## 📊 조사 요약

### 핵심 발견사항
- ❌ **법인카드 전용 공개 데이터셋**: 없음
- ✅ **신용카드 사기 탐지 데이터셋**: 다수 존재 (활용 가능)
- ⚠️ **한국 특화 데이터**: 제한적 (개인정보보호법으로 인한 비공개)

---

## 1. 한국 공공 데이터 (🇰🇷)

### 1.1 공공데이터포털 (data.go.kr)
- **URL**: https://www.data.go.kr/
- **설명**: 정부 공공데이터 중앙 포털
- **법인카드 관련 데이터**:
  - ❌ 직접적인 법인카드 거래 데이터: 없음
  - ⚠️ 공공기관 법인카드 사용내역: 일부 공개 (집계 데이터)
  - ✅ 신용카드 통계 데이터: 연령대별, 성별 집계 (개인정보 제거됨)

**활용 가능성**: 낮음 (raw transaction data 없음)

---

### 1.2 금융 빅데이터 플랫폼
- **URL**: https://www.bigdata-finance.kr/
- **설명**: 금융위원회 운영, 금융데이터 통합 플랫폼
- **제공 데이터**:
  - ✅ 카드 사용 통계 (성별, 연령대, 신용등급별)
  - ✅ 총 사용 금액, 신용일시불 사용액, 체크카드 사용액
  - ❌ 거래 단위 raw data: 없음 (집계 데이터만)

**활용 가능성**: 중간 (통계적 분석 가능, ML 학습 불가)

---

### 1.3 Aicel (한국 브랜드별 카드 결제 데이터)
- **URL**: https://www.aiceltech.com/kr/dataset
- **설명**: 국내 신용카드사 파트너십 데이터
- **제공 데이터**:
  - ✅ 100개 이상 기업, 400개 브랜드 대상
  - ✅ 일별 결제 건수 및 금액 (주간 업데이트)
  - ⚠️ 상업용 유료 데이터 (비용 확인 필요)

**활용 가능성**: 중간 (비용 발생, 거래 단위 데이터 여부 불명확)

---

## 2. Kaggle 데이터셋 (🌍)

### 2.1 Credit Card Transactions Fraud Detection Dataset
- **작성자**: kartik2112
- **URL**: https://www.kaggle.com/datasets/kartik2112/fraud-detection
- **설명**: Sparkov를 사용한 합성 신용카드 거래 데이터
- **데이터 구조**:
  - Transaction ID, Date, Amount, Merchant, Category
  - Customer demographic data (age, gender, location)
  - Fraud label (0 = legitimate, 1 = fraud)
- **규모**: 100만+ 거래
- **장점**:
  - ✅ 거래 단위 raw data
  - ✅ MCC 유사 Category 포함
  - ✅ 라벨링 완료 (fraud/normal)

**활용 가능성**: ⭐⭐⭐⭐⭐ (가장 추천)

**법인카드 변환 방법**:
```python
# Kaggle 데이터를 법인카드처럼 변환
df['employee_id'] = df['customer_id']  # 고객 → 직원
df['merchant_category'] = df['category']  # MCC 매핑
df['department'] = assign_department(df['customer_demographics'])
df['is_business_expense'] = True
```

---

### 2.2 Credit Card Fraud Detection (ULB/Worldline)
- **작성자**: mlg-ulb
- **URL**: https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud
- **설명**: 유럽 카드 소지자 거래 데이터 (2013년 9월, 2일간)
- **데이터 구조**:
  - PCA 변환된 V1~V28 피처 (개인정보 보호)
  - Time, Amount (원본 데이터)
  - Class (0 = normal, 1 = fraud)
- **규모**: 284,807 거래, 492 fraud (0.172%)
- **장점**:
  - ✅ 실제 데이터 기반 (익명화)
  - ✅ 매우 불균형한 데이터 (실제 사기 탐지와 유사)
- **단점**:
  - ❌ PCA 변환으로 feature 해석 불가
  - ❌ MCC/Merchant 정보 없음

**활용 가능성**: ⭐⭐⭐ (ML 모델 학습용, 해석 불가)

---

### 2.3 Credit Card Fraud Detection Dataset 2023
- **작성자**: nelgiriyewithana
- **URL**: https://www.kaggle.com/datasets/nelgiriyewithana/credit-card-fraud-detection-dataset-2023
- **설명**: 2023년 업데이트 버전
- **활용 가능성**: ⭐⭐⭐⭐

---

## 3. UCI Machine Learning Repository

### 3.1 Statlog (Australian Credit Approval)
- **URL**: http://archive.ics.uci.edu/ml/datasets/statlog+(australian+credit+approval)
- **설명**: 신용카드 승인 데이터
- **데이터 구조**:
  - 6개 numerical, 8개 categorical attributes
  - Binary classification (approved/rejected)
- **단점**:
  - ❌ 거래 데이터 아님 (승인 데이터)
  - ❌ 사기 탐지용 아님

**활용 가능성**: ⭐ (다른 목적)

---

## 4. OpenML / Hugging Face

### 4.1 OpenML Credit Card Fraud Detection
- **URL**: https://www.openml.org/search?type=data&id=43627
- **설명**: Kaggle ULB 데이터셋과 동일
- **활용 가능성**: ⭐⭐⭐

---

### 4.2 Hugging Face Financial Fraud Dataset
- **URL**: https://huggingface.co/datasets/amitkedia/Financial-Fraud-Dataset
- **설명**: 금융 사기 탐지 데이터셋
- **활용 가능성**: ⭐⭐⭐

---

## 5. 상업용/기관 데이터

### 5.1 JPMorgan Chase Synthetic Data
- **URL**: https://www.jpmorgan.com/technology/artificial-intelligence/initiatives/synthetic-data/payments-data-for-fraud-detection
- **설명**: 결제 데이터 합성 데이터셋
- **활용 가능성**: ⭐⭐⭐⭐ (접근성 확인 필요)

---

## 📋 최종 추천

### Option 1: Kaggle Simulated Dataset (가장 추천) ⭐⭐⭐⭐⭐
- **데이터셋**: kartik2112/fraud-detection
- **이유**:
  1. ✅ 거래 단위 raw data
  2. ✅ MCC 유사 Category 포함
  3. ✅ Merchant, Customer 정보 포함
  4. ✅ 라벨링 완료 (fraud/normal)
  5. ✅ 100만+ 거래 (충분한 규모)

**변환 작업**:
```python
# 1. Category → MCC 매핑
category_to_mcc = {
    'entertainment': '7995',  # 도박
    'gas_transport': '5542',  # 주유소
    'grocery_pos': '5411',    # 식료품
    'shopping_net': '5732',   # 전자제품
    # ...
}

# 2. Customer → Employee 변환
df['employee_id'] = 'EMP' + df['customer_id'].astype(str)
df['department'] = assign_department_by_age(df['age'])

# 3. 법인카드 특화 필드 추가
df['expense_category'] = map_to_expense_category(df['category'])
df['is_policy_compliant'] = check_compliance(df)
```

---

### Option 2: 한국 데이터 + Kaggle 하이브리드
1. **금융 빅데이터 플랫폼**에서 한국 카드 사용 통계 다운로드
2. **Kaggle 데이터**를 한국 통계에 맞게 조정
   - 한국 MCC 코드 사용
   - 한국 가맹점 이름 생성
   - 한국 직원 이름/부서 생성

---

## 🚀 다음 단계

### 즉시 실행 가능
1. **Kaggle kartik2112 데이터셋 다운로드**
   ```bash
   kaggle datasets download -d kartik2112/fraud-detection
   ```

2. **데이터 변환 스크립트 작성**
   ```
   scripts/09_import_kaggle_data.py
   ```

3. **Neo4j 임포트**
   - Employee, Merchant, Transaction 노드 생성
   - 기존 MCC 데이터와 매핑
   - FraudCase 생성

### 중기 (1-2주)
4. **한국 MCC 코드 매핑 강화**
   - Kaggle Category → 한국 MCC
   - 한국 가맹점 이름 생성

5. **Golden Set 확장**
   - 현재: 합성 데이터
   - 목표: Kaggle 실제 데이터 기반

---

## 📚 참고 자료

### 데이터셋 검색 키워드
- `credit card fraud detection dataset`
- `corporate expense fraud detection`
- `transaction fraud dataset kaggle`
- `financial transaction anomaly detection`

### 유용한 링크
- [Papers with Code - Fraud Detection Datasets](https://paperswithcode.com/datasets?mod=tabular&task=fraud-detection)
- [Kaggle Fraud Detection Datasets](https://www.kaggle.com/datasets?search=fraud+detection)
- [공공데이터포털](https://www.data.go.kr/)
- [금융 빅데이터 플랫폼](https://www.bigdata-finance.kr/)

---

## ⚠️ 주의사항

### 개인정보보호
- ❌ 실제 법인카드 데이터는 민감정보 (개인정보보호법)
- ✅ 합성 데이터 또는 익명화 데이터만 사용
- ✅ 실제 배포 시 데이터 마스킹 필수

### 라이선스 확인
- Kaggle 데이터셋: 대부분 CC BY-SA 4.0 (상업적 사용 가능)
- UCI 데이터셋: Citation 필요
- 상업용 데이터: 별도 라이선스 확인 필요

---

**Last Updated**: 2025-10-20
**Next Review**: 프로젝트 Phase 2 시작 시
