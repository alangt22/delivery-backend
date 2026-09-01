import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Cadastrar usuário',
    description: 'Cria uma nova conta utilizando nome, e-mail e senha.',
  })
  @ApiResponse({
    status: 201,
    description: 'Usuário cadastrado com sucesso.',
  })
  @ApiResponse({
    status: 409,
    description: 'Já existe um usuário com este e-mail.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados enviados são inválidos.',
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Login com e-mail e senha',
    description: 'Autentica o usuário e retorna um JWT.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login realizado com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description: 'E-mail ou senha inválidos.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados enviados são inválidos.',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obter usuário autenticado',
    description: 'Retorna os dados do usuário identificado pelo JWT.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados do usuário autenticado retornados com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description: 'Token ausente, inválido ou expirado.',
  })
  me(@Req() req) {
    const { passwordHash, ...user } = req.user;
    return user;
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Iniciar login com Google',
    description: 'Redireciona o usuário para autenticação através do Google.',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirecionamento para o Google OAuth.',
  })
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Callback do Google OAuth',
    description:
      'Recebe o retorno da autenticação do Google e redireciona o usuário para o frontend com o JWT.',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirecionamento para o frontend após autenticação.',
  })
  googleCallback(@Req() req, @Res() res: Response) {
    const { access_token } = req.user;

    return res.redirect(
      `http://localhost:3001/auth/callback?token=${access_token}`,
    );
  }
}