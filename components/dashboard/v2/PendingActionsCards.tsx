"use client";

import Link from "next/link";
import {
  FileText,
  Clock,
  Users,
  MessageSquare,
  GitCompare,
  Calendar,
  ArrowRight,
  Reply,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type PendingActionsProps = {
  quotesAwaiting?: number;
  expiringRfqs?: number;
  newMatches?: number;
  unreadMessages?: number;
};

export function PendingActionsCards({
  quotesAwaiting = 0,
  expiringRfqs = 0,
  newMatches = 0,
  unreadMessages = 0,
}: PendingActionsProps) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="ct-section-title">Pending Actions</h2>
        <span className="text-xs font-medium text-slate-400">
          What requires your attention
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Quotes Awaiting Review */}
        <div className="ct-pending-card">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FileText className="h-4 w-4" />
            </div>
            {quotesAwaiting > 0 && (
              <Badge variant="warning">{quotesAwaiting}</Badge>
            )}
          </div>
          <h3 className="font-semibold text-ct-navy">Quotes Awaiting Review</h3>
          <p className="mt-1 text-xs text-slate-500">
            Latest from Precision Forge — ₹12,400/unit
          </p>
          <Link href="/buyer/quotes" className="mt-4 block">
            <Button size="sm" variant="outline" className="w-full gap-1.5">
              <GitCompare className="h-3.5 w-3.5" />
              Compare Quotes
            </Button>
          </Link>
        </div>

        {/* RFQs Expiring Soon */}
        <div className="ct-pending-card">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
            {expiringRfqs > 0 && (
              <Badge variant="warning">Urgent</Badge>
            )}
          </div>
          <h3 className="font-semibold text-ct-navy">RFQs Expiring Soon</h3>
          <p className="mt-1 text-xs text-slate-500">
            CNC Aluminum Parts — deadline in 2 days
          </p>
          <Link href="/buyer/rfqs?tab=open" className="mt-4 block">
            <Button size="sm" variant="outline" className="w-full gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Extend RFQ
            </Button>
          </Link>
        </div>

        {/* New Supplier Matches */}
        <div className="ct-pending-card">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Users className="h-4 w-4" />
            </div>
            {newMatches > 0 && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                {newMatches} new
              </span>
            )}
          </div>
          <h3 className="font-semibold text-ct-navy">New Supplier Matches</h3>
          <p className="mt-1 text-xs text-slate-500">
            MetalWorks India — CNC Machining · 94% match
          </p>
          <Link href="/buyer/suppliers" className="mt-4 block">
            <Button size="sm" variant="outline" className="w-full gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              View Supplier
            </Button>
          </Link>
        </div>

        {/* Unread Messages */}
        <div className="ct-pending-card">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <MessageSquare className="h-4 w-4" />
            </div>
            {unreadMessages > 0 && (
              <Badge>{unreadMessages}</Badge>
            )}
          </div>
          <h3 className="font-semibold text-ct-navy">Unread Messages</h3>
          <p className="mt-1 text-xs text-slate-500">
            Apex Castings — re: RFQ #203 lead time
          </p>
          <Link href="/buyer/messages" className="mt-4 block">
            <Button size="sm" variant="outline" className="w-full gap-1.5">
              <Reply className="h-3.5 w-3.5" />
              Reply
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
