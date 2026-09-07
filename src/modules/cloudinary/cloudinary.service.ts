import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

import { v2 as cloudinary } from 'cloudinary';

import FileType from 'file-type';

import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024;

  private readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  private readonly ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string,
  ): Promise<{
    url: string;
    publicId: string;
  }> {
    if (!file) {
      throw new InternalServerErrorException('Arquivo de imagem não informado');
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        'A imagem deve ter no máximo 5 MB',
      );
    }

    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Formato de imagem não permitido. Use JPG, PNG ou WebP',
      );
    }

    const detectedType = await FileType.fromBuffer(file.buffer);

    if (!detectedType) {
      throw new BadRequestException(
        'Não foi possível validar o formato da imagem',
      );
    }

    if (
      !this.ALLOWED_EXTENSIONS.includes(detectedType.ext) ||
      !this.ALLOWED_MIME_TYPES.includes(detectedType.mime)
    ) {
      throw new BadRequestException(
        'O conteúdo do arquivo não corresponde a uma imagem JPG, PNG ou WebP válida',
      );
    }

    if (detectedType.mime !== file.mimetype) {
      throw new BadRequestException(
        'O tipo de arquivo informado não corresponde ao conteúdo real da imagem',
      );
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (error, result) => {
          if (error || !result) {
            reject(
              new InternalServerErrorException(
                'Erro ao enviar imagem para o Cloudinary',
              ),
            );
            return;
          }

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}