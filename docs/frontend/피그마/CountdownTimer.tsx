import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  expiresAt: Date;
}

export default function CountdownTimer({ expiresAt }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = expiresAt.getTime() - new Date().getTime();
      
      if (difference <= 0) {
        return {
          hours: 0,
          minutes: 0,
          seconds: 0
        };
      }
      
      // Check if less than 1 hour left
      setIsWarning(difference < 60 * 60 * 1000);
      
      return {
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      };
    };
    
    // Initial calculation
    setTimeLeft(calculateTimeLeft());
    
    // Setup interval
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    
    // Clear interval on unmount
    return () => clearInterval(timer);
  }, [expiresAt]);
  
  return (
    <div className={`inline-flex items-center ${isWarning ? 'text-red-400' : 'text-gray-300'} text-sm font-medium`}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
      </svg>
      <span className={isWarning ? 'font-bold' : ''}>
        {String(timeLeft.hours).padStart(2, '0')}:
        {String(timeLeft.minutes).padStart(2, '0')}:
        {String(timeLeft.seconds).padStart(2, '0')} 후 소멸
      </span>
    </div>
  );
}