"use client";

import { CreditCard, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function AdminSubscriptionManager() {
  const razorpayConfigured = Boolean(
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription management
          </CardTitle>
          <CardDescription>
            Razorpay sync, manual overrides, and refunds. Billing runs through existing payment
            routes when configured.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Razorpay status:</span>
            <Badge variant={razorpayConfigured ? "success" : "secondary"}>
              {razorpayConfigured ? "Configured" : "Not configured"}
            </Badge>
          </div>

          {!razorpayConfigured ? (
            <p className="text-sm text-muted-foreground">
              Set <code>RAZORPAY_KEY_ID</code> and <code>RAZORPAY_KEY_SECRET</code> in{" "}
              <code>.env.local</code> to enable live subscription billing. Plan definitions live on
              the pricing page until a subscriptions table is added.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Payment webhooks are handled at <code>/api/payment/webhook</code>. Use Razorpay
              dashboard for refund operations until admin refund actions are added.
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Link href="/pricing">
              <Button variant="outline">View pricing plans</Button>
            </Link>
            <a
              href="https://dashboard.razorpay.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline">
                <ExternalLink className="mr-2 h-4 w-4" />
                Razorpay dashboard
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
