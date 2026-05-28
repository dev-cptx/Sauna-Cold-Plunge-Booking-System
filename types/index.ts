import type { BookingStatus, PaymentStatus, DayOfWeek } from '@prisma/client'

export type { BookingStatus, PaymentStatus, DayOfWeek }

export interface PaxTier {
  minPax: number
  maxPax: number
  pricePerPax: number
}

export interface PriceEstimate {
  basePrice: number
  pricePerPax: number
  pax: number
  totalPrice: number
  currency: string
  ruleName?: string
}

export interface AvailableSlot {
  id: string
  date: string              // "yyyy-MM-dd"
  startTime: string         // "09:00"
  endTime: string           // "10:30"
  totalCapacity: number
  bookedCount: number
  availableCapacity: number
  isAvailable: boolean
  estimatedPrice?: PriceEstimate
}

export interface BookingFormData {
  timeSlotId: string
  customerName: string
  customerEmail: string
  customerPhone: string
  pax: number
  notes?: string
}

export interface CreateBookingResponse {
  bookingId: string
  bookingCode: string
  totalPrice: number
}

export interface CreatePaymentResponse {
  snapToken: string | null
  redirectUrl: string
  orderId: string
}

export interface BookingDetail {
  id: string
  bookingCode: string
  customerName: string
  customerEmail: string
  customerPhone: string
  pax: number
  basePrice: number
  totalPrice: number
  status: BookingStatus
  notes: string | null
  qrCodeData: string | null
  confirmedAt: string | null
  cancelledAt: string | null
  cancellationReason: string | null
  createdAt: string
  timeSlot: {
    date: string
    startTime: string
    endTime: string
  }
  payment: {
    status: PaymentStatus
    paymentMethod: string | null
    paidAt: string | null
    amount: number
  } | null
}

export interface AdminStats {
  todayBookings: number
  todayRevenue: number
  todayOccupancyRate: number
  monthBookings: number
  monthRevenue: number
  pendingPayments: number
}

export interface SlotSummary {
  id: string
  date: string
  startTime: string
  endTime: string
  capacity: number
  bookedCount: number
  isBlocked: boolean
  blockedNote: string | null
}
