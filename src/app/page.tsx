"use client";

import { useState, useEffect } from 'react';
import { ScheduleManager } from '@/components/schedule-manager';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function Home() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <LoadingSpinner className="h-12 w-12 text-primary" />
      </div>
    );
  }

  return <ScheduleManager />;
}
