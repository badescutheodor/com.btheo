import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import smartcrop from 'smartcrop-sharp';
import { LRUCache } from 'lru-cache';
import { join, basename, extname } from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import { Readable } from 'stream';
import ffmpeg from 'fluent-ffmpeg';
import { v4 as uuidv4 } from 'uuid';
import { tmpdir } from 'os';
import ffprobeStatic from 'ffprobe-static';

/**
 * Media Processing API Example URLs
 * 
 * Image Processing:
 * 1. Resize an image:
 *    /api/media/images/example.jpg?w=800&h=600
 * 
 * 2. Smart crop an image:
 *    /api/media/images/example.jpg?w=500&h=500&sc=true
 * 
 * 3. Apply filters to an image:
 *    /api/media/images/example.jpg?fil=grayscale&fil=sharpen
 * 
 * 4. Convert image format:
 *    /api/media/images/example.png?f=webp
 * 
 * 5. Add watermark:
 *    /api/media/images/example.jpg?wm=true
 * 
 * 6. Crop specific region:
 *    /api/media/images/example.jpg?c=true&cx=100&cy=100&cw=300&ch=300
 * 
 * 7. Adjust quality:
 *    /api/media/images/example.jpg?q=75
 * 
 * Video Processing:
 * 8. Extract a frame from video:
 *    /api/media/videos/example.mp4?t=5&f=jpeg
 * 
 * 9. Resize video:
 *    /api/media/videos/example.mp4?w=1280&h=720
 * 
 * 10. Trim video:
 *     /api/media/videos/example.mp4?t=10&d=30
 * 
 * 11. Apply filters to video:
 *     /api/media/videos/example.mp4?fil=sepia&fil=contrast
 * 
 * 12. Change video speed:
 *     /api/media/videos/example.mp4?speed=1.5
 * 
 * 13. Loop video:
 *     /api/media/videos/example.mp4?loop=3
 * 
 * 14. Mute video:
 *     /api/media/videos/example.mp4?mute=true
 * 
 * 15. Adjust video quality:
 *     /api/media/videos/example.mp4?quality=medium
 * 
 * Audio Processing:
 * 16. Trim audio:
 *     /api/media/audio/example.mp3?t=30&d=60
 * 
 * 17. Change audio format:
 *     /api/media/audio/example.wav?f=mp3
 * 
 * 18. Adjust audio volume:
 *     /api/media/audio/example.mp3?volume=0.8
 * 
 * 19. Change audio speed:
 *     /api/media/audio/example.mp3?speed=1.25
 * 
 * 20. Loop audio:
 *     /api/media/audio/example.mp3?loop=2
 * 
 * Sprite Generation:
 * 21. Generate sprite from multiple images:
 *     /api/media/sprite?sprite=true&url=image1.jpg&url=image2.jpg&url=image3.jpg&w=120&h=80
 * 
 * Asset Information:
 * 22. Get asset information (JSON only):
 *     /api/media/videos/example.mp4?jsonOnly=true
 * 
 * Combined Operations:
 * 23. Resize, apply filter, and convert format:
 *     /api/media/images/example.jpg?w=600&h=400&fil=grayscale&f=webp
 * 
 * 24. Trim video, resize, and adjust quality:
 *     /api/media/videos/example.mp4?t=5&d=15&w=1080&h=720&quality=high
 * 
 * 25. Trim audio, change speed, and convert format:
 *     /api/media/audio/example.mp3?t=10&d=30&speed=1.5&f=ogg
 * 
 * Note: Replace 'example.jpg', 'example.mp4', and 'example.mp3' with actual file names in your public directory.
 */

const ffprobePath = ffprobeStatic.path;

// Setup cache
const memoryCache = new LRUCache<string, Buffer | object>({ max: 100, ttl: 1000 * 60 * 60 }); // 1 hour TTL

// Constants
const MAX_WIDTH = 3840;
const MAX_HEIGHT = 2160;
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;
const ALLOWED_IMAGE_FORMATS = ['png', 'webp', 'jpeg', 'jpg'] as const;
const ALLOWED_VIDEO_FORMATS = ['mp4', 'webm', 'ogg'] as const;
const ALLOWED_AUDIO_FORMATS = ['mp3', 'wav', 'ogg'] as const;
const ALLOWED_FILTERS = ['grayscale', 'sepia', 'negative', 'blur', 'sharpen', 'contrast', 'brightness'] as const;

