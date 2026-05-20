import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance = null;

export async function getFFmpeg(onLog, onProgress) {
  if (ffmpegInstance) {
    if (onLog) ffmpegInstance.on('log', onLog);
    if (onProgress) ffmpegInstance.on('progress', onProgress);
    return ffmpegInstance;
  }
  const f = new FFmpeg();

  if (onLog) f.on('log', onLog);
  if (onProgress) f.on('progress', onProgress);

  
  const baseURL = 'https://unpkg.com/@ffmpeg/core-mt@0.12.9/dist/esm';
  await f.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
  });

  ffmpegInstance = f;
  return f;
}

export async function processVideo(file, { trimStart, trimEnd, quality = 50, speed = 1, format = 'video/mp4' }, onLog, onProgress) {
  const f = await getFFmpeg(onLog, onProgress);

  const inputName = 'input' + (file.name.substring(file.name.lastIndexOf('.')) || '.mp4');
  const isWebm = format === 'video/webm';
  const isGif = format === 'image/gif';
  const outExt = isWebm ? '.webm' : isGif ? '.gif' : '.mp4';
  const outputName = 'output' + outExt;

  await f.writeFile(inputName, await fetchFile(file));

  const args = [];

  if (trimStart > 0) {
    args.push('-ss', String(trimStart));
  }

  args.push('-i', inputName);

  if (trimEnd && trimEnd > (trimStart || 0)) {
    args.push('-t', String(trimEnd - (trimStart || 0)));
  }

  let filterComplexUsed = false;
  if (speed && speed !== 1) {
    const atempos = [];
    let s = speed;
    while (s > 2.0) { atempos.push('atempo=2.0'); s /= 2.0; }
    while (s < 0.5) { atempos.push('atempo=0.5'); s /= 0.5; }
    if (s !== 1.0 || atempos.length === 0) atempos.push(`atempo=${s}`);
    
    args.push('-filter_complex', `[0:v]scale=-2:'min(ih,480)',setpts=${1 / speed}*PTS[v];[0:a]${atempos.join(',')}[a]`, '-map', '[v]', '-map', '[a]');
    filterComplexUsed = true;
  }

  const quality0to1 = Math.max(0, Math.min(100, quality)) / 100;

  if (isWebm) {
     const crf = Math.floor(63 - (quality0to1 * (63 - 15)));
     if (!filterComplexUsed) args.push('-vf', `scale=-2:'min(ih,480)'`);
     args.push('-c:v', 'libvpx-vp9', '-deadline', 'realtime', '-cpu-used', '8', '-row-mt', '1', '-crf', String(crf), '-b:v', '0', '-c:a', 'libopus', outputName);
  } else if (isGif) {
     if (!filterComplexUsed) {
         args.push('-vf', `fps=10,scale=320:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`);
     }
     args.push(outputName);
  } else {
     const crf = Math.floor(51 - (quality0to1 * (51 - 18)));
     if (!filterComplexUsed) args.push('-vf', `scale=-2:'min(ih,480)'`);
     args.push(
       '-c:v', 'libx264',
       '-crf', String(crf),
       '-preset', 'ultrafast', 
       '-threads', '8',
       '-c:a', 'aac',
       '-b:a', '128k',
       outputName
     );
  }

  await f.exec(args);

  const data = await f.readFile(outputName);
  return new Blob([data.buffer], { type: format });
}
