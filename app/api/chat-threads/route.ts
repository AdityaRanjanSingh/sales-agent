import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const threads = await prisma.thread.findMany({
      where: {
        userId,
        archived: false,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        messages: true,
      },
    });

    return NextResponse.json({ threads });
  } catch (error) {
    console.error("Error fetching chat threads:", error);
    return NextResponse.json(
      { error: "Failed to fetch threads" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, messages = [] } = body;

    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Invalid title format" },
        { status: 400 },
      );
    }

    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages must be an array" },
        { status: 400 },
      );
    }

    const thread = await prisma.thread.create({
      data: {
        userId,
        title: title.trim(),
        messages: messages as never,
      },
    });

    return NextResponse.json({
      success: true,
      thread,
    });
  } catch (error) {
    console.error("Error creating chat thread:", error);
    return NextResponse.json(
      { error: "Failed to create thread" },
      { status: 500 },
    );
  }
}
