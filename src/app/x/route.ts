import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import smartcrop from 'smartcrop-sharp';
import { LRUCache } from 'lru-cache';
import { join, basename, extname } from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';

// Setup cache
const memoryCache = new LRUCache<string, Buffer>({ max: 100, ttl: 1000 * 60 * 60 }); // 1 hour TTL

// Utility functions
const applyWatermark = async (imageBuffer: Buffer, watermarkPath: string): Promise<Buffer> => {
  const watermark = await sharp(watermarkPath).resize({ width: 100 }).png().toBuffer();
  return sharp(imageBuffer)
    .composite([{ input: watermark, gravity: 'southeast' }])
    .toBuffer();
};

const generateEmptyImage = async (): Promise<Buffer> => {
  return sharp({
    create: {
      width: 800,
      height: 600,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .toBuffer();
};

const handleError = async (): Promise<NextResponse> => {
  const emptyImage = await generateEmptyImage();
  return new NextResponse(emptyImage, {
    status: 200,
    headers: { 'Content-Type': 'image/png' },
  });
};

interface ImageParams {
  url: string;
  width?: number;
  height?: number;
  crop?: boolean;
  smartCropEnabled?: boolean;
  format?: 'png' | 'webp' | 'jpeg';
  filter?: 'grayscale' | 'rotate' | 'flip' | 'flop';
  watermark?: boolean;
  removeBg?: boolean;
  cropX?: number;
  cropY?: number;
  cropW?: number;
  cropH?: number;
}

const processImage = async (params: ImageParams, imagePath: string): Promise<Buffer> => {
  let { width, height, crop, smartCropEnabled, format, filter, watermark, removeBg, cropX, cropY, cropW, cropH } = params;
  
  let transformer = sharp(await fs.readFile(imagePath));

  if (smartCropEnabled) {
    const cropData = await smartcrop.crop(await fs.readFile(imagePath), { width, height });
    const { topCrop } = cropData;
    transformer = transformer.extract({
      width: topCrop.width,
      height: topCrop.height,
      left: topCrop.x,
      top: topCrop.y,
    });
  } else if (crop && cropX && cropY && cropW && cropH) {
    transformer = transformer.extract({ left: cropX, top: cropY, width: cropW, height: cropH });
  }

  if (width || height) {
    width = +width > 1920 ? 1920 : width;
    height = +height > 1080 ? 1080 : height;

    let resizeOptions: any = {};

    if (width) {
      resizeOptions['width'] = +width;
    }

    if (height) {
      resizeOptions['height'] = +height;
    }

    transformer = transformer.resize(resizeOptions);
  }

  if (filter) {
    switch (filter) {
      case 'grayscale': transformer = transformer.grayscale(); break;
      case 'rotate': transformer = transformer.rotate(90); break;
      case 'flip': transformer = transformer.flip(); break;
      case 'flop': transformer = transformer.flop(); break;
    }
  }

  if (watermark) {
    const watermarkPath = join(process.cwd(), 'public', 'watermark.png');
    const imageBuffer = await transformer.toBuffer();
    transformer = sharp(await applyWatermark(imageBuffer, watermarkPath));
  }

  if (removeBg) {
    transformer = transformer.removeAlpha();
  }

  return transformer[format || 'jpeg']({ progressive: true }).toBuffer();
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = Object.fromEntries(request.nextUrl.searchParams) as unknown as ImageParams;

  if (!params.url || typeof params.url !== 'string') {
    return handleError();
  }

  const imagePath = join(process.cwd(), 'public', params.url);

  try {
    await fs.stat(imagePath);
  } catch (err) {
    console.log("ERROR", err);
    return handleError();
  }

  const cacheKey = JSON.stringify(params);
  const cachedImage = memoryCache.get(cacheKey);

  if (cachedImage) {
    return new NextResponse(cachedImage, {
      status: 200,
      headers: { 'Content-Type': `image/${params.format || 'jpeg'}` },
    });
  }

  const processedImagePath = join(
    process.cwd(),
    'public',
    'uploads',
    `${basename(params.url, extname(params.url))}_${params.width}x${params.height}_crop_${params.crop}.jpg`
  );

  try {
    await fs.stat(processedImagePath);
    const fileStream = createReadStream(processedImagePath);
    return new NextResponse(fileStream as unknown as ReadableStream, {
      status: 200,
      headers: { 'Content-Type': `image/${params.format || 'jpeg'}` },
    });
  } catch (err) {
    console.log('Processed image not found, proceeding to process');
  }

  try {
    const lowQualityImage = await sharp(await fs.readFile(imagePath))
      .resize({
        width: Math.floor((params.width || 800) / 10),
        height: Math.floor((params.height || 600) / 10),
      })
      .blur(10)
      .jpeg({ quality: 30 })
      .toBuffer();

    const processedImage = await processImage(params, imagePath);
    const combinedImage = Buffer.concat([lowQualityImage, processedImage]);

    await fs.writeFile(processedImagePath, processedImage);
    memoryCache.set(cacheKey, processedImage);

    return new NextResponse(combinedImage, {
      status: 200,
      headers: { 
        'Content-Type': `image/${params.format || 'jpeg'}`,
        'Cache-Control': 'public, max-age=60'
      },
    });
  } catch (err) {
    return handleError();
  }
}