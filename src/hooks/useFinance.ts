import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { BookingTransaction } from '../../types';

export interface FinanceTransaction extends BookingTransaction {
    customer?: string;
    email?: string;
    phone?: string;
    packageId?: string;
    source?: 'booking_payment' | 'expense';
}

export const useFinance = () => {
    const queryClient = useQueryClient();

    const { data: transactions, isLoading, error } = useQuery({
        queryKey: ['finance-transactions'],
        queryFn: () => api.getFinanceTransactions(),
    });

    const updateTransactionStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: 'Pending' | 'Verified' | 'Rejected' }) =>
            api.updateFinanceTransactionStatus(id, status),
        onMutate: async ({ id, status }) => {
            await queryClient.cancelQueries({ queryKey: ['finance-transactions'] });
            await queryClient.cancelQueries({ queryKey: ['bookings'] }); // Also invalidate bookings to update payment status

            const previousTransactions = queryClient.getQueryData<FinanceTransaction[]>(['finance-transactions']);

            queryClient.setQueryData<FinanceTransaction[]>(['finance-transactions'], (old) =>
                old?.map((tx) => (tx.id === id ? { ...tx, status } : tx))
            );

            return { previousTransactions };
        },
        onError: (err: any, variables, context) => {
            queryClient.setQueryData(['finance-transactions'], context?.previousTransactions);
            toast.error(err.message || 'Failed to update transaction status');
        },
        onSuccess: () => {
            toast.success('Transaction status updated successfully');
            queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
        },
    });

    return {
        transactions: (transactions as FinanceTransaction[]) || [],
        isLoading,
        error,
        updateTransactionStatus: (id: string, status: 'Pending' | 'Verified' | 'Rejected') =>
            updateTransactionStatusMutation.mutateAsync({ id, status }),
        isUpdating: updateTransactionStatusMutation.isPending,
    };
};
