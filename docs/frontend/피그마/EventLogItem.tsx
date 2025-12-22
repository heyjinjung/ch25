import React from 'react';

interface VaultEvent {
  type: string;
  amount: number;
  at: string;
  trigger?: string;
  meta?: Record<string, any>;
  from?: string;
  to?: string;
  expired_amount?: number;
}

interface EventLogItemProps {
  event: VaultEvent;
}

export default function EventLogItem({ event }: EventLogItemProps) {
  // Format the event date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ko-KR', { 
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return '날짜 없음';
    }
  };
  
  // Get appropriate icon for event type
  const getEventIcon = () => {
    switch (event.type) {
      case 'ACCRUE_LOCKED':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path d="M10.75 10.818v2.614A3.13 3.13 0 0 0 11.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.56-.612-.875a3.13 3.13 0 0 0-1.138-.432ZM8.33 8.62c.053.055.115.11.184.164.208.16.46.284.736.363V6.603a2.45 2.45 0 0 0-.35.13c-.14.065-.27.143-.386.233-.377.292-.514.627-.514.909 0 .184.058.39.202.592.037.051.08.102.128.152Z" />
            <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-6a.75.75 0 0 1 .75.75v.316a3.78 3.78 0 0 1 1.653.713c.426.33.744.74.925 1.2a.75.75 0 0 1-1.395.55 1.35 1.35 0 0 0-.447-.563 2.187 2.187 0 0 0-.736-.363V9.3c.698.093 1.383.32 1.959.696.787.514 1.29 1.27 1.29 2.13 0 .86-.504 1.616-1.29 2.13-.576.377-1.261.603-1.96.696v.299a.75.75 0 0 1-1.5 0v-.3c-.697-.092-1.382-.318-1.958-.695-.482-.315-.857-.717-1.078-1.188a.75.75 0 0 1 1.359-.636c.08.173.245.376.54.569.313.205.706.353 1.138.432v-2.748a3.782 3.782 0 0 1-1.653-.713C6.9 9.433 6.5 8.681 6.5 7.875c0-.805.4-1.558 1.097-2.096a3.78 3.78 0 0 1 1.653-.713V4.75A.75.75 0 0 1 10 4Z" clipRule="evenodd" />
          </svg>
        );
      case 'UNLOCK':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M14.5 1A4.5 4.5 0 0 0 10 5.5V9H3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1.5V5.5a3 3 0 1 1 6 0v2.75a.75.75 0 0 0 1.5 0V5.5A4.5 4.5 0 0 0 14.5 1Z" clipRule="evenodd" />
          </svg>
        );
      case 'TRANSITION':
        if (event.from === 'LOCKED' && event.to === 'AVAILABLE') {
          return (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clipRule="evenodd" />
            </svg>
          );
        } else if (event.from === 'AVAILABLE' && event.to === 'EXPIRED') {
          return (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
            </svg>
          );
        } else {
          return (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M2 10a.75.75 0 0 1 .75-.75h12.59l-2.1-1.95a.75.75 0 1 1 1.02-1.1l3.5 3.25a.75.75 0 0 1 0 1.1l-3.5 3.25a.75.75 0 1 1-1.02-1.1l2.1-1.95H2.75A.75.75 0 0 1 2 10Z" clipRule="evenodd" />
            </svg>
          );
        }
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-1 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm0-3a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
        );
    }
  };
  
  // Get description text for event type
  const getEventDescription = () => {
    switch (event.type) {
      case 'ACCRUE_LOCKED':
        return `${event.amount.toLocaleString()}원 금고 적립`;
      case 'UNLOCK':
        return `${event.amount.toLocaleString()}원 금고 해금 (${event.trigger || '시스템'})`;
      case 'TRANSITION':
        if (event.from === 'LOCKED' && event.to === 'AVAILABLE') {
          return '잠긴 금고에서 사용 가능으로 전환';
        } else if (event.from === 'AVAILABLE' && event.to === 'EXPIRED') {
          return `${event.expired_amount?.toLocaleString() || ''}원 사용 가능 금액 만료`;
        } else {
          return `상태 변경: ${event.from} → ${event.to}`;
        }
      default:
        return `금고 이벤트: ${event.type}`;
    }
  };
  
  return (
    <div className="flex items-center justify-between py-1 text-sm border-b border-[#2a2a2a] last:border-0">
      <div className="flex items-center gap-2">
        <div className="text-[#a9e06e]">
          {getEventIcon()}
        </div>
        <div className="text-gray-300">
          {getEventDescription()}
        </div>
      </div>
      <div className="text-gray-400 text-xs">
        {formatDate(event.at)}
      </div>
    </div>
  );
}