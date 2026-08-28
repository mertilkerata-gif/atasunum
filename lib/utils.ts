import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { RiskLevel } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getRiskConfig(level: RiskLevel) {
  return {
    NORMAL: {
      label: 'Normal', short: 'NRM',
      color: 'text-emerald-400', colorHex: '#22c55e',
      bg: 'bg-emerald-500/[0.05]', border: 'border-emerald-500/20',
      dot: 'bg-emerald-400', badge: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20',
      glow: 'glow-normal', glowColor: 'rgba(34,197,94,0.15)',
      scanColor: 'rgba(34,197,94,0.3)',
    },
    YOGUN: {
      label: 'Yoğun', short: 'YGN',
      color: 'text-yellow-400', colorHex: '#eab308',
      bg: 'bg-yellow-500/[0.05]', border: 'border-yellow-500/20',
      dot: 'bg-yellow-400', badge: 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/20',
      glow: 'glow-yogun', glowColor: 'rgba(234,179,8,0.15)',
      scanColor: 'rgba(234,179,8,0.3)',
    },
    RISKLI: {
      label: 'Riskli', short: 'RSK',
      color: 'text-orange-400', colorHex: '#f97316',
      bg: 'bg-orange-500/[0.06]', border: 'border-orange-500/25',
      dot: 'bg-orange-400', badge: 'bg-orange-500/15 text-orange-300 border border-orange-500/20',
      glow: 'glow-riskli', glowColor: 'rgba(249,115,22,0.18)',
      scanColor: 'rgba(249,115,22,0.4)',
    },
    KRITIK: {
      label: 'Kritik', short: 'KRT',
      color: 'text-red-400', colorHex: '#ff3d3d',
      bg: 'bg-red-500/[0.07]', border: 'border-red-500/28',
      dot: 'bg-red-400', badge: 'bg-red-500/15 text-red-300 border border-red-500/20',
      glow: 'glow-kritik', glowColor: 'rgba(255,61,61,0.2)',
      scanColor: 'rgba(255,61,61,0.5)',
    },
  }[level]
}

export function getStationConfig(score: number) {
  if (score >= 80) return { color: 'text-red-400', bg: 'bg-red-500', hex: '#ff3d3d', label: 'KRT' }
  if (score >= 60) return { color: 'text-orange-400', bg: 'bg-orange-500', hex: '#f97316', label: 'RSK' }
  if (score >= 40) return { color: 'text-yellow-400', bg: 'bg-yellow-500', hex: '#eab308', label: 'YGN' }
  return { color: 'text-emerald-400', bg: 'bg-emerald-500', hex: '#22c55e', label: 'NRM' }
}

export function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

export function formatDuration(minutes: number) {
  if (minutes < 1) return `${Math.round(minutes * 60)}s`
  return `${minutes.toFixed(1)} dk`
}

export function formatScore(score: number): string {
  return score.toString().padStart(2, '0')
}
