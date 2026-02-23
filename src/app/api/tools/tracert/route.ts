import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

// 验证输入，防止命令注入
function isValidHost(host: string): boolean {
    // 只允许字母、数字、点、连字符、冒号（IPv6）
    const pattern = /^[a-zA-Z0-9.\-:]+$/;
    return pattern.test(host) && host.length > 0 && host.length <= 253;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { host } = body;

        if (!host || !isValidHost(host)) {
            return NextResponse.json(
                { error: '无效的目标地址。只允许域名或 IP 地址。' },
                { status: 400 }
            );
        }

        // 使用 spawn 替代 exec，避免 maxBuffer 截断输出
        const isWindows = process.platform === 'win32';

        const result = await new Promise<string>((resolve, reject) => {
            let output = '';
            let proc;

            if (isWindows) {
                // Windows 下使用 cmd /c 执行，先切换 UTF-8 代码页
                proc = spawn('cmd', ['/c', `chcp 65001 > nul && tracert ${host}`]);
            } else {
                proc = spawn('traceroute', [host]);
            }

            proc.stdout.on('data', (data: Buffer) => {
                output += data.toString('utf8');
            });

            proc.stderr.on('data', (data: Buffer) => {
                output += data.toString('utf8');
            });

            proc.on('close', (code: number | null) => {
                if (code !== 0 && !output) {
                    reject(new Error(`Traceroute 命令退出，退出码: ${code}`));
                } else {
                    resolve(output);
                }
            });

            proc.on('error', (err: Error) => {
                reject(err);
            });

            // 120 秒超时（traceroute 可能需要较长时间）
            const timer = setTimeout(() => {
                proc.kill();
                if (output) {
                    // 超时但已有部分输出，返回已收集的内容
                    resolve(output + '\n\n[命令执行超时，以上为已收集的部分结果]');
                } else {
                    reject(new Error('Traceroute 命令执行超时（120秒）'));
                }
            }, 120000);

            proc.on('close', () => {
                clearTimeout(timer);
            });
        });

        return NextResponse.json({ output: result });
    } catch (error) {
        const message = error instanceof Error ? error.message : '执行 Traceroute 命令失败';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
