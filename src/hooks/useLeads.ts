import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Lead } from '../../types';
import { toast } from 'sonner';

export const useLeads = () => {
    const queryClient = useQueryClient();

    const { data, isLoading, error } = useQuery({
        queryKey: ['leads'],
        queryFn: () => api.getLeads(),
    });

    const leads = (data as Lead[]) || [];

    const addLeadMutation = useMutation({
        mutationFn: (newLead: Lead) => api.createLead(newLead),
        onMutate: async (newLead) => {
            await queryClient.cancelQueries({ queryKey: ['leads'] });
            const previousLeads = queryClient.getQueryData<Lead[]>(['leads']);
            queryClient.setQueryData<Lead[]>(['leads'], (old) => [newLead, ...(old || [])]);
            return { previousLeads };
        },
        onError: (err: any, newLead, context) => {
            queryClient.setQueryData(['leads'], context?.previousLeads);
            toast.error(err.message || 'Failed to create lead');
        },
        onSuccess: () => {
            toast.success('Lead created completely!');
            queryClient.invalidateQueries({ queryKey: ['leads'] });
        },
    });

    const updateLeadMutation = useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Lead> }) => api.updateLead(id, updates),
        onMutate: async ({ id, updates }) => {
            await queryClient.cancelQueries({ queryKey: ['leads'] });
            const previousLeads = queryClient.getQueryData<Lead[]>(['leads']);
            queryClient.setQueryData<Lead[]>(['leads'], (old) =>
                old?.map((lead) => (lead.id === id ? { ...lead, ...updates } : lead))
            );
            return { previousLeads };
        },
        onError: (err: any, variables, context) => {
            queryClient.setQueryData(['leads'], context?.previousLeads);
            toast.error(err.message || 'Failed to update lead');
        },
        onSuccess: () => {
            toast.success('Lead updated successfully');
            queryClient.invalidateQueries({ queryKey: ['leads'] });
        },
    });

    const deleteLeadMutation = useMutation({
        mutationFn: (id: string) => api.deleteLead(id),
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['leads'] });
            const previousLeads = queryClient.getQueryData<Lead[]>(['leads']);
            queryClient.setQueryData<Lead[]>(['leads'], (old) => old?.filter((lead) => lead.id !== id));
            return { previousLeads };
        },
        onError: (err: any, newTodo, context) => {
            queryClient.setQueryData(['leads'], context?.previousLeads);
            toast.error(err.message || 'Failed to delete lead');
        },
        onSuccess: () => {
            toast.success('Lead deleted');
            queryClient.invalidateQueries({ queryKey: ['leads'] });
        },
    });
    const addLeadLogMutation = useMutation({
        mutationFn: ({ id, log }: { id: string; log: any }) => api.createLeadLog(id, log),
        onMutate: async ({ id, log }) => {
            await queryClient.cancelQueries({ queryKey: ['leads'] });
            const previousLeads = queryClient.getQueryData<Lead[]>(['leads']);
            queryClient.setQueryData<Lead[]>(['leads'], (old) =>
                old?.map((lead) => (lead.id === id ? { ...lead, logs: [log, ...(lead.logs || [])] } : lead))
            );
            return { previousLeads };
        },
        onError: (err: any, variables, context) => {
            queryClient.setQueryData(['leads'], context?.previousLeads);
            toast.error(err.message || 'Failed to add lead log');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leads'] });
        },
    });

    return {
        leads,
        isLoading,
        error,
        addLead: addLeadMutation.mutateAsync,
        updateLead: (id: string, updates: Partial<Lead>) => updateLeadMutation.mutateAsync({ id, updates }),
        deleteLead: deleteLeadMutation.mutateAsync,
        addLeadLog: (id: string, log: any) => addLeadLogMutation.mutateAsync({ id, log })
    };
};
