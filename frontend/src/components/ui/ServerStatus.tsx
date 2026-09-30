import React from 'react';

export type ServerStatusType = 'online' | 'offline' | 'ai-active';

export interface ServerStatusProps {
  status: ServerStatusType;
  className?: string;
  showLabel?: boolean;
}

const STATUS_CONFIG: Record<ServerStatusType, { label: string; color: string; pulse: boolean }> = {
  online: { label: 'Online', color: 'text-positive', pulse: true },
  offline: { label: 'Offline', color: 'text-alert', pulse: false },
  'ai-active': { label: 'IA ativa', color: 'text-brand-primary', pulse: true },
};

const ServerStatus: React.FC<ServerStatusProps> = ({
  status,
  className = '',
  showLabel = true,
}) => {
  const config = STATUS_CONFIG[status];

  return (
    <div className={`inline-flex items-center gap-2 text-sm font-medium ${config.color} ${className}`}>
      <span
        className={`w-2 h-2 rounded-full ${config.color} ${config.pulse ? 'animate-pulse' : ''}`}
        aria-hidden="true"
      />
      {showLabel && <span>{config.label}</span>}
    </div>
  );
};

export default ServerStatus;