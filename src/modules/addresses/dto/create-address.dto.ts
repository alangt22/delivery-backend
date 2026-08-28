import { IsString } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';


export class CreateAddressDto {

    @ApiProperty()
    @IsString()
    street!: string;

    @ApiProperty()
    @IsString()
    number!: string;

    @ApiProperty()
    @IsString()
    district!: string;

    @ApiProperty()
    @IsString()
    city!: string;

    @ApiProperty()
    @IsString()
    state!: string;

    @ApiProperty()
    @IsString()
    zipCode!: string;
}
