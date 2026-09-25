import React, { useState } from 'react';
import { BotAvatar } from 'bot-avatars';

export type StaffBotType = 'star' | 'mech' | 'circle' | 'clover' | 'flower' | 'hexagon' | 'square';

export interface StaffBotMemberInfo {
  id?: number | string;
  name?: string;
  role?: string;
  department?: string;
  userType?: string;
  status?: string;
  lastActive?: string | null;
}

/**
 * Deterministic Role-Archetype Avatar Mapping for Shrawello Staff
 * Assigns meaningful character avatars to team members based on their real role and department,
 * with a deterministic hash fallback so each person always has a consistent, recognizable mascot.
 */
export const getStaffBotType = (staff?: StaffBotMemberInfo): StaffBotType => {
  if (!staff) return 'circle';

  const role = (staff.role || '').toLowerCase();
  const dept = (staff.department || '').toLowerCase();
  const userType = (staff.userType || '').toLowerCase();

  // 1. Leadership / Administrator / Owner / Founder -> 'star' (Golden Star)
  if (
    userType === 'admin' ||
    role.includes('admin') ||
    role.includes('director') ||
    role.includes('ceo') ||
    role.includes('founder') ||
    role.includes('lead')
  ) {
    return 'star';
  }

  // 2. Operations / Logistics / Transport & Tours -> 'square' (Solid Blue Cube)
  if (
    dept.includes('operation') ||
    role.includes('operation') ||
    role.includes('logistics') ||
    role.includes('dispatch') ||
    role.includes('vendor')
  ) {
    return 'square';
  }

  // 3. Finance & Accounts / Billing / Cashier -> 'hexagon' (Red Hexagon, structured)
  if (
    dept.includes('finance') ||
    dept.includes('account') ||
    role.includes('finance') ||
    role.includes('account') ||
    role.includes('billing')
  ) {
    return 'hexagon';
  }

  // 4. Customer Support / Guest Relations / Hospitality -> 'flower' (Green Blooming Flower)
  if (
    dept.includes('support') ||
    dept.includes('care') ||
    dept.includes('service') ||
    role.includes('support') ||
    role.includes('guest') ||
    role.includes('hospitality')
  ) {
    return 'flower';
  }

  // 5. Marketing / Growth / Brand & Design -> 'clover' (Blue Lucky Clover)
  if (
    dept.includes('market') ||
    role.includes('market') ||
    role.includes('growth') ||
    role.includes('brand') ||
    role.includes('media')
  ) {
    return 'clover';
  }

  // 6. Tour Consultants / Sales Executives / Dealmakers -> 'circle' (Purple Sphere)
  if (
    dept.includes('sales') ||
    role.includes('consultant') ||
    role.includes('sales') ||
    role.includes('advisor') ||
    role.includes('executive')
  ) {
    return 'circle';
  }

  // 7. IT / Systems / Tech / Engineering -> 'mech' (Robot Engineer)
  if (
    dept.includes('tech') ||
    dept.includes('it') ||
    role.includes('dev') ||
    role.includes('tech') ||
    role.includes('system')
  ) {
    return 'mech';
  }

  // Fallback: Deterministic hash of ID or Name across the 7 staff archetypes
  const pool: StaffBotType[] = ['circle', 'clover', 'flower', 'star', 'hexagon', 'square', 'mech'];
  const key = String(staff.id || staff.name || '0');
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % pool.length;
  return pool[index];
};

interface StaffBotAvatarProps {
  staff?: StaffBotMemberInfo;
  size?: number; // Visual box size: e.g. 28, 36, 44, 52
  isOnline?: boolean;
  isActive?: boolean; // Clocked in / on shift
  paused?: boolean;
  className?: string;
  showStatusIndicator?: boolean;
  customType?: StaffBotType;
}

export const StaffBotAvatar: React.FC<StaffBotAvatarProps> = ({
  staff,
  size = 40,
  isOnline,
  isActive,
  paused,
  className = '',
  showStatusIndicator = false,
  customType,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const botType = customType || getStaffBotType(staff);

  // Status mapping:
  // - If suspended/inactive: paused (resting)
  // - If active working/clocked-in or hovered: 'working' (hops and turns)
  // - Otherwise: 'default' (idle look-around and blinking)
  const isInactive = staff?.status === 'Inactive';
  const shouldPause = paused ?? isInactive;
  const avatarState = (isActive || isHovered) ? 'working' : 'default';

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none group/bot ${className}`}
      style={{ width: size, height: size }}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      title={staff?.name ? `${staff.name} (${staff.role || 'Staff'}) • ${botType.toUpperCase()} mascot` : undefined}
    >
      <div className="w-full h-full rounded-xl flex items-center justify-center overflow-hidden transition-transform duration-200 group-hover/bot:scale-105">
        <BotAvatar
          type={botType}
          size={size}
          state={avatarState}
          paused={shouldPause}
          aria-label={staff?.name ? `${staff.name} avatar` : `${botType} bot avatar`}
        />
      </div>

      {showStatusIndicator && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
            isOnline
              ? 'bg-emerald-500 animate-pulse'
              : isInactive
              ? 'bg-rose-500'
              : 'bg-slate-400'
          }`}
          title={isOnline ? 'Online now' : isInactive ? 'Suspended' : 'Offline'}
        />
      )}
    </div>
  );
};
