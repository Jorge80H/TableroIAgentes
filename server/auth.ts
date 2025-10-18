import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import type { User } from "@shared/schema";

const JWT_SECRET = process.env.SESSION_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = "24h";

export interface AuthRequest extends Request {
  user?: User;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const user = await storage.getUser(payload.userId);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  req.user = user;
  next();
}
