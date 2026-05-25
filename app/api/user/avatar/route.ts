import { NextRequest, NextResponse } from 'next/server';
import { cloudinary } from '@/lib/cloudinary';
import { prisma } from '@/lib/prisma';
import { guardRequest } from '@/lib/security';

export async function POST(request: NextRequest) {
  // Guard: 10 upload per IP per jam (prevent Cloudinary abuse)
  const blocked = guardRequest(request, {
    rateLimit: { limit: 10, windowMs: 60 * 60 * 1000 },
  });
  if (blocked) return blocked;

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const userId = formData.get('userId') as string | null;

  if (!file || !userId) {
    return NextResponse.json({ error: 'Missing file or userId' }, { status: 400 });
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'File harus berupa gambar' }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Ukuran gambar maksimal 5MB' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: 'ai-pacar-toxic',
        public_id: `avatar-${userId}`,
        overwrite: true,
        transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
      },
      (error, result) => {
        if (error || !result) return reject(error);
        resolve(result as { secure_url: string });
      },
    ).end(buffer);
  });

  await prisma.user.update({
    where: { id: userId },
    data: { aiPhotoUrl: uploadResult.secure_url },
  });

  return NextResponse.json({ url: uploadResult.secure_url });
}
