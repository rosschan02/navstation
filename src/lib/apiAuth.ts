import { createHash, randomBytes } from 'crypto';
import { NextRequest } from 'next/server';
import pool from '@/db';

export interface ApiKeyInfo {
  id: number;
  name: string;
  permissions: 'read' | 'write';
}

export interface AuthResult {
  authenticated: boolean;
  method?: 'cookie' | 'apikey';
  user?: { id: number; username: string; role: string };
  apiKey?: ApiKeyInfo;
  error?: string;
  errorCode?: string;
}

/**
 * 生成新的 API Key
 * 格式: nav_sk_[32位随机字符]
 */
export function generateApiKey(): string {
  const randomPart = randomBytes(24).toString('base64url').slice(0, 32);
  return `nav_sk_${randomPart}`;
}

/**
 * 获取 Key 的前缀（用于显示和查找）
 * 返回 "nav_sk_xxx" 形式的前缀
 */
export function getKeyPrefix(key: string): string {
  return key.slice(0, 11); // "nav_sk_" + 前4位
}

/**
 * 对 API Key 进行 SHA256 哈希
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * 从请求中提取 API Key
 * 支持两种方式:
 * 1. X-API-Key header
 * 2. Authorization: Bearer <key>
 */
export function extractApiKey(request: NextRequest): string | null {
  // 方式1: X-API-Key header
  const xApiKey = request.headers.get('X-API-Key');
  if (xApiKey && xApiKey.startsWith('nav_sk_')) {
    return xApiKey;
  }

  // 方式2: Authorization: Bearer <key>
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (token.startsWith('nav_sk_')) {
      return token;
    }
  }

  return null;
}

/**
 * 验证 API Key 并返回权限信息
 */
export async function validateApiKey(key: string): Promise<ApiKeyInfo | null> {
  const keyHash = hashApiKey(key);
  const keyPrefix = getKeyPrefix(key);

  try {
    const result = await pool.query(
      `SELECT id, name, permissions FROM api_keys
       WHERE key_prefix = $1 AND key_hash = $2 AND is_active = true`,
      [keyPrefix, keyHash]
    );

    if (result.rows.length === 0) {
      return null;
    }

    // 更新最后使用时间（异步，不阻塞响应）
    pool.query(
      'UPDATE api_keys SET last_used_at = NOW() WHERE id = $1',
      [result.rows[0].id]
    ).catch(() => {});

    return {
      id: result.rows[0].id,
      name: result.rows[0].name,
      permissions: result.rows[0].permissions,
    };
  } catch {
    return null;
  }
}

/**
 * 从 Cookie 验证管理员登录状态
 */
export function validateCookieAuth(request: NextRequest): { id: number; username: string; role: string } | null {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    if (decoded.exp && decoded.exp > Date.now()) {
      return {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role,
      };
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * 统一的认证函数
 * 同时支持 Cookie 认证（管理员）和 API Key 认证（外部系统）
 */
export async function authenticate(request: NextRequest): Promise<AuthResult> {
  // 优先检查 API Key
  const apiKey = extractApiKey(request);
  if (apiKey) {
    const keyInfo = await validateApiKey(apiKey);
    if (keyInfo) {
      return {
        authenticated: true,
        method: 'apikey',
        apiKey: keyInfo,
      };
    }
    return {
      authenticated: false,
      error: 'API Key 无效或已禁用',
      errorCode: 'INVALID_API_KEY',
    };
  }

  // 检查 Cookie 认证
  const user = validateCookieAuth(request);
  if (user) {
    return {
      authenticated: true,
      method: 'cookie',
      user,
    };
  }

  return {
    authenticated: false,
    error: '未提供认证信息',
    errorCode: 'UNAUTHORIZED',
  };
}

/**
 * 检查是否有指定权限
 * @param auth 认证结果
 * @param requiredPermission 所需权限 ('read' | 'write')
 */
export function hasPermission(auth: AuthResult, requiredPermission: 'read' | 'write'): boolean {
  if (!auth.authenticated) {
    return false;
  }

  // Cookie 认证的管理员拥有所有权限
  if (auth.method === 'cookie') {
    return true;
  }

  // API Key 认证检查权限
  if (auth.method === 'apikey' && auth.apiKey) {
    if (requiredPermission === 'read') {
      return true; // read 和 write 都可以读
    }
    return auth.apiKey.permissions === 'write';
  }

  return false;
}

/**
 * 创建错误响应
 */
export function createAuthErrorResponse(auth: AuthResult): Response {
  const status = auth.errorCode === 'PERMISSION_DENIED' ? 403 : 401;
  return Response.json(
    { error: auth.error, code: auth.errorCode },
    { status }
  );
}
