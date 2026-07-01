import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { toast } from 'sonner';

export interface TransferRequest {
    id: string;
    item_type: 'Lead' | 'Booking';
    item_id: string;
    from_staff_id: number;
    to_staff_id: number;
    requested_by: number;
    reason: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    actioned_by?: number;
    actioned_at?: string;
    rejection_reason?: string;
    created_at: string;
    updated_at: string;
    
    // Enriched fields from database join
    from_staff_name?: string;
    to_staff_name?: string;
    requested_by_name?: string;
    actioned_by_name?: string;
    item_name?: string;
    item_value?: number;
}

export const useTransfers = () => {
    const queryClient = useQueryClient();

    const { data: transfers, isLoading, error, refetch } = useQuery({
        queryKey: ['transfer-requests'],
        queryFn: () => api.getTransferRequests(),
    });

    const requestTransferMutation = useMutation({
        mutationFn: ({ itemType, itemId, toStaffId, reason }: { itemType: 'Lead' | 'Booking'; itemId: string; toStaffId: number; reason: string }) =>
            api.requestTransfer(itemType, itemId, toStaffId, reason),
        onSuccess: (data) => {
            if (data && data.direct) {
                toast.success('Ownership transferred successfully');
            } else {
                toast.success('Transfer request submitted successfully');
            }
            queryClient.invalidateQueries({ queryKey: ['transfer-requests'] });
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to submit transfer request');
        }
    });

    const approveTransferMutation = useMutation({
        mutationFn: (id: string) => api.approveTransferRequest(id),
        onSuccess: () => {
            toast.success('Transfer request approved successfully');
            queryClient.invalidateQueries({ queryKey: ['transfer-requests'] });
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to approve transfer request');
        }
    });

    const rejectTransferMutation = useMutation({
        mutationFn: ({ id, rejectionReason }: { id: string; rejectionReason?: string }) =>
            api.rejectTransferRequest(id, rejectionReason),
        onSuccess: () => {
            toast.success('Transfer request rejected successfully');
            queryClient.invalidateQueries({ queryKey: ['transfer-requests'] });
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to reject transfer request');
        }
    });

    return {
        transfers: (transfers as TransferRequest[]) || [],
        isLoading,
        error,
        requestTransfer: (itemType: 'Lead' | 'Booking', itemId: string, toStaffId: number, reason: string) =>
            requestTransferMutation.mutateAsync({ itemType, itemId, toStaffId, reason }),
        approveTransfer: (id: string) => approveTransferMutation.mutateAsync(id),
        rejectTransfer: (id: string, rejectionReason?: string) => rejectTransferMutation.mutateAsync({ id, rejectionReason }),
        refetchTransfers: refetch
    };
};
