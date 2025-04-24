import re
from datetime import datetime, timedelta


def extract_address_from_text(text):
    match = re.search(r"\[(집합건물|건물)\]\s*(광주광역시[^\n]+)", text)
    if match:
        return match.group(2).strip()

    match = re.search(r"\[도로명주소\]\s*(광주광역시[^\n]+)", text)
    if match:
        return match.group(1).strip()

    return None


def normalize_address(addr):
    addr = re.sub(r"\s+", "", addr).lower()
    addr = re.sub(r"광주광역시", "", addr)
    return addr


def analyze_register_with_user_input(text, landlord_input, contract_date_input, deposit_str, address_input):
    deductions = []
    deduction_reasons = set()
    warnings = []

    # 보증금 처리
    try:
        deposit = int(re.sub(r"[^\d]", "", deposit_str)) if deposit_str else None
        if deposit is None:
            warnings.append("· 보증금 → 근저당권 분석 제외됨")
            reason = "보증금 미입력으로 근저당권 비교 불가 (미확인)"
            if reason not in deduction_reasons:
                deductions.append({"reason": reason, "point": -5})
                deduction_reasons.add(reason)
    except:
        deposit = None
        warnings.append("· 보증금 → 근저당권 분석 제외됨")
        reason = "보증금 미입력으로 근저당권 비교 불가 (미확인)"
        if reason not in deduction_reasons:
            deductions.append({"reason": reason, "point": -5})
            deduction_reasons.add(reason)

    # 근저당권 감지
    mortgage_matches = re.findall(r"채권최고액[\s:()]*금?\s*([\d,]+)\s*원", text)
    if mortgage_matches:
        try:
            raw_amount = mortgage_matches[0]
            amount = int(re.sub(r"[^\d]", "", raw_amount))
            if deposit is not None:
                if amount > deposit:
                    point = -10 if "말소" in text[text.find(raw_amount):text.find(raw_amount)+200] else -20
                    reason = f"근저당권 채권최고액({amount:,}원)가 보증금({deposit}) 초과"
                else:
                    point = -5
                    reason = "근저당권 설정 존재 (보증금 미초과)"
            else:
                reason = "근저당권 존재 (보증금 미입력으로 초과 여부 판단 불가) (미확인)"
                point = -5
            if reason not in deduction_reasons:
                deductions.append({"reason": reason, "point": point})
                deduction_reasons.add(reason)
        except:
            deductions.append({"reason": "근저당권 감지 (직접 확인 필요)", "point": -5})

    # 가압류 감지
    garnishments = [m for m in re.finditer(r"가압류.*?\n(.*?)\n", text)]
    active = [m for m in garnishments if "말소" not in m.group(1)]
    if active:
        count = len(active)
        reason = f"가압류 다중 발생 ({count}건)" if count > 1 else "가압류 1건 존재"
        point = -15 if count > 1 else -10
        if reason not in deduction_reasons:
            deductions.append({"reason": reason, "point": point})
            deduction_reasons.add(reason)

    # 압류 감지
    for match in re.finditer(r"압류.*?\n(.*?)\n", text):
        if "말소" not in match.group(1):
            reason = "압류 등기 (말소 안됨)"
            if reason not in deduction_reasons:
                deductions.append({"reason": reason, "point": -15})
                deduction_reasons.add(reason)

    # 계약일 이후 위험 등기 감지
    date_matches = re.findall(r"(20\d{2})[.\-/년 ]+(\d{1,2})[.\-/월 ]+(\d{1,2})[일]?", text)
    if contract_date_input:
        try:
            contract_dt = datetime.strptime(contract_date_input, "%Y-%m-%d")
            for y, m, d in date_matches:
                try:
                    dt = datetime(int(y), int(m), int(d))
                    if dt > contract_dt:
                        snippet = text[text.find(y):text.find(y)+100]
                        if any(keyword in snippet for keyword in ["근저당", "경매", "압류", "가압류"]):
                            reason = f"계약일({contract_dt.date()}) 이후 위험 등기 발생 ({dt.date()})"
                            if reason not in deduction_reasons:
                                deductions.append({"reason": reason, "point": -15})
                                deduction_reasons.add(reason)
                                break
                except:
                    continue
        except:
            reason = "계약일 형식 오류로 비교 불가 (미확인)"
            if reason not in deduction_reasons:
                deductions.append({"reason": reason, "point": -10})
                deduction_reasons.add(reason)
            warnings.append("· 계약일 → 형식 오류로 선순위 권리 감지 제외됨")
    else:
        reason = "계약일 미입력으로 비교 불가 (미확인)"
        if reason not in deduction_reasons:
            deductions.append({"reason": reason, "point": -5})
            deduction_reasons.add(reason)
        warnings.append("· 계약일 → 선순위 권리 감지 제외됨")

    # 임대인 비교
    if landlord_input:
        if landlord_input not in text:
            reason = "입력한 임대인이 등기부 상 소유자와 불일치"
            if reason not in deduction_reasons:
                deductions.append({"reason": reason, "point": -20})
                deduction_reasons.add(reason)
    else:
        reason = "임대인 정보 미입력으로 비교 불가 (미확인)"
        if reason not in deduction_reasons:
            deductions.append({"reason": reason, "point": -5})
            deduction_reasons.add(reason)
        warnings.append("· 임대인 → 실소유자 불일치 확인 제외됨")

    # 주소 비교
    register_addr = extract_address_from_text(text)
    if address_input:
        norm_user = normalize_address(address_input)
        norm_reg = normalize_address(register_addr) if register_addr else None

        if register_addr:
            if norm_user not in norm_reg:
                reason = "입력한 주소와 등기부 소재지가 일치하지 않음"
                if reason not in deduction_reasons:
                    deductions.append({"reason": reason, "point": -20})
                    deduction_reasons.add(reason)
        else:
            reason = "등기부에서 주소(소재지)를 추출할 수 없음 (미확인)"
            if reason not in deduction_reasons:
                deductions.append({"reason": reason, "point": -10})
                deduction_reasons.add(reason)
    else:
        reason = "주소 미입력으로 비교 불가 (미확인)"
        if reason not in deduction_reasons:
            deductions.append({"reason": reason, "point": -10})
            deduction_reasons.add(reason)

    # 신탁
    if "신탁" in text:
        reason = "신탁 구조로 소유자 간접소유"
        if reason not in deduction_reasons:
            deductions.append({"reason": reason, "point": -10})
            deduction_reasons.add(reason)

    # 가등기
    if "가등기" in text:
        reason = "가등기 설정 존재 - 소유권 불안정 가능성"
        if reason not in deduction_reasons:
            deductions.append({"reason": reason, "point": -10})
            deduction_reasons.add(reason)

    # 경매 이력
    if "경매개시" in text or "경매개시결정" in text:
        reason = "경매개시결정 이력 존재 - 위험 물건 가능성"
        if reason not in deduction_reasons:
            deductions.append({"reason": reason, "point": -20})
            deduction_reasons.add(reason)

    # 임차권등기명령
    if "임차권등기명령" in text:
        reason = "임차권 등기명령 존재 - 선순위 임차인 가능성"
        if reason not in deduction_reasons:
            deductions.append({"reason": reason, "point": -15})
            deduction_reasons.add(reason)

    return deductions, warnings

