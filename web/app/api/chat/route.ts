import { NextRequest, NextResponse } from "next/server";
import { answer } from "@/lib/chat/provider";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, language } = body;
    const lang = language === "es" ? "es" : "en";

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid request: messages array required" },
        { status: 400 }
      );
    }
    
    // Validate message format
    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        return NextResponse.json(
          { error: "Invalid message format: role and content required" },
          { status: 400 }
        );
      }
      if (!["user", "assistant"].includes(msg.role)) {
        return NextResponse.json(
          { error: "Invalid role: must be 'user' or 'assistant'" },
          { status: 400 }
        );
      }
    }
    
    // Get answer from provider (language hint for response locale)
    const reply = await answer(messages, { language: lang });

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
