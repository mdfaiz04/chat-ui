import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import User from "@/models/User";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // For security, don't reveal if user exists. Just say email sent.
      return NextResponse.json({ message: "If an account exists with this email, a reset link has been sent." });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    user.resetToken = resetToken;
    user.resetTokenExpiry = expiry;
    await user.save();

    // SIMULATION: In real app, send email with:
    const resetLink = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;
    console.log(`[FORGOT PASSWORD SIMULATION] Send to ${email}: ${resetLink}`);

    return NextResponse.json({
      success: true,
      message: "Reset link generated (Simulated)",
      debugLink: resetLink // For testing
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Operation failed", details: err.message }, { status: 500 });
  }
}
