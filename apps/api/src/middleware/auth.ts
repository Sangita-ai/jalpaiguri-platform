import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  ward_id: number | null;
  full_name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Missing or invalid authorization header",
    });
  }

  const token = authHeader.slice(7);
  

  console.log("TOKEN RECEIVED:", token);
  console.log("JWT SECRET:", process.env.JWT_SECRET);
  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as AuthUser & {
      iat: number;
      exp: number;
    };

    const user = await prisma.user.findUnique({
      where: {
        id: payload.id,
      },
      select: {
        id: true,
        email: true,
        role: true,
        ward_id: true,
        full_name: true,
        is_active: true,
      },
    });

    if (!user || !user.is_active) {
      return res.status(401).json({
        error: "User not found or inactive",
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      ward_id: user.ward_id,
      full_name: user.full_name,
    };

    next();
  } catch (err) {
  console.log("JWT ERROR:", err);

  return res.status(401).json({
    error: "Invalid or expired token",
  });
}
}

// Optional authentication
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as AuthUser;

    req.user = payload;
  } catch {
    // ignore invalid token
  }

  next();
}
