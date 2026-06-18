"use client";

import Link from "next/link";
import { Package, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Order = {
  id: string;
  buyer: string;
  value: string;
  stage: string;
  progress: number;
  expectedDelivery: string;
};

const DEMO_ORDERS: Order[] = [
  {
    id: "1",
    buyer: "AutoParts India Ltd",
    value: "₹4.2L",
    stage: "Production",
    progress: 65,
    expectedDelivery: "28 Jun 2026",
  },
  {
    id: "2",
    buyer: "Precision Engineering Co",
    value: "₹1.8L",
    stage: "Quality Check",
    progress: 85,
    expectedDelivery: "22 Jun 2026",
  },
  {
    id: "3",
    buyer: "MetalWorks Gujarat",
    value: "₹6.5L",
    stage: "Material Sourcing",
    progress: 30,
    expectedDelivery: "5 Jul 2026",
  },
];

type ActiveOrdersProps = {
  orders?: Order[];
};

export function ActiveOrders({ orders = DEMO_ORDERS }: ActiveOrdersProps) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="ct-section-title">Active Orders</h2>
        <Link
          href="/seller/orders"
          className="text-xs font-semibold text-ct-gold hover:text-ct-gold-light"
        >
          View All →
        </Link>
      </div>

      <div className="ct-card divide-y divide-slate-100 overflow-hidden">
        {orders.map((order) => (
          <div
            key={order.id}
            className="flex flex-col gap-4 p-5 transition-colors hover:bg-slate-50/50 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Package className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-ct-navy">{order.buyer}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">{order.value}</span>
                  <span>·</span>
                  <Badge variant="secondary">{order.stage}</Badge>
                  <span>·</span>
                  <span>Delivery: {order.expectedDelivery}</span>
                </div>
                <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                    style={{ width: `${order.progress}%` }}
                  />
                </div>
              </div>
            </div>
            <Link href="/seller/orders">
              <Button size="sm" variant="outline" className="gap-1.5">
                View Order
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