// Types
type ImageFormat = typeof ALLOWED_IMAGE_FORMATS[number];
type VideoFormat = typeof ALLOWED_VIDEO_FORMATS[number];
type AudioFormat = typeof ALLOWED_AUDIO_FORMATS[number];
type Filter = typeof ALLOWED_FILTERS[number];

interface MediaParams {
  url: string;
  urls?: string[];
  w?: number;
  h?: number;
  c?: boolean;
  sc?: boolean;
  f?: ImageFormat | VideoFormat | AudioFormat;
  fil?: Filter[];
  wm?: boolean;
  bg?: boolean;
  cx?: number;
  cy?: number;
  cw?: number;
  ch?: number;
  q?: number;
  t?: number;
  d?: number;
  sprite?: boolean;
  volume?: number;
  speed?: number;
  loop?: number;
  entities?: string[];
  jsonOnly?: boolean;
  mute?: boolean;
  crf?: number;
  quality?: 'low' | 'medium' | 'high';
}

const generateEmptyImage = async (params: MediaParams): Promise<Buffer> => {
  const { w, h } = params;
  const width = w ? Math.min(w, MAX_WIDTH) : DEFAULT_WIDTH;
  const height = h ? Math.min(h, MAX_HEIGHT) : DEFAULT_HEIGHT;
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .toBuffer();
};

const handleError = async (params: MediaParams): Promise<NextResponse> => {
  const emptyImage = await generateEmptyImage(params);
  return new NextResponse(emptyImage, {
    status: 200,
    headers: { 'Content-Type': 'image/png' },
  });
};

const applyFilters = (command: ffmpeg.FfmpegCommand, filters: Filter[]): ffmpeg.FfmpegCommand => {
  let filterString = '';
  filters.forEach((filter) => {
    switch (filter) {
      case 'grayscale':
        filterString += 'colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3,';
        break;
      case 'sepia':
        filterString += 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131,';
        break;
      case 'negative':
        filterString += 'negate,';
        break;
      case 'blur':
        filterString += 'gblur=sigma=1.5,';
        break;
      case 'sharpen':
        filterString += 'unsharp=5:5:1:5:5:0,';
        break;
      case 'contrast':
        filterString += 'eq=contrast=1.5,';
        break;
      case 'brightness':
        filterString += 'eq=brightness=0.5,';
        break;
    }
  });
  if (filterString) {
    command = command.videoFilters(filterString.slice(0, -1));
  }
  return command;
};

const processImage = async (params: MediaParams, imageStream: Readable): Promise<Readable> => {
  let { w, h, c, sc, f, fil, wm, bg, cx, cy, cw, ch, q, quality } = params;
  
  let transformer = sharp();

  if (sc) {
    const buffer = await streamToBuffer(imageStream);
    const cropData = await smartcrop.crop(buffer, { width: w, height: h });
    const { topCrop } = cropData;
    transformer = transformer.extract({
      width: topCrop.width,
      height: topCrop.height,
      left: topCrop.x,
      top: topCrop.y,
    });
  } else if (c && cx !== undefined && cy !== undefined && cw !== undefined && ch !== undefined) {
    transformer = transformer.extract({ left: cx, top: cy, width: cw, height: ch });
  }

  if (w || h) {
    w = w ? Math.min(+w, MAX_WIDTH) : undefined;
    h = h ? Math.min(+h, MAX_HEIGHT) : undefined;
    transformer = transformer.resize({ width: w, height: h });
  }

  if (fil) {
    fil.forEach((filter) => {
      switch (filter) {
        case 'grayscale': transformer = transformer.grayscale(); break;
        case 'sepia': transformer = transformer.sepia(); break;
        case 'negative': transformer = transformer.negate(); break;
        case 'blur': transformer = transformer.blur(5); break;
        case 'sharpen': transformer = transformer.sharpen(); break;
        case 'contrast': transformer = transformer.contrast(0.5); break;
        case 'brightness': transformer = transformer.modulate({ brightness: 1.5 }); break;
      }
    });
  }

  if (wm) {
    const watermarkPath = join(process.cwd(), 'public', 'watermark.png');
    transformer = transformer.composite([{ input: watermarkPath, gravity: 'southeast' }]);
  }

  if (bg) {
    transformer = transformer.removeAlpha().flatten({ background: '#ffffff' });
  }

  const format = ALLOWED_IMAGE_FORMATS.includes(f as ImageFormat) ? f as ImageFormat : 'jpeg';
  
  let imageQuality = q ? Math.min(Math.max(+q, 1), 100) : 80;
  if (quality === 'low') imageQuality = Math.min(imageQuality, 60);
  else if (quality === 'medium') imageQuality = Math.min(imageQuality, 80);

  transformer = transformer[format]({ quality: imageQuality, progressive: true });

  return imageStream.pipe(transformer);
};

