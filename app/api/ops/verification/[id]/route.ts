/**
 * PATCH /api/ops/verification/[id] — Approve or reject a verification document
 */

import { NextResponse } from "next/server";
import { protectApiRoute, logAdminAction } from "@/lib/auth/protect-route";
import { InMemoryEventBus } from "@/lib/domain/events";
import { VerificationRepository } from "@/lib/domain/repositories/verification.repository";
import { NotificationRepository } from "@/lib/domain/repositories/notification.repository";
import { NotificationService } from "@/lib/domain/services/notification.service";
import { VerificationService } from "@/lib/domain/services/verification.service";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;

  const auth = await protectApiRoute(request, {
    requiredRoles: ["admin", "super_admin", "moderator", "supplier_success"],
    requireAdmin2FA: true,
  });

  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  let body: { action?: "approve" | "reject"; notes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid body" } },
      { status: 400 },
    );
  }

  const action = body.action === "reject" ? "reject" : "approve";

  try {
    const verificationRepository = new VerificationRepository(auth.supabase);
    const notificationRepository = new NotificationRepository(auth.supabase);
    const notificationService = new NotificationService(notificationRepository);
    const eventBus = new InMemoryEventBus();
    const verificationService = new VerificationService(
      verificationRepository,
      notificationService,
      eventBus,
    );

    const result = await verificationService.decideDocument({
      documentId: id,
      actorId: auth.user.id,
      action,
      notes: body.notes ?? null,
    });

    await logAdminAction(auth.supabase, {
      userId: auth.user.id,
      action: `verification_document_${action}d`,
      resource: "verification_documents",
      resourceId: id,
      details: { action, notes: body.notes },
      severity: action === "reject" ? "warning" : "info",
      request,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Verification action failed";

    if (message === "Document not found") {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message } },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message } },
      { status: 500 },
    );
  }
}
