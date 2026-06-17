#!/usr/bin/env python3
"""
SubZero - JSON 거래 데이터 비식별화(De-identification) 스크립트

처리 방식:
1. 이름/계좌/카드/거래ID → 매핑 dict 기반 가명처리 (동일인=동일코드 유지)
2. 거래처명 → 원본 유지 (서비스 정확성)
3. 날짜 → 년월 + 주차 + 요일 + 일자 (패턴 분석 가능)
4. 금액/잔액 → 정확히 유지 (스케일링 제거)
"""

import json
import hashlib
import random
import os
from collections import OrderedDict

# ─── 설정 ─────────────────────────────────────────────────────
ORIGINAL_FILE = "data/original/multi_account_transactions.json"
OUTPUT_DIR = "data/anonymized"
ANONYMIZED_FILE = os.path.join(OUTPUT_DIR, "anon_transactions.json")
MAPPING_FILE = os.path.join(OUTPUT_DIR, "mapping.json")

# ─── 카테고리 매핑 (거래처명 → 카테고리_세부코드_번호) ─────
VENDOR_CATEGORY_MAP = {
    "NETFLIX": "ENT_OTT_STREAMING_001",
    "GOOGLE YOUTUBE": "ENT_OTT_STREAMING_002",
    "WATCHA": "ENT_OTT_STREAMING_003",
    "YOUTUBE": "ENT_OTT_STREAMING_002",
    "SPOTIFY": "ENT_MUSIC_001",
    "MELON": "ENT_MUSIC_002",
    "SK텔레콤": "TELECOM_MOBILE_001",
    "SKT": "TELECOM_MOBILE_001",
    "서울도시가스": "UTILITY_GAS_001",
    "스포애니 강남점": "FIT_GYM_001",
    "스포애니": "FIT_GYM_001",
    "임대인 박영희": "HOUSING_RENT_001",
    "우아한형제들": "F&B_DELIVERY_001",
    "배달의민족": "F&B_DELIVERY_001",
    "김밥천국 역삼점": "F&B_KOREAN_001",
    "김밥천국": "F&B_KOREAN_001",
    "스타벅스코리아": "F&B_CAFE_001",
    "스타벅스": "F&B_CAFE_001",
    "CU": "F_B_CONVENIENCE_001",
    "티머니": "TRANSPORT_CHARGE_001",
    "카카오T": "TRANSPORT_TAXI_001",
    "카카오페이 택시": "TRANSPORT_TAXI_001",
    "CGV 강남": "ENT_CINEMA_001",
    "CGV": "ENT_CINEMA_001",
    "CJ올리브영": "SHOPPING_BEAUTY_001",
    "올리브영": "SHOPPING_BEAUTY_001",
    "카카오": "ETC_KAKAO_001",
    "카카오뱅크 26주적금": "FINANCE_SAVING_001",
    "여행모임 총무 최수진": "FINANCE_GROUP_001",
    "동아리회장 정민지": "FINANCE_GROUP_002",
    "김철수": "TRANSFER_FRIEND_001",
    "박지훈": "TRANSFER_FRIEND_002",
    "홍부모": "TRANSFER_FAMILY_001",
}

DEFAULT_CATEGORY = "UNCLASSIFIED_OTHER_001"


def generate_hash_id(raw: str, namespace: str, mapping: dict) -> str:
    """SHA-256 해시 기반으로 매핑 dict에 저장하고 짧은 ID 반환"""
    if raw in mapping:
        return mapping[raw]

    hash_input = f"{namespace}:{raw}"
    hash_hex = hashlib.sha256(hash_input.encode("utf-8")).hexdigest()
    short_id = f"{namespace}_{hash_hex[:6].upper()}"

    if short_id in mapping.values() and raw not in mapping:
        short_id = f"{namespace}_{hash_hex[:8].upper()}"

    mapping[raw] = short_id
    return short_id


def mask_bank_account(account_number: str) -> str:
    """계좌번호 중간 마스킹 (은행코드는 유지)"""
    parts = account_number.split("-")
    if len(parts) >= 2:
        return f"{parts[0]}-**-{parts[-1]}"
    if len(account_number) > 4:
        masked = account_number[:2] + "*" * (len(account_number) - 4) + account_number[-2:]
        return masked
    return "****"


