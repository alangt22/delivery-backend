import {
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let response: any;
  let request: any;
  let host: any;

  beforeEach(() => {
    filter = new HttpExceptionFilter();

    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    request = {
      url: '/orders',
      method: 'GET',
    };

    host = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(response),
        getRequest: jest.fn().mockReturnValue(request),
      }),
    };
  });

  it('deve estar definido', () => {
    expect(filter).toBeDefined();
  });

  it('deve retornar a mensagem de uma HttpException', () => {
    const exception = new BadRequestException('Dados inválidos');

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.BAD_REQUEST,
    );

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Dados inválidos',
        path: '/orders',
      }),
    );
  });

  it('deve preservar code e items da resposta pública', () => {
    const exception = new BadRequestException({
      message: 'Produtos inválidos',
      code: 'INVALID_PRODUCTS',
      items: ['product-1', 'product-2'],
    });

    filter.catch(exception, host);

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Produtos inválidos',
        code: 'INVALID_PRODUCTS',
        items: ['product-1', 'product-2'],
        path: '/orders',
      }),
    );
  });

  it('deve juntar mensagens quando a exceção possui um array de mensagens', () => {
    const exception = new BadRequestException({
      message: ['Nome é obrigatório', 'Email inválido'],
    });

    filter.catch(exception, host);

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Nome é obrigatório, Email inválido',
      }),
    );
  });

  it('deve retornar mensagem segura para erro 500', () => {
    const exception = new HttpException(
      'Erro interno extremamente sensível',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Erro interno do servidor',
        path: '/orders',
      }),
    );
  });

  it('deve retornar mensagem segura quando ocorrer uma exceção desconhecida', () => {
    const exception = new Error(
      'Informação interna que não deve ser exposta',
    );

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Erro interno do servidor',
        path: '/orders',
      }),
    );
  });

  it('não deve expor detalhes internos de um erro desconhecido', () => {
    const exception = new Error(
      'DATABASE_PASSWORD=senha-super-secreta',
    );

    filter.catch(exception, host);

    const responseBody = response.json.mock.calls[0][0];

    expect(responseBody.message).toBe(
      'Erro interno do servidor',
    );

    expect(responseBody.message).not.toContain(
      'senha-super-secreta',
    );
  });

  it('deve preservar code e items mesmo quando o status for 500', () => {
    const exception = new HttpException(
      {
        message: 'Erro interno',
        code: 'PAYMENT_ERROR',
        items: ['payment-1'],
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );

    filter.catch(exception, host);

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Erro interno do servidor',
        code: 'PAYMENT_ERROR',
        items: ['payment-1'],
      }),
    );
  });
});