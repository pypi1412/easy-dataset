'use server';

import fs from 'fs';
import path from 'path';
import { getProjectRoot, ensureDir } from './base';

// 获取项目中所有原始文件
export async function getFiles(projectId) {
  const projectRoot = await getProjectRoot();
  const projectPath = path.join(projectRoot, projectId);
  const filesDir = path.join(projectPath, 'files');
  await fs.promises.access(filesDir);
  const files = await fs.promises.readdir(filesDir);
  const fileStats = await Promise.all(
    files.map(async fileName => {
      // 跳过非文件项目
      const filePath = path.join(filesDir, fileName);
      const stats = await fs.promises.stat(filePath);

      // 只返回Markdown文件，跳过其他文件
      if (!fileName.endsWith('.md')) {
        return null;
      }

      return {
        name: fileName,
        path: filePath,
        size: stats.size,
        createdAt: stats.birthtime
      };
    })
  );
  return fileStats.filter(Boolean); // 过滤掉null值
}

// 删除项目中的原始文件及相关的文本块
export async function deleteFile(projectId, fileName) {
  const projectRoot = await getProjectRoot();
  const projectPath = path.join(projectRoot, projectId);
  const filesDir = path.join(projectPath, 'files');
  const chunksDir = path.join(projectPath, 'chunks');
  const tocDir = path.join(projectPath, 'toc');

  // 确保目录存在
  await ensureDir(tocDir);

  // 删除原始文件
  const filePath = path.join(filesDir, fileName);
  try {
    await fs.promises.access(filePath);
    await fs.promises.unlink(filePath);
  } catch (error) {
    console.error(`删除文件 ${fileName} 失败:`, error);
    // 如果文件不存在，继续处理
  }

  // 删除相关的TOC文件
  const baseName = path.basename(fileName, path.extname(fileName));
  const tocPath = path.join(tocDir, `${baseName}-toc.json`);
  console.log(111, tocPath);
  try {
    await fs.promises.access(tocPath);
    await fs.promises.unlink(tocPath);
  } catch (error) {
    // 如果TOC文件不存在，继续处理
  }

  // 删除相关的文本块
  try {
    await fs.promises.access(chunksDir);
    const chunks = await fs.promises.readdir(chunksDir);

    // 过滤出与该文件相关的文本块
    const relatedChunks = chunks.filter(chunk => chunk.startsWith(`${baseName}-part-`) && chunk.endsWith('.txt'));

    // 删除相关的文本块
    for (const chunk of relatedChunks) {
      const chunkPath = path.join(chunksDir, chunk);
      await fs.promises.unlink(chunkPath);
    }
  } catch (error) {
    console.error(`删除文件 ${fileName} 相关的文本块失败:`, error);
  }

  return { success: true, fileName };
}
