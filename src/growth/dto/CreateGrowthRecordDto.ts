import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateGrowthRecordDto {
  @IsNumber()
  @Min(0) // Tinggi tidak boleh negatif
  @IsNotEmpty()
  height: number;

  @IsNumber()
  @Min(0) // Berat tidak boleh negatif
  @IsNotEmpty()
  weight: number;

  @IsDateString()
  @IsNotEmpty()
  date: Date;

  @IsNumber()
  @IsNotEmpty()
  inputBy: number;
}