const extractAndSmartcropVideoFrame = async (videoPath: string, width: number, height: number, timeOffset: number = 0): Promise<string> => {
  const framePath = join(tmpdir(), `${uuidv4()}.png`);
  
  await new Promise<void>((resolve, reject) => {
    ffmpeg(videoPath)
      .seekInput(timeOffset)
      .frames(1)
      .save(framePath)
      .on('end', resolve)
      .on('error', reject);
  });

  const frameBuffer = await fs.readFile(framePath);
  const cropData = await smartcrop.crop(frameBuffer, { width, height });
  const { topCrop } = cropData;
  
  const croppedFramePath = join(tmpdir(), `${uuidv4()}_cropped.png`);
  await sharp(frameBuffer)
    .extract({
      width: topCrop.width,
      height: topCrop.height,
      left: topCrop.x,
      top: topCrop.y,
    })
    .resize(width, height)
    .toFile(croppedFramePath);

  await fs.unlink(framePath);
  return croppedFramePath;
};

const processVideo = async (params: MediaParams, videoPath: string): Promise<Readable> => {
  const { w, h, t, d, f, fil, volume, speed, loop, mute, crf, quality, sc } = params;
  const outputFormat = ALLOWED_VIDEO_FORMATS.includes(f as VideoFormat) ? f : 'mp4';

  let command = ffmpeg(videoPath);

  if (sc && w && h) {
    try {
      const smartcroppedFramePath = await extractAndSmartcropVideoFrame(videoPath, w, h, t);
      command = command.input(smartcroppedFramePath)
        .complexFilter([
          '[0:v][1:v]overlay=shortest=1[out]',
          '[out]scale=' + w + ':' + h + '[scaled]'
        ])
        .map('[scaled]');
      
      // Clean up the temporary file after processing
      command.on('end', () => fs.unlink(smartcroppedFramePath));
    } catch (error) {
      console.error("Error in smartcrop:", error);
      // Fallback to regular scaling if smartcrop fails
      command = command.size(`${w}x${h}`);
    }
  } else if (w || h) {
    command = command.size(`${w || '?'}x${h || '?'}`);
  }

  if (t !== undefined) {
    command = command.seekInput(t);
  }

  if (d !== undefined) {
    command = command.duration(d);
  }

  if (mute) {
    command = command.noAudio();
  } else if (volume !== undefined) {
    command = command.audioFilters(`volume=${volume}`);
  }

  if (speed !== undefined) {
    command = command.videoFilters(`setpts=${1/speed}*PTS`).audioFilters(`atempo=${speed}`);
  }

  if (loop !== undefined && loop > 0) {
    command = command.inputOptions([`-stream_loop ${loop - 1}`]);
  }

  if (fil && fil.length > 0) {
    command = applyFilters(command, fil);
  }

  // Apply quality settings
  let crfValue = crf !== undefined ? Math.max(0, Math.min(51, crf)) : 23;
  if (quality === 'low') crfValue = Math.max(crfValue, 28);
  else if (quality === 'medium') crfValue = Math.max(crfValue, 23);
  command = command.outputOptions(`-crf ${crfValue}`);

  command
    .outputOptions('-movflags frag_keyframe+empty_moov')
    .toFormat(outputFormat);

  return command.pipe() as Readable;
};

const processAudio = async (params: MediaParams, audioPath: string): Promise<Readable> => {
  const { f, t, d, fil, volume, speed, loop, crf, quality } = params;
  const outputFormat = ALLOWED_AUDIO_FORMATS.includes(f as AudioFormat) ? f : 'mp3';

  let command = ffmpeg(audioPath);

  if (t !== undefined) {
    command = command.seekInput(t);
  }

  if (d !== undefined) {
    command = command.duration(d);
  }

  if (volume !== undefined) {
    command = command.audioFilters(`volume=${volume}`);
  }

  if (speed !== undefined) {
    command = command.audioFilters(`atempo=${speed}`);
  }

  if (loop !== undefined && loop > 0) {
    command = command.inputOptions([`-stream_loop ${loop - 1}`]);
  }

  if (fil && fil.length > 0) {
    command = applyFilters(command, fil);
  }

  // Apply quality settings
  let audioQuality = crf !== undefined ? Math.max(0, Math.min(9, crf)) : 4;
  if (quality === 'low') audioQuality = Math.min(audioQuality, 7);
  else if (quality === 'medium') audioQuality = Math.min(audioQuality, 5);
  command = command.audioQuality(audioQuality);

  command.toFormat(outputFormat);

  return command.pipe() as Readable;
};

