import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Booking, BookingStatus } from '../../types';
import { toast } from 'sonner';

export const useBookings = () => {
    const queryClient = useQueryClient();

    const { data, isLoading, error } = useQuery({
        queryKey: ['bookings'],
        queryFn: () => api.getBookings(),
    });

    const bookings = (data as Booking[]) || [];

    const addBookingMutation = useMutation({
        mutationFn: (newBooking: Booking) => api.createBooking(newBooking),
        onMutate: async (newBooking) => {
            await queryClient.cancelQueries({ queryKey: ['bookings'] });
            const previousBookings = queryClient.getQueryData<Booking[]>(['bookings']);
            queryClient.setQueryData<Booking[]>(['bookings'], (old) => [newBooking, ...(old || [])]);
            return { previousBookings };
        },
        onError: (err: any, newBooking, context) => {
            queryClient.setQueryData(['bookings'], context?.previousBookings);
            toast.error(err.message || 'Failed to create booking');
        },
        onSuccess: () => {
            toast.success('Booking created completely!');
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
        },
    });

    const updateBookingStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: BookingStatus }) => api.updateBookingStatus(id, status),
        onMutate: async ({ id, status }) => {
            await queryClient.cancelQueries({ queryKey: ['bookings'] });
            const previousBookings = queryClient.getQueryData<Booking[]>(['bookings']);
            queryClient.setQueryData<Booking[]>(['bookings'], (old) =>
                old?.map((booking) => (booking.id === id ? { ...booking, status } : booking))
            );
            return { previousBookings };
        },
        onError: (err: any, variables, context) => {
            queryClient.setQueryData(['bookings'], context?.previousBookings);
            toast.error(err.message || 'Failed to update booking status');
        },
        onSuccess: () => {
            toast.success('Booking status updated');
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
        },
    });

    const updateBookingMutation = useMutation({
        mutationFn: ({ id, updates, silent }: { id: string; updates: Partial<Booking>; silent?: boolean }) => api.updateBooking(id, updates),
        onMutate: async ({ id, updates }) => {
            await queryClient.cancelQueries({ queryKey: ['bookings'] });
            const previousBookings = queryClient.getQueryData<Booking[]>(['bookings']);
            queryClient.setQueryData<Booking[]>(['bookings'], (old) =>
                old?.map((booking) => (booking.id === id ? { ...booking, ...updates } : booking))
            );
            return { previousBookings };
        },
        onError: (err: any, variables, context) => {
            queryClient.setQueryData(['bookings'], context?.previousBookings);
            toast.error(err.message || 'Failed to update booking');
        },
        onSuccess: (_data, variables) => {
            if (!variables.silent) toast.success('Booking updated');
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
        },
    });

    const deleteBookingMutation = useMutation({
        mutationFn: (id: string) => api.deleteBooking(id),
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['bookings'] });
            const previousBookings = queryClient.getQueryData<Booking[]>(['bookings']);
            queryClient.setQueryData<Booking[]>(['bookings'], (old) => old?.filter((booking) => booking.id !== id));
            return { previousBookings };
        },
        onError: (err: any, newTodo, context) => {
            queryClient.setQueryData(['bookings'], context?.previousBookings);
            toast.error(err.message || 'Failed to delete booking');
        },
        onSuccess: () => {
            toast.success('Booking deleted');
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
        },
    });

    return {
        bookings,
        isLoading,
        error,
        addBooking: addBookingMutation.mutateAsync,
        updateBooking: (id: string, updates: Partial<Booking>, silent?: boolean) => updateBookingMutation.mutateAsync({ id, updates, silent }),
        updateBookingStatus: (id: string, status: BookingStatus) => updateBookingStatusMutation.mutateAsync({ id, status }),
        deleteBooking: deleteBookingMutation.mutateAsync,
    };
};
