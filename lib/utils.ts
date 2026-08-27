import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { RiskLevel } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getRiskConfig(level: RiskLevel) {
  const configs = {
    NORMAL: { label: 'Normal', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' },
    YOGUN: { label: 'Yoğun', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', dot: 'bg-yellow-400', badge: 'bg-yellow-500/20 text-yellow-300' },
    RISKLI: { label: 'Riskli', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-400', badge: 'bg-orange-500/20 text-orange-300' },
    KRITIK: { label: 'Kritik', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', dot: 'bg-red-400', badge: 'bg-red-500/20 text-red-300' },
  }
  return configs[level]
}

export function getStationColor(score: number) {
  if (score >= 80) return 'text-red-400'
  if (score >= 60) return 'text-orange-400'
  if (score >= 40) return 'text-yellow-400'
  return 'text-emerald-400'
}

export function getStationBg(score: number) {
  if (score >= 80) return 'bg-red-500'
  if (score >= 60) return 'bg-orange-500'
  if (score >= 40) return 'bg-yellow-500'
  return 'bg-emerald-500'
}

export function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

export function formatDuration(minutes: number) {
  if (minutes < 1) return `${Math.round(minutes * 60)}s`
  return `${minutes.toFixed(1)} dk`
}
