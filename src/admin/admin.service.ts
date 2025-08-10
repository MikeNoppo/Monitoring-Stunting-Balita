import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import * as argon2 from 'argon2';

@Injectable()
export class AdminService {
    constructor(private readonly prisma : PrismaService){}

    async register(regisAdmin: Prisma.userCreateInput) {
        if (!regisAdmin.password || !regisAdmin.email) {
            throw new BadRequestException('Email and password are required');
        }
        const hash = await argon2.hash(regisAdmin.password as string);
        const user = await this.prisma.user.create({
            data: {
                email: regisAdmin.email,
                name: regisAdmin.name ?? 'Admin',
                password: hash,
                role: 'ADMIN',
                instansi: regisAdmin.instansi,
                namaInstansi: regisAdmin.namaInstansi,
                alamat: regisAdmin.alamat,
            },
            select: { id: true, email: true, name: true, role: true },
        });
        return { message: 'Admin created', data: user };
    }

    async addChild (childData: Prisma.childCreateInput) {
        const child = await this.prisma.child.create({
            data: childData
        });
        return {
            message: 'Data anak berhasil ditambahkan.',
            data: child
        };
    }

    async listParents(opts: { q?: string; take: number }) {
        const where: Prisma.userWhereInput = {
            role: 'ORANG_TUA',
            ...(opts.q
                ? {
                      OR: [
                          { name: { contains: opts.q, mode: 'insensitive' } },
                          { email: { contains: opts.q, mode: 'insensitive' } },
                      ],
                  }
                : {}),
        };
        const data = await this.prisma.user.findMany({
            where,
            take: opts.take,
            orderBy: { name: 'asc' },
            select: { id: true, name: true, email: true },
        });
        return { message: 'Parents fetched', data };
    }
}
