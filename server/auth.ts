import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { db, User, Rol } from './db';

// SECRET for HMAC-SHA256 signing
const JWT_SECRET = process.env.GEMINI_API_KEY || 'IITCUP_SANTA_CRUZ_BOLIVIA_CADENA_CUSTODIA_SECRET_KEY';

export interface TokenPayload {
  userId: string;
  usuario: string;
  rol: Rol;
  nombreCompleto: string;
  regionalId?: string;
  exp: number;
}

// -------------------------------------------------------------
// Token Functions
// -------------------------------------------------------------
export function signToken(payload: Omit<TokenPayload, 'exp'>, expiresInMinutes = 120): string {
  const exp = Math.floor(Date.now() / 1000) + (expiresInMinutes * 60);
  const fullPayload: TokenPayload = { ...payload, exp };
  
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
    
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [header, body, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');
      
    if (signature !== expectedSignature) {
      return null;
    }
    
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    
    return payload;
  } catch (error) {
    return null;
  }
}

// -------------------------------------------------------------
// Middleware
// -------------------------------------------------------------
export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado. Cabecera Bearer ausente.' });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  
  if (!payload) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }

  req.user = payload;
  next();
}

export function requireRole(roles: Rol[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado.' });
    }
    
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'Acceso denegado. Permisos insuficientes.' });
    }
    
    next();
  };
}
