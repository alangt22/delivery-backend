import { IsString } from "class-validator";


export class CreateAddressDto {

    @IsString()
    street!: string;

    @IsString()
    number!: string;

    @IsString()
    district!: string;

    @IsString()
    city!: string;

    @IsString()
    state!: string;

    @IsString()
    zipCode!: string;
}