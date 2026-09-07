import { InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { CloudinaryService } from './cloudinary.service';

const uploadStreamMock = jest.fn();
const destroyMock = jest.fn();

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: (...args: any[]) => uploadStreamMock(...args),
      destroy: (...args: any[]) => destroyMock(...args),
    },
  },
}));

describe('CloudinaryService', () => {
  let service: CloudinaryService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CloudinaryService],
    }).compile();

    service = module.get<CloudinaryService>(CloudinaryService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  it('deve configurar o Cloudinary com as variáveis de ambiente', () => {
    const { v2: cloudinary } = require('cloudinary');

    expect(cloudinary.config).toHaveBeenCalledWith({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  });

  it('deve lançar erro quando nenhum arquivo for informado', async () => {
    await expect(
      service.uploadImage(undefined as any, 'products'),
    ).rejects.toThrow(InternalServerErrorException);

    expect(uploadStreamMock).not.toHaveBeenCalled();
  });

  it('deve enviar uma imagem para o Cloudinary e retornar a URL e o publicId', async () => {
    const secureUrl = 'https://res.cloudinary.com/demo/image/upload/product.jpg';

    uploadStreamMock.mockImplementation(
      (options: any, callback: any) => {
        callback(null, {
          secure_url: secureUrl,
          public_id: 'products/product-123',
        });

        return {
          write: jest.fn(),
          end: jest.fn(),
        };
      },
    );

    const file = {
      buffer: Buffer.from([
        0xff, 0xd8, 0xff, 0xe0,
        0x00, 0x10,
        0x4a, 0x46, 0x49, 0x46,
        0x00, 0x01,
        0x01, 0x00, 0x00, 0x01,
        0x00, 0x01, 0x00, 0x00,
      ]),
      originalname: 'produto.jpg',
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    const result = await service.uploadImage(
      file,
      'products',
    );

    expect(uploadStreamMock).toHaveBeenCalledWith(
      {
        folder: 'products',
        resource_type: 'image',
      },
      expect.any(Function),
    );

    expect(result).toEqual({
      url: secureUrl,
      publicId: 'products/product-123',
    });
  });

  it('deve lançar erro quando o Cloudinary retornar erro', async () => {
    uploadStreamMock.mockImplementation(
      (options: any, callback: any) => {
        callback(new Error('Cloudinary error'), null);

        return {
          write: jest.fn(),
          end: jest.fn(),
        };
      },
    );

    const file = {
      buffer: Buffer.from([
        0xff, 0xd8, 0xff, 0xe0,
        0x00, 0x10,
        0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]),
      originalname: 'produto.jpg',
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    await expect(
      service.uploadImage(file, 'products'),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it('deve remover uma imagem do Cloudinary', async () => {
    destroyMock.mockResolvedValue({
      result: 'ok',
    });

    await service.deleteImage('products/product-123');

    expect(destroyMock).toHaveBeenCalledWith(
      'products/product-123',
    );
  });
});