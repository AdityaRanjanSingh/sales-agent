import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ threadId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { threadId } = await context.params;

    const thread = await prisma.thread.findUnique({
      where: {
        id: threadId,
      },
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    if (thread.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ thread });
  } catch (error) {
    console.error("Error fetching chat thread:", error);
    return NextResponse.json(
      { error: "Failed to fetch thread" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { threadId } = await context.params;
    const body = await request.json();

    // Verify thread ownership
    const existingThread = await prisma.thread.findUnique({
      where: { id: threadId },
    });

    if (!existingThread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    if (existingThread.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (typeof body.archived === "boolean") {
      updateData.archived = body.archived;
    }

    if (typeof body.title === "string" && body.title.trim()) {
      updateData.title = body.title.trim();
    }

    if (Array.isArray(body.messages)) {
      updateData.messages = body.messages;
    }

    const thread = await prisma.thread.update({
      where: { id: threadId },
      data: updateData as never,
    });

    return NextResponse.json({
      success: true,
      thread,
    });
  } catch (error) {
    console.error("Error updating chat thread:", error);
    return NextResponse.json(
      { error: "Failed to update thread" },
      { status: 500 },
    );
  }
}
