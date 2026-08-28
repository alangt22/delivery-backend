import {IsEmail, MinLength} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
    @ApiProperty({
        description: 'Email do usuário',
        example: 'user@example.com'
    })
    @IsEmail()
    email!: string;

    
    @ApiProperty({
        description: 'Senha do usuário',
        example: 'password123'
    })
    @MinLength(6)
    password!: string;
}