import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Expense } from '../../types';
import { toast } from 'sonner';

export const useExpenses = () => {
    const queryClient = useQueryClient();

    const { data, isLoading, error } = useQuery({
        queryKey: ['expenses'],
        queryFn: () => api.getExpenses(),
    });

    const expenses = (data as Expense[]) || [];

    const addExpenseMutation = useMutation({
        mutationFn: (newExpense: Expense) => api.createExpense(newExpense),
        onMutate: async (newExpense) => {
            await queryClient.cancelQueries({ queryKey: ['expenses'] });
            const previousExpenses = queryClient.getQueryData<Expense[]>(['expenses']);
            queryClient.setQueryData<Expense[]>(['expenses'], (old) => [newExpense, ...(old || [])]);
            return { previousExpenses };
        },
        onError: (err: any, newExpense, context) => {
            queryClient.setQueryData(['expenses'], context?.previousExpenses);
            toast.error(err.message || 'Failed to record expense');
        },
        onSuccess: () => {
            toast.success('Expense recorded successfully!');
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
        },
    });

    const updateExpenseMutation = useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Expense> }) => api.updateExpense(id, updates),
        onMutate: async ({ id, updates }) => {
            await queryClient.cancelQueries({ queryKey: ['expenses'] });
            const previousExpenses = queryClient.getQueryData<Expense[]>(['expenses']);
            queryClient.setQueryData<Expense[]>(['expenses'], (old) =>
                old?.map((exp) => (exp.id === id ? { ...exp, ...updates } : exp))
            );
            return { previousExpenses };
        },
        onError: (err: any, variables, context) => {
            queryClient.setQueryData(['expenses'], context?.previousExpenses);
            toast.error(err.message || 'Failed to update expense');
        },
        onSuccess: () => {
            toast.success('Expense updated successfully');
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
        },
    });

    const deleteExpenseMutation = useMutation({
        mutationFn: (id: string) => api.deleteExpense(id),
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['expenses'] });
            const previousExpenses = queryClient.getQueryData<Expense[]>(['expenses']);
            queryClient.setQueryData<Expense[]>(['expenses'], (old) => old?.filter((exp) => exp.id !== id));
            return { previousExpenses };
        },
        onError: (err: any, id, context) => {
            queryClient.setQueryData(['expenses'], context?.previousExpenses);
            toast.error(err.message || 'Failed to delete expense');
        },
        onSuccess: () => {
            toast.success('Expense deleted');
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
        },
    });

    return {
        expenses,
        isLoading,
        error,
        addExpense: addExpenseMutation.mutateAsync,
        updateExpense: (id: string, updates: Partial<Expense>) => updateExpenseMutation.mutateAsync({ id, updates }),
        deleteExpense: deleteExpenseMutation.mutateAsync,
    };
};
