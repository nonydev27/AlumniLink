import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

const ISSUER = 'alumnilink';

export const signAccessToken = (user) =>
  jwt.sign({
    role: user.role,
    ae: user.authEpoch ?? 0,
    ma: Boolean(user.mfaAuthenticatedAt),
  }, config.jwtAccessSecret, {
    subject: user.id,
    issuer: ISSUER,
    algorithm: 'HS256',
    expiresIn: config.accessTokenTtl,
  });

export const verifyAccessToken = (token) =>
  jwt.verify(token, config.jwtAccessSecret, { issuer: ISSUER, algorithms: ['HS256'] });

export const accessTokenExpiry = (token) => new Date(jwt.decode(token).exp * 1000).toISOString();

/** Refresh tokens are random opaque strings. Only a SHA-256 hash is stored, so a DB leak can't be replayed. */
export const newRefreshToken = () => crypto.randomBytes(48).toString('base64url');
export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