def anonymize_transactions(data: dict) -> dict:
    """거래 데이터 비식별화 (스케일링 없음 - 금액/잔액 정확 유지)"""
    person_map = {}
    account_map = {}
    card_map = {}
    id_map = {}

    anon_data = OrderedDict()
    anon_data["accountHolderName"] = generate_hash_id(data["accountHolderName"], "P", person_map)
    anon_data["accounts"] = []

    for acc in data["accounts"]:
        raw_account = acc["accountNumber"]
        masked_account = mask_bank_account(raw_account)
        bank_code = acc.get("bankCode", "")

        anon_acc = OrderedDict()
        anon_acc["bankCode"] = bank_code
        anon_acc["bankName"] = acc.get("bankName", "")
        anon_acc["branchCode"] = "***"
        anon_acc["branchName"] = "***"
        anon_acc["accountNumber"] = masked_account
        anon_acc["accountHolder"] = generate_hash_id(acc["accountHolder"], "P", person_map)
        anon_acc["accountType"] = acc.get("accountType", "")
        anon_acc["nickname"] = f"계좌_{generate_hash_id(acc['nickname'] if 'nickname' in acc else raw_account, 'ACCT', account_map)}"
        anon_acc["currency"] = acc.get("currency", "")
        anon_acc["openDate"] = acc.get("openDate", "")
        if anon_acc["openDate"]:
            anon_acc["openDate"] = anon_acc["openDate"][:7]
        anon_acc["status"] = acc.get("status", "")
        # 스케일링 제거 - 정확한 잔액 유지
        anon_acc["balance"] = acc.get("balance", 0)
        anon_acc["availableBalance"] = acc.get("availableBalance", 0)
        anon_acc["transactions"] = []

        counterparty_account_map = {}

        for tx in acc["transactions"]:
            raw_id = tx["transactionId"]
            tx_id = generate_hash_id(raw_id, "ANON", id_map)

            # 날짜 처리
            date_str = tx.get("date", "")
            year_month = ""
            week_of_month = 0
            day_of_week = ""
            day_of_month = 0
            if date_str:
                parts = date_str.split("-")
                if len(parts) == 3:
                    year_month = f"{parts[0]}-{parts[1]}"
                    day_of_month = int(parts[2])
                    week_of_month = (day_of_month - 1) // 7 + 1
                    from datetime import datetime
                    try:
                        dt = datetime(int(parts[0]), int(parts[1]), int(parts[2]))
                        day_names = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
                        day_of_week = day_names[dt.weekday()]
                    except:
                        day_of_week = "UNKNOWN"

            # 거래처 처리 - 원본 이름 유지 (서비스 정확성)
            counterparty = tx.get("counterparty", {})
            cp_name = counterparty.get("name", "")
            category_code = VENDOR_CATEGORY_MAP.get(cp_name, DEFAULT_CATEGORY)

            # 상대방 계좌 마스킹
            cp_account = counterparty.get("accountNumber", "")
            if cp_account:
                if cp_account not in counterparty_account_map:
                    masked_cp = mask_bank_account(cp_account)
                    counterparty_account_map[cp_account] = masked_cp
                cp_account_masked = counterparty_account_map[cp_account]
            else:
                cp_account_masked = ""

            # 금액 - 정확히 유지 (스케일링 제거)
            amount = tx.get("amount", 0)

            description = tx.get("description", "")

            anon_tx = OrderedDict()
            anon_tx["transactionId"] = tx_id
            anon_tx["yearMonth"] = year_month
            anon_tx["weekOfMonth"] = week_of_month
            anon_tx["dayOfWeek"] = day_of_week
            anon_tx["dayOfMonth"] = day_of_month
            anon_tx["time"] = tx.get("time", "")
            anon_tx["type"] = tx.get("type", "")
            anon_tx["amount"] = amount  # 정확한 금액 유지
            anon_tx["balanceAfter"] = tx.get("balanceAfter", 0)  # 정확한 잔액 유지
            anon_tx["description"] = description
            anon_tx["categoryCode"] = category_code
            anon_tx["counterparty"] = OrderedDict()
            anon_tx["counterparty"]["name"] = cp_name  # 실제 거래처명 유지
            anon_tx["counterparty"]["bank"] = counterparty.get("bank", "")
            anon_tx["counterparty"]["accountNumber"] = cp_account_masked

            anon_acc["transactions"].append(anon_tx)

        anon_data["accounts"].append(anon_acc)

    mapping_info = {
        "persons": person_map,
        "accounts": account_map,
        "cards": card_map,
        "ids": id_map,
        "vendorMap": VENDOR_CATEGORY_MAP,
    }

    return anon_data, mapping_info


def main():
    # 원본 파일 읽기
    if not os.path.exists(ORIGINAL_FILE):
        root_file = "multi_account_transactions.json"
        if os.path.exists(root_file):
            print(f"[INFO] {root_file} → {ORIGINAL_FILE} 복사 중...")
            os.makedirs("data/original", exist_ok=True)
            with open(root_file, "r", encoding="utf-8") as f:
                original_data = json.load(f, object_pairs_hook=OrderedDict)
            with open(ORIGINAL_FILE, "w", encoding="utf-8") as f:
                json.dump(original_data, f, ensure_ascii=False, indent=2)
            print(f"[INFO] 원본 저장 완료: {ORIGINAL_FILE}")
        else:
            print(f"[ERROR] 원본 파일 없음: {ORIGINAL_FILE}")
            return
    else:
        with open(ORIGINAL_FILE, "r", encoding="utf-8") as f:
            original_data = json.load(f, object_pairs_hook=OrderedDict)

    # 비식별화 실행 (스케일링 없음)
    anon_data, mapping_info = anonymize_transactions(original_data)

    # 출력 디렉토리 생성
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 비식별화 데이터 저장
    with open(ANONYMIZED_FILE, "w", encoding="utf-8") as f:
        json.dump(anon_data, f, ensure_ascii=False, indent=2)
    print(f"[✅] 비식별화 완료: {ANONYMIZED_FILE}")

    # 매핑 정보 저장
    with open(MAPPING_FILE, "w", encoding="utf-8") as f:
        json.dump(mapping_info, f, ensure_ascii=False, indent=2)
    print(f"[🔑] 매핑 정보 저장: {MAPPING_FILE}")

    total_tx = sum(len(acc["transactions"]) for acc in anon_data["accounts"])
    print(f"[📊] 통계: {len(anon_data['accounts'])}개 계좌, {total_tx}개 거래 비식별화 완료")


if __name__ == "__main__":
    main()