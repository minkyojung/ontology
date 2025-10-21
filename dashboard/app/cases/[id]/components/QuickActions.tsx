'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, FileText, Loader2 } from 'lucide-react';
import { getRejectTemplate, formatRejectMessage } from '@/lib/utils/reject-templates';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface QuickActionsProps {
  caseId: string;
  caseType?: string;
  employeeName?: string;
  status: string;
}

export function QuickActions({ caseId, caseType, employeeName, status }: QuickActionsProps) {
  const router = useRouter();
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState('');

  // Get auto-reject template
  const rejectTemplate = getRejectTemplate(caseType);
  const autoRejectMessage = rejectTemplate
    ? formatRejectMessage(rejectTemplate, employeeName)
    : '';

  const handleQuickReject = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reject',
          reason: autoRejectMessage,
          comment,
          metadata: {
            action_type: rejectTemplate?.action,
            policy_reference: rejectTemplate?.policyReference,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject case');
      }

      await response.json();

      toast.success('Case rejected successfully', {
        description: `${caseId} has been rejected and ${employeeName} has been notified.`,
      });

      setShowRejectDialog(false);
      setComment('');
      router.refresh();
    } catch (error) {
      console.error('Failed to reject case:', error);
      toast.error('Failed to reject case', {
        description: 'Please try again or contact support.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickApprove = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'approve',
          comment,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve case');
      }

      await response.json();

      toast.success('Case approved successfully', {
        description: `${caseId} has been approved.`,
      });

      setShowApproveDialog(false);
      setComment('');
      router.refresh();
    } catch (error) {
      console.error('Failed to approve case:', error);
      toast.error('Failed to approve case', {
        description: 'Please try again or contact support.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReceipt = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'request_receipt',
          comment,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to request receipt');
      }

      await response.json();

      toast.success('Receipt requested successfully', {
        description: `${employeeName} has been notified to submit documentation.`,
      });

      setShowReceiptDialog(false);
      setComment('');
      router.refresh();
    } catch (error) {
      console.error('Failed to request receipt:', error);
      toast.error('Failed to request receipt', {
        description: 'Please try again or contact support.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Don't show actions if case is already closed
  if (status === 'CLOSED' || status === 'RESOLVED' || status === 'REJECTED') {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="default"
          onClick={() => setShowApproveDialog(true)}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
          Quick Approve
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setShowRejectDialog(true)}
        >
          <XCircle className="h-3.5 w-3.5 mr-1.5" />
          Quick Reject
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowReceiptDialog(true)}
        >
          <FileText className="h-3.5 w-3.5 mr-1.5" />
          Request Receipt
        </Button>
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Quick Reject Confirmation</DialogTitle>
            <DialogDescription>
              Reject this case with auto-generated reason based on pattern detection.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Case</label>
              <div className="text-sm text-muted-foreground">
                {caseId} • {employeeName}
              </div>
            </div>

            {autoRejectMessage && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Auto-Generated Reason</label>
                <div className="text-sm bg-muted p-3 rounded-md whitespace-pre-line">
                  {autoRejectMessage}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Additional Comment (Optional)</label>
              <Textarea
                placeholder="Add any additional notes..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>

            {rejectTemplate && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <div className="text-xs font-medium text-yellow-800 mb-1">
                  Next Action: {rejectTemplate.action.replace(/_/g, ' ').toUpperCase()}
                </div>
                <div className="text-xs text-yellow-700">
                  {rejectTemplate.action === 'notify_employee' && '직원에게 거부 사유 자동 통지'}
                  {rejectTemplate.action === 'escalate_manager' && '부서장에게 에스컬레이션'}
                  {rejectTemplate.action === 'request_justification' && '직원에게 증빙 자료 요청'}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleQuickReject}
              disabled={loading}
            >
              {loading && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Quick Approve Confirmation</DialogTitle>
            <DialogDescription>
              Approve this case and close it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Case</label>
              <div className="text-sm text-muted-foreground">
                {caseId} • {employeeName}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Comment (Optional)</label>
              <Textarea
                placeholder="Add approval notes..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleQuickApprove}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
              Confirm Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Request Dialog */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Request Receipt</DialogTitle>
            <DialogDescription>
              Request additional documentation from the employee.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Case</label>
              <div className="text-sm text-muted-foreground">
                {caseId} • {employeeName}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Request Message</label>
              <Textarea
                placeholder="영수증 및 업무 연관성 증빙 자료를 제출해 주시기 바랍니다..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReceiptDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleRequestReceipt}
              disabled={loading}
            >
              {loading && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