const streamToBuffer = (stream: Readable): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
};

const generateSprite = async (params: MediaParams, basePath: string): Promise<{ buffer: Buffer; json: object }> => {
  const { urls = [], w = 120, h = 80, entities = [], quality } = params;
  const outputPath = join(process.cwd(), 'temp', `${uuidv4()}.jpg`);
  const jsonPath = join(process.cwd(), 'temp', `${uuidv4()}.json`);

  // Calculate optimal grid size
  const totalFrames = urls.length;
  const aspectRatio = w / h;
  const columns = Math.ceil(Math.sqrt(totalFrames * aspectRatio));
  const rows = Math.ceil(totalFrames / columns);

  return new Promise((resolve, reject) => {
    let command = ffmpeg();

    urls.forEach((url) => {
      command = command.input(join(basePath, url));
    });

    command
      .complexFilter([
        `concat=n=${totalFrames}:v=1:a=0`,
        `scale=${w}:${h}`,
        `tile=${columns}x${rows}`
      ])
      .frames(1)
      .outputOptions('-q:v 2')  // High quality for sprite
      .saveToFile(outputPath)
      .on('end', async () => {
        const buffer = await fs.readFile(outputPath);
        const json: any = {
          rows,
          columns,
          frameWidth: w,
          frameHeight: h,
          totalFrames,
          frames: urls.map((url, index) => ({
            url,
            x: (index % columns) * w,
            y: Math.floor(index / columns) * h,
          })),
        };

        if (entities.length > 0) {
          json.entities = entities.slice(0, totalFrames).map((entity, index) => ({
            id: entity,
            url: urls[index],
            x: (index % columns) * w,
            y: Math.floor(index / columns) * h,
            width: w,
            height: h,
          }));
        }

        await fs.writeFile(jsonPath, JSON.stringify(json));
        await fs.unlink(outputPath);
        resolve({ buffer, json });
      })
      .on('error', (err) => {
        reject(err);
      });
  });
};

