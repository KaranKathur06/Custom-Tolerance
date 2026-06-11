'use client';

import { useOps } from '@/lib/ops/ops-context';
import { ModeSwitch } from './ModeSwitch';
import Link from 'next/link';
import {
  Search, Bell, ChevronDown, Menu, Command,
  LogOut, Settings, User, ExternalLink, CheckCircle2, ClipboardCheck, ShieldAlert, ArrowRight,
} from 'lucide-react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { BRAND } from '@/config/brand';
import { searchOpsRoutes } from '@/lib/ops/route-registry';

export function TopBar() {
  const { toggleSidebar, mode, commandPaletteOpen, setCommandPaletteOpen } = useOps();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const commandRef = useRef<HTMLDivElement>(null);
  const searchResults = useMemo(() => searchOpsRoutes(searchQuery), [searchQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (commandRef.current && !commandRef.current.contains(e.target as Node)) setCommandPaletteOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [setCommandPaletteOpen]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCommandPaletteOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [setCommandPaletteOpen]);

  async function signOut() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/login?signedOut=1';
    }
  }

  return (
    <header className="ops-topbar">
      <div className="ops-topbar-left">
        <button className="ops-icon-btn" onClick={toggleSidebar} title="Toggle Sidebar">
          <Menu className="w-5 h-5" />
        </button>
        <div className="ops-logo">
          <div className={`ops-logo-icon ${mode}`}>C</div>
          <span className="ops-logo-text">{BRAND.name}<span className="ops-logo-suffix">Ops</span></span>
        </div>
        <ModeSwitch />
      </div>

      <div className="ops-topbar-center">
        <button className="ops-search-trigger" onClick={() => setCommandPaletteOpen(true)}>
          <Search className="w-4 h-4" />
          <span>Search users, listings, RFQs, payments...</span>
          <kbd className="ops-kbd"><Command className="w-3 h-3" />K</kbd>
        </button>
        {commandPaletteOpen && (
          <div className="ops-command-overlay">
            <div className="ops-command-panel" ref={commandRef}>
              <div className="ops-command-input">
                <Search className="w-4 h-4" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search users, suppliers, RFQs, listings, invoices, audit logs..."
                />
                <kbd>Esc</kbd>
              </div>
              <div className="ops-command-results">
                {searchResults.map((result) => (
                  <Link
                    key={`${result.scope}-${result.href}-${result.label}`}
                    href={result.href}
                    className="ops-command-result"
                    onClick={() => setCommandPaletteOpen(false)}
                  >
                    <div>
                      <span>{result.scope}</span>
                      <strong>{result.label}</strong>
                      <small>{result.description}</small>
                    </div>
                    <div className="ops-command-meta">
                      <small>{result.entity}</small>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </Link>
                ))}
                {!searchResults.length && (
                  <div className="ops-command-empty">
                    No operational route found. Try users, suppliers, RFQ, payments, verification, audit, or settings.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="ops-topbar-right">
        <div className="ops-notif-wrapper" ref={notifRef}>
          <button className="ops-icon-btn" onClick={() => setNotifOpen(!notifOpen)}>
            <Bell className="w-5 h-5" />
            <span className="ops-notif-dot" />
          </button>
          {notifOpen && (
            <div className="ops-dropdown ops-notif-dropdown">
              <div className="ops-dropdown-header">
                <span>Operations Queue</span>
                <button className="ops-text-btn">Assign triage</button>
              </div>
              <div className="ops-dropdown-body">
                <a className="ops-notif-item unread" href="/ops/admin/security">
                  <div className="ops-notif-dot-inline critical" />
                  <div>
                    <p className="ops-notif-title">Fraud alert detected</p>
                    <p className="ops-notif-desc">Suspicious multi-account activity from IP 103.x.x.x</p>
                    <p className="ops-notif-time">2 min ago</p>
                  </div>
                  <ShieldAlert className="w-4 h-4" />
                </a>
                <a className="ops-notif-item unread" href="/ops/admin/listings">
                  <div className="ops-notif-dot-inline high" />
                  <div>
                    <p className="ops-notif-title">3 listings pending review</p>
                    <p className="ops-notif-desc">Steel coils, aluminum sheets, copper wire</p>
                    <p className="ops-notif-time">15 min ago</p>
                  </div>
                  <ClipboardCheck className="w-4 h-4" />
                </a>
                <a className="ops-notif-item" href="/ops/admin/verification">
                  <div className="ops-notif-dot-inline normal" />
                  <div>
                    <p className="ops-notif-title">Supplier verification ready</p>
                    <p className="ops-notif-desc">Tata Steel Industries requires GST approval</p>
                    <p className="ops-notif-time">1 hour ago</p>
                  </div>
                  <CheckCircle2 className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="ops-profile-wrapper" ref={profileRef}>
          <button className="ops-profile-btn" onClick={() => setProfileOpen(!profileOpen)}>
            <div className="ops-avatar">A</div>
            <span className="ops-profile-name">Admin</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          {profileOpen && (
            <div className="ops-dropdown ops-profile-dropdown">
              <div className="ops-dropdown-profile-header">
                <div className="ops-avatar lg">A</div>
                <div>
                  <p className="ops-profile-fullname">Super Admin</p>
                  <p className="ops-profile-email">admin@{BRAND.domain}</p>
                </div>
              </div>
              <div className="ops-dropdown-divider" />
              <a className="ops-dropdown-item" href="/ops/admin/settings">
                <Settings className="w-4 h-4" /> Platform Settings
              </a>
              <a className="ops-dropdown-item" href="/ops/account">
                <User className="w-4 h-4" /> Account Center
              </a>
              <a className="ops-dropdown-item" href="/ops/admin">
                <ExternalLink className="w-4 h-4" /> Command Center
              </a>
              <div className="ops-dropdown-divider" />
              <button className="ops-dropdown-item danger" onClick={signOut}>
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
