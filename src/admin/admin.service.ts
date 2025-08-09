import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';

@Injectable()
export class AdminService {
    constructor(private readonly prisma : PrismaService){}

    async register (regisAdmin : Prisma.userCreateInput){
        const user = await this.prisma.user.create({
            data: regisAdmin
        })
    }
}