export async function GET(
  req: NextRequest,
  { params }: { params: { url: string } }
): Promise<NextResponse> {
  params.url = (params.url || []).join('/');
  const url = decodeURIComponent(params.url);
  const searchParams = req.nextUrl.searchParams;
  const mediaParams: MediaParams = {
    url,
    urls: searchParams.getAll('url'),
    w: searchParams.get('w') ? parseInt(searchParams.get('w')!) : undefined,
    h: searchParams.get('h') ? parseInt(searchParams.get('h')!) : undefined,
    c: searchParams.get('c') === 'true',
    sc: searchParams.get('sc') === 'true',
    f: searchParams.get('f') as ImageFormat | VideoFormat | AudioFormat,
    fil: searchParams.getAll('fil') as Filter[],
    wm: searchParams.get('wm') === 'true',
    bg: searchParams.get('bg') === 'true',
    cx: searchParams.get('cx') ? parseInt(searchParams.get('cx')!) : undefined,
    cy: searchParams.get('cy') ? parseInt(searchParams.get('cy')!) : undefined,
    cw: searchParams.get('cw') ? parseInt(searchParams.get('cw')!) : undefined,
    ch: searchParams.get('ch') ? parseInt(searchParams.get('ch')!) : undefined,
    q: searchParams.get('q') ? parseInt(searchParams.get('q')!) : undefined,
    t: searchParams.get('t') ? parseFloat(searchParams.get('t')!) : undefined,
    d: searchParams.get('d') ? parseFloat(searchParams.get('d')!) : undefined,
    sprite: searchParams.get('sprite') === 'true',
    volume: searchParams.get('volume') ? parseFloat(searchParams.get('volume')!) : undefined,
    speed: searchParams.get('speed') ? parseFloat(searchParams.get('speed')!) : undefined,
    loop: searchParams.get('loop') ? parseInt(searchParams.get('loop')!) : undefined,
    entities: searchParams.getAll('entity'),
    jsonOnly: searchParams.get('jsonOnly') === 'true',
    mute: searchParams.get('mute') === 'true',
    crf: searchParams.get('crf') ? parseInt(searchParams.get('crf')!) : undefined,
    quality: searchParams.get('quality') as 'low' | 'medium' | 'high' | undefined,
  };

  if (!url) {
    return handleError(mediaParams);
  }

  const mediaPath = join(process.cwd(), 'public', url);

  try {
    await fs.access(mediaPath);
  } catch (err) {
    console.error("Error accessing media:", err);
    return handleError(mediaParams);
  }

  const cacheKey = JSON.stringify(mediaParams);
  const cachedMedia = memoryCache.get(cacheKey);

  if (cachedMedia) {
    if (typeof cachedMedia === 'object' && !Buffer.isBuffer(cachedMedia)) {
      return new NextResponse(JSON.stringify(cachedMedia), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new NextResponse(Readable.from(cachedMedia as Buffer), {
      status: 200,
      headers: { 'Content-Type': getContentType(mediaParams.f) },
    });
  }

  try {
    if (mediaParams.jsonOnly) {
      const assetInfo = await getAssetInfo(mediaPath);
      memoryCache.set(cacheKey, assetInfo);
      return new NextResponse(JSON.stringify(assetInfo), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let processedMedia: Readable | { buffer: Buffer; json: object };
    let contentType: string;

    if (mediaParams.sprite && mediaParams.urls && mediaParams.urls.length > 0) {
      processedMedia = await generateSprite(mediaParams, join(process.cwd(), 'public'));
      contentType = 'application/json';
    } else {
      const fileExtension = extname(mediaPath).toLowerCase();
      const fileStream = createReadStream(mediaPath);

      if (ALLOWED_IMAGE_FORMATS.includes(fileExtension.slice(1) as ImageFormat)) {
        processedMedia = await processImage(mediaParams, fileStream);
        contentType = `image/${mediaParams.f || 'jpeg'}`;
      } else if (ALLOWED_VIDEO_FORMATS.includes(fileExtension.slice(1) as VideoFormat)) {
        processedMedia = await processVideo(mediaParams, mediaPath);
        contentType = `video/${mediaParams.f || 'mp4'}`;
      } else if (ALLOWED_AUDIO_FORMATS.includes(fileExtension.slice(1) as AudioFormat)) {
        processedMedia = await processAudio(mediaParams, mediaPath);
        contentType = `audio/${mediaParams.f || 'mp3'}`;
      } else {
        throw new Error('Unsupported media type');
      }
    }

    if ('buffer' in processedMedia && 'json' in processedMedia) {
      memoryCache.set(cacheKey, processedMedia.json);
      return new NextResponse(JSON.stringify(processedMedia.json), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      const response = new NextResponse(processedMedia as ReadableStream, {
        status: 200,
        headers: { 
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
          'Transfer-Encoding': 'chunked'
        },
      });

      (processedMedia as Readable).on('error', (error) => {
        console.error('Stream error:', error);
        // In a production environment, you might want to handle this error more gracefully
      });

      return response;
    }
  } catch (err) {
    console.error("Error processing media:", err);
    return handleError(mediaParams);
  }
}

function getContentType(format: string | undefined): string {
  if (ALLOWED_IMAGE_FORMATS.includes(format as ImageFormat)) {
    return `image/${format || 'jpeg'}`;
  } else if (ALLOWED_VIDEO_FORMATS.includes(format as VideoFormat)) {
    return `video/${format || 'mp4'}`;
  } else if (ALLOWED_AUDIO_FORMATS.includes(format as AudioFormat)) {
    return `audio/${format || 'mp3'}`;
  }
  return 'application/octet-stream';
}

async function getAssetInfo(mediaPath: string): Promise<object> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(mediaPath, { path: ffprobePath }, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        const { format, streams } = metadata;
        const info: any = {
          filename: basename(mediaPath),
          format: format.format_name,
          duration: format.duration,
          size: format.size,
          bitrate: format.bit_rate,
        };

        if (streams && streams.length > 0) {
          const videoStream = streams.find(s => s.codec_type === 'video');
          const audioStream = streams.find(s => s.codec_type === 'audio');

          if (videoStream) {
            info.video = {
              codec: videoStream.codec_name,
              width: videoStream.width,
              height: videoStream.height,
              fps: eval(videoStream.r_frame_rate),
            };
          }

          if (audioStream) {
            info.audio = {
              codec: audioStream.codec_name,
              channels: audioStream.channels,
              sample_rate: audioStream.sample_rate,
            };
          }
        }

        resolve(info);
      }
    });
  });
}