def generate_summary_and_actions(deductions, warnings):
    summary_parts = set()
    actions = set()

    if not deductions:
        summary = "등기부등본 분석 결과, 특이 위험 요인은 발견되지 않았습니다."
        actions.add("등기부등본의 변동 여부를 주기적으로 확인하세요.")
        return summary, list(actions), warnings

    for d in deductions:
        reason = d["reason"]

        if "근저당권" in reason and "초과" in reason:
            summary_parts.add("1순위로 설정된 근저당권의 채권최고액이 보증금을 초과합니다. 이는 경매 시 보증금이 전액 회수되지 않을 가능성을 의미합니다.")
            actions.update([
                "보증보험 가입 가능 여부 확인",
                "등기부등본상 채권최고액 및 설정 순위 확인"
            ])

        elif "가압류" in reason:
            summary_parts.add("두 건 이상의 가압류가 발견되어 채권자 간 우선순위 경합이 예상되며, 이는 보증금 회수에 불리하게 작용할 수 있습니다.")
            actions.update([
                "가압류 채권자 목록 확인",
                "가압류 해제 가능성 및 말소 여부 확인"
            ])

        elif "압류" in reason:
            summary_parts.add("압류가 등기되어 있으며 말소되지 않았습니다. 이는 세금 체납 또는 법적 분쟁과 연관되어 있을 수 있습니다.")
            actions.add("채권자와 협의 및 압류 해제 요청 가능 여부 검토")

        elif "소유권이전" in reason:
            summary_parts.add("최근 2년 이내에 소유권이 이전되었습니다. 이는 투자 목적 매도 또는 명의 신뢰도 저하 요인일 수 있습니다.")
            actions.add("이전 소유자와의 관계 및 명의 변동 사유 확인")

        elif "불일치" in reason:
            summary_parts.add("입력한 임대인 정보와 등기부등본에 기재된 실제 소유자가 일치하지 않습니다. 대리인 계약일 경우 위임장 확인이 필요합니다.")
            actions.add("계약 상대방의 실소유자 여부 확인")

        elif "계약일" in reason and "이후" in reason:
            summary_parts.add("계약일 이후에 추가된 권리가 발견되어, 선순위 권리로 인해 보증금 보호가 어려울 수 있습니다.")
            actions.add("계약 체결일과 등기 날짜 비교 검토")

        elif "공동담보" in reason:
            summary_parts.add("본 부동산은 다른 채무의 담보로도 활용되고 있어, 경매 시 채권자 분배 우선순위에서 밀릴 수 있습니다.")
            actions.add("공동담보 부동산 전체 목록과 채권 범위 확인")

        elif "장기 미말소" in reason:
            summary_parts.add("10년 이상 된 권리가 말소되지 않고 남아 있어 등기 정보의 최신성이 떨어질 수 있습니다.")
            actions.add("등기부 권리 말소청구 가능 여부 확인")

        elif "지상권" in reason:
            summary_parts.add("지상권이 설정된 부동산은 사용·수익에 제한이 있어 거주나 재임대에 제약이 있을 수 있습니다.")
            actions.add("지상권 설정 범위 및 존속기간 확인")

        elif "경매" in reason:
            summary_parts.add("해당 부동산은 과거 경매 절차가 개시된 이력이 있어, 권리관계에 대한 면밀한 검토가 필요합니다.")
            actions.add("과거 경매 사유 및 낙찰 여부 확인")

        else:
            summary_parts.add(reason)
            actions.add("상세 내용 확인 필요")

    summary_text = ""

    if warnings:
        warning_block = "⚠️[주의] 아래 항목은 입력 정보가 없어 분석에서 제외되었습니다:\n"
        warning_block += "\n".join(warnings)
        summary_text += warning_block + "\n\n"

   
    if summary_parts:
        summary_text += "[위험 요인]\n"
        summary_text += "\n".join(f"• {s}" for s in sorted(summary_parts))

    return summary_text, sorted(actions), warnings