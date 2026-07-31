'use client';
import React from 'react';
import { css } from '@/lib/dc';

const skeletonBase = 'background: linear-gradient(90deg, var(--skeleton-base) 25%, var(--skeleton-shine) 50%, var(--skeleton-base) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 6px;';

/** Skeleton placeholder for a single chat message bubble */
export function MessageSkeleton() {
  return (
    <div style={css('display:flex; gap:14px; align-items:flex-start; padding:4px 0;')} aria-hidden="true">
      {/* Avatar */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/athena-logo.png" alt="" style={css('width:38px; height:38px; object-fit:contain; flex-shrink:0; opacity:0.5;')} />
      {/* Text lines */}
      <div style={css('flex:1; display:flex; flex-direction:column; gap:10px; padding-top:4px')}>  
        <div style={css(`height:14px; width:85%; ${skeletonBase}`)} />
        <div style={css(`height:14px; width:65%; ${skeletonBase}`)} />
        <div style={css(`height:14px; width:40%; ${skeletonBase}`)} />
      </div>
    </div>
  );
}

/** Skeleton placeholder for multiple messages (loading history) */
export function HistorySkeleton({ count = 3 }: { count?: number }) {
  return (
    <div style={css('display:flex; flex-direction:column; gap:28px; padding:8px 0;')} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <MessageSkeleton key={i} />
      ))}
    </div>
  );
}

/** Skeleton placeholder for a conversation item in the sidebar */
export function ConversationSkeleton() {
  return (
    <div style={css('display:flex; align-items:center; gap:10px; padding:8px 10px;')} aria-hidden="true">
      <div style={css(`width:28px; height:28px; border-radius:6px; flex-shrink:0; ${skeletonBase}`)} />
      <div style={css('flex:1; display:flex; flex-direction:column; gap:6px')}>
        <div style={css(`height:12px; width:75%; ${skeletonBase}`)} />
        <div style={css(`height:10px; width:45%; ${skeletonBase}`)} />
      </div>
    </div>
  );
}

/** Skeleton placeholder for the sidebar conversation list */
export function SidebarSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div style={css('display:flex; flex-direction:column; gap:4px; padding:4px 0;')} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <ConversationSkeleton key={i} />
      ))}
    </div>
  );
}

/** Skeleton for admin KPI cards */
export function KpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div style={css('display:grid; grid-template-columns:repeat(auto-fit, minmax(170px,1fr)); gap:14px;')} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={css(`border-radius:12px; padding:18px; border:1px solid var(--border-faint); ${skeletonBase.replace('border-radius: 6px;', 'border-radius: 12px;')}; height:100px;`)} />
      ))}
    </div>
  );
}

/** Premium thinking indicator with shimmer text */
export function ThinkingIndicator({ label = 'Analisando...' }: { label?: string }) {
  return (
    <div style={css('display:flex; gap:14px; align-items:flex-start;')}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/athena-logo.png" alt="" style={css('width:38px; height:38px; object-fit:contain; flex-shrink:0; margin-top:2px;')} />
      <div style={css('display:flex; flex-direction:column; gap:8px; padding-top:6px;')}>
        <span
          style={{
            fontSize: '13px',
            fontWeight: 500,
            background: 'linear-gradient(90deg, var(--muted) 25%, var(--muted-light) 50%, var(--muted) 75%)',
            backgroundSize: '200% 100%',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            animation: 'shimmer 2s infinite linear',
          }}
        >
          {label}
        </span>
        {/* Skeleton lines simulating incoming response */}
        <div style={css('display:flex; flex-direction:column; gap:8px;')}>
          <div style={css(`height:12px; width:280px; ${skeletonBase}`)} />
          <div style={css(`height:12px; width:200px; ${skeletonBase}`)} />
        </div>
      </div>
    </div>
  );
}
