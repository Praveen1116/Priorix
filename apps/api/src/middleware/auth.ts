import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export interface AuthRequest extends Request {
    userId?: string;
}

interface AuthTokenPayload extends JwtPayload {
    userId: string;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader?.startsWith("Bearer ")) {
            return res.status(401).json({ error: "No token provided" });
        }

        const token = authHeader.split(" ")[1];
        const secret = process.env.JWT_SECRET;

        if (!token) {
            return res.status(401).json({ error: "Invalid token format" });
        }

        if (!secret) {
            return res.status(500).json({ error: "JWT secret is not configured" });
        }

        const decoded = jwt.verify(token, secret);

        if (
            typeof decoded === "string" ||
            !("userId" in decoded) ||
            typeof decoded.userId !== "string"
        ) {
            return res.status(401).json({ error: "Invalid token payload" });
        }

        req.userId = decoded.userId;

        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid token" });
    }
};
