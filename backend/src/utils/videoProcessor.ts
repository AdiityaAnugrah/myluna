import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { AppError } from './errors';

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new AppError('Binary ffmpeg tidak tersedia untuk server ini', 500));
      return;
    }

    const ffmpeg = spawn(ffmpegPath, args, {
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe'],
    });

    let stderr = '';
    ffmpeg.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    ffmpeg.on('error', (error) => {
      reject(new AppError(`Gagal menjalankan ffmpeg: ${error.message}`, 500));
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new AppError(`Kompresi video gagal (code ${code}): ${stderr || 'unknown error'}`, 500));
    });
  });
}

export async function compressComplaintVideoBuffer(params: {
  inputBuffer: Buffer;
  outputDir: string;
  outputFilename: string;
}): Promise<{ outputPath: string; outputBytes: number }> {
  const { inputBuffer, outputDir, outputFilename } = params;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'complaint-video-'));
  const tempInputPath = path.join(tempDir, 'input-video');
  const outputPath = path.join(outputDir, outputFilename);

  try {
    await fs.writeFile(tempInputPath, inputBuffer);

    const args = [
      '-y',
      '-i',
      tempInputPath,
      '-vf',
      'scale=if(gt(iw,1280),1280,iw):-2',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '30',
      '-maxrate',
      '1200k',
      '-bufsize',
      '2400k',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      '-c:a',
      'aac',
      '-b:a',
      '96k',
      '-ac',
      '2',
      '-ar',
      '44100',
      outputPath,
    ];

    await runFfmpeg(args);
    const stat = await fs.stat(outputPath);
    return {
      outputPath,
      outputBytes: stat.size,
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
