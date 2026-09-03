import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { Profile } from 'passport-google-oauth20';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) { }

  async register(dto: RegisterDto) {
    const userExists = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (userExists) {
      throw new ConflictException('Email já cadastrado');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash: hashedPassword,
      },
    });

    const { passwordHash, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }
    if (user.isBlocked) {
      throw new UnauthorizedException('Usuário bloqueado');
    }

    if (!user.passwordHash) {
      throw new ConflictException('Esta conta utiliza login com Google');
    }

    const passwordMatch = await bcrypt.compare(
      dto.password,
      user.passwordHash!,
    );

    if (!passwordMatch) {
      throw new ConflictException('Email ou senha inválidos');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const access_token = await this.jwtService.signAsync(payload);

    return {
      access_token,
    };
  }

  async validateGoogleUser(profile: Profile) {
    const email = profile.emails?.[0]?.value;

    let user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          name: profile.displayName,

          email: email!,

          googleId: profile.id,
        },
      });

    } else if (!user.googleId) {
      user = await this.prisma.user.update({
        where: {
          id: user.id,
        },

        data: {
          googleId: profile.id,
        },
      });

    }

    // Impede que usuários bloqueados autentiquem pelo Google.
    if (user.isBlocked) {
      throw new UnauthorizedException('Usuário bloqueado');
    }


    const payload = {
      sub: user.id,

      email: user.email,

      role: user.role,
    };

    const access_token = await this.jwtService.signAsync(payload);

    const { passwordHash, ...userWithoutPassword } = user;


    return {
      user: userWithoutPassword,
      access_token,
    };
  }
}
