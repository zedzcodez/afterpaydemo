import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "how-to-use.md");
    const content = fs.readFileSync(filePath, "utf-8");

    return NextResponse.json({ content });
  } catch (error) {
    console.error("Failed to read how-to-use.md:", error);
    return NextResponse.json(
      { error: "Failed to load documentation" },
      { status: 500 }
    );
  }
}
