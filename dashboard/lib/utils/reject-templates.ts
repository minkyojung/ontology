/**
 * Auto-reject templates for common fraud patterns
 */

export interface RejectTemplate {
  reason: string;
  action: 'notify_employee' | 'escalate_manager' | 'request_justification';
  policyReference?: string;
  additionalNotes?: string;
}

export const REJECT_TEMPLATES: Record<string, RejectTemplate> = {
  SPLIT_PAYMENT: {
    reason: '법인카드 운영규정 제27조 위반 (한도 회피 목적 분할 결제 금지)',
    action: 'notify_employee',
    policyReference: '법인카드 운영규정 제27조',
    additionalNotes: '반복 위반 시 카드 사용 정지 조치',
  },
  BLACKLIST_MCC: {
    reason: '고위험 MCC 거래 (블랙리스트 가맹점 - 유흥/도박 등)',
    action: 'escalate_manager',
    policyReference: '법인카드 운영규정 제15조',
    additionalNotes: '부서장 승인 필수',
  },
  OFF_HOURS: {
    reason: '업무 외 시간대 거래로 개인 사용 의심',
    action: 'request_justification',
    policyReference: '법인카드 운영규정 제12조',
    additionalNotes: '영수증 및 업무 연관성 증빙 필요',
  },
  WEEKEND_TRANSACTION: {
    reason: '주말 거래로 업무 목적 확인 필요',
    action: 'request_justification',
    policyReference: '법인카드 운영규정 제12조',
    additionalNotes: '출장 기안서 또는 업무 증빙 필요',
  },
  GRAYLIST_MCC: {
    reason: '준고위험 MCC 거래 (엔터테인먼트/레저 등)',
    action: 'request_justification',
    policyReference: '법인카드 운영규정 제16조',
    additionalNotes: '접대비 또는 복지비 항목 확인 필요',
  },
};

export function getRejectTemplate(caseType?: string): RejectTemplate | null {
  if (!caseType) return null;
  return REJECT_TEMPLATES[caseType] || null;
}

export function formatRejectMessage(template: RejectTemplate): string {
  const message = [
    `거부 사유: ${template.reason}`,
    template.policyReference ? `\n근거: ${template.policyReference}` : '',
    template.additionalNotes ? `\n참고: ${template.additionalNotes}` : '',
  ].filter(Boolean).join('');

  return message;
}
